/**
 * Council Decide API — run council voting + LLM helpers
 * v2: Full prompt/response logging + structured table output
 */
import { Hono } from 'hono'
import { authMiddleware } from './auth.js'
import { ensureTable } from './councilPersonas.js'
import { callWithChain, callModel, getProviderForModel, parseVote } from '../llm/providers.js'

export const councilDecideRoutes = new Hono()

// POST /council/decide — run the council
councilDecideRoutes.post('/council/decide', authMiddleware(), async (c) => {
    const db = c.get('db');
    if (!db) return c.json({ error: 'DB not available' }, 500);

    const body = await c.req.json();
    const { tableId, topic, question, mode: reqMode, numObjects, numParams } = body;
    if (!tableId && !topic) return c.json({ error: 'tableId or topic required' }, 400);

    await ensureTable(db);

    // Load table context
    let tableContext = '';
    let columns = [];
    let rows = [];
    let tableTitle = topic || '';

    if (tableId) {
        try {
            const table = db.prepare('SELECT title, description FROM tables WHERE id = ?').bind(tableId).get();
            if (table) {
                tableTitle = table.title;
                const colDef = db.prepare('SELECT definition FROM columns WHERE table_id = ?').bind(tableId).get();
                const rowsData = db.prepare('SELECT data FROM rows WHERE table_id = ? LIMIT 20').bind(tableId).all();
                columns = colDef ? JSON.parse(colDef.definition) : [];
                rows = rowsData.map(r => JSON.parse(r.data));
                tableContext = `
Таблица "${table.title}": ${table.description || ''}
Критерии (параметры): ${columns.map(c => `${c.title} (вес ${c.weight}%)`).join(', ')}
Альтернативы (строки, ${rows.length}):
${rows.map((r, i) => `  ${i+1}. ${JSON.stringify(r)}`).join('\n')}
`;
            }
        } catch (e) {
            console.warn('[Council] Failed to load table context:', e.message);
        }
    }

    const mode = reqMode || 'sequential';

    // Load enabled personas
    const personas = db.prepare('SELECT * FROM council_personas WHERE enabled = 1 ORDER BY sort_order ASC').all();

    if (personas.length === 0) {
        return c.json({ error: 'No enabled personas. Configure Council first.' }, 400);
    }

    // Create council_job record
    const jobResult = db.prepare(`INSERT INTO council_jobs (topic, status, alternatives, criteria, created_at)
        VALUES (?, 'running', ?, ?, datetime('now'))`).run(
            tableTitle,
            JSON.stringify(rows.map(r => r.name || r[columns[0]?.title] || 'Unknown')),
            JSON.stringify(columns.map(c => ({ title: c.title, weight: c.weight })))
        );
    const jobId = jobResult.lastInsertRowid;

    // Trim table context to requested dimensions BEFORE sending to LLM
    let trimmedColumns = columns;
    let trimmedRows = rows;
    if (numParams && columns.length > numParams) {
        // Keep top-weighted columns
        trimmedColumns = [...columns].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, numParams);
    }
    if (numObjects && rows.length > numObjects) {
        // Keep first N rows (user order = relevance)
        trimmedRows = rows.slice(0, numObjects);
    }
    // Rebuild tableContext with trimmed data
    if ((numParams && columns.length > numParams) || (numObjects && rows.length > numObjects)) {
        tableContext = `
Таблица "${tableTitle}": 
Критерии (${trimmedColumns.length} из ${columns.length}): ${trimmedColumns.map(c => `${c.title} (вес ${c.weight}%)`).join(', ')}
Альтернативы (${trimmedRows.length} из ${rows.length}):
${trimmedRows.map((r, i) => `  ${i+1}. ${JSON.stringify(r)}`).join('\n')}
`;
    }

    const objectConstraint = numObjects ? `\nВАЖНО: в ответе должно быть РОВНО ${numObjects} объектов в scores. Список объектов: ${trimmedRows.map(r => r.name || 'Unknown').join(', ')}. Не добавляй никаких других объектов.` : '';
    const paramConstraint = numParams ? `\nВАЖНО: в ответе должно быть РОВНО ${numParams} критериев для каждого объекта: ${trimmedColumns.map(c => c.title).join(', ')}. Не добавляй никаких других критериев.` : '';

    // Build structured output instruction
    const structuredInstruction = `

ФОРМАТ ОТВЕТА (ОБЯЗАТЕЛЬНО):
Ответь в виде JSON-блока. Вот структура:
\`\`\`json
{
  "analysis": "Краткое обоснование (2-3 предложения)",
  "scores": {
    "Альтернатива1": { "Критерий1": 8, "Критерий2": 7 },
    "Альтернатива2": { "Критерий1": 6, "Критерий2": 9 }
  },
  "recommendation": "Лучшая альтернатива",
  "confidence": 8,
  "score": 82
}
\`\`\`
${objectConstraint}${paramConstraint}
Если не хватает данных для оценки — укажи "insufficient_data" в recommendation.

КРИТИЧЕСКОЕ ПРАВИЛО: количество объектов в scores должно строго соответствовать ограничению выше. Количество критериев для каждого объекта — строго по ограничению выше. Лишние объекты или критерии НЕДОПУСТИМЫ.
`;

    const userQuestion = question || `Проведи оценку альтернатив по каждому критерию. Какой объект лучший?`;

    // Run each persona through LLM chain
    const votes = [];
    const debug = [];

    const runPersona = async (persona) => {
        const t0 = Date.now();
        let provider = 'unknown';
        let modelUsed = 'unknown';
        try {
            const systemPrompt = persona.system_prompt + '\n\n' + tableContext + structuredInstruction;
            const userMsg = `Вопрос: ${userQuestion}\n\nТы: ${persona.name} (${persona.role}). Дай оценку с позиции своей роли.`;

            let response = null;
            let tokensUsed = { input: 0, output: 0 };

            if (persona.model) {
                const result = await callModel(process.env, persona.model, systemPrompt, userMsg, persona.temperature);
                if (result) {
                    response = typeof result === 'string' ? result : result.text;
                    tokensUsed = typeof result === 'string' ? { input: 0, output: 0 } : result.tokens;
                    provider = getProviderForModel(persona.model);
                    modelUsed = persona.model;
                }
            }
            if (!response) {
                const result = await callWithChain(process.env, systemPrompt, userMsg, persona.temperature);
                if (result) {
                    response = typeof result === 'string' ? result : result.text;
                    tokensUsed = typeof result === 'string' ? { input: 0, output: 0 } : result.tokens;
                    provider = 'zai';
                    modelUsed = process.env.ZAI_MODEL || 'GLM-5.1';
                }
            }

            const duration = Date.now() - t0;

            // LOG full prompt/response to council_logs
            try {
                db.prepare(`INSERT INTO council_logs (job_id, persona_name, persona_role, model, provider, system_prompt, user_prompt, ai_response, tokens_input, tokens_output, duration_ms)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                        jobId, persona.name, persona.role, modelUsed, provider,
                        systemPrompt.substring(0, 16000),
                        userMsg,
                        response ? response.substring(0, 16000) : '',
                        tokensUsed.input, tokensUsed.output, duration
                    );
            } catch (logErr) {
                console.warn('[Council] Failed to log:', logErr.message);
            }

            const parsed = parseVote(response);

            // Post-validate grade range (1-10)
            if (parsed.scores) {
                for (const obj of Object.keys(parsed.scores)) {
                    if (typeof parsed.scores[obj] !== 'object') continue;
                    for (const param of Object.keys(parsed.scores[obj])) {
                        const val = parsed.scores[obj][param];
                        if (typeof val === 'number') {
                            parsed.scores[obj][param] = Math.max(1, Math.min(10, Math.round(val)));
                        } else if (typeof val === 'object' && val !== null && val.grade != null) {
                            val.grade = Math.max(1, Math.min(10, Math.round(Number(val.grade) || 0)));
                        }
                    }
                }
            }

            return {
                vote: {
                    persona: persona.id, name: persona.name, emoji: persona.emoji, role: persona.role, weight: persona.weight,
                    response: response ? response.substring(0, 2000) : '',
                    recommendation: parsed.recommendation, confidence: parsed.confidence, score: parsed.score,
                    tokens: tokensUsed,
                    scores: parsed.scores,
                    // Debug info
                    debug: { provider, model: modelUsed, duration_ms: duration, tokens_in: tokensUsed.input, tokens_out: tokensUsed.output }
                },
                dbg: { persona: persona.name, ms: duration, status: 'ok', tokens: tokensUsed, model: modelUsed, provider }
            };
        } catch (e) {
            const duration = Date.now() - t0;
            // Log error too
            try {
                db.prepare(`INSERT INTO council_logs (job_id, persona_name, persona_role, model, provider, system_prompt, user_prompt, ai_response, duration_ms)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                        jobId, persona.name, persona.role, modelUsed, provider, '', '', `ERROR: ${e.message}`, duration
                    );
            } catch (_) {}
            return { vote: null, dbg: { persona: persona.name, ms: duration, status: 'fail', error: e.message } };
        }
    };

    // Run with timeout protection (BUG-2 fix)
    const COUNCIL_TIMEOUT_MS = 5 * 60 * 1000; // 5 min
    const councilRun = async () => {
        if (mode === 'parallel') {
            const results = await Promise.all(personas.map(p => runPersona(p)));
            for (const r of results) { if (r.vote) votes.push(r.vote); debug.push(r.dbg); }
        } else {
            for (const persona of personas) {
                const r = await runPersona(persona);
                if (r.vote) votes.push(r.vote); debug.push(r.dbg);
            }
        }
    };

    try {
        await Promise.race([
            councilRun(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Council timeout after 5 minutes')), COUNCIL_TIMEOUT_MS))
        ]);
    } catch (timeoutErr) {
        // Mark job as failed
        try {
            db.prepare(`UPDATE council_jobs SET status = 'failed', error = ?, completed_at = datetime('now') WHERE id = ?`).run(timeoutErr.message, jobId);
        } catch (_) {}
        return c.json({ error: timeoutErr.message, jobId, votes, debug: { partial: true } }, 504);
    }

    // Calculate consensus
    let totalWeight = 0;
    let weightedScore = 0;
    const recommendations = {};

    for (const v of votes) {
        if (v.score) {
            weightedScore += v.score * v.weight;
            totalWeight += v.weight;
        }
        if (v.recommendation) {
            recommendations[v.recommendation] = (recommendations[v.recommendation] || 0) + v.weight;
        }
    }

    const consensusScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : null;
    const topRecommendation = Object.entries(recommendations).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // If editor exists, run editor
    const editorPersona = personas.find(p => p.role === 'editor');
    let editorSummary = null;

    if (editorPersona && votes.length > 0) {
        try {
            const editorPrompt = editorPersona.system_prompt + '\n\nМнения экспертов:\n' +
                votes.map(v => `${v.emoji} ${v.name}: ${v.response}`).join('\n\n');
            editorSummary = await callWithChain(process.env, editorPrompt, 'Составь финальное резюме на основе мнений всех экспертов. Укажи итоговую рекомендацию и почему.', editorPersona.temperature);
            if (typeof editorSummary === 'object') editorSummary = editorSummary.text;
        } catch (e) {
            debug.push({ persona: 'Editor', status: 'fail', error: e.message });
        }
    }

    // Update council_jobs
    const totalTokens = votes.reduce((s, v) => s + (v.tokens?.input || 0) + (v.tokens?.output || 0), 0);
    db.prepare(`UPDATE council_jobs SET status = 'completed', tokens_used = ?, persona_results = ?, final_decision = ?, completed_at = datetime('now')
        WHERE id = ?`).run(
            totalTokens,
            JSON.stringify(votes),
            JSON.stringify({ winner: topRecommendation, score: consensusScore, recommendations }),
            jobId
        );

    // --- Optimal measurement recommendation ---
    // Based on EBM principles: more parameters/objects = better discrimination
    // Rule of thumb: 5-15 params, 3-10 objects for reliable utility scores
    const currentObjCount = rows.length;
    const currentParamCount = columns.length;
    const minOptimalParams = Math.max(5, Math.ceil(currentObjCount * 0.8));
    const minOptimalObjects = Math.max(3, Math.ceil(currentParamCount * 0.5));
    const measurementAdvice = {
        current: { objects: currentObjCount, parameters: currentParamCount },
        optimal: { objects: minOptimalObjects, parameters: minOptimalParams },
        suggestion: []
    };
    if (currentParamCount < minOptimalParams) {
        measurementAdvice.suggestion.push(`Рекомендуется добавить ещё ${minOptimalParams - currentParamCount} параметров (сейчас ${currentParamCount}, оптимально ${minOptimalParams}) для более точного ранжирования.`);
    }
    if (currentObjCount < minOptimalObjects) {
        measurementAdvice.suggestion.push(`Рекомендуется добавить ещё ${minOptimalObjects - currentObjCount} объектов (сейчас ${currentObjCount}, оптимально ${minOptimalObjects}) для более полной картины выбора.`);
    }
    if (measurementAdvice.suggestion.length === 0) {
        measurementAdvice.suggestion.push('Размерность таблицы оптимальна для параметрической модели выбора.');
    }

    return c.json({
        jobId,
        votes,
        measurementAdvice,
        consensus: {
            score: consensusScore,
            recommendation: topRecommendation,
            voteCount: votes.length,
            recommendations: Object.fromEntries(
                Object.entries(recommendations).sort((a, b) => b[1] - a[1])
            ),
        },
        editorSummary,
        debug,
        tokens: {
            input: votes.reduce((s, v) => s + (v.tokens?.input || 0), 0),
            output: votes.reduce((s, v) => s + (v.tokens?.output || 0), 0),
        },
        // Extended debug info
        meta: {
            provider: debug.find(d => d.provider)?.provider || 'unknown',
            model: debug.find(d => d.model)?.model || 'unknown',
            total_duration_ms: debug.reduce((s, d) => s + (d.ms || 0), 0),
            personas_count: personas.length,
            mode,
            llm_chain: 'ZAI GLM-5.1 (единственный провайдер)',
        },
        ts: Date.now(),
    });
});

