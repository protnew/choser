const Database = require('better-sqlite3');
const db = new Database('./data/choser.db');
const tables = db.prepare(`
  SELECT t.id, t.title, t.created_at, t.updated_at, t.object_count, t.state
  FROM tables t 
  WHERE t.tags LIKE '%эксперимент%' OR t.id IN (
    SELECT table_id FROM decision_analytics WHERE type = 'ai_vs_human'
  )
  ORDER BY t.rowid ASC
`).all();
// Get original tables (not experiments)
const originals = tables.filter(t => !t.id.startsWith('exp-'));
console.log('Original tables in experiment:');
originals.forEach(t => console.log(`  ${t.id}: "${t.title}" | created=${t.created_at} | updated=${t.updated_at} | objects=${t.object_count} | state=${t.state}`));

// Check hidden tables
const hidden = db.prepare("SELECT id, title, state FROM tables WHERE state = 'скрытая'").all();
console.log(`\nHidden tables (${hidden.length}):`);
hidden.forEach(t => console.log(`  ${t.id}: "${t.title}" state=${t.state}`));
