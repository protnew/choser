/**
 * Council Personas API — CRUD for council personas
 */
import { Hono } from 'hono'
import { authMiddleware } from './auth.js'

export const councilPersonaRoutes = new Hono()

// Default personas (seeded on first GET if table empty)
const DEFAULT_PERSONAS = [
    {
        id: 'ceo', name: 'CEO', role: 'advisor', emoji: '👔',
        enabled: 1,
        sortOrder: 1, temperature: 0.3, weight: 1.2,
        model: 'GLM-5.1',
        systemPrompt: `Ты — CEO, член Совета директоров для анализа параметрических таблиц выбора. Таблица содержит объекты (строки) × параметры (столбцы) с весами коэффициентов. Оценивай: стратегическое соответствие бизнес-целям, конкурентное преимущество, ROI, масштабируемость. Формат ответа: СТРОГО JSON {"recommendation":"название лучшего объекта","confidence":1-10,"score":1-100,"reasoning":"..."}`
    },
    {
        id: 'cfo', name: 'CFO', role: 'advisor', emoji: '💰',
        enabled: 1,
        sortOrder: 2, temperature: 0.2, weight: 1.1,
        model: 'GLM-5.1',
        systemPrompt: `Ты — CFO, финансовый директор в Совете для анализа параметрических таблиц выбора. Оценивай: TCO, hidden costs, payback period, NPV, влияние на cash flow. Цена — не параметр оценки, а реальная стоимость использования. Эффективность = Полезность / Цена × 1000. Формат ответа: СТРОГО JSON {"recommendation":"название лучшего объекта","confidence":1-10,"score":1-100,"reasoning":"..."}`
    },
    {
        id: 'ciso', name: 'CISO', role: 'advisor', emoji: '🔒',
        enabled: 1,
        sortOrder: 3, temperature: 0.3, weight: 1.0,
        model: 'GLM-5.1',
        systemPrompt: `Ты — CISO в Совете для анализа параметрических таблиц выбора. Оценивай: data privacy, vendor lock-in, compliance, incident response, репутационные риски. Формат ответа: СТРОГО JSON {"recommendation":"название лучшего объекта","confidence":1-10,"score":1-100,"reasoning":"..."}`
    },
    {
        id: 'coo', name: 'COO', role: 'advisor', emoji: '🏗️',
        enabled: 1,
        sortOrder: 4, temperature: 0.3, weight: 1.0,
        model: 'GLM-5.1',
        systemPrompt: `Ты — COO в Совете для анализа параметрических таблиц выбора. Оценивай: SLA, время внедрения, операционные риски, масштабируемость операций. Формат ответа: СТРОГО JSON {"recommendation":"название лучшего объекта","confidence":1-10,"score":1-100,"reasoning":"..."}`
    },
    {
        id: 'legal', name: 'Юрисконсульт', role: 'advisor', emoji: '⚖️',
        enabled: 1,
        sortOrder: 5, temperature: 0.2, weight: 1.0,
        model: 'GLM-5.1',
        systemPrompt: `Ты — Главный юрисконсульт в Совете для анализа параметрических таблиц выбора. Оценивай: правовые риски, лицензирование, GDPR/ФЗ-152, штрафы, limitation of liability. Формат ответа: СТРОГО JSON {"recommendation":"название лучшего объекта","confidence":1-10,"score":1-100,"reasoning":"..."}`
    },
    {
        id: 'chro', name: 'CHRO', role: 'advisor', emoji: '👥',
        enabled: 1,
        sortOrder: 6, temperature: 0.3, weight: 0.9,
        model: 'GLM-5.1',
        systemPrompt: `Ты — CHRO в Совете для анализа параметрических таблиц выбора. Оценивай: влияние на команду, обучение, change management, стоимость найма. Формат ответа: СТРОГО JSON {"recommendation":"название лучшего объекта","confidence":1-10,"score":1-100,"reasoning":"..."}`
    },
    {
        id: 'tech', name: 'CTO', role: 'advisor', emoji: '⚙️',
        enabled: 1,
        sortOrder: 7, temperature: 0.4, weight: 1.0,
        model: 'GLM-5.1',
        systemPrompt: `Ты — CTO в Совете для анализа параметрических таблиц выбора. Оценивай: архитектуру, интеграции, API, масштабируемость, технический долг, CI/CD. Формат ответа: СТРОГО JSON {"recommendation":"название лучшего объекта","confidence":1-10,"score":1-100,"reasoning":"..."}`
    },
    {
        id: 'user_advocate', name: 'User Advocate', role: 'advisor', emoji: '👤',
        enabled: 1,
        sortOrder: 8, temperature: 0.5, weight: 0.9,
        model: 'GLM-5.1',
        systemPrompt: `Ты — Advocate пользователя в Совете для анализа параметрических таблиц выбора. Оценивай: UX, обучаемость, документацию, community. Учитывай perspective конечных пользователей. Формат ответа: СТРОГО JSON {"recommendation":"название лучшего объекта","confidence":1-10,"score":1-100,"reasoning":"..."}`
    },
    {
        id: 'critic', name: 'Критик', role: 'critic', emoji: '🎭',
        enabled: 1,
        sortOrder: 9, temperature: 0.6, weight: 0.8,
        model: 'GLM-5.1',
        systemPrompt: `Ты — Критик (Devil's Advocate) в Совете для анализа параметрических таблиц выбора. Найди слабые места, скрытые риски, слишком оптимистичные допущения. Оспаривай рекомендации других. Формат ответа: СТРОГО JSON {"recommendation":"название лучшего объекта","confidence":1-10,"score":1-100,"reasoning":"..."}`
    },
    {
        id: 'editor', name: 'Редактор', role: 'editor', emoji: '📝',
        enabled: 1,
        sortOrder: 10, temperature: 0.2, weight: 0.5,
        model: 'GLM-5.1',
        systemPrompt: `Ты — Редактор, генеральный секретарь Совета для анализа параметрических таблиц выбора. Синтезируй мнения всех экспертов в финальное резюме: 1) главная рекомендация, 2) аргументы «за», 3) аргументы «против», 4) условия реализации, 5) вердикт. Не более 200 слов.`
    }
]

