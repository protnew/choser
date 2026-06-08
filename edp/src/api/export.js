/**
 * Export API — PDF, PNG, XLSX, JSON
 * PDF via pdfkit (pure Node, no Chromium needed)
 * XLSX via exceljs
 * PNG via API (frontend ECharts → toDataURL)
 */
import { Hono } from 'hono'

export const exportRoutes = new Hono()

// GET /tables/:id/export?format=json|csv|xlsx|pdf
exportRoutes.get('/tables/:id/export', async (c) => {
  const db = c.get('db')
  const { id } = c.req.param()
  const format = c.req.query('format') || 'json'

  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id)
  if (!table) return c.json({ error: 'Not found' }, 404)

  const columns = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(id)
  const rows = db.prepare('SELECT * FROM rows WHERE table_id = ?').all(id)

  const parsedColumns = columns?.definition ? JSON.parse(columns.definition) : []
  const parsedRows = rows.map(r => ({
    ...(typeof r.data === 'string' ? JSON.parse(r.data) : r.data),
    _tco_1y: r.tco_1y,
    _tco_3y: r.tco_3y,
    _tco_5y: r.tco_5y,
    _irr_3y: r.irr_3y,
    _irr_5y: r.irr_5y,
    _roic_3y: r.roic_3y,
    _roic_5y: r.roic_5y,
    _currency: r.currency
  }))

  switch (format) {
    case 'json':
      return c.json({
        meta: { id: table.id, title: table.title, description: table.description, tags: table.tags, utility: table.utility },
        columns: parsedColumns,
        rows: parsedRows,
        exported_at: new Date().toISOString()
      })

    case 'csv':
      return exportCSV(c, table, parsedColumns, parsedRows)

    case 'xlsx':
      return await exportXLSX(c, table, parsedColumns, parsedRows)

    case 'pdf':
      return await exportPDF(c, table, parsedColumns, parsedRows)

    default:
      return c.json({ error: 'Unsupported format. Use: json, csv, xlsx, pdf' }, 400)
  }
})

// ─── CSV Export ───

function exportCSV(c, table, columns, rows) {
  const headers = columns.map(col => col.title || col.key || col).join(',')
  const csvRows = rows.map(row => {
    return columns.map(col => {
      const key = col.key || col
      const val = row[key] ?? row[`_${key}`] ?? ''
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }).join(',')
  })

  const csv = [headers, ...csvRows].join('\n')
  return c.text(csv, 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${table.id}.csv"`
  })
}

// ─── XLSX Export (via exceljs) ───

async function exportXLSX(c, table, columns, rows) {
  try {
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.default.Workbook()
    const sheet = workbook.addWorksheet(table.title?.substring(0, 31) || 'Data')

    // Headers
    const headerRow = columns.map(col => col.title || col.key || col)
    sheet.addRow(headerRow)
    sheet.getRow(1).font = { bold: true }

    // Data rows
    for (const row of rows) {
      const values = columns.map(col => {
        const key = col.key || col
        return row[key] ?? row[`_${key}`] ?? ''
      })
      sheet.addRow(values)
    }

    // Auto-fit columns
    sheet.columns.forEach(col => {
      let maxLen = 10
      col.eachCell({ includeEmpty: true }, cell => {
        const len = String(cell.value || '').length
        if (len > maxLen) maxLen = Math.min(len + 2, 50)
      })
      col.width = maxLen
    })

    const buffer = await workbook.xlsx.writeBuffer()

    return c.body(buffer, 200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${table.id}.xlsx"`
    })
  } catch (e) {
    // exceljs not installed — fallback to CSV
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
      return exportCSV(c, table, columns, rows)
    }
    return c.json({ error: e.message }, 500)
  }
}

// ─── PDF Export (via pdfkit) ───

async function exportPDF(c, table, columns, rows) {
  try {
    const PDFDocument = (await import('pdfkit')).default
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' })
    const chunks = []

    doc.on('data', chunk => chunks.push(chunk))

    // Title
    doc.fontSize(18).text(table.title || 'Decision Table', { align: 'center' })
    if (table.description) {
      doc.fontSize(10).text(table.description, { align: 'center' })
    }
    doc.moveDown(1)

    // Table
    const headers = columns.map(col => col.title || col.key || col)
    const colWidth = (doc.page.width - 100) / Math.max(headers.length, 1)
    const startX = 50

    // Header row
    let y = doc.y
    doc.fontSize(8).font('Helvetica-Bold')
    headers.forEach((h, i) => {
      doc.text(String(h).substring(0, 30), startX + i * colWidth, y, { width: colWidth - 4, ellipsis: true })
    })
    doc.moveDown(0.5)

    // Data rows
    doc.font('Helvetica').fontSize(7)
    for (const row of rows.slice(0, 50)) { // Max 50 rows in PDF
      y = doc.y
      columns.forEach((col, i) => {
        const key = col.key || col
        const val = String(row[key] ?? '').substring(0, 40)
        doc.text(val, startX + i * colWidth, y, { width: colWidth - 4, ellipsis: true })
      })
      doc.moveDown(0.3)

      if (doc.y > doc.page.height - 50) {
        doc.addPage()
      }
    }

    // Footer
    doc.fontSize(7).text(`Exported: ${new Date().toISOString()} | Choser EDP v1.0`, 50, doc.page.height - 30)

    doc.end()

    const buffer = await new Promise(resolve => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
    })

    return c.body(buffer, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${table.id}.pdf"`
    })
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') {
      // pdfkit not installed — fallback to JSON
      return c.json({
        meta: { id: table.id, title: table.title },
        columns, rows,
        note: 'Install pdfkit for PDF export: npm install pdfkit'
      })
    }
    return c.json({ error: e.message }, 500)
  }
}
