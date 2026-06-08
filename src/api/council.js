import { Hono } from 'hono'
import { authMiddleware } from './auth.js'

const council = new Hono()

// Default personas (seeded on first GET if table empty)
const DEFAULT_PERSONAS = [
    {
        id: 'ceo', name: 'CEO', role: 'advisor', emoji: '👔',
        sortOrder: 1, temperature: 0.3, weight: 1.2,
        model: '',
        systemPrompt: `Ты — CEO с 20-летним опытом управления. Оценивай с точки зрения бизнес-стратегии, ROI, рыночных рисков и конкурентных преимуществ. Давай конкретные рекомендации. Отвечай кратко, 3-5 предложений.`
    },
    {
        id: 'cfo', name: 'CFO', role: 'advisor', emoji: '💰',
        sortOrder: 2, temperature: 0.2, weight: 1.1,
        model: '',
        systemPrompt: `Ты — CFO, финансовый директор. Оценивай с точки зрения стоимости, TCO, hidden costs, финансовой устойчивости предложения. Важно: ROI, payback period, total cost of ownership. Отвечай кратко, 3-5 предложений.`
    },
    {
        id: 'ciso', name: 'CISO', role: 'advisor', emoji: '🔒',
        sortOrder: 3, temperature: 0.3, weight: 1.0,
        model: '',
        systemPrompt: `Ты — CISO, директор по информационной безопасности. Оценивай риски: data privacy, vendor lock-in, compliance (GDPR, SOC2), инцидент-менеджмент. Отвечай кратко, 3-5 предложений.`
    },
    {
        id: 'tech', name: 'Tech Lead', role: 'advisor', emoji: '⚙️',
        sortOrder: 4, temperature: 0.4, weight: 1.0,
        model: '',
        systemPrompt: `Ты — Tech Lead, технический руководитель. Оценивай: архитектура, интеграции, API, масштабируемость, stack maturity, developer experience. Отвечай кратко, 3-5 предложений.`
    },
    {
        id: 'user_advocate', name: 'User Advocate', role: 'advisor', emoji: '👤',
        sortOrder: 5, temperature: 0.5, weight: 0.9,
        model: '',
        systemPrompt: `Ты — Advocate конечного пользователя. Оценивай: UX, обучаемость, onboarding, поддержка пользователей, community, документация. Отвечай кратко, 3-5 предложений.`
    },
    {
        id: 'critic', name: 'Критик', role: 'critic', emoji: '🎭',
        sortOrder: 6, temperature: 0.6, weight: 0.8,
        model: '',
        systemPrompt: `Ты — Критик-аналитик. Твоя задача — найти слабые места, подводные камни и риски в рекомендациях других экспертов. Играешь "адвоката дьявола". Указывай на то, что другие могли упустить. Отвечай кратко, 3-5 предложений.`
    },
    {
        id: 'editor', name: 'Редактор', role: 'editor', emoji: '📝',
        sortOrder: 7, temperature: 0.2, weight: 0.5,
        model: '',
        systemPrompt: `Ты — Редактор. На основе всех мнений экспертов, составь финальное резюме: 1) главная рекомендация, 2) ключевые аргументы за, 3) ключевые аргументы против, 4) итоговый вердикт. Формат: структурированный текст, не более 200 слов.`
    }
];

/**
 * Ensure council_personas table exists and is seeded
 */
