// Generate Excel-like CSV files (since we don't have xlsx library, use CSV that Excel opens natively)
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const db = new Database('./data/choser.db');

// Get all ai_vs_human records
const records = db.prepare("SELECT * FROM decision_analytics WHERE type = 'ai_vs_human' ORDER BY rowid").all();
console.log(`Total records: ${records.length}`);

// Pick 15 random
const shuffled = [...records].sort(() => Math.random() - 0.5);
const selected = shuffled.slice(0, 15);

const backupDir = '/tmp/excel_backup';
fs.mkdirSync(backupDir, { recursive: true });

// Also create one summary file
let summary = '\uFEFF'; // BOM for Excel UTF-8
summary += '№;Таблица;Объектов ИИ;Объектов Человек;Пересечение %;Пересечение шт;Точное совпадение %;Точное шт;Частичное %;Частичное шт\n';

selected.forEach((r, i) => {
  const d = JSON.parse(r.details || '{}');
  summary += `${i+1};${r.table_title};${r.ai_count};${r.human_count};${r.match_percent}%;${r.match_count};${d.position_match_percent || 0}%;${d.position_match || 0};${d.partial_match_percent || 0}%;${d.partial_match || 0}\n`;
  
  // Create individual file with object lists
  let csv = '\uFEFF';
  csv += `Таблица: ${r.table_title}\n`;
  csv += `Запрос ИИ: ${r.ai_query}\n\n`;
  
  const aiObjects = JSON.parse(r.ai_objects || '[]');
  const humanObjects = JSON.parse(r.human_objects || '[]');
  const aiLower = new Set(aiObjects.map(s => s.toLowerCase().trim()));
  
  csv += '№;Объект ИИ;Совпадение;Объект Человек;Совпадение\n';
  const maxLen = Math.max(aiObjects.length, humanObjects.length);
  for (let j = 0; j < maxLen; j++) {
    const ai = aiObjects[j] || '';
    const human = humanObjects[j] || '';
    const aiMatch = ai && humanObjects.some(h => h.toLowerCase().trim() === ai.toLowerCase().trim()) ? '✓' : '';
    const hMatch = human && aiLower.has(human.toLowerCase().trim()) ? '✓' : '';
    csv += `${j+1};${ai};${aiMatch};${human};${hMatch}\n`;
  }
  
  csv += `\nСтатистика:\n`;
  csv += `Пересечение: ${r.match_percent}% (${r.match_count}/${Math.max(r.ai_count, r.human_count)})\n`;
  csv += `Точное совпадение (1=1, 2=2, 3=3): ${d.position_match_percent || 0}% (${d.position_match || 0}/3)\n`;
  csv += `Частичное (в топ-3 но не на месте): ${d.partial_match_percent || 0}% (${d.partial_match || 0}/3)\n`;
  
  // Clean filename
  const safeName = r.table_title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50);
  fs.writeFileSync(path.join(backupDir, `${String(i+1).padStart(2,'0')}_${safeName}.csv`), csv, 'utf8');
  console.log(`${i+1}. ${r.table_title} → ${safeName}.csv`);
});

fs.writeFileSync(path.join(backupDir, '00_СВОДКА_15_таблиц.csv'), summary, 'utf8');
console.log('\nSummary: 00_СВОДКА_15_таблиц.csv');
console.log(`Files saved to ${backupDir}`);
