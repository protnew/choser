/**
 * Excel (XLSX) export with visual formatting
 * Uses exceljs — lightweight, no native deps
 */
import { Hono } from 'hono'

export const exportXlsxRoutes = new Hono()

exportXlsxRoutes.get('/tables/:id/export/xlsx', async (c) => {
  const db = c.get('db')
  const { id } = c.req.param()

  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id)
  if (!table) return c.json({ error: 'Not found' }, 404)

  const columnsRow = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(id)
  const columns = columnsRow?.definition ? JSON.parse(columnsRow.definition) : []
  const rows = db.prepare('SELECT * FROM rows WHERE table_id = ?').all(id)
    .map(r => ({ ...(typeof r.data === 'string' ? JSON.parse(r.data) : r.data) }))

  // Dynamic import exceljs (large lib, lazy load)
  let ExcelJS
  try {
    ExcelJS = (await import('exceljs')).default
  } catch {
    // Fallback: generate CSV-like with tab separation
    return c.text('ExcelJS not installed. Run: npm install exceljs', 500)
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Choser EDP'
  workbook.created = new Date()

  // ─── Sheet 1: Data ───
  const sheet = workbook.addWorksheet(table.title.substring(0, 31), {
    properties: { tabColor: { argb: 'FF2563EB' } }
  })

  // Header row
  const headerLabels = columns.map(col => col.title || col.key)
  headerLabels.unshift('#')
  headerLabels.push('Utility')

  // Build column definitions
  const colDefs = [
    { header: '#', key: 'idx', width: 4 }
  ]
  for (const col of columns) {
    colDefs.push({
      header: col.title || col.key,
      key: col.key,
      width: Math.max(12, Math.min(40, (col.title || col.key).length * 1.5 + 4))
    })
  }
  colDefs.push({ header: 'Utility', key: '_utility', width: 12 })

  sheet.columns = colDefs

  // Style header
  const headerRow = sheet.getRow(1)
  headerRow.height = 28
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' }
    }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF2563EB' } }
    }
  })

  // Add data rows with grade coloring
  const sortedRows = [...rows].sort((a, b) => (b.utility || 0) - (a.utility || 0))

  for (let i = 0; i < sortedRows.length; i++) {
    const row = sortedRows[i]
    const rowData = { idx: i + 1 }
    for (const col of columns) {
      const val = row[col.key]
      if (typeof val === 'object' && val !== null) {
        rowData[col.key] = val.value ?? val.grade ?? ''
      } else {
        rowData[col.key] = val ?? ''
      }
    }
    rowData._utility = row.utility || 0

    const excelRow = sheet.addRow(rowData)
    excelRow.height = 22

    // Color cells by grade
    excelRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (colNumber === 1 || colNumber === colDefs.length) return // skip # and utility

      const colDef = columns[colNumber - 2]
      if (!colDef) return

      const rawVal = row[colDef.key]
      const grade = typeof rawVal === 'object' ? rawVal.grade : (typeof rawVal === 'number' ? rawVal : null)

      if (grade !== null && grade !== undefined && colDef.weight > 0) {
        // Color scale: red (1-3) → yellow (4-6) → green (7-10)
        let color
        if (grade >= 9) color = 'FF059669'      // green-600
        else if (grade >= 7) color = 'FF34D399'  // green-400
        else if (grade >= 5) color = 'FFFBBF24'  // yellow-400
        else if (grade >= 3) color = 'FFF97316'  // orange-500
        else color = 'FFEF4444'                  // red-500

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: color }
        }

        // Dark text on light bg, white text on dark bg
        const textColor = grade >= 7 ? 'FF000000' : 'FFFFFFFF'
        cell.font = { bold: true, color: { argb: textColor }, size: 12 }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }

        // Show grade number
        cell.value = grade
      } else {
        cell.alignment = { vertical: 'middle', wrapText: true }
      }
    })

    // Utility cell
    const utilityCell = excelRow.getCell(colDefs.length)
    const utility = row.utility || 0
    if (i === 0) {
      // Winner row — gold background
      excelRow.eachCell((cell) => {
        if (!cell.fill || cell.fill.fgColor?.argb === 'FFFFFFFF' || !cell.fill.fgColor) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } }
        }
      })
      utilityCell.font = { bold: true, size: 13, color: { argb: 'FFB45309' } }
    }
    utilityCell.alignment = { horizontal: 'center', vertical: 'middle' }
    utilityCell.numFmt = '0.0'
  }

  // ─── Sheet 2: Legend ───
  const legendSheet = workbook.addWorksheet('Легенда', {
    properties: { tabColor: { argb: 'FFFBBF24' } }
  })

  legendSheet.columns = [
    { header: 'Оценка', key: 'grade', width: 10 },
    { header: 'Цвет', key: 'color', width: 15 },
    { header: 'Значение', key: 'meaning', width: 30 }
  ]

  const legendData = [
    { grade: '9-10', color: 'Зелёный', meaning: 'Отлично — полностью удовлетворяет' },
    { grade: '7-8', color: 'Светло-зелёный', meaning: 'Хорошо — в основном соответствует' },
    { grade: '5-6', color: 'Жёлтый', meaning: 'Средне — частично соответствует' },
    { grade: '3-4', color: 'Оранжевый', meaning: 'Слабо — значительные недостатки' },
    { grade: '1-2', color: 'Красный', meaning: 'Плохо — не соответствует требованиям' }
  ]

  legendSheet.getRow(1).font = { bold: true }
  legendSheet.addRows(legendData)

  // Color the legend cells
  const legendColors = ['FF059669', 'FF34D399', 'FFFBBF24', 'FFF97316', 'FFEF4444']
  for (let i = 0; i < legendData.length; i++) {
    const row = legendSheet.getRow(i + 2)
    const colorCell = row.getCell(2)
    colorCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: legendColors[i] }
    }
    colorCell.font = { bold: true, color: { argb: i < 2 ? 'FF000000' : 'FFFFFFFF' } }
  }

  // ─── Sheet 3: Criteria ───
  const critSheet = workbook.addWorksheet('Критерии', {
    properties: { tabColor: { argb: 'FF8B5CF6' } }
  })

  critSheet.columns = [
    { header: 'Ключ', key: 'key', width: 10 },
    { header: 'Название', key: 'title', width: 30 },
    { header: 'Вес (%)', key: 'weight', width: 10 },
    { header: 'Тип', key: 'type', width: 12 }
  ]

  critSheet.getRow(1).font = { bold: true }
  critSheet.addRows(columns.map(c => ({
    key: c.key,
    title: c.title,
    weight: c.weight || 0,
    type: c.type || 'text'
  })))

  // Auto-filter on data sheet
  if (sortedRows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: sortedRows.length + 1, column: colDefs.length }
    }
  }

  // Freeze header
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()

  // Send as downloadable file
  const filename = encodeURIComponent(`${table.title}.xlsx`)
  c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  c.header('Content-Disposition', `attachment; filename="${filename}"`)
  c.header('Cache-Control', 'no-cache')

  return c.body(Buffer.from(buffer))
})
