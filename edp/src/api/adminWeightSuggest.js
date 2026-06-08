/**
 * Smart Weight Suggester — AI-suggested weights for comparison table criteria.
 * Uses LLM to analyze table context and suggest optimal weights.
 */
import { Hono } from 'hono'

export const weightSuggestRoutes = new Hono()

// POST /admin/weights/suggest — AI-suggested weights
weightSuggestRoutes.post('/admin/weights/suggest', async (c) => {
  const db = c.get('db')
  if (!db) return c.json({ error: 'DB not available' }, 500)

  const body = await c.req.json()
  const { tableId, context } = body
  if (!tableId) return c.json({ error: 'tableId is required' }, 400)

  const userContext = context || 'balanced evaluation'

  // 1. Load table metadata
  const table = db.prepare(
    "SELECT id, title, description FROM tables WHERE id = ? AND state != 'deleted'"
  ).bind(tableId).get()
  if (!table) return c.json({ error: 'Table not found' }, 404)

  // 2. Load columns definition
  const colRow = db.prepare('SELECT definition FROM columns WHERE table_id = ?').bind(tableId).get()
  if (!colRow || !colRow.definition) return c.json({ error: 'No columns defined for this table' }, 400)

  let columns
  try {
    columns = JSON.parse(colRow.definition)
  } catch {
    return c.json({ error: 'Failed to parse columns definition' }, 500)
  }

  // Build current weights map: title -> weight (as 0-1 fraction)
  const totalWeight = columns.reduce((s, c) => s + (c.weight || 0), 0)
  const currentWeights = {}
  for (const col of columns) {
    if ((col.weight || 0) > 0) {
      currentWeights[col.title] = totalWeight > 0 ? +(col.weight / totalWeight).toFixed(4) : 0
    }
  }

  // 3. Load rows (sample up to 15)
  const rowRecords = db.prepare('SELECT data FROM rows WHERE table_id = ? LIMIT 15').bind(tableId).all()
  const rows = rowRecords.map(r => {
    try { return JSON.parse(r.data) } catch { return {} }
  })

  // Build a concise table summary for the LLM
  const rowDataSummary = rows.map(r => {
    const entry = {}
    entry.name = r.name || 'Unknown'
    for (const col of columns) {
      const raw = r[col.key]
      if (raw == null) {
        entry[col.title] = null
      } else if (typeof raw === 'object') {
        entry[col.title] = raw.grade != null ? raw.grade : raw.value
      } else {
        entry[col.title] = raw
      }
    }
    return entry
  })

  const tableSummary = JSON.stringify({
    title: table.title,
    description: table.description || '',
    criteria: columns.map(c => ({ name: c.title, currentWeight: c.weight || 0, type: c.type || 'text' })),
    objects: rowDataSummary
  }, null, 2)

  // 4. Build prompt
  const systemPrompt = `You are a decision analysis expert specializing in Multi-Criteria Decision Analysis (MCDA). Your task is to suggest optimal weight distributions for comparison table criteria.

Rules:
- Weights must be numbers between 0 and 1 (inclusive).
- All weights MUST sum to exactly 1.0.
- Only assign non-zero weights to criteria that matter for the given goal.
- Consider the actual data in the table when making your suggestion.
- If a criterion has very similar values across all objects, it should get lower weight (low discriminative power).
- If a criterion shows high variation and is relevant to the goal, it should get higher weight.

You MUST respond with valid JSON only, no markdown fences, no extra text. Format:
{"weights": {"criterion_name": weight_value, ...}, "reasoning": "explanation of why these weights are optimal for the stated goal"}`

  const userMessage = `Table data:
${tableSummary}

Current weight distribution: ${JSON.stringify(currentWeights)}

Goal / Context: "${userContext}"

Based on the table data and the stated goal, suggest optimal weights for each criterion. Respond ONLY with valid JSON.`

  // 5. Call LLM chain
  let llmResult = null
  let provider = null

  try {
    llmResult = await callWithChain(process.env, systemPrompt, userMessage, 0.3)
    provider = llmResult.provider || 'unknown'
  } catch (e) {
    return c.json({ error: 'LLM call failed: ' + e.message }, 502)
  }

  const rawText = typeof llmResult === 'string' ? llmResult : (llmResult.text || '')

  // 6. Parse LLM response
  let suggestedWeights = {}
  let reasoning = ''

  try {
    // Try to extract JSON from the response (may be wrapped in markdown code fences)
    let jsonStr = rawText.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) jsonStr = fenceMatch[1].trim()

    // Try to find the JSON object
    const braceStart = jsonStr.indexOf('{')
    const braceEnd = jsonStr.lastIndexOf('}')
    if (braceStart !== -1 && braceEnd !== -1) {
      jsonStr = jsonStr.substring(braceStart, braceEnd + 1)
    }

    const parsed = JSON.parse(jsonStr)

    if (parsed.weights && typeof parsed.weights === 'object') {
      suggestedWeights = parsed.weights
    }
    if (parsed.reasoning) {
      reasoning = parsed.reasoning
    }
  } catch (e) {
    // Fallback: return raw text as reasoning
    reasoning = 'Failed to parse LLM response as JSON. Raw response: ' + rawText.substring(0, 500)
  }

  // Normalize suggested weights to sum to 1.0
  const suggestedTotal = Object.values(suggestedWeights).reduce((s, w) => s + (parseFloat(w) || 0), 0)
  if (suggestedTotal > 0 && Math.abs(suggestedTotal - 1.0) > 0.01) {
    for (const key of Object.keys(suggestedWeights)) {
      suggestedWeights[key] = +((parseFloat(suggestedWeights[key]) || 0) / suggestedTotal).toFixed(4)
    }
  }

  // 7. Return response
  return c.json({
    tableId: table.id,
    title: table.title,
    context: userContext,
    currentWeights,
    suggestedWeights,
    reasoning,
    provider
  })
})