// GET /council/decisions — list past decisions
councilDecideRoutes.get('/council/decisions', authMiddleware(), async (c) => {
    const db = c.get('db');
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
    const offset = parseInt(c.req.query('offset') || '0');
    const rows = db.prepare(
        `SELECT id, topic, status, tokens_used, cost_usd, provider, error, created_at, completed_at 
         FROM council_jobs ORDER BY id DESC LIMIT ? OFFSET ?`
    ).all(limit, offset);
    const total = db.prepare('SELECT count(*) as c FROM council_jobs').get().c;
    return c.json({ data: rows, total, limit, offset });
});

// GET /council/decisions/:id — single decision with logs
councilDecideRoutes.get('/council/decisions/:id', authMiddleware(), async (c) => {
    const db = c.get('db');
    const row = db.prepare('SELECT * FROM council_jobs WHERE id = ?').get(c.req.param('id'));
    if (!row) return c.json({ error: 'Not found' }, 404);
    const logs = db.prepare('SELECT * FROM council_logs WHERE job_id = ? ORDER BY id ASC').all(c.req.param('id'));
    return c.json({ ...row, logs });
});

// GET /council/decisions/:id/logs — get logs for a decision
councilDecideRoutes.get('/council/decisions/:id/logs', authMiddleware(), async (c) => {
    const db = c.get('db');
    const logs = db.prepare('SELECT * FROM council_logs WHERE job_id = ? ORDER BY id ASC').all(c.req.param('id'));
    return c.json({ logs, total: logs.length });
});

