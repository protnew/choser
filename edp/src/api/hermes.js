/**
 * Hermes Proxy API — proxy chat requests to Hermes AI
 */
import { Hono } from 'hono'
import { authMiddleware } from './auth.js'

export const hermesRoutes = new Hono()

// POST /hermes/chat — proxy to Hermes
hermesRoutes.post('/hermes/chat', authMiddleware(), async (c) => {
    const { message, history = [] } = await c.req.json();
    if (!message) return c.json({ error: 'message required' }, 400);

    const hermesUrl = process.env.HERMES_URL || 'http://host.docker.internal:9090';

    try {
        const messages = [
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: message }
        ];

        const resp = await fetch(`${hermesUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: process.env.HERMES_MODEL || 'hermes',
                messages,
                temperature: 0.7,
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            return c.json({ error: `Hermes HTTP ${resp.status}: ${text.substring(0, 200)}` });
        }

        const data = await resp.json();
        const response = data.choices?.[0]?.message?.content || 'Пустой ответ от Hermes';
        return c.json({ response, model: data.model, usage: data.usage });
    } catch (e) {
        // Fallback: try ZAI if Hermes unavailable
        console.warn('[Hermes proxy] Error:', e.message);
        try {
            const zaiUrl = process.env.ZAI_BASE_URL || 'https://open.bigmodel.cn/api/coding/paas/v4';
            const resp = await fetch(`${zaiUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.ZAI_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: process.env.ZAI_MODEL || 'GLM-5.1',
                    messages: [
                        { role: 'system', content: 'Ты — Hermes, AI-ассистент. Отвечай на русском языке.' },
                        { role: 'user', content: message }
                    ],
                    temperature: 0.7,
                }),
                signal: AbortSignal.timeout(30000),
            });
            const data = await resp.json();
            const response = data.choices?.[0]?.message?.content || 'Пустой ответ';
            return c.json({ response, model: data.model || 'ZAI fallback', usage: data.usage });
        } catch (e2) {
            return c.json({ error: `Hermes и ZAI недоступны: ${e.message}; ${e2.message}` });
        }
    }
});

// GET /hermes/status — check if Hermes is available
hermesRoutes.get('/hermes/status', authMiddleware(), async (c) => {
    const hermesUrl = process.env.HERMES_URL || 'http://host.docker.internal:9090';
    try {
        const resp = await fetch(`${hermesUrl}/v1/models`, { signal: AbortSignal.timeout(5000) });
        return c.json({ available: resp.ok, url: hermesUrl });
    } catch {
        return c.json({ available: false, url: hermesUrl, fallback: 'ZAI' });
    }
});
