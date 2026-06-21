/**
 * Admin Interactive + Sensitivity Curves
 */
import { Hono } from 'hono'
import { callLLM, sanitizePrompt } from '../council/engine.js'

export const adminInteractiveRoutes = new Hono()

// POST /admin/decision/interactive — recalculate rankings with custom simplification params
adminInteractiveRoutes.post('/admin/decision/interactive', async (c) => {
  const db = c.get('db')
  const { removeWeights = false, keepTopParams = 0, scoreScale = 'original', weightFlatten = 0, maxScale = 0 } = await c.req.json().catch(() => ({}))

  // Normalize: support both old API (removeWeights bool, scoreScale string) and new API (weightFlatten 0-100, maxScale 1-10)
  const wFlatten = weightFlatten > 0 ? weightFlatten / 100 : (removeWeights ? 1 : 0)
  const mScale = maxScale > 0 ? maxScale : (scoreScale === 'binary' ? 1 : scoreScale === '3point' ? 3 : 10)

  // Get AI results from DB
  const aiResults = db.prepare(`
    SELECT table_id, table_title, ai_objects, human_objects, match_percent, details
    FROM decision_analytics WHERE type = 'ai_vs_human'
  `).all()

  const isDefault = wFlatten === 0 && keepTopParams === 0 && mScale === 10

  const results = []

  for (const aiRow of aiResults) {
    try {
      const aiObjects = JSON.parse(aiRow.ai_objects || '[]')
      const aiTop3 = aiObjects.slice(0, 3)

      let humanTop3, positionMatch, exactCount, exactPct, inTop3ButWrongPos
      let paramsUsed = 0, paramsTotal = 0

      if (isDefault) {
        // At defaults: no simplification = original vs original = 100% match
        // Still need paramsTotal for grouping charts
        const colRow = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(aiRow.table_id)
        if (colRow) {
          try { paramsTotal = JSON.parse(colRow.definition).filter(c => (c.weight > 0 || c.type === 'number') && c.key).length } catch {}
        }
        const aiTop3Full = JSON.parse(aiRow.ai_objects || '[]').slice(0, 3)
        humanTop3 = [...aiTop3Full]
        exactCount = 3
        exactPct = 100
        inTop3ButWrongPos = 0

        positionMatch = [0, 1, 2].map(i => ({
          position: i + 1,
          ai: aiTop3Full[i] || '—',
          human: aiTop3Full[i] || '—',
          match: true,
          matchType: 'exact'
        }))
      } else {
        // Modified settings: recalculate from raw data
        const colRow = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(aiRow.table_id)
        const rows = db.prepare('SELECT data FROM rows WHERE table_id = ?').all(aiRow.table_id)
        if (!colRow || !rows.length) continue

        const columns = JSON.parse(colRow.definition)
        const paramMap = new Map()
        for (const col of columns) {
          if ((col.weight > 0 || col.type === 'number') && col.key) paramMap.set(col.key, col)
        }
        if (paramMap.size < 2) continue
        paramsTotal = paramMap.size

        const parsedRows = rows.map(r => { try { return JSON.parse(r.data) } catch { return null } }).filter(Boolean)

        let paramKeys = [...paramMap.keys()]
        if (keepTopParams > 0) {
          const keepCount = Math.max(1, Math.round(paramMap.size * keepTopParams / 100))
          const sorted = [...paramKeys].sort((a, b) => (paramMap.get(b)?.weight || 0) - (paramMap.get(a)?.weight || 0))
          paramKeys = sorted.slice(0, keepCount)
        }
        paramsUsed = paramKeys.length

        const roundFn = mScale < 10 ? (v => Math.max(0, Math.min(mScale, Math.round(v / 10 * mScale)))) : (v => v)
        const wBlend = wFlatten // 0 = original weights, 1 = all equal

        const ranked = parsedRows.map(row => {
          let score = 0, totalWeight = 0
          for (const key of paramKeys) {
            const col = paramMap.get(key)
            const raw = row[key]
            const val = raw && typeof raw === 'object' ? (parseFloat(raw.grade) || parseFloat(raw.value) || 0) : (parseFloat(raw) || 0)
            const origW = col?.weight || 1
            const w = origW * (1 - wBlend) + 1 * wBlend
            score += roundFn(val) * w
            totalWeight += w
          }
          const name = row['Название'] || row['name'] || row['Объект'] || Object.values(row)[0] || '?'
          return { name, score: totalWeight > 0 ? +(score / totalWeight).toFixed(4) : 0 }
        }).sort((a, b) => b.score - a.score)

        humanTop3 = ranked.slice(0, 3).map(r => r.name)

        // Smart matching function — strict: requires strong evidence
        const smartMatch = (a, h) => {
          if (!a || !h) return { match: false, type: 'none' }
          const al = a.toLowerCase().trim(), hl = h.toLowerCase().trim()
          if (al === hl) return { match: true, type: 'exact' }
          const norm = s => s.toLowerCase().replace(/[-_]/g, ' ').replace(/[^a-zа-яё0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
          const an = norm(a), hn = norm(h)
          if (an === hn) return { match: true, type: 'normalized' }
          if (an.includes(hn) || hn.includes(an)) return { match: true, type: 'substring' }
          const specRe = /\d+[.,]?\d*\s*(гб|gb|мб|mb|тб|tb|ghz|ггц|мгц|mhz|ядер|core|поток|thread|ddr|dim|gbps|мбит|mbps)/g
          const specsA = (al.match(specRe) || []).map(s => s.replace(/\s/g,'').replace(',','.'))
          const specsH = (hl.match(specRe) || []).map(s => s.replace(/\s/g,'').replace(',','.'))
          if (specsA.length && specsH.length) {
            const setA = new Set(specsA), setH = new Set(specsH)
            const overlap = [...setA].filter(n => setH.has(n))
            if (overlap.length >= Math.min(setA.size, setH.size) && overlap.length > 0) return { match: true, type: 'semantic' }
          }
          const stopWords = new Set(['для','the','and','pro','с','на','в','по','из','за','и','или','or','vs','no'])
          const aWords = an.split(' ').filter(w => w.length > 2 && !stopWords.has(w))
          const hWords = hn.split(' ').filter(w => w.length > 2 && !stopWords.has(w))
          if (aWords.length >= 2 && hWords.length >= 2) {
            const overlap = aWords.filter(aw => hWords.some(hw => aw === hw))
            if (overlap.length >= Math.ceil(Math.min(aWords.length, hWords.length) * 0.6)) return { match: true, type: 'fuzzy' }
          }
          return { match: false, type: 'none' }
        }

        // Position-by-position match
        positionMatch = [0, 1, 2].map(i => {
          const m = smartMatch(aiTop3[i], humanTop3[i])
          return { position: i + 1, ai: aiTop3[i] || '—', human: humanTop3[i] || '—', match: m.match, matchType: m.type }
        })
        exactCount = positionMatch.filter(p => p.match).length
        exactPct = Math.round((exactCount / 3) * 100)
      }

      // Presence in top-3: how many of original top-3 are in simplified top-3 (any position)
      const aiNames = aiTop3.map(s => (s||'').toLowerCase().trim()).filter(Boolean)
      const humanNames = humanTop3.map(s => (s||'').toLowerCase().trim()).filter(Boolean)
      let presenceCount, presencePct
      if (isDefault || aiNames.length === 0) {
        // No simplification = 100% presence; or no data to compare
        presenceCount = 3
        presencePct = 100
      } else {
        presenceCount = aiNames.filter(ai => humanNames.some(h => {
          if (ai === h) return true
          const norm = s => s.replace(/[-_]/g,' ').replace(/[^a-zа-яё0-9 ]/g,' ').replace(/\s+/g,' ').trim()
          const an = norm(ai), hn = norm(h)
          if (an === hn || an.includes(hn) || hn.includes(an)) return true
          return false
        })).length
        presencePct = Math.round((presenceCount / 3) * 100)
      }

      // 1st place match
      const firstMatch = isDefault ? true : (() => {
        const ai1 = (aiTop3[0]||'').toLowerCase().trim()
        const h1 = (humanTop3[0]||'').toLowerCase().trim()
        if (!ai1 || !h1) return true
        if (ai1 === h1) return true
        const norm = s => s.replace(/[-_]/g,' ').replace(/[^a-zа-яё0-9 ]/g,' ').replace(/\s+/g,' ').trim()
        const an = norm(ai1), hn = norm(h1)
        return an === hn || an.includes(hn) || hn.includes(an)
      })()

      results.push({
        table_id: aiRow.table_id, table_title: aiRow.table_title,
        aiTop3, humanTop3, positionMatch,
        exactCount, exactPct, presenceCount, presencePct, firstMatch,
        paramsUsed: isDefault ? 0 : paramsUsed, paramsTotal: paramsTotal,
        settings: { weightFlatten: wFlatten * 100, keepTopParams, maxScale: mScale }
      })
    } catch (e) { /* skip */ }
  }

  // Aggregate
  const n = results.length
  const avgExact = n ? +(results.reduce((s, r) => s + r.exactPct, 0) / n).toFixed(1) : 0
  const avgPresence = n ? +(results.reduce((s, r) => s + r.presencePct, 0) / n).toFixed(1) : 0
  const firstMatchCount = results.filter(r => r.firstMatch).length
  const firstMatchPct = n ? +((firstMatchCount / n) * 100).toFixed(1) : 0

  return c.json({
    results, total: n,
    summary: { avgExact, avgPresence, firstMatchCount, firstMatchPct, all3MatchPct: n ? +((results.filter(r => r.exactCount === 3).length / n) * 100).toFixed(1) : 0 },
    settings: { weightFlatten: wFlatten * 100, keepTopParams, maxScale: mScale }
  })
})

// POST /admin/decision/sensitivity-curves — batch curves for each mechanism
adminInteractiveRoutes.post('/admin/decision/sensitivity-curves', async (c) => {
  const db = c.get('db')
  const steps = 20

  const normMatch = (a, b) => {
    if (!a || !b) return true
    const al = a.toLowerCase().trim(), bl = b.toLowerCase().trim()
    if (al === bl) return true
    const norm = s => s.replace(/[-_]/g, ' ').replace(/[^a-zа-яё0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
    const an = norm(al), bn = norm(bl)
    return an === bn || an.includes(bn) || bn.includes(an)
  }

  function computeTop3(columns, rows, settings) {
    const paramMap = new Map()
    for (const col of columns) {
      if ((col.weight > 0 || col.type === 'number') && col.key) paramMap.set(col.key, col)
    }
    if (paramMap.size < 2) return null
    let paramKeys = [...paramMap.keys()]
    if (settings.keepTopParamsPct > 0) {
      const keepCount = Math.max(1, Math.round(paramMap.size * (100 - settings.keepTopParamsPct) / 100))
      const sorted = [...paramKeys].sort((a, b) => (paramMap.get(b)?.weight || 0) - (paramMap.get(a)?.weight || 0))
      paramKeys = sorted.slice(0, keepCount)
    }
    const roundFn = settings.scoreScale === 'binary' ? (v => v >= 7 ? 1 : 0)
      : settings.scoreScale === '3point' ? (v => Math.max(0, Math.min(3, Math.round(v / 3.33))))
      : settings.maxScale && settings.maxScale < 10 ? (v => Math.max(0, Math.min(settings.maxScale, Math.round(v / 10 * settings.maxScale))))
      : (v => v)
    const ranked = rows.map(row => {
      let score = 0, totalWeight = 0
      for (const key of paramKeys) {
        const col = paramMap.get(key)
        const raw = row[key]
        const val = raw && typeof raw === 'object' ? (parseFloat(raw.grade) || parseFloat(raw.value) || 0) : (parseFloat(raw) || 0)
        const origW = col?.weight || 1
        const w = origW * (1 - settings.removeWeights) + 1 * settings.removeWeights
        score += roundFn(val) * w; totalWeight += w
      }
      const name = row['Название'] || row['name'] || row['Объект'] || Object.values(row)[0] || '?'
      return { name, score: totalWeight > 0 ? +(score / totalWeight).toFixed(4) : 0 }
    }).sort((a, b) => b.score - a.score)
    return ranked.slice(0, 3).map(r => r.name)
  }

  // Load raw table data
  const tableIds = db.prepare("SELECT DISTINCT table_id FROM decision_analytics WHERE type = 'ai_vs_human'").all().map(r => r.table_id)
  const tableCache = []
  for (const tid of tableIds) {
    const colRow = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(tid)
    const rowsRaw = db.prepare('SELECT data FROM rows WHERE table_id = ?').all(tid)
    if (!colRow || !rowsRaw.length) continue
    try {
      const columns = JSON.parse(colRow.definition)
      const rows = rowsRaw.map(r => { try { return JSON.parse(r.data) } catch { return null } }).filter(Boolean)
      const baseline = computeTop3(columns, rows, { removeWeights: 0, keepTopParamsPct: 0, scoreScale: 'original' })
      if (baseline && baseline.length >= 1) tableCache.push({ columns, rows, baseline })
    } catch { /* skip */ }
  }

  function calcStats(settings) {
    let firstMatchCount = 0, presenceSum = 0, n = 0
    for (const tc of tableCache) {
      const simplified = computeTop3(tc.columns, tc.rows, settings)
      if (!simplified || simplified.length === 0) continue
      n++
      if (normMatch(tc.baseline[0], simplified[0])) firstMatchCount++
      let presence = 0
      for (const b of tc.baseline) { if (simplified.some(s => normMatch(b, s))) presence++ }
      presenceSum += Math.round(presence / 3 * 100)
    }
    return { firstMatchPct: n ? +(firstMatchCount / n * 100).toFixed(1) : 0, presencePct: n ? +(presenceSum / n).toFixed(1) : 0, count: n }
  }

  const zeroSettings = { removeWeights: 0, keepTopParamsPct: 0, scoreScale: 'original' }

  const weightsCurve = []
  for (let i = 0; i <= steps; i++) {
    const pct = (i / steps) * 100
    weightsCurve.push({ pct, ...calcStats({ removeWeights: i / steps, keepTopParamsPct: 0, scoreScale: 'original' }) })
  }

  const paramsCurve = []
  for (let i = 0; i <= steps; i++) {
    const pct = (i / steps) * 95
    paramsCurve.push({ pct, ...calcStats({ removeWeights: 0, keepTopParamsPct: pct, scoreScale: 'original' }) })
  }

  const scaleDegradation = []
  for (let i = 0; i <= steps; i++) {
    const maxScale = Math.max(1, 10 - Math.round(i / steps * 9)) // 10 → 1
    scaleDegradation.push({ maxScale, ...calcStats({ removeWeights: 0, keepTopParamsPct: 0, maxScale }) })
  }

  const scaleCurve = [
    { label: 'Оригинал (1-10)', ...calcStats({ ...zeroSettings, scoreScale: 'original' }) },
    { label: '3 балла (1-3)', ...calcStats({ ...zeroSettings, scoreScale: '3point' }) },
    { label: 'Бинарная (0/1)', ...calcStats({ ...zeroSettings, scoreScale: 'binary' }) },
  ]

  const combinedCurve = []
  for (let i = 0; i <= steps; i++) {
    const pct = (i / steps) * 100
    const maxScale = Math.max(1, 10 - Math.round(i / steps * 9))
    combinedCurve.push({ pct, ...calcStats({ removeWeights: i / steps, keepTopParamsPct: pct * 0.95 / 100, maxScale }) })
  }

  return c.json({ weightsCurve, paramsCurve, scaleCurve, scaleDegradation, combinedCurve, totalTables: tableCache.length })
})

// POST /admin/decision/random-baseline — Monte Carlo random baseline vs optimal pick
adminInteractiveRoutes.post('/admin/decision/random-baseline', async (c) => {
  const db = c.get('db')

  function computeTop3(columns, rows, settings) {
    const paramMap = new Map()
    for (const col of columns) {
      if ((col.weight > 0 || col.type === 'number') && col.key) paramMap.set(col.key, col)
    }
    if (paramMap.size < 2) return null
    let paramKeys = [...paramMap.keys()]
    if (settings.keepTopParamsPct > 0) {
      const keepCount = Math.max(1, Math.round(paramMap.size * (100 - settings.keepTopParamsPct) / 100))
      const sorted = [...paramKeys].sort((a, b) => (paramMap.get(b)?.weight || 0) - (paramMap.get(a)?.weight || 0))
      paramKeys = sorted.slice(0, keepCount)
    }
    const roundFn = settings.scoreScale === 'binary' ? (v => v >= 7 ? 1 : 0)
      : settings.scoreScale === '3point' ? (v => Math.max(0, Math.min(3, Math.round(v / 3.33))))
      : settings.maxScale && settings.maxScale < 10 ? (v => Math.max(0, Math.min(settings.maxScale, Math.round(v / 10 * settings.maxScale))))
      : (v => v)
    const ranked = rows.map(row => {
      let score = 0, totalWeight = 0
      for (const key of paramKeys) {
        const col = paramMap.get(key)
        const raw = row[key]
        const val = raw && typeof raw === 'object' ? (parseFloat(raw.grade) || parseFloat(raw.value) || 0) : (parseFloat(raw) || 0)
        const origW = col?.weight || 1
        const w = origW * (1 - settings.removeWeights) + 1 * settings.removeWeights
        score += roundFn(val) * w; totalWeight += w
      }
      const name = row['Название'] || row['name'] || row['Объект'] || Object.values(row)[0] || '?'
      return { name, score: totalWeight > 0 ? +(score / totalWeight).toFixed(4) : 0 }
    }).sort((a, b) => b.score - a.score)
    return ranked.slice(0, 3).map(r => r.name)
  }

  // Extract numeric value from row data for a given column key
  function extractNumericValue(row, key) {
    const raw = row[key]
    if (raw == null) return null
    if (typeof raw === 'object') {
      const num = parseFloat(raw.grade) || parseFloat(raw.value) || parseFloat(raw)
      return isNaN(num) ? null : num
    }
    // Try to extract number from string (e.g. "12 345 руб", "15,000.00")
    const str = String(raw).replace(/[^\d.,]/g, '').replace(/\s/g, '').replace(',', '.')
    const num = parseFloat(str)
    return isNaN(num) ? null : num
  }

  // Price column detection patterns (case-insensitive)
  const pricePatterns = ['цен', 'стоим', 'price', 'cost', 'budget', 'руб', 'usd', 'eur', 'тариф']

  function findPriceColumn(columns) {
    for (const col of columns) {
      const key = (col.key || '').toLowerCase()
      if (pricePatterns.some(p => key.includes(p))) return col.key
    }
    return null
  }

  // Load all tables
  const aiResults = db.prepare(`
    SELECT table_id, table_title, ai_objects
    FROM decision_analytics WHERE type = 'ai_vs_human'
  `).all()

  const results = []
  const MONTE_CARLO_ITERATIONS = 1000

  for (const aiRow of aiResults) {
    try {
      const colRow = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(aiRow.table_id)
      const rowsRaw = db.prepare('SELECT data FROM rows WHERE table_id = ?').all(aiRow.table_id)
      if (!colRow || !rowsRaw.length) continue

      const columns = JSON.parse(colRow.definition)
      const rows = rowsRaw.map(r => { try { return JSON.parse(r.data) } catch { return null } }).filter(Boolean)
      if (rows.length === 0) continue

      // Compute baseline top-3 using default settings
      const baseline = computeTop3(columns, rows, { removeWeights: 0, keepTopParamsPct: 0, scoreScale: 'original' })
      if (!baseline || baseline.length === 0) continue

      const baselineWinner = baseline[0]

      // Monte Carlo: pick random object, check if matches baseline winner
      let matchCount = 0
      for (let i = 0; i < MONTE_CARLO_ITERATIONS; i++) {
        const randomIdx = Math.floor(Math.random() * rows.length)
        const randomRow = rows[randomIdx]
        const randomName = randomRow['Название'] || randomRow['name'] || randomRow['Объект'] || Object.values(randomRow)[0] || '?'
        if (randomName.toLowerCase().trim() === baselineWinner.toLowerCase().trim()) {
          matchCount++
        }
      }

      const randomMatchPct = +((matchCount / MONTE_CARLO_ITERATIONS) * 100).toFixed(1)

      // Price/cost detection
      const priceColKey = findPriceColumn(columns)
      let baselineWinnerPrice = null
      let randomAvgPrice = null
      let expectedLoss = null
      let expectedLossPct = null

      if (priceColKey) {
        // Find baseline winner's price
        for (const row of rows) {
          const name = row['Название'] || row['name'] || row['Объект'] || Object.values(row)[0] || '?'
          if (name.toLowerCase().trim() === baselineWinner.toLowerCase().trim()) {
            baselineWinnerPrice = extractNumericValue(row, priceColKey)
            break
          }
        }

        // Average price across all objects (uniform random = this is random_avg_price)
        let priceSum = 0
        let priceCount = 0
        for (const row of rows) {
          const price = extractNumericValue(row, priceColKey)
          if (price != null) {
            priceSum += price
            priceCount++
          }
        }

        if (priceCount > 0 && baselineWinnerPrice != null) {
          randomAvgPrice = +(priceSum / priceCount).toFixed(2)
          expectedLoss = +(randomAvgPrice - baselineWinnerPrice).toFixed(2)
          expectedLossPct = randomAvgPrice > 0 ? +((expectedLoss / randomAvgPrice) * 100).toFixed(1) : 0
        }
      }

      results.push({
        table_id: aiRow.table_id,
        table_title: aiRow.table_title,
        object_count: rows.length,
        baseline_winner: baselineWinner,
        baseline_winner_price: baselineWinnerPrice,
        random_match_pct: randomMatchPct,
        random_avg_price: randomAvgPrice,
        expected_loss: expectedLoss,
        expected_loss_pct: expectedLossPct
      })
    } catch (e) { /* skip */ }
  }

  // Aggregate summary
  const totalTables = results.length
  const avgRandomMatchPct = totalTables ? +(results.reduce((s, r) => s + r.random_match_pct, 0) / totalTables).toFixed(1) : 0
  const tablesWithPrices = results.filter(r => r.expected_loss_pct != null)
  const avgExpectedLossPct = tablesWithPrices.length
    ? +(tablesWithPrices.reduce((s, r) => s + r.expected_loss_pct, 0) / tablesWithPrices.length).toFixed(1)
    : 0

  return c.json({
    results,
    summary: {
      avg_random_match_pct: avgRandomMatchPct,
      tables_with_prices: tablesWithPrices.length,
      avg_expected_loss_pct: avgExpectedLossPct,
      total_tables: totalTables
    }
  })
})