/**
 * Ensure council_personas table exists and is seeded
 */
export async function ensureTable(db) {
    try {
        db.exec(`
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

// GET /council/personas — list all personas
councilPersonaRoutes.get('/council/personas', authMiddleware(), async (c) => {
    const db = c.get('db');
    if (!db) return c.json({ error: 'DB not available' }, 500);

    await ensureTable(db);

    const results = db.prepare(
        'SELECT * FROM council_personas ORDER BY sort_order ASC'
    ).all();

    return c.json({ personas: results });
});

// PUT /council/personas/reorder — MUST be before /:id route
 councilPersonaRoutes.put('/council/personas/reorder', authMiddleware(), async (c) => {
     const db = c.get('db');
     if (!db) return c.json({ error: 'DB not available' }, 500);

     const { order } = await c.req.json();
     if (!Array.isArray(order)) return c.json({ error: 'order must be array' }, 400);

     const stmt = db.prepare('UPDATE council_personas SET sort_order = ? WHERE id = ?');
     const tx = db.transaction((items) => {
         for (let i = 0; i < items.length; i++) {
             stmt.run(i + 1, items[i]);
         }
     });
     tx(order);

     return c.json({ ok: true, order });
 });

// PUT /council/personas/:id
councilPersonaRoutes.put('/council/personas/:id', authMiddleware(), async (c) => {
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

// POST /council/personas — create new persona
councilPersonaRoutes.post('/council/personas', authMiddleware(), async (c) => {
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

// DELETE /council/personas/:id
councilPersonaRoutes.delete('/council/personas/:id', authMiddleware(), async (c) => {
    const db = c.get('db');
    if (!db) return c.json({ error: 'DB not available' }, 500);

    db.prepare('DELETE FROM council_personas WHERE id = ?')
        .bind(c.req.param('id')).run();

    return c.json({ ok: true });
});

// POST /council/personas/reset — delete all and re-seed defaults
councilPersonaRoutes.post('/council/personas/reset', authMiddleware(), async (c) => {
    const db = c.get('db');
    if (!db) return c.json({ error: 'DB not available' }, 500);

    db.exec('DELETE FROM council_personas');

    for (const p of DEFAULT_PERSONAS) {
        db.prepare(`
            INSERT INTO council_personas (id, name, role, enabled, sort_order, model, temperature, system_prompt, weight, emoji, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(p.id, p.name, p.role, 1, p.sortOrder, p.model, p.temperature, p.systemPrompt, p.weight, p.emoji).run();
    }

    return c.json({ ok: true, count: DEFAULT_PERSONAS.length });
});
