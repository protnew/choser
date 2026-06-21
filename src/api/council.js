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
        const count = db.prepare('SELECT COUNT(*) as c FROM council_personas').get();
        if (count.c === 0) {
            for (const p of DEFAULT_PERSONAS) {
                db.prepare(`
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
// Also: /personas (legacy alias for DecisionPage.jsx)
council.get('/council/personas', authMiddleware(), async (c) => {
    const db = c.get('db');
    if (!db) return c.json({ error: 'DB not available' }, 500);

    await ensureTable(db);

    const results = db.prepare(
        'SELECT * FROM council_personas ORDER BY sort_order ASC'
    ).all();

    return c.json({ personas: results });
});

// PUT /api/council/personas/:id — update persona
council.put('/council/personas/:id', authMiddleware(), async (c) => {
    const db = c.get('db');
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

    db.prepare(`UPDATE council_personas SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values).run();

    return c.json({ ok: true });
});

// POST /api/council/personas — create new persona
council.post('/council/personas', authMiddleware(), async (c) => {
    const db = c.get('db');
    if (!db) return c.json({ error: 'DB not available' }, 500);

    const body = await c.req.json();
    const id = body.id || `persona_${Date.now()}`;

    db.prepare(`
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
council.delete('/council/personas/:id', authMiddleware(), async (c) => {
    const db = c.get('db');
    if (!db) return c.json({ error: 'DB not available' }, 500);

    db.prepare('DELETE FROM council_personas WHERE id = ?')
        .bind(c.req.param('id')).run();

    return c.json({ ok: true });
});

// Legacy aliases (DecisionPage.jsx calls /personas without /council/)
council.get('/personas', authMiddleware(), async (c) => {
    const db = c.get('db');
    if (!db) return c.json({ error: 'DB not available' }, 500);
    await ensureTable(db);
    const results = db.prepare('SELECT * FROM council_personas ORDER BY sort_order ASC').all();
    return c.json({ personas: results });
});

council.put('/personas/:id', authMiddleware(), async (c) => {
    const db = c.get('db');
    if (!db) return c.json({ error: 'DB not available' }, 500);
    const { id } = c.req.param();
    const body = await c.req.json();
    const fields = []; const values = [];
    for (const [key, val] of Object.entries(body)) {
        const col = { name: 'name', role: 'role', enabled: 'enabled', sort_order: 'sort_order', model: 'model', temperature: 'temperature', system_prompt: 'system_prompt', weight: 'weight', emoji: 'emoji' }[key];
        if (col) { fields.push(`${col} = ?`); values.push(val); }
    }
    if (fields.length === 0) return c.json({ error: 'No valid fields' }, 400);
    fields.push("updated_at = datetime('now')"); values.push(id);
    db.prepare(`UPDATE council_personas SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    return c.json({ ok: true });
});

council.patch('/personas/:id', authMiddleware(), async (c) => {
    const db = c.get('db');
    if (!db) return c.json({ error: 'DB not available' }, 500);
    const { id } = c.req.param();
    const body = await c.req.json();
    const fields = []; const values = [];
    for (const [key, val] of Object.entries(body)) {
        const col = { name: 'name', role: 'role', enabled: 'enabled', sort_order: 'sort_order', model: 'model', temperature: 'temperature', system_prompt: 'system_prompt', weight: 'weight', emoji: 'emoji' }[key];
        if (col) { fields.push(`${col} = ?`); values.push(val); }
    }
    if (fields.length === 0) return c.json({ ok: true });
    fields.push("updated_at = datetime('now')"); values.push(id);
    db.prepare(`UPDATE council_personas SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    return c.json({ ok: true });
});

export { council as councilRoutes };
