import { jsonRpcResponse, jsonRpcError } from './mcpResources.js';

// Tool definitions
export const TOOL_DEFINITIONS = [
    { name: 'search_tables', description: 'Search tables by title or description', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Search query' }, limit: { type: 'number', description: 'Max results (default 10)' } }, required: ['query'] } },
    { name: 'get_table', description: 'Get full table data with rows and parameters', inputSchema: { type: 'object', properties: { table_id: { type: 'number', description: 'Table ID' }, format: { type: 'string', enum: ['full', 'summary'], description: 'Response format' } }, required: ['table_id'] } },
    { name: 'create_table', description: 'Create a new comparison table', inputSchema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, objects: { type: 'array', items: { type: 'string' }, description: 'Object names' }, parameters: { type: 'array', items: { type: 'string' }, description: 'Parameter names' } }, required: ['title'] } },
    { name: 'add_row', description: 'Add a row (object) to a table', inputSchema: { type: 'object', properties: { table_id: { type: 'number' }, object_name: { type: 'string' }, values: { type: 'object', description: 'Param name to value mapping' } }, required: ['table_id', 'object_name'] } },
    { name: 'update_cell', description: 'Update a specific cell value', inputSchema: { type: 'object', properties: { table_id: { type: 'number' }, row_id: { type: 'number' }, param_name: { type: 'string' }, value: { type: 'string' } }, required: ['table_id', 'row_id', 'param_name', 'value'] } },
    { name: 'delete_row', description: 'Delete a row from a table', inputSchema: { type: 'object', properties: { table_id: { type: 'number' }, row_id: { type: 'number' } }, required: ['table_id', 'row_id'] } },
    { name: 'ai_compare', description: 'Run AI comparison analysis on a table', inputSchema: { type: 'object', properties: { table_id: { type: 'number' }, prompt: { type: 'string', description: 'Optional custom prompt' } }, required: ['table_id'] } },
    { name: 'ai_suggest', description: 'Get AI-powered suggestions for table parameters', inputSchema: { type: 'object', properties: { table_id: { type: 'number' }, context: { type: 'string', description: 'Additional context' } }, required: ['table_id'] } },
    { name: 'council_decide', description: 'Run Council of AI agents for decision-making', inputSchema: { type: 'object', properties: { table_id: { type: 'number' }, question: { type: 'string' } }, required: ['table_id'] } },
    { name: 'ebm_analysis', description: 'Run EBM/EVSI analysis on a table', inputSchema: { type: 'object', properties: { table_id: { type: 'number' } }, required: ['table_id'] } },
];

export function handleToolsList(body) {
    return jsonRpcResponse(body.id, { tools: TOOL_DEFINITIONS });
}
