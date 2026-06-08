/**
 * Low-level raw API calls to AI providers.
 * Each returns raw text response.
 */

export async function rawCallOpenRouter(env, model, systemMsg, userMsg, generationConfig = {}) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://choser.org',
            'X-Title': 'Choser Engine'
        },
        body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemMsg }, { role: "user", content: userMsg }],
            temperature: generationConfig.temperature || 0.3,
            max_tokens: generationConfig.max_tokens || generationConfig.max_completion_tokens || 4096
        })
    });
    if (!response.ok) {
        const errText = await response.text();
        if (response.status === 429) throw new Error(`OpenRouter rate-limited: ${errText}`);
        throw new Error(`OpenRouter HTTP ${response.status}: ${errText}`);
    }
    const data = await response.json();
    if (!data.choices?.[0]) throw new Error('OpenRouter: empty response');
    return data.choices[0].message.content;
}

export async function rawCallZAI(env, model, systemMsg, userMsg, generationConfig = {}) {
    const baseUrl = env.ZAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.ZAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemMsg }, { role: "user", content: userMsg }],
            temperature: generationConfig.temperature || 0.3,
            max_tokens: generationConfig.max_tokens || 4096
        })
    });
    if (!response.ok) throw new Error(`ZAI HTTP ${response.status}: ${await response.text()}`);
    const data = await response.json();
    if (!data.choices?.[0]) throw new Error('ZAI: empty response');
    return data.choices[0].message.content;
}

export async function rawCallGroq(env, model, systemMsg, userMsg, generationConfig = {}) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemMsg }, { role: "user", content: userMsg }],
            temperature: generationConfig.temperature || 0.3,
            max_completion_tokens: generationConfig.max_completion_tokens || 4096,
            response_format: generationConfig.response_format || { type: "text" }
        })
    });
    if (!response.ok) throw new Error(`Groq HTTP ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return data.choices[0].message.content;
}

export async function rawCallGemini(env, model, systemMsg, userMsg, generationConfig = {}) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GOOGLE_API_KEY}`;
    const payload = {
        contents: [{ role: "user", parts: [{ text: systemMsg + (userMsg ? "\n\n" + userMsg : "") }] }],
        generationConfig: {
            temperature: generationConfig.temperature || 0.3,
            responseMimeType: generationConfig.responseMimeType || "text/plain"
        }
    };
    const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}: ${await response.text()}`);
    const data = await response.json();
    if (!data.candidates?.[0]?.content) throw new Error("No Gemini candidates");
    return data.candidates[0].content.parts[0].text;
}
