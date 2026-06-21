/**
 * Council Persona Runner — LLM call, vote parsing, retry loop, validation, logging
 */
import { callWithChain, callModel } from '../llm/providers.js';
import { postValidateScores, buildCorrectionPrompt } from './councilPromptBuilder.js';
import { fetchWebSources } from './webSearch.js';

const MAX_RETRIES = 2; // max correction attempts

/**
 * Validate that scores have correct dimensions
 */
function validateDimensions(scores, expectedObjCount, expectedParamCount) {
    if (!scores || typeof scores !== 'object') return { ok: false, reason: 'no scores' };
    const objKeys = Object.keys(scores);
    if (objKeys.length === 0) return { ok: false, reason: 'empty scores' };

    // Check object count: allow 0 extra (strict upper bound)
    if (objKeys.length > expectedObjCount) {
        return { ok: false, reason: `${objKeys.length} objects (max ${expectedObjCount})` };
    }

    // Check param count per object: strict upper bound
    for (const obj of objKeys) {
        if (typeof scores[obj] !== 'object') continue;
        const paramKeys = Object.keys(scores[obj]);
        if (paramKeys.length > expectedParamCount) {
            return { ok: false, reason: `${obj}: ${paramKeys.length} params (max ${expectedParamCount})` };
        }
    }

    return { ok: true };
}

/**
 * Validate that response contains links if required
 */
function validateLinks(parsed, searchMode) {
    if (searchMode !== 'web' && searchMode !== 'deep') return { ok: true };
    if (!parsed.links || typeof parsed.links !== 'object' || Object.keys(parsed.links).length === 0) {
        return { ok: false, reason: 'Missing links/sources in web mode' };
    }
    return { ok: true };
}

