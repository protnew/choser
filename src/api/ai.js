import { Hono } from 'hono'
import { AI_SERVICE } from '../ai_service.js'
import { authMiddleware } from '../auth.js'

const ai = new Hono()

// --- AI: Generate Table ---
ai.post('/generate', authMiddleware, async (c) => {
    const { prompt, objCount, paramCount } = await c.req.json()

    try {
        const json = await AI_SERVICE.generateTable(c.env, prompt, objCount, paramCount)
        const _debug = json._debug || [];
        const _quality_score = json._quality_score ?? null;
        const _quality_details = json._quality_details || null;
        delete json._debug;
        delete json._model;
        delete json._quality_score;
        delete json._quality_details;
        delete json._repaired;
        delete json._repair_attempts;
        let dataObj = json;
        if (Array.isArray(json)) dataObj = { rows: json, title: prompt, columns: [] };

        let rows = dataObj.data || dataObj.rows || [];
        if (!Array.isArray(rows) && rows && rows.rows) rows = rows.rows;

        return c.json({ ...dataObj, rows: Array.isArray(rows) ? rows : [], _debug, _quality_score, _quality_details })
    } catch (e) {
        console.error('[API] /api/generate failed:', e.message);
        return c.json({ error: e.message, _debug: e._debug || [] }, 500)
    }
})

// --- AI: Refine Table ---
ai.post('/refine', authMiddleware, async (c) => {
    const { instruction, tableData } = await c.req.json()
    try {
        const table = await AI_SERVICE.refineTable(c.env, tableData, instruction)
        return c.json({ ...table, rows: table.data })
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- AI: Generate Similar Table ---
ai.post('/generate-similar', authMiddleware, async (c) => {
    const { id, topic, objCount, paramCount } = await c.req.json()
    const db = c.env.DB

    try {
        const sourceMeta = await db.prepare('SELECT * FROM tables WHERE id = ?').bind(id).first()
        if (!sourceMeta) throw new Error("Source table not found")

        const sourceColumns = await db.prepare('SELECT * FROM columns WHERE table_id = ?').bind(id).all()
        const fullSource = { ...sourceMeta, columns: sourceColumns.results }

        const json = await AI_SERVICE.generateSimilarTable(c.env, fullSource, topic, objCount, paramCount)
        return c.json(json)
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- AI: Auto-Update Row ---
ai.post('/auto-update-row', authMiddleware, async (c) => {
    const { rowData, columns, topic } = await c.req.json()

    if (!rowData || !columns) {
        return c.json({ error: 'rowData and columns are required' }, 400)
    }

    try {
        const updatedRow = await AI_SERVICE.autoUpdateRow(c.env, rowData, columns, topic)
        return c.json({ data: updatedRow })
    } catch (e) {
        console.error('[API] /api/auto-update-row failed:', e.message);
        return c.json({ error: e.message }, 500)
    }
})

// --- AI: Chat with table context (AI Advisor) ---
ai.post('/chat', authMiddleware, async (c) => {
    const { message, context_table_id } = await c.req.json()
    const db = c.env.DB

    if (!message) return c.json({ error: 'message обязателен' }, 400)

    let tableContext = ''
    if (context_table_id) {
        try {
            const table = await db.prepare('SELECT title, description FROM tables WHERE id = ?')
                .bind(context_table_id).first()
            if (table) {
                const colDef = await db.prepare('SELECT definition FROM columns WHERE table_id = ?')
                    .bind(context_table_id).first()
                const { results: rowsData } = await db.prepare('SELECT data FROM rows WHERE table_id = ? LIMIT 15')
                    .bind(context_table_id).all()

                const columns = colDef ? JSON.parse(colDef.definition) : []
                const rows = rowsData.map(r => JSON.parse(r.data))

                tableContext = `
Контекст — таблица "${table.title}":
Описание: ${table.description || 'нет'}
Параметры: ${columns.map(c => `${c.title} (вес: ${c.weight}%)`).join(', ')}
Данные (первые ${rows.length} строк): ${JSON.stringify(rows).substring(0, 8000)}
`
            }
        } catch (e) {
            console.warn(`[Chat] Failed to load context: ${e.message}`)
        }
    }

    const systemPrompt = `
Ты — AI-советник платформы Choser (матрицы принятия решений).
Отвечай кратко, по делу, на русском языке.
Если есть контекст таблицы — используй данные для ответа.
Можешь рекомендовать лучший выбор, объяснять оценки, предлагать улучшения.
${tableContext}
`

    try {
        // Используем самую быструю модель для чата
        if (c.env.GOOGLE_API_KEY) {
            const apiKey = c.env.GOOGLE_API_KEY
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\nВопрос пользователя: " + message }] }],
                    generationConfig: { temperature: 0.5 }
                })
            })

            if (!response.ok) throw new Error(`Gemini: HTTP ${response.status}`)

            const data = await response.json()
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Не удалось получить ответ'
            return c.json({ reply, model: 'gemini-2.5-flash' })
        }

        return c.json({ error: 'No AI provider configured for chat' }, 500)
    } catch (e) {
        console.error('[API] /api/chat failed:', e.message)
        return c.json({ error: e.message }, 500)
    }
})

export default ai
