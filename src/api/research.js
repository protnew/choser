import { Hono } from 'hono'
import { AI_SERVICE } from '../ai_service.js'
import { saveRows } from '../utils/db.js'

const research = new Hono()

// --- Research Jobs: D1-based background task queue ---
// Вместо Durable Objects ($5/мес) используем D1 (бесплатно)

// Статусы задач
const JOB_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    STEP_DONE: 'step_done',
    COMPLETED: 'completed',
    FAILED: 'failed',
}

/**
 * POST /api/research/start
 * Запуск нового исследования
 * Body: { topic, depth?, max_sources?, create_table? }
 */
research.post('/start', async (c) => {
    const { topic, depth = 3, max_sources = 10, create_table = true } = await c.req.json()
    const db = c.env.DB

    if (!topic) return c.json({ error: 'topic обязателен' }, 400)

    const jobId = `research-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const now = new Date().toISOString()

    try {
        await db.prepare(`
            INSERT INTO research_jobs (id, topic, depth, status, steps, result, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(jobId, topic, depth, JOB_STATUS.PENDING, '[]', null, now, now).run()

        // Запускаем первый шаг синхронно (обзор)
        // Каждый шаг выполняется в рамках отдельного запроса (polling)
        try {
            await runNextStep(db, c.env, jobId, topic, depth)
        } catch (e) {
            console.error(`[Research] Step error: ${e.message}`)
            await updateJobStatus(db, jobId, JOB_STATUS.FAILED, null, e.message)
        }

        const job = await db.prepare('SELECT * FROM research_jobs WHERE id = ?').bind(jobId).first()
        return c.json({ job_id: jobId, status: job.status, steps: JSON.parse(job.steps || '[]') })
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

/**
 * GET /api/research/:id/status
 * Статус задачи (polling)
 */
research.get('/:id/status', async (c) => {
    const db = c.env.DB
    const jobId = c.req.param('id')

    const job = await db.prepare('SELECT * FROM research_jobs WHERE id = ?').bind(jobId).first()
    if (!job) return c.json({ error: 'Job not found' }, 404)

    return c.json({
        job_id: job.id,
        topic: job.topic,
        status: job.status,
        steps: JSON.parse(job.steps || '[]'),
        result: job.result ? JSON.parse(job.result) : null,
        error: job.error,
        created_at: job.created_at,
        updated_at: job.updated_at
    })
})

/**
 * POST /api/research/:id/continue
 * Продолжить выполнение следующего шага (вызывается polling-ом или вручную)
 */
research.post('/:id/continue', async (c) => {
    const db = c.env.DB
    const jobId = c.req.param('id')

    const job = await db.prepare('SELECT * FROM research_jobs WHERE id = ?').bind(jobId).first()
    if (!job) return c.json({ error: 'Job not found' }, 404)
    if (job.status === JOB_STATUS.COMPLETED || job.status === JOB_STATUS.FAILED) {
        return c.json({ job_id: job.id, status: job.status, message: 'Job already finished' })
    }

    try {
        await runNextStep(db, c.env, jobId, job.topic, job.depth)
        const updated = await db.prepare('SELECT * FROM research_jobs WHERE id = ?').bind(jobId).first()
        return c.json({
            job_id: updated.id,
            status: updated.status,
            steps: JSON.parse(updated.steps || '[]')
        })
    } catch (e) {
        await updateJobStatus(db, jobId, JOB_STATUS.FAILED, null, e.message)
        return c.json({ error: e.message }, 500)
    }
})

/**
 * GET /api/research/:id/result
 * Получить финальный результат (таблицу)
 */
research.get('/:id/result', async (c) => {
    const db = c.env.DB
    const jobId = c.req.param('id')

    const job = await db.prepare('SELECT * FROM research_jobs WHERE id = ?').bind(jobId).first()
    if (!job) return c.json({ error: 'Job not found' }, 404)

    if (job.status !== JOB_STATUS.COMPLETED) {
        return c.json({ error: 'Job not completed yet', status: job.status }, 400)
    }

    return c.json({
        job_id: job.id,
        topic: job.topic,
        result: JSON.parse(job.result || '{}'),
        table_id: job.table_id
    })
})

/**
 * GET /api/research/list
 * Список всех задач
 */
research.get('/', async (c) => {
    const db = c.env.DB
    const { results } = await db.prepare(
        'SELECT id, topic, status, created_at, updated_at, table_id FROM research_jobs ORDER BY created_at DESC LIMIT 50'
    ).all()
    return c.json({ jobs: results })
})

// --- Internal Functions ---

async function runNextStep(db, env, jobId, topic, maxDepth) {
    const job = await db.prepare('SELECT * FROM research_jobs WHERE id = ?').bind(jobId).first()
    const steps = JSON.parse(job.steps || '[]')
    const currentStep = steps.length

    if (currentStep >= maxDepth) {
        // Все шаги завершены — финализировать
        await finalizeResearch(db, env, jobId, steps)
        return
    }

    await updateJobStatus(db, jobId, JOB_STATUS.RUNNING)

    let stepResult
    const stepNames = ['Обзор (Broad Scan)', 'Углубление (Deep Dive)', 'Верификация (Cross-Check)']
    const stepName = stepNames[currentStep] || `Шаг ${currentStep + 1}`

    if (currentStep === 0) {
        // Шаг 1: Обзор — широкий поиск по теме
        stepResult = await AI_SERVICE.deepResearch(env, topic, {
            phase: 'overview',
            previousData: null
        })
    } else if (currentStep === 1) {
        // Шаг 2: Углубление — детальный поиск по найденным объектам
        const prevData = steps[0]?.data
        stepResult = await AI_SERVICE.deepResearch(env, topic, {
            phase: 'deep_dive',
            previousData: prevData
        })
    } else {
        // Шаг 3+: Верификация — перекрёстная проверка
        const prevData = steps[currentStep - 1]?.data
        stepResult = await AI_SERVICE.deepResearch(env, topic, {
            phase: 'verification',
            previousData: prevData
        })
    }

    steps.push({
        step: currentStep + 1,
        name: stepName,
        data: stepResult,
        completed_at: new Date().toISOString()
    })

    const isLast = steps.length >= maxDepth
    const newStatus = isLast ? JOB_STATUS.COMPLETED : JOB_STATUS.STEP_DONE

    if (isLast) {
        await finalizeResearch(db, env, jobId, steps)
    } else {
        await db.prepare('UPDATE research_jobs SET steps = ?, status = ?, updated_at = ? WHERE id = ?')
            .bind(JSON.stringify(steps), newStatus, new Date().toISOString(), jobId).run()
    }
}

async function finalizeResearch(db, env, jobId, steps) {
    // Берём данные последнего шага как финальный результат
    const lastStep = steps[steps.length - 1]
    const result = lastStep?.data || {}

    // Сохраняем результат как таблицу Choser
    let tableId = null
    try {
        if (result.title && (result.data || result.rows)) {
            tableId = `research-${jobId.split('-')[1] || Date.now()}`
            const now = new Date().toISOString()

            await db.prepare('INSERT INTO tables (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
                .bind(tableId, result.title, result.description || '', now, now).run()

            await db.prepare('INSERT INTO columns (table_id, definition, created_at, updated_at) VALUES (?, ?, ?, ?)')
                .bind(tableId, JSON.stringify(result.columns || []), now, now).run()

            const rows = result.data || result.rows || []
            await saveRows(db, tableId, rows, { withTimestamps: true, kv: env.CACHE_KV })
        }
    } catch (e) {
        console.error(`[Research] Failed to save table: ${e.message}`)
    }

    await db.prepare(
        'UPDATE research_jobs SET steps = ?, status = ?, result = ?, table_id = ?, updated_at = ? WHERE id = ?'
    ).bind(
        JSON.stringify(steps), JOB_STATUS.COMPLETED, JSON.stringify(result), tableId,
        new Date().toISOString(), jobId
    ).run()
}

async function updateJobStatus(db, jobId, status, result = null, error = null) {
    if (result) {
        await db.prepare('UPDATE research_jobs SET status = ?, result = ?, updated_at = ? WHERE id = ?')
            .bind(status, JSON.stringify(result), new Date().toISOString(), jobId).run()
    } else if (error) {
        await db.prepare('UPDATE research_jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?')
            .bind(status, error, new Date().toISOString(), jobId).run()
    } else {
        await db.prepare('UPDATE research_jobs SET status = ?, updated_at = ? WHERE id = ?')
            .bind(status, new Date().toISOString(), jobId).run()
    }
}

export default research
