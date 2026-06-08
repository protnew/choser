const Database = require('better-sqlite3');
const db = new Database('./data/choser.db');

// Get what's already done
const existing = new Set(db.prepare("SELECT table_id FROM decision_analytics WHERE type = 'ai_vs_human'").all().map(r => r.table_id));

// Get candidates
const candidates = db.prepare(`
  SELECT t.id, t.title, t.object_count FROM tables t 
  WHERE t.state != 'deleted' AND t.object_count >= 3
    AND (t.tags IS NULL OR t.tags NOT LIKE '%эксперимент%')
    AND t.title NOT LIKE '%политич%' AND t.title NOT LIKE '%Сири%' AND t.title NOT LIKE '%сири%'
    AND t.title NOT LIKE '%Забастовк%'
    AND t.id NOT LIKE 'exp-%'
  ORDER BY t.rowid ASC
`).all().filter(t => !existing.has(t.id));

console.log(`Available: ${candidates.length}`);

// Print next 35 candidates with their objects
let count = 0;
for (const t of candidates) {
  if (count >= 35) break;
  const rows = db.prepare('SELECT data FROM rows WHERE table_id = ?').all(t.id);
  const names = rows.map(r => { try { const d = JSON.parse(r.data); return d['Название'] || d['name'] || d['Объект'] || Object.values(d)[0] || '' } catch { return '' } }).filter(Boolean);
  console.log(`${count+1}. [${t.id}] "${t.title}" (${t.object_count} obj): ${names.slice(0,5).join(', ')}${names.length > 5 ? '...' : ''}`);
  count++;
}
