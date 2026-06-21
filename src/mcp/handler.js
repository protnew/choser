/**
 * MCP Handler — JSON-RPC 2.0 + SSE transport
 */
import { streamSSE } from 'hono/streaming'
import { getDb } from '../lib/db.js'
import { runCouncil, sanitizePrompt } from '../council/engine.js'
import { councilDecideSchema, createTableSchema, getTableSchema, listTablesSchema, explainTableSchema, suggestSimilarSchema } from '../middleware/validate.js'

export async function mcpHandler(c) {
  const db = getDb()

  // SSE transport (GET /mcp/sse)
  if (c.req.method === 'GET') {
    const token = c.req.query('token')

    // Auth check (if enabled)
    if (process.env.AUTH_ENABLED !== 'false' && !token) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    return streamSSE(c, async (stream) => {
      await stream.writeSSE({ event: 'endpoint', data: '/mcp' })

      // Keepalive
      const keepalive = setInterval(async () => {
        try {
          await stream.writeSSE({ event: 'ping', data: '' })
        } catch { clearInterval(keepalive) }
      }, 15000)

      stream.onAbort(() => clearInterval(keepalive))
    })
  }

  // JSON-RPC (POST /mcp)
  if (c.req.method === 'POST') {
    const body = await c.req.json()
    const { jsonrpc, method, params, id } = body

    if (jsonrpc !== '2.0') {
      return c.json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id })
    }

    try {
      const result = await handleMcpMethod(method, params, db, c)
      return c.json({ jsonrpc: '2.0', result, id })
    } catch (err) {
      return c.json({ jsonrpc: '2.0', error: { code: -32603, message: err.message }, id })
    }
  }

  return c.json({ error: 'Method not allowed' }, 405)
}

async function handleMcpMethod(method, params, db, c) {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'choser-edp', version: '1.0.0' }
      }

    case 'tools/list':
      return {
        tools: [
          {
            name: 'council_decide',
            description: 'Запустить AI-Совет для принятия решения. Агенты в разных ролях (CFO, CISO, CEO, Tech Lead) оценивают варианты и выносят consensus.',
            inputSchema: {
              type: 'object',
              properties: {
                topic: { type: 'string', description: 'Тема решения', maxLength: 500 },
                alternatives: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Варианты (2-10)',
                  minItems: 2, maxItems: 10
                },
                criteria: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      weight: { type: 'number', minimum: 1, maximum: 100 }
                    }
                  },
                  description: 'Критерии оценки (опционально)',
                  maxItems: 20
                }
              },
              required: ['topic', 'alternatives']
            }
          },
          {
            name: 'create_table',
            description: 'Создать таблицу параметрического выбора',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                columns: { type: 'array' },
                rows: { type: 'array' }
              },
              required: ['id', 'title']
            }
          },
          {
            name: 'get_table',
            description: 'Получить таблицу с данными + TCO/IRR/ROIC',
            inputSchema: {
              type: 'object',
              properties: { id: { type: 'string' } },
              required: ['id']
            }
          },
          {
            name: 'list_tables',
            description: 'Поиск таблиц по названию/тегу (cursor pagination)',
            inputSchema: {
              type: 'object',
              properties: {
                q: { type: 'string', description: 'FTS5 search query' },
                tag: { type: 'string' },
                cursor: { type: 'string' },
                limit: { type: 'number', default: 50, maximum: 200 }
              }
            }
          },
          {
            name: 'explain_table',
            description: 'Объяснить почему выбран данный вариант (LLM rationale)',
            inputSchema: {
              type: 'object',
              properties: { id: { type: 'string' } },
              required: ['id']
            }
          },
          {
            name: 'suggest_similar',
            description: 'Найти похожие решения (FTS5 search)',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query']
            }
          }
        ]
      }

    case 'tools/call':
      return await handleToolCall(params, db, c)

    default:
      throw new Error(`Unknown method: ${method}`)
  }
}

