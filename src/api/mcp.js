import { Hono } from 'hono';
import { TABLE_STATES } from '../utils/db.js';
import { jsonRpcResponse, jsonRpcError, handleResourcesList, handleResourcesRead } from './mcpResources.js';
import { handleToolsList } from './mcpTools.js';
import { handleToolCall } from './mcpToolCalls.js';

const mcp = new Hono();

// SSE endpoint
mcp.get('/sse', async (c) => {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const textEncoder = new TextEncoder();
    writer.write(textEncoder.encode(`event: endpoint\ndata: /mcp/messages?sessionId=test-session\n\n`));
    return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
    });
});

// JSON-RPC message handler
mcp.post('/messages', async (c) => {
    const body = await c.req.json();
    const db = c.env.DB;

    if (body.method === 'initialize') {
        return c.json(jsonRpcResponse(body.id, {
            protocolVersion: '2024-11-05',
            capabilities: { resources: {}, tools: {} },
            serverInfo: { name: 'choser-engine', version: '2.0.0' }
        }));
    }

    if (body.method?.startsWith('notifications/')) {
        return new Response(null, { status: 204 });
    }

    if (body.method === 'resources/list') {
        return c.json(await handleResourcesList(db, body));
    }

    if (body.method === 'resources/read') {
        return c.json(await handleResourcesRead(db, body));
    }

    if (body.method === 'tools/list') {
        return c.json(handleToolsList(body));
    }

    if (body.method === 'tools/call') {
        try {
            const result = await handleToolCall(db, c.env, body);
            return c.json(result);
        } catch (e) {
            return c.json(jsonRpcError(body.id, -32000, e.message));
        }
    }

    return c.json(jsonRpcError(body.id || null, -32601, 'Method not found'));
});

export default mcp;