async function ensureTable(db) {
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS council_personas (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'advisor',
                enabled INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                model TEXT DEFAULT '',
                temperature REAL DEFAULT 0.3,
                system_prompt TEXT NOT NULL,
                weight REAL DEFAULT 1.0,
                emoji TEXT DEFAULT '🤖',
                updated_at TEXT
            )
        `);

        // Seed if empty
        const count = await db.prepare('SELECT COUNT(*) as c FROM council_personas').first();
        if (count.c === 0) {
            for (const p of DEFAULT_PERSONAS) {
                await db.prepare(`
                    INSERT INTO council_personas (id, name, role, enabled, sort_order, model, temperature, system_prompt, weight, emoji, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `).bind(p.id, p.name, p.role, p.enabled, p.sortOrder, p.model, p.temperature, p.systemPrompt, p.weight, p.emoji).run();
            }
        }
    } catch (e) {
        console.error('[Council] Table init error:', e.message);
    }
}

// GET /api/council/personas — list all personas
council.get('/personas', authMiddleware, async (c) => {
    const db = c.env.DB;
    if (!db) return c.json({ error: 'DB not available' }, 500);

    await ensureTable(db);

    const { results } = await db.prepare(
        'SELECT * FROM council_personas ORDER BY sort_order ASC'
    ).all();

    return c.json({ personas: results });
});

// PUT /api/council/personas/:id — update persona
council.put('/personas/:id', authMiddleware, async (c) => {
    const db = c.env.DB;
    if (!db) return c.json({ error: 'DB not available' }, 500);

    const { id } = c.req.param();
    const body = await c.req.json();

    const fields = [];
    const values = [];

    for (const [key, val] of Object.entries(body)) {
        const col = {
            name: 'name', role: 'role', enabled: 'enabled', sort_order: 'sort_order',
            model: 'model', temperature: 'temperature', system_prompt: 'system_prompt',
            weight: 'weight', emoji: 'emoji'
        }[key];
        if (col) {
            fields.push(`${col} = ?`);
            values.push(val);
        }
    }

    if (fields.length === 0) return c.json({ error: 'No valid fields' }, 400);

    fields.push("updated_at = datetime('now')");
    values.push(id);

    await db.prepare(`UPDATE council_personas SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values).run();

    return c.json({ ok: true });
});

