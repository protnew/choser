import { Hono } from 'hono'
import { authMiddleware, requireRole } from '../auth.js'
import { TABLE_STATES } from '../utils/db.js'

const admin = new Hono()

// --- Users Admin ---

admin.get('/users', authMiddleware, requireRole(['admin']), async (c) => {
    const db = c.env.DB
    const { include_deleted } = c.req.query()
    const sql = include_deleted
        ? 'SELECT id, email, name, role, created_at, is_deleted FROM users'
        : 'SELECT id, email, name, role, created_at, is_deleted FROM users WHERE is_deleted = 0 OR is_deleted IS NULL'
    const { results } = await db.prepare(sql).all()
    return c.json(results)
})

admin.post('/promote', authMiddleware, requireRole(['admin']), async (c) => {
    const { email, role } = await c.req.json()
    const db = c.env.DB

    if (!['admin', 'moderator', 'user'].includes(role)) {
        return c.json({ error: 'Invalid role' }, 400)
    }

    try {
        const info = await db.prepare('UPDATE users SET role = ? WHERE email = ?').bind(role, email).run()
        if (info.meta && info.meta.changes === 0) {
            return c.json({ error: 'User not found or role unchanged' }, 404)
        }
        return c.json({ success: true, email, role })
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

admin.delete('/user/:id', authMiddleware, requireRole(['admin']), async (c) => {
    const { id } = c.req.param()
    const db = c.env.DB
    await db.prepare('UPDATE users SET is_deleted = 1 WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
})

admin.post('/restore/:id', authMiddleware, requireRole(['admin']), async (c) => {
    const { id } = c.req.param()
    const db = c.env.DB
    await db.prepare('UPDATE users SET is_deleted = 0 WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
})

// --- Tables Admin ---

admin.get('/archive', authMiddleware, requireRole(['admin']), async (c) => {
    const db = c.env.DB
    const { results } = await db.prepare('SELECT * FROM tables WHERE state = ? ORDER BY updated_at DESC').bind(TABLE_STATES.DELETED).all()
    return c.json(results || [])
})

admin.post('/restore-table/:id', authMiddleware, requireRole(['admin']), async (c) => {
    const { id } = c.req.param()
    const db = c.env.DB
    await db.prepare('UPDATE tables SET state = ? WHERE id = ?').bind(TABLE_STATES.OPEN, id).run()
    return c.json({ success: true })
})

// --- Settings Admin ---

admin.get('/settings', authMiddleware, requireRole(['admin']), async (c) => {
    const db = c.env.DB
    try {
        const { results } = await db.prepare('SELECT * FROM settings').all()
        const settings = {}
        if (results) results.forEach(s => settings[s.id] = s.value)
        return c.json(settings)
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

admin.post('/settings', authMiddleware, requireRole(['admin']), async (c) => {
    const { id, value } = await c.req.json()
    const db = c.env.DB
    if (!id || !value) return c.json({ error: 'Missing id or value' }, 400)
    try {
        await db.prepare('INSERT INTO settings (id, value, updated_at) VALUES (?, ?, date("now")) ON CONFLICT(id) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at')
            .bind(id, value).run()
        return c.json({ success: true, id, value })
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- Database Backup (Download JSON) ---

admin.get('/backup', authMiddleware, requireRole(['admin']), async (c) => {
    const db = c.env.DB
    try {
        const { results: allTables } = await db.prepare('SELECT * FROM tables ORDER BY updated_at DESC').all()
        const { results: allColumns } = await db.prepare('SELECT * FROM columns').all()
        const { results: allRows } = await db.prepare('SELECT * FROM rows').all()
        const { results: allUsers } = await db.prepare('SELECT id, email, name, role, created_at, is_deleted FROM users').all()

        const backup = {
            _meta: {
                version: '0.0.8',
                timestamp: new Date().toISOString(),
                table_count: (allTables || []).length,
                row_count: (allRows || []).length,
                user_count: (allUsers || []).length
            },
            tables: allTables || [],
            columns: allColumns || [],
            rows: allRows || [],
            users: allUsers || []
        }

        return c.json(backup, 200, {
            'Content-Disposition': `attachment; filename="choser-backup-${new Date().toISOString().slice(0, 10)}.json"`,
            'Content-Type': 'application/json'
        })
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- Server-side Snapshots ---

admin.post('/snapshot', authMiddleware, requireRole(['admin']), async (c) => {
    const db = c.env.DB
    try {
        await db.prepare(`CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT,
            data TEXT,
            created_at INTEGER DEFAULT (unixepoch())
        )`).run()

        const tblCount = await db.prepare('SELECT COUNT(*) as cnt FROM tables').first()
        const rowCount = await db.prepare('SELECT COUNT(*) as cnt FROM rows').first()
        const colCount = await db.prepare('SELECT COUNT(*) as cnt FROM columns').first()
        const usrCount = await db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_deleted = 0 OR is_deleted IS NULL').first()

        // Store only metadata summary (not full data to avoid TOOBIG)
        const { label } = await c.req.json().catch(() => ({}))
        const snapshotMeta = {
            tables: tblCount?.cnt || 0,
            rows: rowCount?.cnt || 0,
            columns: colCount?.cnt || 0,
            users: usrCount?.cnt || 0,
            timestamp: new Date().toISOString()
        }

        await db.prepare('INSERT INTO snapshots (label, data) VALUES (?, ?)')
            .bind(label || `Снимок ${new Date().toISOString().slice(0, 16)}`, JSON.stringify(snapshotMeta))
            .run()

        await db.prepare('DELETE FROM snapshots WHERE id NOT IN (SELECT id FROM snapshots ORDER BY created_at DESC LIMIT 20)').run()

        return c.json({ success: true, label, meta: snapshotMeta })
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

admin.get('/snapshots', authMiddleware, requireRole(['admin']), async (c) => {
    const db = c.env.DB
    try {
        // Ensure snapshots table exists
        await db.prepare(`CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT,
            data TEXT,
            created_at INTEGER DEFAULT (unixepoch())
        )`).run()

        const { results } = await db.prepare('SELECT id, label, created_at FROM snapshots ORDER BY created_at DESC LIMIT 20').all()
        return c.json(results || [])
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

// --- Statistics Dashboard ---

admin.get('/stats', authMiddleware, requireRole(['admin']), async (c) => {
    const db = c.env.DB
    try {
        const median = (arr) => { if (!arr.length) return 0; const s = [...arr].sort((a,b)=>a-b); const m = Math.floor(s.length/2); return s.length%2 ? s[m] : (s[m-1]+s[m])/2 }
        const stddev = (arr) => { if (!arr.length) return 0; const m = arr.reduce((a,b)=>a+b,0)/arr.length; return Math.sqrt(arr.reduce((s,v)=>s+(v-m)**2,0)/arr.length) }
        const percentile = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a,b)=>a-b); const i = (p/100)*(s.length-1); const lo = Math.floor(i); return lo === s.length-1 ? s[lo] : s[lo] + (i-lo)*(s[lo+1]-s[lo]) }
        const histogram = (arr, bins=10) => { if (!arr.length) return []; const min = Math.min(...arr), max = Math.max(...arr); if (min === max) return [{ x: min, y: arr.length }]; const w = (max-min)/bins; return Array.from({length:bins}, (_,i) => { const lo = min+i*w, hi = lo+w; return { x: Math.round((lo+hi)/2*100)/100, y: arr.filter(v => i===bins-1 ? v>=lo&&v<=hi : v>=lo&&v<hi).length, range: `${Math.round(lo)}-${Math.round(hi)}` } }) }
        const r2 = (x) => Math.round(x * 100) / 100

        // 1. Overview
        const ov = await db.prepare(`SELECT COUNT(*) as t, COALESCE(SUM(object_count),0) as obj, COALESCE(AVG(object_count),0) as avgObj, COALESCE(AVG(param_count),0) as avgPar, MIN(object_count) as minObj, MAX(object_count) as maxObj, MIN(param_count) as minPar, MAX(param_count) as maxPar FROM tables WHERE state != 'deleted'`).first()
        const rowCnt = await db.prepare('SELECT COUNT(*) as cnt FROM rows').first()
        const usrCnt = await db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_deleted = 0 OR is_deleted IS NULL').first()
        const colCnt = await db.prepare('SELECT COUNT(DISTINCT table_id) as cnt FROM columns').first()

        // 2. Distributions
        const { results: objDist } = await db.prepare(`SELECT CASE WHEN object_count<=3 THEN '2-3' WHEN object_count<=5 THEN '4-5' WHEN object_count<=10 THEN '6-10' WHEN object_count<=20 THEN '11-20' ELSE '21+' END as range_label, COUNT(*) as count FROM tables WHERE state != 'deleted' GROUP BY range_label ORDER BY MIN(object_count)`).all()
        const { results: paramDist } = await db.prepare(`SELECT CASE WHEN param_count<=3 THEN '1-3' WHEN param_count<=5 THEN '4-5' WHEN param_count<=10 THEN '6-10' WHEN param_count<=15 THEN '11-15' WHEN param_count<=20 THEN '16-20' ELSE '21+' END as range_label, COUNT(*) as count FROM tables WHERE state != 'deleted' GROUP BY range_label ORDER BY MIN(param_count)`).all()

        // 3. Views distribution
        const { results: viewsDist } = await db.prepare(`SELECT CASE WHEN views<=5 THEN '0-5' WHEN views<=20 THEN '6-20' WHEN views<=50 THEN '21-50' WHEN views<=100 THEN '51-100' ELSE '100+' END as range_label, COUNT(*) as count FROM tables WHERE state != 'deleted' GROUP BY range_label ORDER BY MIN(views)`).all()

        // 4. Extract Cost/Utility from rows
        const { results: allRows } = await db.prepare(`SELECT r.data, t.title, t.id as table_id, t.object_count, t.param_count, t.views FROM rows r JOIN tables t ON r.table_id = t.id WHERE t.state != 'deleted'`).all()
        let costValues=[], utilityValues=[], scatterData=[], tablesWithCost=new Set(), tablesWithUtility=new Set()
        const perTableCost = {}, perTableUtility = {}

        for (const row of (allRows||[])) {
            try {
                const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
                let rowCost = null, rowUtility = null
                for (const [key, val] of Object.entries(data||{})) {
                    const kl = (key||'').toLowerCase(); const nv = parseFloat(val)
                    if (isNaN(nv) || nv === 0) continue
                    if (kl.includes('стоимость')||kl.includes('cost')||kl.includes('цена')||kl.includes('price')) { costValues.push(nv); tablesWithCost.add(row.table_id); rowCost = nv; if (!perTableCost[row.table_id]) perTableCost[row.table_id]=[]; perTableCost[row.table_id].push(nv) }
                    if (kl.includes('полезность')||kl.includes('utility')||kl.includes('рейтинг')||kl.includes('rating')) { utilityValues.push(nv); tablesWithUtility.add(row.table_id); rowUtility = nv; if (!perTableUtility[row.table_id]) perTableUtility[row.table_id]=[]; perTableUtility[row.table_id].push(nv) }
                }
                if (rowCost && rowUtility) scatterData.push({ cost: rowCost, utility: rowUtility, table: row.title })
            } catch(e) {}
        }

        // 5. Histograms for cost and utility
        const costHist = histogram(costValues, 12)
        const utilHist = histogram(utilityValues, 12)

        // 6. Per-table aggregated stats
        const { results: allTables } = await db.prepare(`SELECT id, title, object_count, param_count, views, author, utility, utility_price, tags, state, updated_at FROM tables WHERE state != 'deleted' ORDER BY views DESC`).all()

        const tableAnalytics = (allTables||[]).slice(0, 50).map(t => ({
            title: t.title, objects: t.object_count, params: t.param_count, views: t.views, author: t.author,
            avgCost: perTableCost[t.id] ? r2(perTableCost[t.id].reduce((a,b)=>a+b,0)/perTableCost[t.id].length) : null,
            avgUtility: perTableUtility[t.id] ? r2(perTableUtility[t.id].reduce((a,b)=>a+b,0)/perTableUtility[t.id].length) : null,
            costCount: perTableCost[t.id]?.length || 0,
            utilCount: perTableUtility[t.id]?.length || 0,
        }))

        // 7. Tags breakdown
        const tagMap = {}
        for (const t of (allTables||[])) {
            const tags = (t.tags||'').split(',').map(s=>s.trim()).filter(Boolean)
            for (const tag of tags) { tagMap[tag] = (tagMap[tag]||0) + 1 }
        }
        const tagStats = Object.entries(tagMap).map(([tag, count]) => ({tag, count})).sort((a,b) => b.count-a.count).slice(0, 30)

        // 8. Objects vs Params scatter (per table)
        const objParamScatter = (allTables||[]).filter(t => t.object_count > 0 && t.param_count > 0).slice(0, 200).map(t => ({ x: t.object_count, y: t.param_count, title: t.title, views: t.views }))

        // 9. Top tables
        const topTables = (allTables||[]).slice(0, 15)

        // 10. Authors
        const { results: topAuthors } = await db.prepare(`SELECT author as name, COUNT(*) as tables, SUM(object_count) as total_objects, ROUND(AVG(object_count),1) as avg_objects FROM tables WHERE state != 'deleted' GROUP BY author ORDER BY tables DESC LIMIT 15`).all()

        // 11. Timeline
        const { results: timeline } = await db.prepare(`SELECT CASE WHEN updated_at IS NOT NULL AND updated_at != '' THEN substr(updated_at, 1, 7) ELSE 'unknown' END as month, COUNT(*) as created, SUM(object_count) as objects FROM tables WHERE state != 'deleted' GROUP BY month ORDER BY month`).all()

        // 12. State distribution  
        const { results: stateBreakdown } = await db.prepare(`SELECT state, COUNT(*) as count FROM tables GROUP BY state`).all()

        // Per-table aggregated scatter (normalize by table)
        const perTableScatter = []
        for (const t of (allTables||[])) {
            const tc = perTableCost[t.id], tu = perTableUtility[t.id]
            if (tc?.length && tu?.length) {
                perTableScatter.push({
                    cost: r2(tc.reduce((a,b)=>a+b,0)/tc.length),
                    utility: r2(tu.reduce((a,b)=>a+b,0)/tu.length),
                    title: t.title, objects: t.object_count, views: t.views,
                    costN: tc.length, utilN: tu.length
                })
            }
        }

        return c.json({
            overview: {
                totalTables: ov?.t||0, totalRows: rowCnt?.cnt||0, totalUsers: usrCnt?.cnt||0, totalParams: colCnt?.cnt||0,
                avgObjectsPerTable: r2(ov?.avgObj||0), avgParamsPerTable: r2(ov?.avgPar||0),
                minObjects: ov?.minObj||0, maxObjects: ov?.maxObj||0, minParams: ov?.minPar||0, maxParams: ov?.maxPar||0,
            },
            distributions: {
                objectCounts: (objDist||[]).map(r => ({range: r.range_label, count: r.count})),
                paramCounts: (paramDist||[]).map(r => ({range: r.range_label, count: r.count})),
                viewsCounts: (viewsDist||[]).map(r => ({range: r.range_label, count: r.count})),
            },
            utilityStats: {
                avgUtility: r2(utilityValues.length ? utilityValues.reduce((a,b)=>a+b,0)/utilityValues.length : 0),
                medianUtility: r2(median(utilityValues)), stdUtility: r2(stddev(utilityValues)),
                p10Utility: r2(percentile(utilityValues,10)), p25Utility: r2(percentile(utilityValues,25)),
                p75Utility: r2(percentile(utilityValues,75)), p90Utility: r2(percentile(utilityValues,90)),
                minUtility: r2(utilityValues.length? Math.min(...utilityValues):0), maxUtility: r2(utilityValues.length? Math.max(...utilityValues):0),
                totalUtilityValues: utilityValues.length, tablesWithUtility: tablesWithUtility.size,
                avgCost: r2(costValues.length ? costValues.reduce((a,b)=>a+b,0)/costValues.length : 0),
                medianCost: r2(median(costValues)), stdCost: r2(stddev(costValues)),
                p10Cost: r2(percentile(costValues,10)), p25Cost: r2(percentile(costValues,25)),
                p75Cost: r2(percentile(costValues,75)), p90Cost: r2(percentile(costValues,90)),
                minCost: r2(costValues.length? Math.min(...costValues):0), maxCost: r2(costValues.length? Math.max(...costValues):0),
                totalCostValues: costValues.length, tablesWithCost: tablesWithCost.size,
            },
            histograms: { cost: costHist, utility: utilHist },
            scatterCostUtility: scatterData.slice(0, 500),
            perTableScatter,
            objParamScatter,
            tableAnalytics,
            topTables,
            tagStats,
            stateBreakdown: (stateBreakdown||[]).map(s => ({state: s.state, count: s.count})),
            userActivity: { totalAuthors: (topAuthors||[]).length, topAuthors: topAuthors||[] },
            timeline: (timeline||[]).filter(t => t.month !== 'unknown'),
        })
    } catch (e) {
        return c.json({ error: e.message }, 500)
    }
})

export default admin
