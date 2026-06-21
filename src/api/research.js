import { Hono } from 'hono'

const router = new Hono()

// In-memory research jobs
const jobs = new Map()

/**
 * Call LLM to research a topic and extract comparison objects
 */
async function researchViaLLM(topic, phase, previousFindings = []) {
    const systemPrompt = `Ты — аналитик-исследователь. Твоя задача — найти реальные объекты для сравнения по заданной теме.
Формат ответа: СТРОГО JSON массив, каждый элемент — объект с полями:
- name: название (строка)
- description: краткое описание 1-2 предложения
- url: ссылка на источник (если известна) или пустая строка
- price: цена или диапазон цен (строка, например "50000-80000 руб")
- pros: плюсы, через запятую (строка)
- cons: минусы, через запятую (строка)

ВАЖНО: Найди МИНИМУМ 5 РЕАЛЬНЫХ объектов. Если не уверен в точной цене — укажи приблизительную с пометкой "~".
Ответ — ТОЛЬКО JSON массив, без markdown, без пояснений.`

    const phasePrompts = {
        1: `Найди самые популярные и актуальные объекты по теме "${topic}". Это обзорная фаза — нужны самые известные варианты.`,
        2: `Углубись в тему "${topic}". Найди менее очевидные, но качественные варианты, которые могли быть упущены.${previousFindings.length > 0 ? ` Уже найдены: ${previousFindings.map(f => f.name).join(', ')}. Найди ДРУГИЕ, не повторяйся.` : ''}`,
        3: `Верифицируй и дополни данные по теме "${topic}". Найди специализированные/премиум/бюджетные варианты.${previousFindings.length > 0 ? ` Уже найдены: ${previousFindings.map(f => f.name).join(', ')}. Найди ДРУГИЕ.` : ''}`
    }

    // Try LLM providers
    const providers = []

    // ZAI (GLM)
    if (process.env.ZAI_API_KEY) {
        providers.push(async () => {
            const resp = await fetch('https://open.bigmodel.cn/api/coding/paas/v4/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.ZAI_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: process.env.ZAI_MODEL || 'GLM-5.1',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: phasePrompts[phase] }
                    ],
                    temperature: 0.4
                })
            })
            if (!resp.ok) throw new Error(`ZAI HTTP ${resp.status}`)
            const data = await resp.json()
            return { text: data.choices?.[0]?.message?.content || '', provider: 'zai' }
        })
    }

    // OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
        providers.push(async () => {
            const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'hermes-3-llama-3.1-405b:free',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: phasePrompts[phase] }
                    ],
                    temperature: 0.4
                })
            })
            if (!resp.ok) throw new Error(`OpenRouter HTTP ${resp.status}`)
            const data = await resp.json()
            return { text: data.choices?.[0]?.message?.content || '', provider: 'openrouter' }
        })
    }

    for (const fn of providers) {
        try {
            const result = await fn()
            if (result.text) {
                // Parse JSON from response — handle markdown wrapping
                let jsonStr = result.text.trim()
                if (jsonStr.startsWith('```')) {
                    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
                }
                const objects = JSON.parse(jsonStr)
                if (Array.isArray(objects) && objects.length > 0) {
                    return objects.map(obj => ({
                        name: obj.name || 'Без названия',
                        description: obj.description || '',
                        url: obj.url || '',
                        price: obj.price || '',
                        pros: obj.pros || '',
                        cons: obj.cons || '',
                        source: `LLM (${result.provider}), фаза ${phase}`
                    }))
                }
            }
        } catch (e) {
            console.error(`[Research] LLM provider failed:`, e.message)
        }
    }

    throw new Error('Все LLM провайдеры недоступны')
}

// POST /research/start — start a deep research job
router.post('/research/start', async (c) => {
    const { topic, depth = 3 } = await c.req.json().catch(() => ({}))
    if (!topic || !topic.trim()) {
        return c.json({ error: 'Укажите тему исследования' }, 400)
    }

    const jobId = 'res_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const phases = ['Обзор', 'Углубление', 'Верификация']
    const actualDepth = Math.min(depth, 3)

    const steps = []
    for (let p = 0; p < actualDepth; p++) {
        steps.push({
            phase: p + 1,
            label: phases[p],
            icon: ['🔍', '🔬', '✅'][p],
            status: 'pending',
            objects: []
        })
    }

    const job = {
        id: jobId,
        topic: topic.trim(),
        depth: actualDepth,
        status: 'running',
        steps,
        created: Date.now(),
        table_id: null
    }

    jobs.set(jobId, job)

    // Run research asynchronously — phase by phase
    ;(async () => {
        try {
            for (let p = 0; p < actualDepth; p++) {
                job.steps[p].status = 'running'

                const previousFindings = job.steps.slice(0, p).flatMap(s => s.objects)
                const objects = await researchViaLLM(job.topic, p + 1, previousFindings)

                job.steps[p].objects = objects
                job.steps[p].status = 'completed'
            }
            job.status = 'completed'
        } catch (e) {
            console.error('[Research] Job failed:', e.message)
            job.status = 'failed'
            job.error = e.message
        }
    })()

    return c.json({
        job_id: jobId,
        status: 'running',
        steps: steps.map(s => ({ ...s, objects: undefined, count: s.objects.length }))
    })
})

