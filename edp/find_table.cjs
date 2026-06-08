const db = require('better-sqlite3')('./data/choser.db');
// Find tables with 15+ params (columns with weights), 10+ objects
const tables = db.prepare(`
  SELECT t.id, t.title, t.object_count, t.param_count
  FROM tables t
  WHERE t.state != 'deleted' AND t.object_count >= 10 AND t.param_count >= 15
  ORDER BY t.param_count DESC, t.object_count DESC
  LIMIT 10
`).all();
for (const t of tables) {
  const cols = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(t.id);
  if (!cols) continue;
  const columns = JSON.parse(cols.definition);
  const weighted = columns.filter(c => c.weight > 0);
  console.log(t.id, '|', t.title, '| objects:', t.object_count, '| params:', t.param_count, '| weighted:', weighted.length, '| max_weight:', Math.max(...weighted.map(c=>c.weight||0)));
}
db.close();
