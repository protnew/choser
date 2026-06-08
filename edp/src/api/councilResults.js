import { Hono } from 'hono'
import { authMiddleware } from './auth.js'
import { randomUUID } from 'node:crypto'

const councilResults = new Hono()

// TTL: 24 hours in seconds
const TTL_SECONDS = 24 * 60 * 60

// ─── POST /v1/api/council/results — Save council result, get shareable UUID ───
councilResults.post('/council/results', async (c) => {
    const db = c.get('db')
    let body
    try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

    // Validate required fields
    if (!body.topic && !body.question) {
        return c.json({ error: 'topic or question required' }, 400)
    }
    if (!body.result) {
        return c.json({ error: 'result data required' }, 400)
    }

    const uuid = randomUUID()
    const now = Date.now()
    const expiresAt = now + TTL_SECONDS * 1000

    try {
        // Create table if not exists
        db.prepare(`
            CREATE TABLE IF NOT EXISTS council_results (
                id TEXT PRIMARY KEY,
                topic TEXT NOT NULL,
                question TEXT,
                result TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                user_id TEXT,
                view_count INTEGER DEFAULT 0
            )
        `).run()

        // Cleanup expired results first
        db.prepare('DELETE FROM council_results WHERE expires_at < ?').run(now)

        // Insert new result
        db.prepare(`
            INSERT INTO council_results (id, topic, question, result, created_at, expires_at, user_id, view_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `).run(
            uuid,
            body.topic || body.question,
            body.question || body.topic,
            JSON.stringify(body.result),
            now,
            expiresAt,
            c.req.header('X-User-Id') || null
        )

        const ttlHours = Math.round(TTL_SECONDS / 3600)
        return c.json({
            id: uuid,
            url: `${new URL(c.req.url).origin}/#/decision?result=${uuid}`,
            expires_at: expiresAt,
            ttl_hours: ttlHours,
            message: `Ссылка действительна ${ttlHours} ч`
        })
    } catch (e) {
        console.error('[councilResults] Save error:', e.message)
        return c.json({ error: 'Failed to save result' }, 500)
    }
})

// ─── GET /v1/api/council/results/:id — Load shared council result ───
councilResults.get('/council/results/:id', async (c) => {
    const db = c.get('db')
    const id = c.req.param('id')

    try {
        // Create table if not exists (in case GET is called before POST)
        db.prepare(`
            CREATE TABLE IF NOT EXISTS council_results (
                id TEXT PRIMARY KEY,
                topic TEXT NOT NULL,
                question TEXT,
                result TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                user_id TEXT,
                view_count INTEGER DEFAULT 0
            )
        `).run()

        const row = db.prepare('SELECT * FROM council_results WHERE id = ?').get(id)

        if (!row) {
            return c.json({ error: 'Результат не найден или истёк срок действия' }, 404)
        }

        // Check expiration
        if (row.expires_at < Date.now()) {
            db.prepare('DELETE FROM council_results WHERE id = ?').run(id)
            return c.json({ error: 'Срок действия ссылки истёк' }, 410)
        }

        // Increment view count
        db.prepare('UPDATE council_results SET view_count = view_count + 1 WHERE id = ?').run(id)

        // Parse result
        let result
        try {
            result = JSON.parse(row.result)
        } catch {
            result = { raw: row.result }
        }

        const remainingMs = row.expires_at - Date.now()
        const remainingHours = Math.round(remainingMs / 3600000 * 10) / 10

        return c.json({
            id: row.id,
            topic: row.topic,
            question: row.question,
            result,
            created_at: row.created_at,
            expires_at: row.expires_at,
            remaining_hours: remainingHours,
            view_count: row.view_count + 1
        })
    } catch (e) {
        console.error('[councilResults] Load error:', e.message)
        return c.json({ error: 'Failed to load result' }, 500)
    }
})

// ─── DELETE /v1/api/council/results/:id — Manual delete ───
councilResults.delete('/council/results/:id', async (c) => {
    const db = c.get('db')
    const id = c.req.param('id')

    try {
        const result = db.prepare('DELETE FROM council_results WHERE id = ?').run(id)
        return c.json({ ok: true, deleted: result.changes > 0 })
    } catch (e) {
        return c.json({ error: 'Failed to delete' }, 500)
    }
})

export { councilResults as councilResultRoutes }
