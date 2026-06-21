/**
 * LLM Providers — unified provider routing for Choser Council
 * Extracted from councilDecide.js + councilStream.js (was duplicated)
 * 
 * Primary: Hermes agent inside container (127.0.0.1:9090)
 * Fallback: ZAI direct → OpenRouter → Groq
 */

const HERMES_URL = 'http://127.0.0.1:9090/v1/chat/completions';
const HERMES_KEY = 'hermes-choser-internal-2026';

// --- Provider detection ---

export function getProviderForModel(modelId) {
    if (modelId.includes('hermes')) return 'hermes';
    if (modelId.includes('openrouter') || modelId.includes('nemotron')) return 'openrouter';
    if (modelId.includes('groq') || modelId.includes('llama')) return 'groq';
    if (modelId.includes('glm') || modelId.includes('zai')) return 'zai';
    return 'hermes'; // default to hermes
}

// --- Hermes (internal agent) ---

export async function callHermes(env, systemPrompt, userMessage, temperature) {
    const resp = await fetch(HERMES_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${HERMES_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'hermes-agent',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
            temperature
        })
    });
    if (!resp.ok) throw new Error(`Hermes HTTP ${resp.status}`);
    const data = await resp.json();
    // Hermes wraps in OpenAI-compatible format, but may have nested response
    const content = data.choices?.[0]?.message?.content
        || data.output?.text
        || (typeof data.content === 'string' ? data.content : null);
    if (!content && data.error) throw new Error(data.error.message || 'Hermes error');
    return {
        text: content || '',
        tokens: { input: data.usage?.prompt_tokens || 0, output: data.usage?.completion_tokens || 0 }
    };
}

// --- External providers (fallbacks) ---

export async function callZAI(env, systemPrompt, userMessage, temperature) {
    const baseUrl = env.ZAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    const model = env.ZAI_MODEL || 'GLM-5.1';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
        const resp = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${env.ZAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
                temperature,
                max_tokens: 16000
            }),
            signal: controller.signal
        });
        if (!resp.ok) throw new Error(`ZAI HTTP ${resp.status}`);
        const data = await resp.json();
        const usage = data.usage || {};
        return {
            text: data.choices?.[0]?.message?.content || '',
            tokens: { input: usage.prompt_tokens || 0, output: usage.completion_tokens || 0 }
        };
    } finally {
        clearTimeout(timeout);
    }
}

export async function callOpenRouter(env, systemPrompt, userMessage, temperature) {
    const model = env.OPENROUTER_MODEL || 'z-ai/glm-4.5-air:free';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    try {
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
                temperature,
                max_tokens: 16000
            }),
            signal: controller.signal
        });
        if (!resp.ok) {
            const body = await resp.text().catch(() => '');
            throw new Error(`OpenRouter HTTP ${resp.status}: ${body.substring(0, 100)}`);
        }
        const data = await resp.json();
        const usage = data.usage || {};
        const msg = data.choices?.[0]?.message || {};
        // Handle reasoning models that put content in reasoning field
        const text = msg.content || msg.reasoning || '';
        return {
            text,
            tokens: { input: usage.prompt_tokens || 0, output: usage.completion_tokens || 0 }
        };
    } finally {
        clearTimeout(timeout);
    }
}

export async function callGroq(env, systemPrompt, userMessage, temperature) {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
            temperature
        })
    });
    if (!resp.ok) throw new Error(`Groq HTTP ${resp.status}`);
    const data = await resp.json();
    const usage = data.usage || {};
    return {
        text: data.choices?.[0]?.message?.content || '',
        tokens: { input: usage.prompt_tokens || 0, output: usage.completion_tokens || 0 }
    };
}

// --- Model router ---

export async function callModel(env, modelId, systemPrompt, userMessage, temperature) {
    // Always use chain for reliability (ZAI → OpenRouter → Hermes)
    return await callWithChain(env, systemPrompt, userMessage, temperature);
}

// --- Fallback chain: ZAI (primary) → Hermes → OpenRouter → Groq ---

export async function callWithChain(env, systemPrompt, userMessage, temperature = 0.3) {
    console.log(`[LLM] callWithChain starting, ZAI_KEY=${env.ZAI_API_KEY ? 'set(' + env.ZAI_API_KEY.substring(0,8) + '...)' : 'NOT SET'}, OR_KEY=${env.OPENROUTER_API_KEY ? 'set' : 'NOT SET'}`);

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // 1. ZAI (primary)
    if (env.ZAI_API_KEY) {
        try {
            const t0 = Date.now();
            const result = await callZAI(env, systemPrompt, userMessage, temperature);
            console.log(`[LLM] ZAI OK in ${Date.now() - t0}ms, tokens: ${result.tokens.input}/${result.tokens.output}`);
            return result;
        } catch (e) {
            console.warn('[LLM] ZAI fail:', e.message, '→ trying fallback');
        }
    }

    // 2. OpenRouter with retry (handles 429 rate limits)
    if (env.OPENROUTER_API_KEY) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const t0 = Date.now();
                const result = await callOpenRouter(env, systemPrompt, userMessage, temperature);
                console.log(`[LLM] OpenRouter OK (attempt ${attempt}) in ${Date.now() - t0}ms, tokens: ${result.tokens.input}/${result.tokens.output}`);
                return result;
            } catch (e) {
                const waitSec = Math.min(attempt * 12, 30);
                console.warn(`[LLM] OpenRouter fail (attempt ${attempt}): ${e.message} → retry in ${waitSec}s`);
                if (attempt < 3) await sleep(waitSec * 1000);
            }
        }
    }

    // 3. Hermes (internal agent)
    try {
        const t0 = Date.now();
        const result = await callHermes(env, systemPrompt, userMessage, temperature);
        console.log(`[LLM] Hermes OK in ${Date.now() - t0}ms`);
        return result;
    } catch (e) {
        console.warn('[LLM] Hermes fail:', e.message);
    }

    throw new Error('All LLM providers failed (ZAI → OpenRouter → Hermes)');
}

// --- Vote parser (extracted to parseVote.js) ---
export { parseVote } from './parseVote.js';
