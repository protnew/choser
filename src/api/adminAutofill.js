/**
 * AI Auto-Fill from URLs - Extract product characteristics from web pages using LLM.
 * Takes a URL, fetches the page content, and uses LLM to extract product/option
 * characteristics to fill a table row.
 */
import { Hono } from 'hono'
import { callWithChain as llmChain } from '../llm/providers.js'

export const autofillRoutes = new Hono()

// POST /admin/autofill/url - Extract data from URL
autofillRoutes.post('/admin/autofill/url', async (c) => {
  const db = c.get('db')
  if (!db) return c.json({ error: 'DB not available' }, 500)

  const body = await c.req.json().catch(() => ({}))
  const { url, tableId } = body

  if (!url) return c.json({ error: 'url is required' }, 400)

  // Validate URL format
  let parsedUrl
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return c.json({ error: 'Only http/https URLs are supported' }, 400)
    }
  } catch {
    return c.json({ error: 'Invalid URL format' }, 400)
  }

  // 1. Fetch URL content
  let html
  let sourceLength = 0
  let pageTitle = parsedUrl.hostname

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChoserEDP/1.0; +https://choser.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!resp.ok) {
      return c.json({ error: 'Failed to fetch URL: HTTP ' + resp.status, url }, 502)
    }

    html = await resp.text()
    sourceLength = html.length

    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) pageTitle = titleMatch[1].trim()
  } catch (e) {
    return c.json({
      error: 'Failed to fetch URL: ' + (e.message || String(e)),
      hint: 'The container may not have internet access, or the URL may be unreachable.',
      url
    }, 502)
  }

  // 2. Strip HTML tags to text content
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // 3. Cut text to ~4000 chars
  const truncatedText = text.substring(0, 4000)

  // 4. Build prompt based on whether tableId is provided
  let systemPrompt, userMessage

  if (tableId) {
    // Load column definitions for this table
    const table = db.prepare(
      "SELECT id, title, description FROM tables WHERE id = ? AND state != 'deleted'"
    ).bind(tableId).get()
    if (!table) return c.json({ error: 'Table not found' }, 404)

    const colRow = db.prepare('SELECT definition FROM columns WHERE table_id = ?').bind(tableId).get()
    if (!colRow || !colRow.definition) {
      return c.json({ error: 'No columns defined for this table' }, 400)
    }

    let columns
    try {
      columns = JSON.parse(colRow.definition)
    } catch {
      return c.json({ error: 'Failed to parse columns definition' }, 500)
    }

    const columnInfo = columns.map(col => {
      return '"' + col.title + '" (' + (col.type || 'text') + (col.description ? ': ' + col.description : '') + ')'
    }).join(', ')

    systemPrompt = `You are a data extraction assistant. Extract product or option characteristics from web page text and map them to the given table columns.
Rules:
- Extract values that match each column as accurately as possible.
- Use null for columns where no relevant data is found.
- For numeric columns, extract only the number (no units or currency symbols unless part of the value).
- Respond ONLY with valid JSON, no markdown fences, no explanation.`

    userMessage = `Extract product characteristics from this web page text.
Columns: ${columnInfo}
Page text: ${truncatedText}
Respond ONLY in JSON: {column_name: extracted_value, ...}`
  } else {
    systemPrompt = `You are a data extraction assistant. Identify and extract key product or option characteristics from web page text.
Rules:
- Identify the most important characteristics (name, price, rating, specs, etc.).
- Use clear, concise names as keys.
- For numeric values, extract only the number.
- Respond ONLY with valid JSON, no markdown fences, no explanation.`

    userMessage = `Extract key product characteristics from this web page text.
Page text: ${truncatedText}
Respond ONLY in JSON: {characteristic_name: value, ...}`
  }

  // 5. Call LLM chain
  let llmResult = null
  let provider = null

  try {
    llmResult = await llmChain(process.env, systemPrompt, userMessage, 0.2)
    provider = llmResult.provider || 'unknown'
  } catch (e) {
    return c.json({ error: 'LLM call failed: ' + e.message, url, title: pageTitle, source_length: sourceLength }, 502)
  }

  const rawText = typeof llmResult === 'string' ? llmResult : (llmResult.text || '')

  // 6. Parse LLM response
  let extracted = {}
  try {
    let jsonStr = rawText.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) jsonStr = fenceMatch[1].trim()

    const braceStart = jsonStr.indexOf('{')
    const braceEnd = jsonStr.lastIndexOf('}')
    if (braceStart !== -1 && braceEnd !== -1) {
      jsonStr = jsonStr.substring(braceStart, braceEnd + 1)
    }

    extracted = JSON.parse(jsonStr)
  } catch (e) {
    return c.json({
      error: 'Failed to parse LLM response as JSON',
      raw_response: rawText.substring(0, 500),
      url,
      title: pageTitle,
      source_length: sourceLength,
      provider
    }, 500)
  }

  // 7. Return response
  return c.json({
    url,
    title: pageTitle,
    extracted,
    source_length: sourceLength,
    provider
  })
})


// LLM helpers moved to ../llm/providers.js
