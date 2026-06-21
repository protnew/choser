/**
 * Financial API — TCO, IRR, ROIC calculations
 * Newton-Raphson IRR, materialized column updates
 */
import { Hono } from 'hono'

export const financialRoutes = new Hono()

// GET /tables/:id/tco — TCO breakdown for all rows
financialRoutes.get('/tables/:id/tco', (c) => {
  const db = c.get('db')
  const { id } = c.req.param()

  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id)
  if (!table) return c.json({ error: 'Not found' }, 404)

  const rows = db.prepare('SELECT * FROM rows WHERE table_id = ?').all(id)
  const ratesSetting = db.prepare("SELECT value FROM settings WHERE key = 'exchange_rates'").get()
  const rates = ratesSetting ? JSON.parse(ratesSetting.value) : { USD: 92.5, EUR: 100.1 }

  const breakdown = rows.map(r => {
    const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
    const tco = data?.tco || data?.TCO || {}
    const categories = {
      implementation: Number(tco.implementation) || 0,
      license_annual: Number(tco.license_annual) || 0,
      infrastructure_annual: Number(tco.infrastructure_annual) || 0,
      training: Number(tco.training) || 0,
      support_annual: Number(tco.support_annual) || 0,
      hidden: Number(tco.hidden?.total) || 0
    }
    const filled = Object.values(categories).filter(v => v > 0).length
    const annual = categories.license_annual + categories.infrastructure_annual + categories.support_annual

    return {
      name: data?.name || data?.Название || `Row ${r.id}`,
      currency: r.currency || 'RUB',
      categories,
      tco_1y: r.tco_1y,
      tco_3y: r.tco_3y,
      tco_5y: r.tco_5y,
      partial_warning: filled < 6 ? `⚠️ TCO частичный (${filled}/6 категорий)` : null,
      annual_cost: annual
    }
  })

  // Pool summary — конвертация валют в RUB
  const convertToBase = (amount, currency) => {
    if (!amount || currency === 'RUB' || currency === 'rub') return amount || 0
    const rate = rates[currency]
    return rate ? amount * rate : amount || 0  // fallback: использовать как есть
  }

  const totalTco3y = rows.reduce((sum, r) => {
    const amount = r.tco_3y || 0
    const currency = r.currency || 'RUB'
    return sum + convertToBase(amount, currency)
  }, 0)

  const totalTco5y = rows.reduce((sum, r) => {
    const amount = r.tco_5y || 0
    const currency = r.currency || 'RUB'
    return sum + convertToBase(amount, currency)
  }, 0)

  return c.json({
    table_id: id,
    title: table.title,
    exchange_rates: rates,
    rows: breakdown,
    pool_tco_3y: totalTco3y,
    pool_tco_5y: totalTco5y
  })
})

// GET /tables/:id/roi — IRR + ROIC for all rows
financialRoutes.get('/tables/:id/roi', (c) => {
  const db = c.get('db')
  const { id } = c.req.param()

  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id)
  if (!table) return c.json({ error: 'Not found' }, 404)

  const rows = db.prepare('SELECT * FROM rows WHERE table_id = ?').all(id)
  const waccSetting = db.prepare("SELECT value FROM settings WHERE key = 'wacc'").get()
  const taxSetting = db.prepare("SELECT value FROM settings WHERE key = 'tax_rate'").get()
  const wacc = waccSetting ? parseFloat(waccSetting.value) : 0.12
  const taxRate = taxSetting ? parseFloat(taxSetting.value) : 0.20

  const analysis = rows.map(r => {
    const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
    const name = data?.name || data?.Название || `Row ${r.id}`

    // Utility / Price ratio
    const utility = data?.utility || table.utility || 0
    const up = r.tco_3y > 0 ? (utility / r.tco_3y) : null

    // Payback (if savings data available)
    const savings = Number(data?.annual_savings) || Number(data?.savings_annual) || 0
    const paybackMonths = savings > 0 && r.tco_1y > 0
      ? Math.round(r.tco_1y / (savings / 12))
      : null

    // IRR display
    const irrDisplay = r.irr_3y !== null && r.irr_3y !== undefined
      ? (r.irr_3y > 0.20 ? '🟢 высокая' : r.irr_3y > 0.05 ? '🟡 умеренная' : '🔴 низкая')
      : 'N/A'

    // ROIC vs WACC
    const roicBeatsWacc = r.roic_3y !== null && r.roic_3y !== undefined ? r.roic_3y > wacc : null

    return {
      name,
      tco_1y: r.tco_1y,
      tco_3y: r.tco_3y,
      tco_5y: r.tco_5y,
      irr_3y: r.irr_3y,
      irr_5y: r.irr_5y,
      irr_display: irrDisplay,
      roic_3y: r.roic_3y,
      roic_5y: r.roic_5y,
      roic_beats_wacc: roicBeatsWacc,
      utility_price: up !== null ? Math.round(up * 100) / 100 : (r.tco_3y === 0 ? '∞' : null),
      payback_months: paybackMonths,
      currency: r.currency || 'RUB'
    }
  })

  return c.json({
    table_id: id,
    title: table.title,
    wacc,
    tax_rate: taxRate,
    rows: analysis
  })
})