// --- LLM Call Chain ---

async function callWithChain(env, systemPrompt, userMessage, temperature = 0.3) {
  // Try ZAI first (primary provider)
  if (env.ZAI_API_KEY) {
    try {
      const result = await callZAI(env, systemPrompt, userMessage, temperature)
      return { ...result, provider: 'zai' }
    } catch (e) { console.warn('[WeightSuggest] ZAI failed:', e.message) }
  }
  // OpenRouter
  if (env.OPENROUTER_API_KEY) {
    try {
      const result = await callOpenRouter(env, systemPrompt, userMessage, temperature)
      return { ...result, provider: 'openrouter' }
    } catch (e) { console.warn('[WeightSuggest] OpenRouter failed:', e.message) }
  }
  // Groq
  if (env.GROQ_API_KEY) {
    try {
      const result = await callGroq(env, systemPrompt, userMessage, temperature)
      return { ...result, provider: 'groq' }
    } catch (e) { console.warn('[WeightSuggest] Groq failed:', e.message) }
  }
  throw new Error('No LLM provider available. Configure ZAI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY.')
}

async function callZAI(env, systemPrompt, userMessage, temperature) {
  const baseUrl = env.ZAI_BASE_URL || 'https://open.bigmodel.cn/api/coding/paas/v4'
  const model = env.ZAI_MODEL || 'GLM-5.1'
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.ZAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature
    })
  })
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '')
    throw new Error(`ZAI HTTP ${resp.status}: ${errBody.substring(0, 200)}`)
  }
  const data = await resp.json()
  const usage = data.usage || {}
  return {
    text: data.choices?.[0]?.message?.content || '',
    tokens: { input: usage.prompt_tokens || 0, output: usage.completion_tokens || 0 }
  }
}

async function callOpenRouter(env, systemPrompt, userMessage, temperature) {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL || 'hermes-3-llama-3.1-405b:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature
    })
  })
  if (!resp.ok) throw new Error(`OpenRouter HTTP ${resp.status}`)
  const data = await resp.json()
  const usage = data.usage || {}
  return {
    text: data.choices?.[0]?.message?.content || '',
    tokens: { input: usage.prompt_tokens || 0, output: usage.completion_tokens || 0 }
  }
}

async function callGroq(env, systemPrompt, userMessage, temperature) {
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature
    })
  })
  if (!resp.ok) throw new Error(`Groq HTTP ${resp.status}`)
  const data = await resp.json()
  const usage = data.usage || {}
  return {
    text: data.choices?.[0]?.message?.content || '',
    tokens: { input: usage.prompt_tokens || 0, output: usage.completion_tokens || 0 }
  }
}