// DELETE /council/decisions/:id — soft delete
councilDecideRoutes.delete('/council/decisions/:id', authMiddleware(), async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');
    const existing = db.prepare('SELECT id FROM council_jobs WHERE id = ?').get(id);
    if (!existing) return c.json({ error: 'Not found' }, 404);
    db.prepare("UPDATE council_jobs SET status = 'deleted' WHERE id = ?").run(id);
    return c.json({ ok: true });
});

// POST /council/decisions/:id/restore — restore deleted
councilDecideRoutes.post('/council/decisions/:id/restore', authMiddleware(), async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');
    const existing = db.prepare('SELECT id FROM council_jobs WHERE id = ?').get(id);
    if (!existing) return c.json({ error: 'Not found' }, 404);
    db.prepare("UPDATE council_jobs SET status = 'completed' WHERE id = ?").run(id);
    return c.json({ ok: true });
});

// GET /council/similar — find similar past decisions
councilDecideRoutes.get('/council/similar', authMiddleware(), async (c) => {
    const db = c.get('db');
    const topic = c.req.query('topic') || '';
    if (!topic) return c.json({ data: [], total: 0 });
    const rows = db.prepare(
        `SELECT id, topic, status, created_at FROM council_jobs 
         WHERE topic LIKE ? AND status != 'deleted' ORDER BY id DESC LIMIT 10`
    ).all(`%${topic}%`);
    return c.json({ data: rows, total: rows.length });
});

// LLM helpers moved to ../llm/providers.js

// parseVote moved to ../llm/providers.js