// POST /api/council/personas — create new persona
council.post('/personas', authMiddleware, async (c) => {
    const db = c.env.DB;
    if (!db) return c.json({ error: 'DB not available' }, 500);

    const body = await c.req.json();
    const id = body.id || `persona_${Date.now()}`;

    await db.prepare(`
        INSERT INTO council_personas (id, name, role, enabled, sort_order, model, temperature, system_prompt, weight, emoji, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
        id, body.name || 'New Persona', body.role || 'advisor',
        body.enabled ?? 1, body.sort_order ?? 99,
        body.model || '', body.temperature ?? 0.3,
        body.system_prompt || 'Ты — AI-эксперт. Дай свою оценку.', body.weight ?? 1.0,
        body.emoji || '🤖'
    ).run();

    return c.json({ ok: true, id });
});

// DELETE /api/council/personas/:id
council.delete('/personas/:id', authMiddleware, async (c) => {
    const db = c.env.DB;
    if (!db) return c.json({ error: 'DB not available' }, 500);

    await db.prepare('DELETE FROM council_personas WHERE id = ?')
        .bind(c.req.param('id')).run();

    return c.json({ ok: true });
});

// POST /api/council/decide — run the council
council.post('/council/decide', authMiddleware, async (c) => {
    const db = c.env.DB;
    if (!db) return c.json({ error: 'DB not available' }, 500);

    const { tableId, topic, question } = await c.req.json();
    if (!tableId && !topic) return c.json({ error: 'tableId or topic required' }, 400);

    await ensureTable(db);

    // Load table context
    let tableContext = '';
    if (tableId) {
        try {
            const table = await db.prepare('SELECT title, description FROM tables WHERE id = ?').bind(tableId).first();
            if (table) {
                const colDef = await db.prepare('SELECT definition FROM columns WHERE table_id = ?').bind(tableId).first();
                const { results: rowsData } = await db.prepare('SELECT data FROM rows WHERE table_id = ? LIMIT 10').bind(tableId).all();
                const columns = colDef ? JSON.parse(colDef.definition) : [];
                const rows = rowsData.map(r => JSON.parse(r.data));
                tableContext = `
Таблица "${table.title}": ${table.description || ''}
Параметры: ${columns.map(c => `${c.title} (${c.weight}%)`).join(', ')}
Строки (${rows.length}): ${JSON.stringify(rows).substring(0, 6000)}
`;
            }
        } catch (e) {
            console.warn('[Council] Failed to load table context:', e.message);
        }
    }

    // Load enabled personas
    const { results: personas } = await db.prepare(
        'SELECT * FROM council_personas WHERE enabled = 1 ORDER BY sort_order ASC'
    ).all();

    if (personas.length === 0) {
        return c.json({ error: 'No enabled personas. Configure Council first.' }, 400);
    }

    const userQuestion = question || `Какой объект из таблицы лучший выбор? Обоснуй.`;

    // ─── SEQUENTIAL TABLE BUILDING ───
    // Each agent receives the current table state and refines it.
    // Agent 1 (first non-editor) creates the initial draft.
    // Each subsequent agent reviews and adjusts grades/values from their expertise angle.
    // Final result = a proper Choser comparison table.

    const TABLE_PROMPT_INSTRUCTIONS = `
ФОРМАТ ОТВЕТА — строго JSON (без markdown-обёрток):
{
  "columns": [
    {"key": "латиница_подчёркивания", "title": "Название параметра", "weight": ЧИСЛО_от_1_до_100, "type": "number"}
  ],
  "objects": {
    "Название объекта": {
      "параметр_key": {"grade": ОЦЕНКА_1_10, "value": "описание значения"},
      ...
    }
  },
  "prices": {"Название объекта": ЦИФРА_или_0},
  "links": {"Название объекта": "URL или пустая строка"},
  "recommendation": "Название лучшего объекта",
  "confidence": ЧИСЛО_1_10
}

ПРАВИЛА:
- weights параметров должны суммироваться к 100
- grade: 1-10 (10 = идеально)
- value: краткое текстовое описание/пояснение оценки
- Минимум 3 объекта, 5-10 параметров
- Каждый параметр должен быть конкретным и измеримым
- Если передана текущая таблица — УТОЧНИ её: исправь оценки, добавь пропущенное, но НЕ удаляй объекты/параметры без веской причины
- Добавь заключение: recommendation + confidence
`;

    const advisors = personas.filter(p => p.role !== 'editor');
    const editorPersona = personas.find(p => p.role === 'editor');
    const votes = [];
    const debug = [];
    let currentTable = null; // Running table state

    for (let i = 0; i < advisors.length; i++) {
        const persona = advisors[i];
        const t0 = Date.now();
        try {
            const isFirst = i === 0;
            let systemPrompt = persona.system_prompt;
            let userMsg = '';

            if (isFirst) {
                // First agent creates the initial draft
                systemPrompt += '\n\nТы ПЕРВЫЙ эксперт. Создай черновик таблицы выбора с нуля.';
                if (tableContext) systemPrompt += '\n\n' + tableContext;
                userMsg = `Задача: ${userQuestion}\n\n${TABLE_PROMPT_INSTRUCTIONS}\n\nСоздай таблицу выбора: определи объекты для сравнения, параметры, веса (сумма=100), оценки (1-10) и описания.`;
            } else {
                // Subsequent agents refine the table
                systemPrompt += '\n\nТы следующий эксперт в цепочке. Твоя задача — ПРОСМОТРЕТЬ таблицу выбора и УТОЧНИТЬ её со своей точки зрения.';
                if (tableContext) systemPrompt += '\n\n' + tableContext;
                const currentTableStr = JSON.stringify(currentTable, null, 2);
                userMsg = `Задача: ${userQuestion}\n\nТЕКУЩАЯ ТАБЛИЦА:\n${currentTableStr}\n\n${TABLE_PROMPT_INSTRUCTIONS}\n\nПросмотри текущую таблицу и уточни:\n1. Исправь оценки где не согласен (укажи почему)\n2. Добавь пропущенные параметры если есть\n3. Скорректируй веса если нужно\n4. Обнови recommendation и confidence\n5. Верни ПОЛНУЮ таблицу (не только изменения)`;
            }

            let response = null;
            if (persona.model) {
                response = await callModel(c.env, persona.model, systemPrompt, userMsg, persona.temperature);
            }
            if (!response) {
                response = await callWithChain(c.env, systemPrompt, userMsg, persona.temperature);
            }

            let parsedTable = parseTableJSON(response);
            // Retry once if first agent failed to produce a table
            if (!parsedTable && isFirst) {
                console.warn(`[Council] Agent ${persona.name} produced unparseable JSON, retrying...`);
                const retryResponse = await callWithChain(c.env, systemPrompt, userMsg, persona.temperature);
                const retryTable = parseTableJSON(retryResponse);
                if (retryTable) {
                    parsedTable = retryTable;
                    response = retryResponse;
                    debug.push({ persona: persona.name, model: 'chain-retry', ms: Date.now() - t0, status: 'recovered' });
                }
            }
            const parsedVote = parseVote(response);

            // Update running table state
            if (parsedTable && parsedTable.columns && parsedTable.objects) {
                currentTable = parsedTable;
            }

            votes.push({
                persona: persona.id,
                name: persona.name,
                emoji: persona.emoji,
                role: persona.role,
                weight: persona.weight,
                response: response.substring(0, 2000),
                recommendation: parsedTable?.recommendation || parsedVote.recommendation,
                confidence: parsedTable?.confidence || parsedVote.confidence,
                score: parsedVote.score,
            });

            debug.push({ persona: persona.name, model: 'chain', ms: Date.now() - t0, status: 'ok' });
        } catch (e) {
            debug.push({ persona: persona.name, ms: Date.now() - t0, status: 'fail', error: e.message });
        }
    }

    // Calculate consensus from final table + votes
    const recommendations = {};
    for (const v of votes) {
        if (v.recommendation) {
            recommendations[v.recommendation] = (recommendations[v.recommendation] || 0) + v.weight;
        }
    }
    const topRecommendation = Object.entries(recommendations).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Build Choser-format table from final state
    let choserTable = null;
    if (currentTable && currentTable.columns && currentTable.objects) {
        const cols = currentTable.columns;
        // Normalize weights to sum=100
        const totalW = cols.reduce((s, c) => s + (c.weight || 0), 0) || 1;
        const normalizedCols = cols.map(c => ({ ...c, weight: Math.round((c.weight / totalW) * 100) }));
        // Fix rounding to exactly 100
        const wSum = normalizedCols.reduce((s, c) => s + c.weight, 0);
        if (wSum !== 100 && normalizedCols.length > 0) normalizedCols[0].weight += (100 - wSum);

        const rows = Object.entries(currentTable.objects).map(([name, params]) => {
            const row = { id: 'dec_' + Math.random().toString(36).substr(2, 9), name };
            for (const col of normalizedCols) {
                const p = params[col.key] || params[col.title] || {};
                row[col.key] = {
                    grade: typeof p === 'object' ? (p.grade || 0) : (typeof p === 'number' ? p : 0),
                    value: typeof p === 'object' ? (p.value || String(p.grade || 0)) : String(p),
                };
            }
            row.price = (currentTable.prices?.[name]) || '';
            row.link = (currentTable.links?.[name]) || '';
            row.notes = '';
            // Calculate utility
            const c = calcChoser(row, normalizedCols);
            row._u = c.s;
            row._up = c.up;
            return row;
        });
        rows.sort((a, b) => (b._u || 0) - (a._u || 0));
        if (rows.length > 0 && rows[0]._u > 0) rows[0].name = '👑 ' + rows[0].name;
        choserTable = { columns: normalizedCols, rows };
    }

    // Editor summary
    let editorSummary = null;
    if (editorPersona && votes.length > 0) {
        try {
            const editorPrompt = editorPersona.system_prompt + '\n\nМнения экспертов:\n' +
                votes.map(v => `${v.emoji} ${v.name}: рекомендует ${v.recommendation || '—'} (уверенность ${v.confidence || '?'}/10)`).join('\n');
            editorSummary = await callWithChain(c.env, editorPrompt, 'Составь финальное резюме на основе мнений всех экспертов.', editorPersona.temperature);
        } catch (e) {
            debug.push({ persona: 'Editor', status: 'fail', error: e.message });
        }
    }

    return c.json({
        votes,
        consensus: {
            recommendation: topRecommendation,
            voteCount: votes.length,
            recommendations: Object.fromEntries(
                Object.entries(recommendations).sort((a, b) => b[1] - a[1])
            ),
        },
        editorSummary,
        choserTable,
        debug,
        ts: Date.now(),
    });
});

// --- LLM Helpers ---

async function callWithChain(env, systemPrompt, userMessage, temperature = 0.3) {
    // ZAI only — all other providers removed
    if (env.ZAI_API_KEY) {
        try { return await callZAI(env, systemPrompt, userMessage, temperature); } catch (e) { console.warn('[Council] ZAI fail:', e.message); throw e; }
    }
    throw new Error('No ZAI_API_KEY configured');
}

// callOpenRouter & callGroq removed — ZAI only

async function callZAI(env, systemPrompt, userMessage, temperature) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const t0 = Date.now();
    try {
        const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${env.ZAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'glm-5.1',
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
                temperature,
                max_tokens: 50000
            }),
            signal: controller.signal
        });
        if (!resp.ok) throw new Error(`ZAI HTTP ${resp.status}`);
        const data = await resp.json();
        const ms = Date.now() - t0;
        const tok = data.usage;
        console.log(`[LLM] ZAI OK in ${ms}ms, tokens: ${tok?.prompt_tokens || '?'}/${tok?.completion_tokens || '?'}`);
        return data.choices?.[0]?.message?.content || '';
    } finally {
        clearTimeout(timeout);
    }
}

async function callModel(env, modelId, systemPrompt, userMessage, temperature) {
    // ZAI only — all models route to ZAI GLM
    return await callZAI(env, systemPrompt, userMessage, temperature);
}

function parseTableJSON(text) {
    // Extract JSON from text (may contain markdown, prose, etc.)
    let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Try direct parse
    try { const p = JSON.parse(clean); if (p.columns || p.objects) return p; } catch(e) {}
    // Find first { ... last }
    const first = clean.indexOf('{');
    const last = clean.lastIndexOf('}');
    if (first !== -1 && last > first) {
        const slice = clean.substring(first, last + 1);
        try { const p = JSON.parse(slice); if (p.columns || p.objects) return p; } catch(e) {}
        // Repair: try to close truncated JSON
        try {
            let repaired = slice;
            // Count unclosed brackets
            let opens = 0, closeBrace = 0, closeBracket = 0;
            for (const ch of repaired) {
                if (ch === '{') opens++;
                if (ch === '}') closeBrace++;
                if (ch === '[') closeBracket++;
                if (ch === ']') closeBracket--;
            }
            // Remove trailing incomplete content after last complete value
            const lastComplete = repaired.search(/[,\s]+$/);
            if (lastComplete > 0) repaired = repaired.substring(0, lastComplete);
            // Close open strings
            const dq = (repaired.match(/(?<!\\)"/g) || []).length;
            if (dq % 2 !== 0) repaired += '"';
            // Close open brackets/braces
            let depth = 0, arrDepth = 0;
            for (const ch of repaired) {
                if (ch === '{') depth++;
                if (ch === '}') depth--;
                if (ch === '[') arrDepth++;
                if (ch === ']') arrDepth--;
            }
            repaired += ']'.repeat(Math.max(0, arrDepth));
            repaired += '}'.repeat(Math.max(0, depth));
            const p = JSON.parse(repaired);
            if (p.columns || p.objects) {
                console.log('[Council] JSON repaired from truncated response');
                return p;
            }
        } catch(e2) {
            console.warn('[Council] JSON repair failed:', e2.message);
        }
    }
    return null;
}

function parseVote(text) {
    let recommendation = null;
    let confidence = null;
    let score = null;

    // Extract RECOMMENDATION
    const recMatch = text.match(/РЕКОМЕНДАЦИЯ:\s*\[?([^\]\n]+)/i);
    if (recMatch) recommendation = recMatch[1].trim();
    // Also try JSON field
    if (!recommendation) {
        try {
            const j = parseTableJSON(text);
            if (j?.recommendation) recommendation = j.recommendation;
            if (j?.confidence) confidence = j.confidence;
        } catch {}
    }

    // Extract CONFIDENCE
    const confMatch = text.match(/УВЕРЕННОСТЬ:\s*\[?(\d+)/i);
    if (confMatch) confidence = parseInt(confMatch[1]);

    // Extract SCORE
    const scoreMatch = text.match(/SCORE:\s*\[?(\d+)/i);
    if (scoreMatch) score = parseInt(scoreMatch[1]);

    return { recommendation, confidence, score };
}

/**
 * Choser utility calculation — mirrors src/utils/calc.js
 */
function calcChoser(row, columns) {
    let totalWeight = 0;
    let weightedScore = 0;
    for (const col of columns) {
        const w = col.weight || 0;
        const cell = row[col.key];
        const grade = typeof cell === 'object' ? (cell?.grade || 0) : (typeof cell === 'number' ? cell : 0);
        weightedScore += grade * w;
        totalWeight += w;
    }
    const s = totalWeight > 0 ? Math.round(weightedScore / totalWeight * 100) / 10 : 0;
    const price = parseFloat(row.price) || 0;
    const up = price > 0 ? Math.round(s / price * 100) / 100 : 0;
    return { s, up };
}

export { council as councilRoutes };
