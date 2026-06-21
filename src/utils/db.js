/**
 * Database helper functions and constants.
 * Eliminates duplication between tables.js and mcp.js
 */
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';

/** Table state constants — single source of truth */
export const TABLE_STATES = {
    OPEN: 'открытая',
    PUBLIC: 'public',
    OPEN_EN: 'open',
    DELETED: 'deleted',
    PRIVATE: 'private',
    LINK_ACCESS: 'link_access',
};

/** Check if a state is considered "public/open" (visible to everyone) */
export function isPublicState(state) {
    return [TABLE_STATES.OPEN, TABLE_STATES.PUBLIC, TABLE_STATES.OPEN_EN].includes(state);
}

/**
 * Load a full table from DB: meta + columns + rows.
 * Includes KV caching logic for public tables.
 * @param {D1Database} d1 - Raw D1 database binding
 * @param {KVNamespace} [kv] - Optional KV binding
 * @param {string} tableId
 * @param {{ rowLimit?: number }} options
 * @returns {{ meta, columns: Array, rows: Array }}
 */
export async function loadTable(d1, tableId, { rowLimit, kv } = {}) {
    // 1. Check KV Cache FIRST 
    const cacheKey = `cache_v5_table:${tableId}`;
    if (kv) {
        try {
            const cached = await kv.get(cacheKey, 'json');
            if (cached) {
                console.log(`[Cache Hit] Table ${tableId}`);
                if (rowLimit && cached.rows?.length > rowLimit) {
                    cached.rows = cached.rows.slice(0, rowLimit);
                }
                return cached;
            }
        } catch (e) {
            console.error(`KV get error: ${e.message}`);
        }
    }

    // 2. Load from D1 using Drizzle
    const db = drizzle(d1);
    console.log(`[Cache Miss] Loading ${tableId} from D1...`);

    const metaResult = await db.select().from(schema.tables).where(eq(schema.tables.id, tableId)).limit(1);
    const meta = metaResult[0];
    if (!meta) return null;

    const columnsResult = await db.select({ definition: schema.columns.definition }).from(schema.columns).where(eq(schema.columns.tableId, tableId)).limit(1);
    const columnsMeta = columnsResult[0];
    const columns = columnsMeta ? (typeof columnsMeta.definition === 'string' ? JSON.parse(columnsMeta.definition) : columnsMeta.definition) : [];

    let rowsQuery = db.select({ data: schema.rows.data }).from(schema.rows).where(eq(schema.rows.tableId, tableId));
    if (rowLimit) rowsQuery = rowsQuery.limit(rowLimit);

    const rowsResult = await rowsQuery;
    const rows = rowsResult.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data);

    const result = { meta, columns, rows };

    // 3. Save to KV Cache if Public
    if (kv && isPublicState(meta.state)) {
        try {
            // Cache full payload for fast subsequent reads
            await kv.put(cacheKey, JSON.stringify({ meta, columns, rows }), { expirationTtl: 3600 }); // 1 Hour TTL
        } catch (e) {
            console.error(`KV put error: ${e.message}`);
        }
    }

    return result;
}

/**
 * Batch-insert rows for a table using Drizzle.
 * @param {D1Database} d1 - Raw D1 database binding
 * @param {string} tableId
 * @param {Array} rowsData
 * @param {{ withTimestamps?: boolean, kv?: KVNamespace }} options
 */
export async function saveRows(d1, tableId, rowsData, { withTimestamps = false, kv } = {}) {
    if (!rowsData || rowsData.length === 0) return;

    const db = drizzle(d1);

    // Format payload
    const payload = rowsData.map(r => ({
        tableId: tableId,
        data: r
    }));

    await db.insert(schema.rows).values(payload);

    // Invalidate cache immediately on update
    if (kv) {
        try {
            await kv.delete(`cache_v5_table:${tableId}`);
            console.log(`[Cache Invalidated] cache_v5_table:${tableId}`);
        } catch (e) { /* ignore */ }
    }
}

/**
 * Clean specific table cache
 */
export async function invalidateCache(kv, tableId) {
    if (!kv) return;
    try {
        await kv.delete(`cache_v5_table:${tableId}`);
    } catch (e) { }
}

/**
 * Check if a user has access to a table.
 * @param {object} tableMeta - Table metadata from DB
 * @param {object|null} user - Authenticated user (JWT payload) or null
 * @param {string|null} linkToken - ?token= query parameter for link_access
 * @returns {boolean}
 */
export function hasTableAccess(tableMeta, user, linkToken = null) {
    // Link access
    if (tableMeta.state === TABLE_STATES.LINK_ACCESS && linkToken && linkToken === tableMeta.link) {
        return true;
    }

    // Public tables
    if (isPublicState(tableMeta.state)) {
        return true;
    }

    // Owner or admin
    if (user) {
        const isOwner = tableMeta.owner_id && String(tableMeta.owner_id) === String(user.sub);
        const isAdmin = user.role === 'admin';
        if (isOwner || isAdmin) return true;
    }

    return false;
}

/**
 * Check if a user can edit a table.
 * @param {object} tableMeta - Table metadata from DB (needs owner_id, state)
 * @param {object} user - Authenticated user (JWT payload)
 * @returns {boolean}
 */
export function canEditTable(tableMeta, user) {
    const isOwner = tableMeta.owner_id && String(tableMeta.owner_id) === String(user.sub);
    const isAdmin = user.role === 'admin';
    const isMod = user.role === 'moderator';

    if (!isAdmin && !isMod && !isOwner) return false;
    if (tableMeta.state === TABLE_STATES.DELETED && !isAdmin) return false;

    return true;
}
