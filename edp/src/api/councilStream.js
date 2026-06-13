/**
 * Council Stream API — SSE streaming version of council decide
 * Streams each persona's vote as it arrives via Server-Sent Events.
 * v3: Fixed numParams, tableContext trimming, timeout protection, council_logs, post-validation
 *
 * Refactored: prompt building → councilPromptBuilder.js, persona running → councilPersonaRunner.js
 */
import { Hono } from 'hono'
import { authMiddleware } from './auth.js'
import { ensureTable } from './councilPersonas.js'
import { stream } from 'hono/streaming'
import { getCouncilTemplate, applyTemplate } from '../council/templates.js'
import { buildTableFromVotes } from './councilTableBuilder.js'
import { buildPrompt, buildTableContext } from './councilPromptBuilder.js'
import { runPersona } from './councilPersonaRunner.js'

const COUNCIL_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_TOKENS_PER_COUNCIL = 1000000;
const MAX_DURATION_SEC = 30 * 60;
const DEFAULT_TOKEN_BUDGET = 80000; // 80K tokens per persona

export const councilStreamRoutes = new Hono()

// GET /council/templates — list available council templates
councilStreamRoutes.get('/council/templates', async (c) => {
    const { COUNCIL_TEMPLATES } = await import('../council/templates.js');
    return c.json({ templates: Object.values(COUNCIL_TEMPLATES) });
})

