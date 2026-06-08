const Database = require('better-sqlite3');
const db = new Database('./data/choser.db');
const existing = new Set(db.prepare("SELECT table_id FROM decision_analytics WHERE type = 'ai_vs_human'").all().map(r => r.table_id));
const candidates = db.prepare(`
  SELECT t.id, t.title, t.object_count FROM tables t 
  WHERE t.state != 'deleted' AND t.object_count >= 3
    AND (t.tags IS NULL OR t.tags NOT LIKE '%эксперимент%')
    AND t.title NOT LIKE '%политич%' AND t.title NOT LIKE '%Сири%' AND t.title NOT LIKE '%сири%'
    AND t.title NOT LIKE '%Забастовк%'
  ORDER BY t.rowid ASC
`).all().filter(t => !existing.has(t.id) && !t.id.startsWith('exp-'));
console.log(`Available for next batch: ${candidates.length}`);
candidates.slice(0, 25).forEach((t, i) => console.log(`  ${i+1}. ${t.title} (${t.object_count} obj)`));