// POST /tables/:id/calculate — recalculate TCO/IRR/ROIC via materialized columns
financialRoutes.post('/tables/:id/calculate', (c) => {
  const db = c.get('db')
  const log = c.get('log')
  const { id } = c.req.param()

  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id)
  if (!table) return c.json({ error: 'Not found' }, 404)

  const rows = db.prepare('SELECT * FROM rows WHERE table_id = ?').all(id)
  const taxSetting = db.prepare("SELECT value FROM settings WHERE key = 'tax_rate'").get()
  const taxRate = taxSetting ? parseFloat(taxSetting.value) : 0.20

  let updated = 0
  db.transaction(() => {
    for (const row of rows) {
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
      const tco = calculateTCO(data)
      const irr3 = calculateIRR(tco.tco_1y, tco.tco_3y, data)
      const irr5 = calculateIRR(tco.tco_1y, tco.tco_5y, data)
      const roic3 = calculateROIC(tco.tco_3y, data, taxRate)
      const roic5 = calculateROIC(tco.tco_5y, data, taxRate)

      db.prepare(`UPDATE rows SET
        tco_1y = ?, tco_3y = ?, tco_5y = ?,
        irr_3y = ?, irr_5y = ?,
        roic_3y = ?, roic_5y = ?,
        currency = ?, tco_calculated_at = datetime('now')
        WHERE id = ?`
      ).run(
        tco.tco_1y, tco.tco_3y, tco.tco_5y,
        irr3, irr5,
        roic3, roic5,
        tco.currency || 'RUB',
        row.id
      )
      updated++
    }
  })()

  log.info({ table_id: id, rows_updated: updated }, 'Financial data recalculated')
  return c.json({ success: true, rows_updated: updated })
})

// ─── Calculation helpers ───

function calculateTCO(data) {
  const tco = data?.tco || data?.TCO || {}
  const impl = Number(tco.implementation) || 0
  const lic = Number(tco.license_annual) || 0
  const infra = Number(tco.infrastructure_annual) || 0
  const train = Number(tco.training) || 0
  const support = Number(tco.support_annual) || 0
  const hidden = Number(tco.hidden?.total) || 0

  const annual = lic + infra + support
  return {
    tco_1y: impl + annual + train + hidden || null,
    tco_3y: impl + annual * 3 + train + hidden || null,
    tco_5y: impl + annual * 5 + train + hidden || null,
    currency: tco.currency || null
  }
}

/**
 * Newton-Raphson IRR calculation
 * NPV = -initial + Σ(cashflow_t / (1+IRR)^t) = 0
 * initial guess = 0.1, max 100 iterations, tolerance 0.0001
 */
function calculateIRR(initialInvestment, totalTCO, data) {
  if (!totalTCO || totalTCO <= 0 || !initialInvestment) return null

  const savings = Number(data?.annual_savings) || Number(data?.savings_annual) || 0
  const revenueIncrease = Number(data?.revenue_increase_annual) || 0
  const benefit = savings + revenueIncrease

  if (benefit <= 0) return null // No benefits = no IRR

  // Determine years from TCO ratio
  const years = totalTCO === initialInvestment ? 1 :
    Math.round(totalTCO / (totalTCO - initialInvestment + benefit)) || 3

  // Cash flows: year 0 = -investment, years 1..N = benefit - annual_cost
  const annualCost = (totalTCO - initialInvestment) / Math.max(years, 1)
  const cashflows = [-initialInvestment]
  for (let t = 1; t <= years; t++) {
    cashflows.push(benefit - annualCost)
  }

  // Newton-Raphson
  let irr = 0.1 // initial guess 10%
  const maxIter = 100
  const tolerance = 0.0001

  for (let i = 0; i < maxIter; i++) {
    let npv = 0
    let dnpv = 0

    for (let t = 0; t < cashflows.length; t++) {
      const factor = Math.pow(1 + irr, t)
      npv += cashflows[t] / factor
      if (t > 0) {
        dnpv -= t * cashflows[t] / Math.pow(1 + irr, t + 1)
      }
    }

    if (Math.abs(dnpv) < 1e-12) break // Prevent division by zero
    const newIrr = irr - npv / dnpv

    if (Math.abs(newIrr - irr) < tolerance) return Math.round(newIrr * 10000) / 10000
    irr = newIrr

    // Guard against divergence
    if (irr < -1 || irr > 10 || isNaN(irr)) return null
  }

  return null // Did not converge
}

/**
 * ROIC = NOPAT / Invested Capital
 * NOPAT = (revenue - operating_costs) × (1 - tax_rate)
 */
function calculateROIC(totalTCO, data, taxRate) {
  if (!totalTCO || totalTCO <= 0) return null

  const revenue = Number(data?.revenue_from_project) || Number(data?.annual_revenue) || 0
  const opCosts = Number(data?.operating_costs_annual) || 0

  if (revenue <= 0) return null

  const nopat = (revenue - opCosts) * (1 - taxRate)
  return Math.round((nopat / totalTCO) * 10000) / 10000
}