// POST /council/decide-stream — SSE streaming version of council decide
councilStreamRoutes.post('/council/decide-stream', authMiddleware(), async (c) => {
    const db = c.get('db');
    if (!db) return c.json({ error: 'DB not available' }, 500);

    let body;
    try { body = await c.req.json(); } catch (e) { return c.json({ error: 'Invalid JSON body' }, 400); }

    // FIX: Accept both numParams (from frontend) and numParameters (legacy)
    const { tableId, topic, question, mode: reqMode, numParams, numParameters, numObjects, personaIds, searchMode: rawSearchMode, templateId } = body;
    // B1 FIX: map frontend modes to backend modes: 'single'|'multi' → 'web', 'none' → 'memory'
    const searchMode = (!rawSearchMode || rawSearchMode === 'none' || rawSearchMode === 'memory') ? 'memory' : 'web';
    const effectiveNumParams = numParams || numParameters || 5;
    const effectiveNumObjects = numObjects || 3;
    const template = getCouncilTemplate(templateId);

    if (!tableId && !topic) return c.json({ error: 'tableId or topic required' }, 400);

    await ensureTable(db);

    // Load table context — with trimming (extracted to councilPromptBuilder)
    const { tableContext, trimmedObjNames, trimmedParamNames } = buildTableContext(db, tableId, effectiveNumParams, effectiveNumObjects);

    // Read weights from DB table for weighted scoring
    let tableWeights = {};
    if (tableId) {
        try {
            const wRow = db.prepare('SELECT weights FROM tables WHERE id = ?').bind(tableId).get();
            if (wRow?.weights) tableWeights = JSON.parse(wRow.weights);
            // Fallback: read from columns definition
            if (Object.keys(tableWeights).length === 0) {
                const colDef = db.prepare('SELECT definition FROM columns WHERE table_id = ?').bind(tableId).get();
                if (colDef) {
                    for (const col of JSON.parse(colDef.definition)) {
                        if (col.title && col.weight) tableWeights[col.title] = col.weight;
                    }
                }
            }
        } catch (e) { console.warn('[CouncilStream] Weights read failed:', e.message); }
    }

    // Load personas
    let personas = db.prepare('SELECT * FROM council_personas WHERE enabled = 1 ORDER BY sort_order ASC').all();
    if (personaIds && Array.isArray(personaIds) && personaIds.length > 0) {
        const idSet = new Set(personaIds);
        personas = personas.filter(p => idSet.has(p.id));
    }
    if (personas.length === 0) return c.json({ error: 'No enabled personas' }, 400);

    const userQuestion = question || 'Какой объект лучший выбор? Обоснуй.';
    const mode = reqMode || 'sequential';
    const nP = effectiveNumParams;
    const nO = effectiveNumObjects;

    // PRE-FLIGHT: estimate tokens and duration
    const tokensPerPersona = Math.max(nP * nO * 80 + 2000, 3000); // ~80 tokens per cell + overhead
    const estimatedTokens = personas.length * tokensPerPersona;
    const estimatedDurationSec = mode === 'parallel'
        ? Math.ceil(personas.length * 30 / Math.min(personas.length, 4)) // parallel: bottleneck = 4 concurrent
        : personas.length * 35 + (personas.length - 1) * 3; // sequential: 35s per persona + 3s delay
    const overTokenLimit = estimatedTokens > MAX_TOKENS_PER_COUNCIL;
    const overTimeLimit = estimatedDurationSec > MAX_DURATION_SEC;

    if (overTokenLimit || overTimeLimit) {
        return c.json({
            error: 'Council too expensive',
            estimated_tokens: estimatedTokens,
            estimated_duration_sec: estimatedDurationSec,
            token_limit: MAX_TOKENS_PER_COUNCIL,
            duration_limit: MAX_DURATION_SEC,
            suggestion: `Reduce personas (${personas.length}→${Math.min(3, personas.length)}) or parameters (${nP}→3) or objects (${nO}→2)`
        }, 400);
    }

    // Create council_job for tracking (BUG-2 fix)
    let jobId = null;
    try {
        const jobResult = db.prepare(`INSERT INTO council_jobs (topic, status, alternatives, criteria, created_at)
            VALUES (?, 'running', ?, ?, datetime('now'))`).run(
                topic || 'stream-council',
                JSON.stringify(trimmedObjNames),
                JSON.stringify(trimmedParamNames)
            );
        jobId = jobResult.lastInsertRowid;
    } catch (e) { console.warn('[CouncilStream] council_jobs insert failed:', e.message); }

    // SSE headers
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    c.header('X-Accel-Buffering', 'no');

    return stream(c, async (s) => {
        console.log(`[CouncilStream] SSE stream started: ${personas.length} personas, mode=${mode}, nP=${nP}, nO=${nO}, searchMode=${searchMode}`);
        const votes = [];
        let totalTokens = { input: 0, output: 0 };
        let timedOut = false;

        const sendEvent = async (event, data) => {
            await s.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n');
        };
        const sendError = async (message) => {
            await sendEvent('error', { message });
        };

        // Timeout protection — wrap entire council run
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                timedOut = true;
                reject(new Error('Council timeout after ' + Math.round(COUNCIL_TIMEOUT_MS / 1000) + 's'));
            }, COUNCIL_TIMEOUT_MS);
        });

        // Wrapper to call runPersona with all needed opts
        const runPersonaWithOpts = async (persona) => {
            if (timedOut) return null;

            const tokenBudget = body.tokenBudget || DEFAULT_TOKEN_BUDGET;
            const userMsg = applyTemplate(
                buildPrompt(persona, topic || userQuestion, userQuestion, tableContext, nP, nO, trimmedObjNames, trimmedParamNames, tokenBudget),
                template
            );

            const vote = await runPersona(persona, {
                topic, userQuestion, tableContext,
                nP, nO, trimmedObjNames, trimmedParamNames,
                userMsg, totalTokens, sendEvent, sendError,
                db, jobId, tokenBudget,
                searchMode,
            });

            if (vote) votes.push(vote);
            return vote;
        };

        try {
            const councilRun = async () => {
                if (mode === 'parallel') {
                    await Promise.all(personas.map(p => runPersonaWithOpts(p)));
                } else {
                    for (const persona of personas) {
                        if (timedOut) break;
                        await runPersonaWithOpts(persona);
                        // Rate limit delay between sequential agents
                        await new Promise(r => setTimeout(r, 3000));
                    }
                }

                // === AUTO-GENERATE TABLE FROM ALL VOTES ===
                const tableData = buildTableFromVotes(votes, nO, nP, tableWeights);
                if (tableData) {
                    // CHECK COMPLETENESS: warn if empty cells
                    const emptyCells = [];
                    for (const obj of tableData.objects) {
                        for (const param of tableData.parameters) {
                            const cell = obj.scores[param.name];
                            if (!cell || cell.grade === 0 || cell.value === '—') {
                                emptyCells.push(`${obj.name}/${param.name}`);
                            }
                        }
                    }
                    if (emptyCells.length > 0) {
                        await sendEvent('warning', {
                            type: 'incomplete_table',
                            empty_cells: emptyCells,
                            total_cells: tableData.objects.length * tableData.parameters.length,
                            fill_rate: Math.round((1 - emptyCells.length / (tableData.objects.length * tableData.parameters.length)) * 100) + '%',
                            message: `${emptyCells.length} ячеек не заполнены: ${emptyCells.slice(0, 5).join(', ')}${emptyCells.length > 5 ? '...' : ''}`
                        });
                    }
                    await sendEvent('table', tableData);
                    console.log(`[CouncilStream] ✅ Sent table SSE: ${tableData.objects.length} rows × ${tableData.parameters.length} cols, empty=${emptyCells.length}`);
                } else {
                    console.log(`[CouncilStream] ⚠️ No table data — votes had no parseable scores`);
                }

                // === RECOMMENDATIONS ===
                if (tableData) {
                    const currentObj = tableData.objects.length;
                    const currentParam = tableData.parameters.length;
                    // Market benchmarks for ideal table size
                    const idealObj = Math.min(currentObj + 3, 10);
                    const idealParam = Math.min(currentParam + 2, 8);
                    const suggestions = [];
                    if (currentObj < 5) suggestions.push(`Объектов ${currentObj} — для полной картины желательно ${idealObj}`);
                    if (currentParam < 5) suggestions.push(`Параметров ${currentParam} — для объективной оценки желательно ${idealParam}`);
                    if (suggestions.length > 0) {
                        await sendEvent('recommendation', {
                            type: 'table_improvement',
                            current: { objects: currentObj, parameters: currentParam },
                            suggested: { objects: idealObj, parameters: idealParam },
                            suggestions,
                            token_estimate: idealObj * idealParam * 80 * personas.length,
                        });
                    }
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

                await sendEvent('consensus', {
                    score: consensusScore,
                    recommendation: topRecommendation,
                    votes: votes.length,
                    recommendations: Object.fromEntries(
                        Object.entries(recommendations).sort((a, b) => b[1] - a[1])
                    ),
                });

                // Done
                await sendEvent('done', {
                    totalTokens,
                    meta: {
                        provider: 'zai',
                        model: process.env.ZAI_MODEL || 'GLM-5.1',
                        personas_count: personas.length,
                        mode,
                    }
                });

                // Mark job as completed
                if (jobId) {
                    try {
                        db.prepare(`UPDATE council_jobs SET status = 'completed', completed_at = datetime('now') WHERE id = ?`).run(jobId);
                    } catch (e) { console.warn('[CouncilStream] job complete update failed:', e.message); }
                }
            };

            // Run with timeout protection (BUG-2 fix)
            await Promise.race([councilRun(), timeoutPromise]);

        } catch (e) {
            await sendError('Council stream failed: ' + e.message);
            // Mark job as failed on timeout/error
            if (jobId) {
                try {
                    db.prepare(`UPDATE council_jobs SET status = 'failed', error = ?, completed_at = datetime('now') WHERE id = ?`).run(e.message, jobId);
                } catch (_) {}
            }
        }
    });
});
