// JSON-RPC helpers
export const jsonRpcResponse = (id, result) => ({ jsonrpc: "2.0", id, result });
export const jsonRpcError = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

// Resource handlers
export function handleResourcesList(db, body) {
    return db.prepare(`SELECT id, title, description, updated_at FROM tables WHERE state != ? LIMIT 50`)
        .bind(3).all()
        .then(({ results }) => jsonRpcResponse(body.id, {
            resources: results.map(t => ({
                uri: `choser://tables/${t.id}`,
                name: t.title,
                description: t.description || '',
                mimeType: 'application/json'
            }))
        }))
        .catch(() => jsonRpcResponse(body.id, { resources: [] }));
}

export async function handleResourcesRead(db, body) {
    const uri = body.params?.uri;
    const tableMatch = uri?.match(/choser:\/\/tables\/(\d+)/);
    if (!tableMatch) return jsonRpcError(body.id, -32602, 'Invalid resource URI');

    const tableId = parseInt(tableMatch[1]);
    const table = await db.prepare('SELECT * FROM tables WHERE id = ?').bind(tableId).first();
    if (!table) return jsonRpcError(body.id, -32602, 'Table not found');

    const { results: rows } = await db.prepare('SELECT * FROM rows WHERE table_id = ? ORDER BY row_number').bind(tableId).all();
    const { results: params } = await db.prepare('SELECT * FROM params WHERE table_id = ? ORDER BY sort_order').bind(tableId).all();

    return jsonRpcResponse(body.id, {
        contents: [{
            uri, mimeType: 'application/json',
            text: JSON.stringify({ table, rows, params }, null, 2)
        }]
    });
}
