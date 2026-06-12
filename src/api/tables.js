import { Hono } from 'hono'
import { authMiddleware, verifyToken } from '../auth.js'
import { TABLE_STATES, isPublicState, loadTable, saveRows, hasTableAccess, canEditTable } from '../utils/db.js'
import { zValidator } from '@hono/zod-validator'
import { TableSaveSchema } from '../schema/matrix.js'

const tables = new Hono()

// --- List All Tables (with Optional FTS5 Search) ---
tables.get('/tables', async (c) => {
    const db = c.env.DB
    const search = c.req.query('search')

    try {
        let results;
        if (search && search.trim().length > 0) {
            try {
                // Escape quotes to prevent FTS5 syntax errors, append * for prefix matching
                const safeSearch = search.replace(/"/g, '""').trim();
                const ftsQuery = `"${safeSearch}"*`;

                const res = await db.prepare(`
                    SELECT t.* 
                    FROM tables t
                    JOIN tables_fts f ON t.id = f.id
                    WHERE tables_fts MATCH ? AND t.state != ?
                    ORDER BY rank
                    LIMIT 2000
                `).bind(ftsQuery, TABLE_STATES.DELETED).all()
                results = res.results;
            } catch (err) {
                console.warn('[FTS Error, falling back to LIKE]', err.message);
                const safeSearch = `%${search.trim()}%`;
                const res = await db.prepare(`
                    SELECT * 
                    FROM tables 
                    WHERE (title LIKE ? OR description LIKE ? OR tags LIKE ?) AND state != ?
                    ORDER BY updated_at DESC
                    LIMIT 2000
                `).bind(safeSearch, safeSearch, safeSearch, TABLE_STATES.DELETED).all()
                results = res.results;
            }
        } else {
            const res = await db.prepare(
                `SELECT * FROM tables WHERE state != ? ORDER BY updated_at DESC LIMIT 2000`
            ).bind(TABLE_STATES.DELETED).all()
            results = res.results;
        }
        return c.json(results || [])
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- Get Table Data ---
tables.get('/table/:id', async (c) => {
    const { id } = c.req.param()
    const db = c.env.DB

    try {
        // Increment View
        try {
            await db.prepare('UPDATE tables SET views = COALESCE(views, 0) + 1 WHERE id = ?').bind(id).run()
        } catch (err) {
            console.error('[DB] Failed to increment views:', err.message)
        }

        const tableData = await loadTable(db, id, { kv: c.env.CACHE_KV })
        if (!tableData) return c.json({ error: 'Table not found' }, 404)

        // Permission Check
        let currentUser = null
        const authHeader = c.req.header('Authorization')
        if (authHeader) {
            try {
                const t = authHeader.split(' ')[1]
                currentUser = await verifyToken(t, c.env.JWT_SECRET || 'dev-secret')
            } catch (e) { }
        }

        const linkToken = c.req.query('token')
        if (!hasTableAccess(tableData.meta, currentUser, linkToken)) {
            return c.json({ error: 'Access denied.' }, 403)
        }

        return c.json({ meta: tableData.meta, columns: tableData.columns, data: tableData.rows })
    } catch (e) {
        return c.json({ error: 'Load failed: ' + e.message }, 500)
    }
})

// --- Create/Update Table ---
tables.post('/table', authMiddleware, zValidator('json', TableSaveSchema), async (c) => {
    const body = c.req.valid('json')
    const { id, title, description, columns, data, quality_score, quality_details } = body
    const db = c.env.DB
    const user = c.get('user')

    try {
        const existing = await db.prepare('SELECT owner_id, state, link FROM tables WHERE id = ?').bind(id).first()

        if (existing) {
            if (!canEditTable(existing, user)) return c.json({ error: 'Forbidden' }, 403)

            let newState = existing.state;
            let newLink = existing.link;
            if (body.state) {
                newState = body.state;
                if (newState === TABLE_STATES.LINK_ACCESS && !newLink) newLink = crypto.randomUUID();
            }

            await db.batch([
                db.prepare('UPDATE tables SET title = ?, description = ?, state = ?, link = ?, quality_score = ?, quality_details = ?, updated_at = date("now") WHERE id = ?')
                    .bind(title, description, newState, newLink, quality_score ?? null, quality_details ? JSON.stringify(quality_details) : null, id),
                db.prepare('DELETE FROM columns WHERE table_id = ?').bind(id),
                db.prepare('DELETE FROM rows WHERE table_id = ?').bind(id),
                db.prepare('INSERT INTO columns (table_id, definition) VALUES (?, ?)')
                    .bind(id, JSON.stringify(columns))
            ])

            await saveRows(db, id, data, { kv: c.env.CACHE_KV })

            // Save Snapshot to table_versions
            const snapshotData = { title, description, columns, rows: data || [] };
            await db.prepare('INSERT INTO table_versions (table_id, data, author_id) VALUES (?, ?, ?)')
                .bind(id, JSON.stringify(snapshotData), user.sub).run();
        } else {
            let newTitle = title;
            // Uniqueness check (Simplified)
            let counter = 1;
            while (true) {
                const dup = await db.prepare('SELECT id FROM tables WHERE title = ? AND owner_id = ?').bind(newTitle, user.sub).first();
                if (!dup) break;
                newTitle = `${title} (${counter})`;
                counter++;
                if (counter > 10) break;
            }

            await db.prepare('INSERT INTO tables (id, title, description, owner_id, author, quality_score, quality_details) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .bind(id, newTitle, description || '', user.sub, user.name, quality_score ?? null, quality_details ? JSON.stringify(quality_details) : null).run()

            await db.prepare('INSERT INTO columns (table_id, definition) VALUES (?, ?)')
                .bind(id, JSON.stringify(columns)).run()

            await saveRows(db, id, data, { kv: c.env.CACHE_KV })

            // Save Snapshot to table_versions
            const snapshotData = { title: newTitle, description, columns, rows: data || [] };
            await db.prepare('INSERT INTO table_versions (table_id, data, author_id) VALUES (?, ?, ?)')
                .bind(id, JSON.stringify(snapshotData), user.sub).run();
        }
        return c.json({ success: true, id })
    } catch (e) {
        return c.json({ error: 'Save failed: ' + e.message }, 500)
    }
})

// --- Get Table Versions History ---
tables.get('/table/:id/versions', authMiddleware, async (c) => {
    const { id } = c.req.param()
    const db = c.env.DB
    const user = c.get('user')

    try {
        const tableMeta = await db.prepare('SELECT owner_id, state FROM tables WHERE id = ?').bind(id).first()
        if (!tableMeta) return c.json({ error: 'Table not found' }, 404)

        const isOwner = tableMeta.owner_id && String(tableMeta.owner_id) === String(user.sub)
        const isAdmin = user.role === 'admin'
        if (tableMeta.state === TABLE_STATES.PRIVATE && !isOwner && !isAdmin) {
            return c.json({ error: 'Access denied.' }, 403)
        }

        const { results } = await db.prepare('SELECT id, created_at, author_id FROM table_versions WHERE table_id = ? ORDER BY created_at DESC LIMIT 50').bind(id).all()
        return c.json(results || [])
    } catch (e) {
        return c.json({ error: 'Failed to load versions: ' + e.message }, 500)
    }
})

// --- Get Specific Table Version ---
tables.get('/table/:id/version/:vid', authMiddleware, async (c) => {
    const { id, vid } = c.req.param()
    const db = c.env.DB
    const user = c.get('user')

    try {
        const tableMeta = await db.prepare('SELECT owner_id, state FROM tables WHERE id = ?').bind(id).first()
        if (!tableMeta) return c.json({ error: 'Table not found' }, 404)

        const isOwner = tableMeta.owner_id && String(tableMeta.owner_id) === String(user.sub)
        const isAdmin = user.role === 'admin'
        if (tableMeta.state === TABLE_STATES.PRIVATE && !isOwner && !isAdmin) {
            return c.json({ error: 'Access denied.' }, 403)
        }

        const versionStr = await db.prepare('SELECT data FROM table_versions WHERE id = ? AND table_id = ?').bind(vid, id).first()
        if (!versionStr) return c.json({ error: 'Version not found' }, 404)

        const versionData = JSON.parse(versionStr.data)
        return c.json(versionData)
    } catch (e) {
        return c.json({ error: 'Failed to load version: ' + e.message }, 500)
    }
})

// --- Copy Table ---
tables.post('/table/:id/copy', authMiddleware, async (c) => {
    const { id } = c.req.param()
    const db = c.env.DB
    const user = c.get('user')

    try {
        const tableData = await loadTable(db, id, { kv: c.env.CACHE_KV })
        if (!tableData) return c.json({ error: 'Source table not found' }, 404)

        const { meta: sourceMeta } = tableData
        const isOwner = sourceMeta.owner_id && String(sourceMeta.owner_id) === String(user.sub)
        const isAdmin = user.role === 'admin'

        if (!isPublicState(sourceMeta.state) && !isOwner && !isAdmin) {
            return c.json({ error: 'Cannot copy private table' }, 403)
        }

        const newId = id + '-copy-' + Date.now().toString(36)
        const newTitle = 'Копия ' + sourceMeta.title

        await db.prepare('INSERT INTO tables (id, title, description, owner_id, author, state, param_count, object_count, tags, utility) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(newId, newTitle, sourceMeta.description, user.sub, user.name, TABLE_STATES.OPEN, sourceMeta.param_count, sourceMeta.object_count, sourceMeta.tags, 0)
            .run()

        if (tableData.columns.length > 0) {
            await db.prepare('INSERT INTO columns (table_id, definition) VALUES (?, ?)')
                .bind(newId, JSON.stringify(tableData.columns)).run()
        }

        await saveRows(db, newId, tableData.rows, { kv: c.env.CACHE_KV })

        return c.json({ success: true, id: newId })
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- Soft Delete Table ---
tables.delete('/table/:id', authMiddleware, async (c) => {
    const { id } = c.req.param()
    const db = c.env.DB
    const user = c.get('user')
    try {
        const table = await db.prepare('SELECT owner_id FROM tables WHERE id = ?').bind(id).first()
        if (!table) return c.json({ error: 'Table not found' }, 404)
        if (String(table.owner_id) !== String(user.sub) && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

        await db.prepare(`UPDATE tables SET state = ?, updated_at = date('now') WHERE id = ?`)
            .bind(TABLE_STATES.DELETED, id).run()
        return c.json({ success: true })
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- Trash List ---
tables.get('/trash', authMiddleware, async (c) => {
    const db = c.env.DB
    const user = c.get('user')
    try {
        const { results } = await db.prepare(
            `SELECT * FROM tables WHERE state = ? AND owner_id = ? ORDER BY updated_at DESC LIMIT 10000`
        ).bind(TABLE_STATES.DELETED, user.sub).all()
        return c.json(results || [])
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- Restore Table ---
tables.post('/table/:id/restore', authMiddleware, async (c) => {
    const { id } = c.req.param()
    const db = c.env.DB
    const user = c.get('user')
    try {
        const table = await db.prepare('SELECT owner_id FROM tables WHERE id = ?').bind(id).first()
        if (!table) return c.json({ error: 'Table not found' }, 404)
        if (String(table.owner_id) !== String(user.sub) && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

        await db.prepare(`UPDATE tables SET state = ?, updated_at = date('now') WHERE id = ?`)
            .bind(TABLE_STATES.OPEN, id).run()
        return c.json({ success: true })
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- Hard Delete (Single) ---
tables.delete('/table/:id/hard', authMiddleware, async (c) => {
    const { id } = c.req.param()
    const db = c.env.DB
    const user = c.get('user')
    try {
        const table = await db.prepare('SELECT owner_id FROM tables WHERE id = ?').bind(id).first()
        if (!table) return c.json({ error: 'Table not found' }, 404)
        if (String(table.owner_id) !== String(user.sub) && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

        await db.batch([
            db.prepare('DELETE FROM tables WHERE id = ?').bind(id),
            db.prepare('DELETE FROM columns WHERE table_id = ?').bind(id),
            db.prepare('DELETE FROM rows WHERE table_id = ?').bind(id)
        ])
        return c.json({ success: true })
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- Hard Delete (Batch) ---
tables.delete('/batch-hard', authMiddleware, async (c) => {
    const { ids } = await c.req.json();
    const db = c.env.DB
    const user = c.get('user')
    if (!ids || !Array.isArray(ids)) return c.json({ error: 'Invalid IDs' }, 400);

    try {
        const batch = [];
        for (const id of ids) {
            const table = await db.prepare('SELECT owner_id FROM tables WHERE id = ?').bind(id).first();
            if (table && (String(table.owner_id) === String(user.sub) || user.role === 'admin')) {
                batch.push(db.prepare('DELETE FROM tables WHERE id = ?').bind(id));
                batch.push(db.prepare('DELETE FROM columns WHERE table_id = ?').bind(id));
                batch.push(db.prepare('DELETE FROM rows WHERE table_id = ?').bind(id));
            }
        }
        if (batch.length > 0) await db.batch(batch);
        return c.json({ success: true, count: batch.length / 3 });
    } catch (e) {
        return c.json({ error: e.message }, 500);
    }
})

// --- Catalog: All Objects (authenticated) ---
tables.get('/catalog/objects', authMiddleware, async (c) => {
    const db = c.env.DB
    const q = c.req.query('q') || ''

    try {
        let results
        if (q.trim()) {
            results = await db.prepare(`
                SELECT r.data, r.table_id, t.title as table_title
                FROM rows r
                JOIN tables t ON r.table_id = t.id
                WHERE t.state != ?
                AND json_extract(r.data, '$.name') LIKE ?
                ORDER BY t.title
                LIMIT 5000
            `).bind(TABLE_STATES.DELETED, `%${q}%`).all()
        } else {
            results = await db.prepare(`
                SELECT r.data, r.table_id, t.title as table_title
                FROM rows r
                JOIN tables t ON r.table_id = t.id
                WHERE t.state != ?
                ORDER BY t.title
                LIMIT 5000
            `).bind(TABLE_STATES.DELETED).all()
        }

        const objects = (results.results || []).map(r => {
            const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
            return {
                name: data.name || '—',
                price: data.price || '',
                table_id: r.table_id,
                table_title: r.table_title
            }
        })
        return c.json(objects)
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- Catalog: All Parameters (authenticated) ---
tables.get('/catalog/params', authMiddleware, async (c) => {
    const db = c.env.DB
    const q = c.req.query('q') || ''

    try {
        const results = await db.prepare(`
            SELECT c.definition, c.table_id, t.title as table_title
            FROM columns c
            JOIN tables t ON c.table_id = t.id
            WHERE t.state != ?
        `).bind(TABLE_STATES.DELETED).all()

        // Extract unique param titles across all tables
        const paramMap = new Map() // title -> { count, tables[], weights[] }
        for (const row of (results.results || [])) {
            const cols = typeof row.definition === 'string' ? JSON.parse(row.definition) : row.definition
            if (!Array.isArray(cols)) continue
            for (const col of cols) {
                const title = col.title || col.key
                if (q.trim() && !title.toLowerCase().includes(q.toLowerCase())) continue

                if (!paramMap.has(title)) {
                    paramMap.set(title, { title, tables: [], avg_weight: 0, total_weight: 0, count: 0 })
                }
                const entry = paramMap.get(title)
                entry.tables.push({ id: row.table_id, title: row.table_title })
                entry.total_weight += (col.weight || 0)
                entry.count++
                entry.avg_weight = Math.round(entry.total_weight / entry.count * 10) / 10
            }
        }

        const params = Array.from(paramMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5000)

        return c.json(params)
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- Autocomplete for cell editing ---
tables.get('/autocomplete', async (c) => {
    const db = c.env.DB
    const q = c.req.query('q') || ''
    const field = c.req.query('field') || 'name'

    if (!q.trim() || q.length < 2) return c.json([])
    // SECURITY: Limit field to safe values
    if (field !== 'name' && !/^[a-zA-Z0-9_]+$/.test(field)) return c.json([])

    try {
        if (field === 'name') {
            // Autocomplete object names
            const results = await db.prepare(`
                SELECT DISTINCT json_extract(r.data, '$.name') as val
                FROM rows r
                JOIN tables t ON r.table_id = t.id
                WHERE t.state != ?
                AND json_extract(r.data, '$.name') LIKE ?
                LIMIT 15
            `).bind(TABLE_STATES.DELETED, `%${q}%`).all()

            return c.json((results.results || []).map(r => r.val).filter(Boolean))
        } else {
            // Autocomplete param values — only allow alphanumeric field keys
            const jsonPath = `$.${field}.value`
            const results = await db.prepare(`
                SELECT DISTINCT json_extract(r.data, ?) as val
                FROM rows r
                JOIN tables t ON r.table_id = t.id
                WHERE t.state != ?
                AND val IS NOT NULL AND val != ''
                AND val LIKE ?
                LIMIT 15
            `).bind(jsonPath, TABLE_STATES.DELETED, `%${q}%`).all()

            return c.json((results.results || []).map(r => r.val).filter(Boolean))
        }
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

export default tables
