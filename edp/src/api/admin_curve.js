// Sensitivity curves endpoint — to be prepended to admin.js export
// POST /admin/decision/sensitivity-curves

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
    : (v => v)

  const ranked = rows.map(row => {
    let score = 0, totalWeight = 0
    for (const key of paramKeys) {
      const col = paramMap.get(key)
      const raw = row[key]
      const val = raw && typeof raw === 'object' ? (parseFloat(raw.grade) || parseFloat(raw.value) || 0) : (parseFloat(raw) || 0)
      const origW = col?.weight || 1
      const w = origW * (1 - settings.removeWeights) + 1 * settings.removeWeights
      score += roundFn(val) * w
      totalWeight += w
    }
    const name = row['Название'] || row['name'] || row['Объект'] || Object.values(row)[0] || '?'
    return { name, score: totalWeight > 0 ? +(score / totalWeight).toFixed(4) : 0 }
  }).sort((a, b) => b.score - a.score)

  return ranked.slice(0, 3).map(r => r.name)
}

module.exports = { normMatch, computeTop3 }
