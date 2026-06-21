/**
 * Shared helpers: JSON extraction, smart repair, critique
 */
import { TableSaveSchema } from '../schema/matrix.js';
import { rawCallZAI } from './callers.js';

export function extractJSON(text, allowThrow = true) {
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleanText); } catch (e) { }

    if (!parsed) {
        const firstOpen = cleanText.indexOf('{');
        const lastClose = cleanText.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose > firstOpen) {
            cleanText = cleanText.substring(firstOpen, lastClose + 1);
            try { parsed = JSON.parse(cleanText); } catch (e) { }
        }
    }

    if (!parsed && allowThrow) throw new Error("Invalid JSON syntax");
    if (!parsed) return null;

    if (allowThrow) {
        const result = TableSaveSchema.partial({ id: true, state: true }).safeParse(parsed);
        if (!result.success) {
            const errText = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            throw new Error("Zod Schema Error: " + errText);
        }
    }
    return parsed;
}

export async function smartRepair(env, malformedJSON, initialError) {
    console.warn(`[AI] Smart Repair. Error: ${initialError}`);
    let currentJSON = malformedJSON;
    let currentError = initialError;
    const maxAttempts = 5;

    const squad = [
        { provider: 'ZAI', model: 'glm-5.1', fn: rawCallZAI },
        { provider: 'ZAI', model: 'glm-4.5-air', fn: rawCallZAI }
    ];

    for (let i = 0; i < maxAttempts; i++) {
        const agent = squad[i % squad.length];
        if (agent.provider === 'OpenRouter' && !env.OPENROUTER_API_KEY) continue;
        if (agent.provider === 'Groq' && !env.GROQ_API_KEY) continue;
        if (agent.provider === 'ZAI' && !env.ZAI_API_KEY) continue;

        console.log(`[AI] Repair ${i + 1}/${maxAttempts} via ${agent.provider} (${agent.model})...`);
        const repairPrompt = `You are a JSON Syntax Repair Agent.\nInput JSON has syntax errors: "${currentError}".\nFIX the JSON. Return ONLY raw JSON. No markdown.\nStart with { and end with }.\n\nBroken JSON:\n${currentJSON.substring(0, 10000)}`;

        try {
            const fixedText = await agent.fn(env, agent.model, repairPrompt, currentJSON);
            try {
                const cleanResult = extractJSON(fixedText);
                console.log(`[AI] Repair ${i + 1} SUCCESS!`);
                cleanResult._repaired = true;
                cleanResult._repair_attempts = i + 1;
                return cleanResult;
            } catch (parseErr) {
                if (fixedText && fixedText.length > 10) { currentJSON = fixedText; currentError = parseErr.message; }
            }
        } catch (apiErr) {
            console.error(`[AI] Repair ${i + 1} API error: ${apiErr.message}`);
        }
    }
    throw new Error(`Smart Repair failed after ${maxAttempts} attempts.`);
}

export async function critiqueTable(env, tableJSON) {
    const critiquePrompt = `You are a strict QA Critic for Choser comparison tables.\nEvaluate on 100-point scale.\n\n7 criteria:\n1. data_completeness (20%) — All cells filled?\n2. description_depth (20%) — Specific facts/numbers?\n3. grade_consistency (15%) — Grades match descriptions?\n4. data_relevance (15%) — Relevant params/objects?\n5. objectivity (10%) — Balanced evaluation?\n6. weight_balance (10%) — Weights sum to 100%?\n7. title_quality (10%) — Informative title?\n\nReturn JSON: {"overall_score":0-100,"criteria":{...},"suggestions":[...]}\noverall_score = SUM(criteria[i].score * criteria[i].weight / 100)\nBe STRICT.`;

    const tableStr = JSON.stringify(tableJSON).substring(0, 15000);
    let critiqueText = null;

    if (env.OPENROUTER_API_KEY) {
        try { critiqueText = await rawCallOpenRouter(env, 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', critiquePrompt, `Evaluate:\n${tableStr}`, { temperature: 0.1 }); } catch (e) { }
    }
    if (!critiqueText && env.ZAI_API_KEY) {
        try { critiqueText = await rawCallZAI(env, 'glm-5.1', critiquePrompt, `Evaluate:\n${tableStr}`, { temperature: 0.1 }); } catch (e) { }
    }
    if (!critiqueText && env.GROQ_API_KEY) {
        try { critiqueText = await rawCallGroq(env, 'llama-3.3-70b-versatile', critiquePrompt, `Evaluate:\n${tableStr}`, { temperature: 0.1 }); } catch (e) { }
    }
    if (!critiqueText) throw new Error('No AI provider for critique');

    const critique = extractJSON(critiqueText);
    if (typeof critique.overall_score !== 'number' || critique.overall_score < 0 || critique.overall_score > 100) {
        let sum = 0;
        if (critique.criteria) Object.values(critique.criteria).forEach(c => { sum += (c.score || 0) * (c.weight || 0) / 100; });
        critique.overall_score = Math.round(sum);
    }
    return critique;
}
