/**
 * PDF Styles & HTML Template Builders
 * Extracted from export-pdf.js — all CSS, helpers, and HTML partials
 * for the print-ready PDF export.
 */

// ─── Grade → color helper ───
export function gradeColor(grade) {
  if (grade >= 9) return '#059669'
  if (grade >= 7) return '#34D399'
  if (grade >= 5) return '#FBBF24'
  if (grade >= 3) return '#F97316'
  if (grade >= 1) return '#EF4444'
  return '#D1D5DB'
}

export function gradeBg(grade) {
  if (grade >= 9) return '#D1FAE5'
  if (grade >= 7) return '#A7F3D0'
  if (grade >= 5) return '#FEF3C7'
  if (grade >= 3) return '#FFEDD5'
  if (grade >= 1) return '#FEE2E2'
  return '#F3F4F6'
}

export function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Embedded CSS ───
export const PDF_CSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: A4 landscape;
      margin: 15mm 10mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #1F2937;
      background: #fff;
      padding: 20px;
    }

    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      .section { break-inside: avoid; }
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #2563EB;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1E3A5F;
      margin-bottom: 6px;
    }
    .header .description {
      font-size: 11px;
      color: #6B7280;
      max-width: 800px;
      margin: 0 auto 8px;
      white-space: pre-line;
    }
    .header .meta {
      font-size: 10px;
      color: #9CA3AF;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: 600;
      margin: 0 4px;
    }
    .badge-choser { background: #EFF6FF; color: #2563EB; }
    .badge-date { background: #F3F4F6; color: #6B7280; }

    /* Print button (screen only) */
    .print-btn {
      position: fixed;
      top: 15px;
      right: 15px;
      background: #2563EB;
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 600;
      z-index: 100;
    }
    .print-btn:hover { background: #1D4ED8; }

    /* Data Table */
    .section { margin-bottom: 20px; }
    .section h2 {
      font-size: 14px;
      color: #1E3A5F;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid #E5E7EB;
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    table.data-table th {
      background: #1E3A5F;
      color: #fff;
      padding: 6px 8px;
      text-align: center;
      font-weight: 600;
      font-size: 9px;
      white-space: nowrap;
    }
    table.data-table th.weight-header {
      font-size: 8px;
      color: #93C5FD;
      font-weight: 400;
    }
    table.data-table td {
      padding: 5px 6px;
      border-bottom: 1px solid #E5E7EB;
      vertical-align: middle;
    }

    .rank {
      text-align: center;
      font-weight: 700;
      color: #6B7280;
      width: 30px;
    }
    .name-cell {
      font-weight: 600;
      white-space: nowrap;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .grade-cell {
      text-align: center;
      min-width: 50px;
      max-width: 100px;
    }
    .grade-badge {
      display: inline-block;
      font-weight: 700;
      font-size: 12px;
      min-width: 20px;
    }
    .grade-value {
      display: block;
      font-size: 8px;
      color: #6B7280;
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 90px;
    }

    .winner {
      background: #FFFBEB !important;
    }
    .winner .name-cell::before {
      content: '\\1F451  ';
    }

    /* Utility bar */
    .utility-cell {
      min-width: 80px;
    }
    .utility-bar {
      position: relative;
      width: 100%;
      height: 18px;
      background: #F3F4F6;
      border-radius: 9px;
      overflow: hidden;
    }
    .utility-fill {
      height: 100%;
      background: linear-gradient(90deg, #2563EB, #34D399);
      border-radius: 9px;
      transition: width 0.3s;
    }
    .utility-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 9px;
      font-weight: 700;
      color: #1F2937;
    }

    /* Weights */
    .weights-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .weight-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 9px;
      min-width: 150px;
    }
    .weight-name {
      width: 100px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .weight-bar-bg {
      flex: 1;
      height: 6px;
      background: #E5E7EB;
      border-radius: 3px;
      overflow: hidden;
      min-width: 40px;
    }
    .weight-bar-fill {
      height: 100%;
      background: #8B5CF6;
      border-radius: 3px;
    }
    .weight-pct {
      width: 28px;
      text-align: right;
      color: #6B7280;
    }

    /* Council section */
    .council-section {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 12px;
    }
    .editor-summary {
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 10px;
      color: #374151;
    }
    .consensus {
      font-size: 11px;
      padding: 8px;
      background: #EFF6FF;
      border-left: 3px solid #2563EB;
      border-radius: 0 6px 6px 0;
      margin-bottom: 10px;
    }
    .votes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
    }
    .vote-card {
      background: #fff;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 8px;
      font-size: 10px;
    }
    .vote-persona {
      font-weight: 700;
      color: #1E3A5F;
      margin-bottom: 2px;
    }
    .vote-choice {
      color: #2563EB;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .vote-reasoning {
      color: #6B7280;
      font-size: 9px;
      line-height: 1.3;
    }

    /* Footer */
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      font-size: 9px;
      color: #9CA3AF;
    }

    /* Grade legend */
    .legend {
      display: flex;
      gap: 12px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 9px;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
`

// ─── Build table rows HTML ───
export function buildRowsHtml(rows, criteriaColumns, maxUtility) {
  let html = ''
  rows.forEach((row, idx) => {
    const utility = row.utility || 0
    const utilityPct = Math.round((utility / maxUtility) * 100)
    const isWinner = idx === 0 && rows.length > 1
    const rowName = escHtml(row.name || `Row ${idx + 1}`)

    html += `<tr class="${isWinner ? 'winner' : ''}">`
    html += `<td class="rank">${idx + 1}</td>`
    html += `<td class="name-cell">${rowName}</td>`

    // Criteria grades
    for (const col of criteriaColumns) {
      const key = col.key
      const raw = row[key]
      let grade = null
      let value = ''

      if (typeof raw === 'object' && raw !== null) {
        grade = raw.grade
        value = raw.value || ''
      } else if (typeof raw === 'number') {
        grade = raw
        value = String(raw)
      } else {
        value = raw || ''
      }

      const bgColor = grade !== null && grade !== undefined ? gradeBg(grade) : ''
      const textColor = grade !== null && grade !== undefined ? gradeColor(grade) : ''

      html += `<td class="grade-cell" style="${bgColor ? 'background:' + bgColor + ';' : ''}${textColor ? 'color:' + textColor + ';' : ''}">`
      if (grade !== null && grade !== undefined) {
        html += `<span class="grade-badge">${grade}</span>`
      }
      if (value && String(value).length > 0 && String(value) !== String(grade)) {
        html += `<span class="grade-value">${escHtml(String(value).substring(0, 60))}</span>`
      }
      html += `</td>`
    }

    // Utility score with progress bar
    html += `<td class="utility-cell">
      <div class="utility-bar">
        <div class="utility-fill" style="width:${utilityPct}%;"></div>
        <span class="utility-text">${utility}</span>
      </div>
    </td>`

    html += `</tr>`
  })
  return html
}

// ─── Build criteria weights legend ───
export function buildWeightsHtml(criteriaColumns) {
  let html = ''
  for (const col of criteriaColumns) {
    const pct = col.weight || 0
    html += `<div class="weight-item">
      <span class="weight-name">${escHtml(col.title || col.key)}</span>
      <div class="weight-bar-bg"><div class="weight-bar-fill" style="width:${pct}%;"></div></div>
      <span class="weight-pct">${pct}%</span>
    </div>`
  }
  return html
}

// ─── Build council recommendation section ───
export function buildCouncilHtml(councilDecision) {
  if (!councilDecision) return ''

  const votes = councilDecision.votes ? JSON.parse(councilDecision.votes) : []
  let votesHtml = ''
  if (Array.isArray(votes) && votes.length > 0) {
    for (const v of votes) {
      votesHtml += `<div class="vote-card">
        <div class="vote-persona">${escHtml(v.persona || v.name || 'Expert')}</div>
        <div class="vote-choice">${escHtml(v.vote || v.choice || '')}</div>
        <div class="vote-reasoning">${escHtml(v.reasoning || v.argument || '')}</div>
      </div>`
    }
  }

  return `<div class="section council-section">
    <h2>🏛️ Council Recommendation</h2>
    ${councilDecision.editorSummary ? `<div class="editor-summary">${escHtml(councilDecision.editorSummary)}</div>` : ''}
    ${councilDecision.consensus ? `<div class="consensus"><strong>Consensus:</strong> ${escHtml(councilDecision.consensus)}</div>` : ''}
    ${votesHtml ? `<h3>Votes</h3><div class="votes-grid">${votesHtml}</div>` : ''}
  </div>`
}

// ─── Grade legend HTML ───
export function buildLegendHtml() {
  return `<div class="legend">
      <div class="legend-item"><div class="legend-dot" style="background:#059669"></div> 9-10 Excellent</div>
      <div class="legend-item"><div class="legend-dot" style="background:#34D399"></div> 7-8 Good</div>
      <div class="legend-item"><div class="legend-dot" style="background:#FBBF24"></div> 5-6 Average</div>
      <div class="legend-item"><div class="legend-dot" style="background:#F97316"></div> 3-4 Below avg</div>
      <div class="legend-item"><div class="legend-dot" style="background:#EF4444"></div> 1-2 Poor</div>
    </div>`
}
