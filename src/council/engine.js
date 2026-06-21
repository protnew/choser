/**
 * Council Engine — LLM Router + Personas + Consensus
 */
import { createHash } from 'node:crypto'
import { getDb } from '../lib/db.js'

// Provider configs
const PROVIDERS = {
  openrouter: {
    baseUrl: () => 'https://openrouter.ai/api/v1',
    apiKey: () => process.env.OPENROUTER_API_KEY,
    model: 'nvidia/nemotron-3-super-120b-a12b:free',  // Best free model (tested 2026-05-09)
    weight: 95,
    pricing: { input: 0, output: 0 },  // Free tier
    headers: () => ({
      'HTTP-Referer': 'https://choser.org',
      'X-Title': 'Choser Engine'
    })
  },
  zai: {
    baseUrl: () => process.env.ZAI_BASE_URL || 'https://open.bigmodel.cn/api/coding/paas/v4',
    apiKey: () => process.env.ZAI_API_KEY,
    model: 'glm-5.1',
    weight: 80,
    pricing: { input: 0.001, output: 0.001 } // per 1K tokens (approx)
  },
  google: {
    baseUrl: () => 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: () => process.env.GOOGLE_API_KEY,
    model: 'gemini-2.0-flash',
    weight: 100,
    pricing: { input: 0.0, output: 0.0 } // free tier
  },
  openai: {
    baseUrl: () => {
      const url = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
      if (url.includes('z.ai') || url.includes('bigmodel')) return null
      return url
    },
    apiKey: () => {
      const baseUrl = process.env.OPENAI_BASE_URL || ''
      if (baseUrl.includes('z.ai') || baseUrl.includes('bigmodel')) return null
      return process.env.OPENAI_API_KEY
    },
    model: 'gpt-4o',
    weight: 90,
    pricing: { input: 0.005, output: 0.015 }
  },
  local: {
    baseUrl: () => process.env.QWEN_BASE_URL || 'http://127.0.0.1:8081/v1',
    apiKey: () => 'local',
    model: 'qwen3.6-uncensored',
    weight: 1,
    pricing: { input: 0, output: 0 }
  }
}

// Circuit breaker state (in-memory)
const circuitState = {}
// { provider: { failures: 0, lastFailure: timestamp, open: false, lastCheck: timestamp } }

function isCircuitOpen(provider) {
  const state = circuitState[provider]
  if (!state || !state.open) return false

  // Half-open after 30 sec
  if (Date.now() - state.lastFailure > 30000) {
    state.open = false
    return false
  }
  return true
}

function recordFailure(provider) {
  if (!circuitState[provider]) circuitState[provider] = { failures: 0, open: false }
  circuitState[provider].failures++
  circuitState[provider].lastFailure = Date.now()

  if (circuitState[provider].failures >= 3) {
    circuitState[provider].open = true
    // Invalidate cache for this provider
    try {
      const db = getDb()
      db.prepare('DELETE FROM llm_cache WHERE provider = ?').run(provider)
    } catch (e) { }
  }
}

function recordSuccess(provider) {
  if (circuitState[provider]) {
    circuitState[provider].failures = 0
    circuitState[provider].open = false
  }
}

// Get ordered provider list (skip open circuits)
function getProviderOrder(preferred) {
  const order = []
  if (preferred && PROVIDERS[preferred]) order.push(preferred)

  for (const [name, config] of Object.entries(PROVIDERS)) {
    if (!order.includes(name) && config.apiKey()) order.push(name)
  }

  return order.filter(p => !isCircuitOpen(p))
}

// LLM call with fallback
async function callLLM(systemPrompt, userPrompt, providerName = null, modelOverride = null) {
  const providers = getProviderOrder(providerName)
  if (providers.length === 0) throw new Error('No LLM providers available')

  // Check cache
  const cacheKey = createHash('sha256')
    .update(JSON.stringify({ system: systemPrompt, user: userPrompt, model: modelOverride || 'default' }))
    .digest('hex')

  const db = getDb()
  const cached = db.prepare("SELECT response FROM llm_cache WHERE hash = ? AND expires_at > datetime('now')").get(cacheKey)
  if (cached) {
    return { ...JSON.parse(cached.response), from_cache: true }
  }

  // Try providers in order
  for (const provider of providers) {
    const config = PROVIDERS[provider]
    const model = modelOverride || config.model

    try {
      const result = await callProvider(provider, config, model, systemPrompt, userPrompt)

      // Cache for 24h
      db.prepare("INSERT OR REPLACE INTO llm_cache (hash, provider, response, expires_at) VALUES (?, ?, ?, datetime('now', '+24 hours'))")
        .run(cacheKey, provider, JSON.stringify(result))

      recordSuccess(provider)
      return result
    } catch (err) {
      recordFailure(provider)
      console.warn(`[LLM] ${provider} failed: ${err.message}, trying next...`)
    }
  }

  throw new Error('All LLM providers failed')
}

