/**
 * Token Tracker API — usage analytics
 */
import { Hono } from 'hono'
import { getDb } from '../lib/db.js'

export const tokenRoutes = new Hono()

tokenRoutes.get('/admin/tokens/summary', (c) => {
  const db = getDb()
  const period = c.req.query('period') || '7d'
  let dateFilter = ''
  if (period === '7d') dateFilter = " AND created_at >= datetime('now', '-7 days')"
  else if (period === '30d') dateFilter = " AND created_at >= datetime('now', '-30 days')"

  const row = db.prepare(`SELECT 
    COALESCE(SUM(tokens_used),0) as total_tokens,
    COALESCE(SUM(cost_usd),0) as total_cost_usd,
    COUNT(*) as total_requests
    FROM council_jobs WHERE status != 'deleted'${dateFilter}`).get()
  
  const rates = db.prepare("SELECT value FROM settings WHERE key = 'exchange_rates'").get()
  let rubRate = 92.5
  try { rubRate = JSON.parse(rates?.value || '{}').USD || 92.5 } catch(e) {}

  return c.json({
    total_tokens: row.total_tokens,
    total_cost_usd: Math.round(row.total_cost_usd * 10000) / 10000,
    total_cost_rub: Math.round(row.total_cost_usd * rubRate * 100) / 100,
    avg_per_request: row.total_requests > 0 ? Math.round(row.total_tokens / row.total_requests) : 0,
    total_requests: row.total_requests,
    period
  })
})

tokenRoutes.get('/admin/tokens/by-model', (c) => {
  const db = getDb()
  const rows = db.prepare(`SELECT provider, SUM(tokens_used) as tokens, SUM(cost_usd) as cost_usd, COUNT(*) as requests 
    FROM council_jobs WHERE status != 'deleted' GROUP BY provider`).all()
  return c.json(rows)
})

tokenRoutes.get('/admin/tokens/by-day', (c) => {
  const db = getDb()
  const rows = db.prepare(`SELECT DATE(created_at) as date, SUM(tokens_used) as tokens, SUM(cost_usd) as cost_usd, COUNT(*) as requests 
    FROM council_jobs WHERE status != 'deleted' GROUP BY DATE(created_at) ORDER BY date`).all()
  return c.json(rows)
})

tokenRoutes.get('/admin/tokens/by-agent', (c) => {
  const db = getDb()
  const jobs = db.prepare(`SELECT persona_results, provider, tokens_used, cost_usd FROM council_jobs WHERE status != 'deleted' AND persona_results IS NOT NULL`).all()
  const agents = {}
  for (const job of jobs) {
    try {
      const results = JSON.parse(job.persona_results)
      const agentList = Array.isArray(results) ? results : Object.values(results)
      for (const agent of agentList) {
        const name = agent.name || agent.persona || job.provider
        if (!agents[name]) agents[name] = { agent: name, tokens: 0, cost_usd: 0, requests: 0 }
        agents[name].tokens += agent.tokens?.input + agent.tokens?.output || 0
        agents[name].cost_usd += job.cost_usd / (agentList.length || 1)
        agents[name].requests += 1
      }
    } catch(e) {
      const p = job.provider || 'unknown'
      if (!agents[p]) agents[p] = { agent: p, tokens: 0, cost_usd: 0, requests: 0 }
      agents[p].tokens += job.tokens_used || 0
      agents[p].cost_usd += job.cost_usd || 0
      agents[p].requests += 1
    }
  }
  return c.json(Object.values(agents))
})