async function runPersona(persona, opts) {
    const {
        topic, userQuestion, tableContext,
        nP, nO, trimmedObjNames, trimmedParamNames,
        userMsg, totalTokens, sendEvent, sendError,
        db, jobId, tokenBudget, searchMode = 'web',
    } = opts;

    const t0 = Date.now();
    const expectedObjCount = trimmedObjNames.length || nO;
    const expectedParamCount = trimmedParamNames.length || nP;
    console.log(`[runPersona] ${persona.emoji} ${persona.name}: expecting ${expectedObjCount}obj × ${expectedParamCount}param`);

    try {
        let systemPrompt = persona.system_prompt + '\n\n' + tableContext;

        if (searchMode === 'web' || searchMode === 'deep') {
            const searchQuery = topic ? `${topic} ${userQuestion || ''}`.trim() : (userQuestion || '');
            if (searchQuery) {
                const urls = await fetchWebSources(searchQuery, 5);
                if (urls.length > 0) {
                    systemPrompt += `\n\nВНИМАНИЕ! Для ответа ОБЯЗАТЕЛЬНО используй информацию из сети. Вот список актуальных источников (URLs), на которые ты должен опираться и указывать их в поле links:\n${urls.join('\n')}`;
                }
            }
        }

        // === ATTEMPT 1: initial prompt ===
        let response = null;
        let tokensUsed = { input: 0, output: 0 };

        if (persona.model) {
            const result = await callModel(process.env, persona.model, systemPrompt, userMsg, persona.temperature);
            if (result) {
                response = typeof result === 'string' ? result : result.text;
                tokensUsed = typeof result === 'string' ? { input: 0, output: 0 } : result.tokens;
            }
        }
        if (!response) {
            const result = await callWithChain(process.env, systemPrompt, userMsg, persona.temperature);
            if (result) {
                response = typeof result === 'string' ? result : result.text;
                tokensUsed = typeof result === 'string' ? { input: 0, output: 0 } : result.tokens;
            }
        }

        if (!response) {
            await sendError('No response from LLM for persona ' + persona.name);
            return null;
        }

        totalTokens.input += tokensUsed.input || 0;
        totalTokens.output += tokensUsed.output || 0;

        let parsed = parseVote(response);
        let validatedScores = postValidateScores(parsed.scores, nO, nP, trimmedObjNames, trimmedParamNames);

        // === RETRY LOOP: correct dimensions if wrong ===
        let attempts = 1;
        while (attempts <= MAX_RETRIES) {
            const dimCheck = validateDimensions(validatedScores, expectedObjCount, expectedParamCount);
            const linkCheck = validateLinks(parsed, searchMode);
            
            if (dimCheck.ok && linkCheck.ok) break;

            const failReason = !dimCheck.ok ? dimCheck.reason : linkCheck.reason;
            console.warn(`[runPersona] ${persona.name}: attempt ${attempts} failed check: ${failReason}`);

            let correctionPrompt = buildCorrectionPrompt(
                response, expectedObjCount, expectedParamCount, trimmedObjNames, trimmedParamNames
            );

            if (!linkCheck.ok) {
                correctionPrompt += `\nВНИМАНИЕ: Ты забыл указать ссылки на источники! Верни JSON с полем "links", содержащим URL-адреса, подтверждающие твои оценки.`;
            }

            try {
                const retryResult = await callWithChain(process.env, systemPrompt, correctionPrompt, 0.2);
                if (retryResult) {
                    const retryText = typeof retryResult === 'string' ? retryResult : retryResult.text;
                    response = retryText;
                    parsed = parseVote(retryText);
                    validatedScores = postValidateScores(parsed.scores, nO, nP, trimmedObjNames, trimmedParamNames);
                    tokensUsed = typeof retryResult === 'string' ? { input: 0, output: 0 } : retryResult.tokens;
                    totalTokens.input += tokensUsed.input || 0;
                    totalTokens.output += tokensUsed.output || 0;
                }
            } catch (retryErr) {
                console.warn(`[runPersona] ${persona.name}: retry ${attempts} error: ${retryErr.message}`);
            }
            attempts++;
        }

        // Final grade normalization
        if (validatedScores) {
            for (const obj of Object.keys(validatedScores)) {
                if (typeof validatedScores[obj] !== 'object') continue;
                for (const param of Object.keys(validatedScores[obj])) {
                    const val = validatedScores[obj][param];
                    if (typeof val === 'object' && val !== null) {
                        val.grade = Math.max(1, Math.min(10, Math.round(Number(val.grade) || 0)));
                    } else {
                        validatedScores[obj][param] = Math.max(1, Math.min(10, Math.round(Number(val) || 0)));
                    }
                }
            }
        }

        console.log(`[runPersona] ${persona.emoji} ${persona.name}: ${attempts} attempts, ${validatedScores ? Object.keys(validatedScores).length + 'obj' : 'NO SCORES'}`);

        const vote = {
            persona: persona.id,
            name: persona.name,
            emoji: persona.emoji,
            role: persona.role,
            weight: persona.weight,
            response: response,
            scores: validatedScores,
            recommendation: parsed.recommendation,
            confidence: parsed.confidence,
            score: parsed.score,
            prices: parsed.prices,
            links: parsed.links,
        };

        // Log to council_logs
        if (jobId) {
            try {
                db.prepare(`INSERT INTO council_logs (job_id, persona_name, persona_role, system_prompt, user_prompt, ai_response, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`).run(
                        jobId, persona.name, persona.role, systemPrompt, userMsg, response
                    );
            } catch (e) { console.warn('[runPersona] council_logs insert failed:', e.message); }
        }

        // Stream vote
        await sendEvent('vote', {
            persona: persona.id,
            name: persona.name,
            emoji: persona.emoji,
            response: response,
            scores: validatedScores,
            recommendation: parsed.recommendation,
            confidence: parsed.confidence,
            score: parsed.score,
            debug: {
                duration_ms: Date.now() - t0,
                tokens_in: totalTokens.input,
                tokens_out: totalTokens.output,
                attempts: attempts,
            }
        });

        return vote;
    } catch (e) {
        await sendError('Persona ' + persona.name + ' failed: ' + e.message);
        return null;
    }
}

function parseVote(text) {
    // Inline minimal parser to avoid circular import
    if (!text) return { recommendation: null, confidence: null, score: null, scores: null, prices: null, links: null };

    let parsed = null;

    // Try JSON extraction
    const strategies = [
        () => { const m = text.match(/```json\s*([\s\S]*?)\s*```/); if (m) return JSON.parse(m[1]); },
        () => { const m = text.match(/```\s*([\s\S]*?)\s*```/); if (m) return JSON.parse(m[1]); },
        () => { const f = text.indexOf('{'); const l = text.lastIndexOf('}'); if (f !== -1 && l > f) return JSON.parse(text.substring(f, l + 1)); },
    ];

    for (const fn of strategies) {
        if (parsed) break;
        try { parsed = fn(); } catch (_) {}
    }

    if (!parsed) return { recommendation: null, confidence: null, score: null, scores: null, prices: null, links: null };

    return {
        recommendation: parsed.recommendation || null,
        confidence: parsed.confidence != null ? Number(parsed.confidence) : null,
        score: parsed.score != null ? Number(parsed.score) : null,
        scores: parsed.scores && typeof parsed.scores === 'object' ? parsed.scores : null,
        prices: parsed.prices && typeof parsed.prices === 'object' ? parsed.prices : null,
        links: parsed.links && typeof parsed.links === 'object' ? parsed.links : null,
    };
}

export { runPersona };