async function callProvider(provider, config, model, systemPrompt, userPrompt) {
  const apiKey = config.apiKey()
  if (!apiKey) throw new Error(`No API key for ${provider}`)

  if (provider === 'google') {
    // Gemini API format
    const url = `${config.baseUrl()}/models/${model}:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
      }),
      signal: AbortSignal.timeout(90000)
    })

    if (!response.ok) throw new Error(`Gemini ${response.status}`)
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const usage = data.usageMetadata || {}

    return {
      text,
      provider,
      model,
      tokens: { input: usage.promptTokenCount || 0, output: usage.candidatesTokenCount || 0 }
    }
  }

  // OpenAI-compatible (openrouter, zai, openai, local)
  const url = `${config.baseUrl()}/chat/completions`
  const extraHeaders = config.headers ? config.headers() : {}
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...extraHeaders
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4096
    }),
    signal: AbortSignal.timeout(90000)
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`${provider} ${response.status}: ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''
  const usage = data.usage || {}

  return {
    text,
    provider,
    model,
    tokens: { input: usage.prompt_tokens || 0, output: usage.completion_tokens || 0 }
  }
}

// ─── Main Council Runner ───

export async function runCouncil(db, jobId, topic, alternatives, criteria, personas, log) {
  let totalTokens = 0
  let totalCost = 0
  const personaResults = []

  // Sanitize inputs (prevent prompt injection)
  const safeTopic = sanitizePrompt(topic, 500)
  const safeAlternatives = alternatives.map(a => sanitizePrompt(a, 200))

  for (const persona of personas) {
    const systemPrompt = persona.system_prompt

    const userPrompt = buildUserPrompt(safeTopic, safeAlternatives, criteria, persona)

    try {
      const result = await callLLM(
        systemPrompt,
        userPrompt,
        persona.model_override ? Object.keys(PROVIDERS).find(p => PROVIDERS[p].model === persona.model_override) : null,
        persona.model_override
      )

      // Parse persona response (expect JSON)
      let parsed
      try {
        // Extract JSON from markdown code block if needed
        const jsonMatch = result.text.match(/```json\s*([\s\S]*?)```/) || result.text.match(/({[\s\S]*})/)
        parsed = JSON.parse(jsonMatch ? jsonMatch[1] : result.text)
      } catch {
        parsed = { raw_response: result.text, error: 'Failed to parse JSON' }
      }

      // Normalize scores: array → object, nested → flat
      let normalizedScores = parsed.scores || parsed
      if (Array.isArray(normalizedScores)) {
        // [{name: "Samsung", scores: {...}, total: 15}] → {"Samsung": 15}
        const obj = {}
        for (const item of normalizedScores) {
          if (item.name && item.total !== undefined) {
            obj[item.name] = item.total
          } else if (item.name && item.scores && typeof item.scores === 'object') {
            const vals = Object.values(item.scores).filter(v => typeof v === 'number')
            obj[item.name] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : 0
          }
        }
        normalizedScores = Object.keys(obj).length > 0 ? obj : parsed
      }

      personaResults.push({
        persona: persona.name,
        role: persona.role,
        scores: normalizedScores,
        confidence: parsed.confidence || 5,
        reasoning: parsed.reasoning || null,
        source_references: parsed.sources || [],
        provider: result.provider,
        model: result.model,
        tokens: result.tokens
      })

      totalTokens += (result.tokens.input + result.tokens.output)
      if (!result.from_cache) {
        const pricing = PROVIDERS[result.provider]?.pricing || { input: 0, output: 0 }
        totalCost += (result.tokens.input * pricing.input + result.tokens.output * pricing.output) / 1000
      }
    } catch (err) {
      personaResults.push({
        persona: persona.name,
        role: persona.role,
        error: err.message
      })
    }
  }

  // Consensus calculation
  const consensus = calculateConsensus(personaResults, alternatives)

  // Update job
  db.prepare(`UPDATE council_jobs SET
    status = 'completed',
    persona_results = ?,
    final_decision = ?,
    tokens_used = ?,
    cost_usd = ?,
    completed_at = datetime('now')
  WHERE id = ?`).run(
    JSON.stringify(personaResults),
    JSON.stringify(consensus),
    totalTokens,
    totalCost,
    jobId
  )

  log.info({ jobId, winner: consensus.winner, tokens: totalTokens, cost: totalCost }, 'Council completed')

  return consensus
}

function buildUserPrompt(topic, alternatives, criteria, persona) {
  const altList = alternatives.map((a, i) => `${i + 1}. ${a}`).join('\n')
  const critList = criteria
    ? criteria.map(c => `- ${c.name || c} (weight: ${c.weight || 10}%)`).join('\n')
    : 'Оцени по стандартным критериям для данного типа решений.'

  return `Оцени следующие варианты выбора по роли "${persona.role}":

ТЕМА: ${topic}

ВАРИАНТЫ:
${altList}

КРИТЕРИИ:
${critList}

Ответь JSON (ВАЖНО: используй ТОЧНЫЕ названия вариантов как в списке выше, без нумерации):
{
  "scores": { "${alternatives[0]}": 8, "${alternatives[1]}": 7 },
  "confidence": N (1-10),
  "reasoning": "почему так",
  "sources": [{"claim": "...", "source": "URL|экспертная|расчёт"}]
}`
}

function calculateConsensus(personaResults, alternatives) {
  const EXPONENT = 1.5
  const scores = {}

  // Initialize
  alternatives.forEach((_, i) => { scores[i] = { total: 0, weight_sum: 0, details: [] } })

  for (const result of personaResults) {
    if (result.error || !result.scores) continue

    const provider = result.provider || 'unknown'
    const weight = PROVIDERS[provider]?.weight || 1
    const adjustedWeight = Math.pow(weight, EXPONENT)
    const confidence = result.confidence || 5

    for (const [altName, score] of Object.entries(result.scores)) {
      // Fuzzy match: try exact, then contains, then index-based
      let idx = alternatives.indexOf(altName)
      if (idx === -1) {
        // Try: altName contains the alternative text
        idx = alternatives.findIndex(a => altName.includes(a) || a.includes(altName))
      }
      if (idx === -1) {
        // Try: extract number from altName ("Вариант 1" → 0)
        const numMatch = altName.match(/(\d+)/)
        if (numMatch) idx = parseInt(numMatch[1]) - 1
      }
      if (idx === -1 || idx >= alternatives.length) continue

      scores[idx].total += score * confidence * adjustedWeight
      scores[idx].weight_sum += confidence * adjustedWeight
      scores[idx].details.push({
        persona: result.persona,
        score,
        confidence,
        weight: adjustedWeight
      })
    }
  }

  // Calculate weighted averages
  const ranked = Object.entries(scores)
    .map(([idx, data]) => ({
      alternative: alternatives[parseInt(idx)],
      score: data.weight_sum > 0 ? Math.round(data.total / data.weight_sum * 100) / 100 : 0,
      details: data.details
    }))
    .sort((a, b) => b.score - a.score)

  // Bias detection
  const allScores = ranked.map(r => r.score)
  const biasDetected = allScores.every(s => s > 8) || allScores.every(s => s < 3)

  return {
    winner: ranked[0]?.alternative || null,
    rankings: ranked,
    bias_warning: biasDetected ? 'Все оценки очень высокие или очень низкие — возможен groupthink' : null,
    persona_count: personaResults.length,
    timestamp: new Date().toISOString()
  }
}

// ─── Prompt Sanitization ───

const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all|prior)\s+(instructions?|prompts?|rules?)/gi,
  /system\s*:/gi,
  /\{\{/g,
  /\}\}/g,
  /\[INST\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /###\s*(system|instruction)/gi,
  /you\s+are\s+now/gi
]

export function sanitizePrompt(text, maxLen = 500) {
  if (typeof text !== 'string') return ''
  let safe = text.slice(0, maxLen)

  for (const pattern of INJECTION_PATTERNS) {
    safe = safe.replace(pattern, '[FILTERED]')
  }

  // Remove null bytes and control chars (except newline/tab)
  safe = safe.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  return safe.trim()
}

export { callLLM, getProviderOrder, circuitState }
