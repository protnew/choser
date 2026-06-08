const Database = require('better-sqlite3');
const db = new Database('./data/choser.db');
const exp = db.prepare("SELECT id, title, object_count FROM tables WHERE tags LIKE '%эксперимент%'").all();
console.log(`Experiment tables: ${exp.length}`);
exp.forEach(t => {
  const rows = db.prepare('SELECT data FROM rows WHERE table_id = ? LIMIT 3').all(t.id);
  const names = rows.map(r => { try { return JSON.parse(r.data)['Название'] || JSON.parse(r.data)['name'] } catch { return '?' } });
  console.log(`  ${t.title}: ${t.object_count} objects — ${names.join(', ')}`);
});
