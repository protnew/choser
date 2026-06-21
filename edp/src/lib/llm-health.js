/**
 * LLM Health Check — cached status per provider
 * Background refresh every 60 seconds
 */

const healthStatus = {}
const CHECK_INTERVAL_MS = 60 * 1000

export function startHealthCheckTimer(log) {
  // Initial check
  checkAllProviders(log)

  const timer = setInterval(() => {
    checkAllProviders(log)
  }, CHECK_INTERVAL_MS)

  timer.unref()
  log.info('LLM health check timer started (60s)')
}

async function checkAllProviders(log) {
  const providers = ['zai', 'google', 'openai', 'local', 'openrouter', 'hermes', 'groq']

  for (const provider of providers) {
    const apiKey = getApiKey(provider)
    if (!apiKey) {
      healthStatus[provider] = { status: 'not_configured', last_check: new Date().toISOString() }
      continue
    }

    try {
      const baseUrl = getBaseUrl(provider)
      // Simple models list request — lightweight health check
      const response = await fetch(`${baseUrl}/models`, {
        headers: getHeaders(provider, apiKey),
        signal: AbortSignal.timeout(5000)
      })

      healthStatus[provider] = {
        status: response.ok ? 'ok' : 'error',
        http_status: response.status,
        last_check: new Date().toISOString()
      }
    } catch (err) {
      healthStatus[provider] = {
        status: 'unreachable',
        error: err.message,
        last_check: new Date().toISOString()
      }
    }
  }
}

function getApiKey(provider) {
  switch (provider) {
    case 'zai': return process.env.ZAI_API_KEY || process.env.OPENAI_API_KEY || null
    case 'google': return process.env.GOOGLE_API_KEY || null
    case 'openai': {
      const baseUrl = process.env.OPENAI_BASE_URL || ''
      // If it's a ZAI URL, skip — use 'zai' provider instead
      if (baseUrl.includes('z.ai') || baseUrl.includes('bigmodel')) return null
      return process.env.OPENAI_API_KEY || null
    }
    case 'local': return process.env.QWEN_BASE_URL ? 'local' : null
    case 'openrouter': return process.env.OPENROUTER_API_KEY || null
    case 'hermes': return 'hermes-choser-internal-2026' // Internal key
    case 'groq': return process.env.GROQ_API_KEY || null
    default: return null
  }
}

function getBaseUrl(provider) {
  switch (provider) {
    case 'zai': return process.env.ZAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/coding/paas/v4'
    case 'google': return 'https://generativelanguage.googleapis.com/v1beta'
    case 'openai': {
      const url = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
      if (url.includes('z.ai') || url.includes('bigmodel')) return null
      return url
    }
    case 'local': return process.env.QWEN_BASE_URL || 'http://127.0.0.1:8081/v1'
    case 'openrouter': return 'https://openrouter.ai/api/v1'
    case 'hermes': return 'http://127.0.0.1:9090/v1'
    case 'groq': return 'https://api.groq.com/openai/v1'
    default: return null
  }
}

function getHeaders(provider, apiKey) {
  if (provider === 'google') {
    return { 'x-goog-api-key': apiKey }
  }
  return { 'Authorization': `Bearer ${apiKey}` }
}

export function getHealthStatus() {
  return { ...healthStatus }
}