async function handleToolCall(params, db, c) {
  const toolName = params?.name
  const args = params?.arguments || {}

  switch (toolName) {
    case 'council_decide': {
      const validation = councilDecideSchema.safeParse(args)
      if (!validation.success) {
        const errors = validation.error.issues?.map(i => `${i.path.join('.')}: ${i.message}`) || ['Validation failed']
        throw new Error(`Validation: ${errors.join('; ')}`)
      }
      const { topic, alternatives, criteria } = validation.data

      // Create job
      const result = db.prepare(`INSERT INTO council_jobs (topic, alternatives, criteria, status)
        VALUES (?, ?, ?, 'running')`).run(
        sanitizePrompt(topic, 500), JSON.stringify(alternatives.map(a => sanitizePrompt(a, 200))), criteria ? JSON.stringify(criteria) : null
      )
      const jobId = result.lastInsertRowid

      const personas = c.get('personas')
      const selectedPersonas = Object.values(personas).slice(0, 4)
      const log = c.get('log')

      const councilResult = await runCouncil(db, jobId, topic, alternatives, criteria, selectedPersonas, log)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(councilResult, null, 2)
        }]
      }
    }

    case 'create_table': {
      const { id, title, description, columns, rows } = args

      // Validation
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new Error('id is required and must be a non-empty string')
      }
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new Error('title is required and must be a non-empty string')
      }
      if (id.length > 200) throw new Error('id must be <= 200 chars')
      if (title.length > 500) throw new Error('title must be <= 500 chars')

      // Validate columns structure
      if (columns) {
        if (!Array.isArray(columns)) throw new Error('columns must be an array')
        if (columns.length > 50) throw new Error('max 50 columns')
        for (const col of columns) {
          if (!col.key || typeof col.key !== 'string') throw new Error('each column must have a string "key"')
          if (col.weight !== undefined && (typeof col.weight !== 'number' || col.weight < 0 || col.weight > 100)) {
            throw new Error('column weight must be 0-100')
          }
        }
        // Check weight sum ≈ 100 (for weighted columns)
        const weightedCols = columns.filter(c => c.weight > 0)
        if (weightedCols.length > 0) {
          const weightSum = weightedCols.reduce((s, c) => s + (c.weight || 0), 0)
          if (Math.abs(weightSum - 100) > 5) {
            throw new Error(`weighted columns sum to ${weightSum}, expected ~100`)
          }
        }
      }

      // Validate rows structure
      if (rows) {
        if (!Array.isArray(rows)) throw new Error('rows must be an array')
        if (rows.length > 100) throw new Error('max 100 rows')
        if (rows.length < 2) throw new Error('need at least 2 rows for a comparison')
        for (const row of rows) {
          if (!row.name || typeof row.name !== 'string') throw new Error('each row must have a string "name"')
        }
      }

      // Check if table already exists
      const existing = db.prepare('SELECT id FROM tables WHERE id = ?').get(id)

      db.transaction(() => {
        db.prepare('INSERT OR REPLACE INTO tables (id, title, description, param_count, object_count) VALUES (?, ?, ?, ?, ?)')
          .run(id, title.trim(), (description || '').trim(), columns?.length || 0, rows?.length || 0)
        if (columns) {
          db.prepare('INSERT OR REPLACE INTO columns (table_id, definition) VALUES (?, ?)')
            .run(id, JSON.stringify(columns))
        }
        if (rows) {
          db.prepare('DELETE FROM rows WHERE table_id = ?').run(id)
          for (const row of rows) {
            db.prepare('INSERT INTO rows (table_id, data) VALUES (?, ?)').run(id, JSON.stringify(row))
          }
        }
      })()

      const action = existing ? 'updated' : 'created'
      return { content: [{ type: 'text', text: `Table "${title}" ${action} with id=${id}, ${columns?.length || 0} columns, ${rows?.length || 0} rows` }] }
    }

    case 'get_table': {
      const { id } = args
      const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id)
      if (!table) throw new Error(`Table ${id} not found`)

      const columns = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(id)
      const rows = db.prepare('SELECT * FROM rows WHERE table_id = ?').all(id)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            meta: table,
            columns: columns?.definition ? JSON.parse(columns.definition) : null,
            rows: rows.map(r => ({ ...r, data: JSON.parse(r.data) }))
          }, null, 2)
        }]
      }
    }

    case 'list_tables': {
      const { q, tag, cursor, limit = 50 } = args
      let results

      if (q) {
        const safeSearch = q.replace(/"/g, '""').trim()
        results = db.prepare(`
          SELECT t.* FROM tables t
          JOIN tables_fts f ON t.id = f.id
          WHERE tables_fts MATCH ? AND t.state != 'deleted'
          LIMIT ?
        `).all(`"${safeSearch}"*`, limit)
      } else {
        results = db.prepare(`
          SELECT * FROM tables WHERE state != 'deleted'
          ORDER BY updated_at DESC LIMIT ?
        `).all(limit)
      }

      if (tag) results = results.filter(t => t.tags?.includes(tag))

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ count: results.length, tables: results.map(t => ({ id: t.id, title: t.title, tags: t.tags })) }, null, 2)
        }]
      }
    }

    case 'explain_table': {
      const { id } = args
      const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id)
      if (!table) throw new Error(`Table ${id} not found`)

      const columnsRow = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(id)
      const columns = columnsRow?.definition ? JSON.parse(columnsRow.definition) : []
      const rows = db.prepare('SELECT * FROM rows WHERE table_id = ?').all(id)
        .map(r => JSON.parse(r.data))

      // Sort by utility desc to find winner
      const sorted = [...rows].sort((a, b) => (b.utility || 0) - (a.utility || 0))
      const winner = sorted[0]
      const runnerUp = sorted[1]

      // Build context for LLM
      const criteriaList = columns.filter(c => c.weight > 0).map(c => `${c.title} (${c.weight}%)`).join(', ')
      const altSummary = rows.map(r => `  - ${r.name}: utility=${r.utility || 'N/A'}`).join('\n')

      const llmPrompt = `Объясни решение из таблицы "${table.title}".

Критерии с весами: ${criteriaList || 'стандартные'}

Варианты:
${altSummary}

Победитель: ${winner?.name} (utility: ${winner?.utility})
Второе место: ${runnerUp?.name} (utility: ${runnerUp?.utility})

Дай краткое объяснение (3-5 предложений): почему победитель лучше, в чём его сильные стороны, и где у него возможные слабости. Отвечай на русском.`

      try {
        const { callLLM } = await import('../council/engine.js')
        const result = await callLLM(
          'Ты — аналитик, объясняешь технические решения на основе параметрического сравнения. Отвечай кратко и по делу.',
          llmPrompt,
          'zai',
          'glm-5.1'
        )
        return { content: [{ type: 'text', text: result.text }] }
      } catch (err) {
        // Fallback to basic explanation if LLM fails
        const basic = `Таблица "${table.title}": ${rows.length} вариантов, ${columns.length} параметров. ` +
          `Победитель: ${winner?.name || 'N/A'} (utility: ${winner?.utility || 'N/A'}). ` +
          `Критерии: ${criteriaList || 'не указаны'}.`
        return { content: [{ type: 'text', text: basic }] }
      }
    }

    case 'suggest_similar': {
      const { query } = args
      const safeSearch = query.replace(/"/g, '""').trim()
      const results = db.prepare(`
        SELECT id, title, tags, utility FROM tables
        JOIN tables_fts ON tables_fts.id = tables.id
        WHERE tables_fts MATCH ? AND state != 'deleted'
        LIMIT 10
      `).all(`"${safeSearch}"*`)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ query, matches: results }, null, 2)
        }]
      }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