// GET /research/:id/status — poll job status
router.get('/research/:id/status', async (c) => {
    const { id } = c.req.param()
    const job = jobs.get(id)

    if (!job) {
        return c.json({ error: 'Исследование не найдено' }, 404)
    }

    return c.json({
        status: job.status,
        error: job.error || null,
        steps: job.steps.map(s => ({
            phase: s.phase,
            label: s.label,
            icon: s.icon,
            status: s.status,
            count: s.objects.length
        }))
    })
})

// GET /research/:id/result — get final result, auto-create table
router.get('/research/:id/result', async (c) => {
    const { id } = c.req.param()
    const job = jobs.get(id)

    if (!job) {
        return c.json({ error: 'Исследование не найдено' }, 404)
    }

    if (job.status !== 'completed') {
        return c.json({ error: 'Исследование ещё не завершено', status: job.status }, 400)
    }

    // If table already created, return it
    if (job.table_id) {
        const allObjects = job.steps.flatMap(s => s.objects)
        return c.json({
            table_id: job.table_id,
            topic: job.topic,
            total_objects: allObjects.length,
            phases: job.steps.map(s => ({ phase: s.phase, label: s.label, objects: s.objects }))
        })
    }

    // Create table from research results
    try {
        const db = c.get('db')
        const tableId = 'res_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
        const allObjects = job.steps.flatMap(s => s.objects)

        // Deduplicate by name
        const seen = new Set()
        const uniqueObjects = allObjects.filter(obj => {
            const key = (obj.name || '').toLowerCase().trim()
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

        const cleanTopic = job.topic.charAt(0).toUpperCase() + job.topic.slice(1)
        const tableTitle = `Сравнение: ${cleanTopic}`

        // Build columns — collect all unique parameter names from objects
        const paramSet = new Set()
        for (const obj of uniqueObjects) {
            for (const key of Object.keys(obj)) {
                if (!['name', 'source', 'phase'].includes(key) && obj[key]) {
                    paramSet.add(key.charAt(0).toUpperCase() + key.slice(1))
                }
            }
        }

        const columns = [
            { title: 'Название', weight: 25, type: 'text' },
            ...([...paramSet].filter(p => p !== 'Name').map(p => ({
                title: p, weight: Math.round(60 / Math.max(paramSet.size, 1)), type: 'text'
            }))),
            { title: 'Оценка', weight: 15, type: 'number' }
        ]

        // Build rows
        const rows = uniqueObjects.map(obj => {
            const row = { 'Название': obj.name || '' }
            for (const key of Object.keys(obj)) {
                if (['name', 'source', 'phase'].includes(key)) continue
                const colName = key.charAt(0).toUpperCase() + key.slice(1)
                row[colName] = obj[key] || ''
            }
            if (!row['Оценка']) row['Оценка'] = ''
            return row
        })

        // Insert table
        db.prepare(`INSERT INTO tables (id, title, description, author, state, param_count, object_count, tags, utility, utility_price, weights, created_at, updated_at)
            VALUES (?, ?, ?, 'Research AI', 'открытая', ?, ?, ?, 0, 0, ?, unixepoch(), date('now'))`
        ).run(tableId, tableTitle,
            `Deep Research: ${cleanTopic} (${job.depth} фазы, ${rows.length} объектов)`,
            columns.length, rows.length, 'research,ai-generated',
            JSON.stringify(columns.map(c => c.weight)))

        // Insert columns
        db.prepare('INSERT INTO columns (table_id, definition) VALUES (?, ?)').run(tableId, JSON.stringify(columns))

        // Insert rows
        const insertRow = db.prepare('INSERT INTO rows (table_id, data) VALUES (?, ?)')
        for (const row of rows) {
            insertRow.run(tableId, JSON.stringify(row))
        }

        job.table_id = tableId

        return c.json({
            table_id: tableId,
            topic: job.topic,
            total_objects: rows.length,
            phases: job.steps.map(s => ({ phase: s.phase, label: s.label, objects: s.objects }))
        })
    } catch (e) {
        return c.json({ error: 'Ошибка создания таблицы: ' + e.message }, 500)
    }
})

export const researchRoutes = router
