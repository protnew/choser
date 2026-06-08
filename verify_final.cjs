const Database = require('better-sqlite3');
const db = new Database('./data/choser.db');
const exp = db.prepare("SELECT id, title, object_count FROM tables WHERE tags LIKE '%эксперимент%' ORDER BY rowid").all();
console.log(`=== ${exp.length} experiment tables ===\n`);
exp.forEach(t => {
  const rows = db.prepare('SELECT data FROM rows WHERE table_id = ?').all(t.id);
  const names = rows.map(r => { try { return JSON.parse(r.data)['Название'] } catch { return '?' } });
  const aiOnly = rows.filter(r => { try { return JSON.parse(r.data)['Источник']?.includes('нет в оригинале') } catch { return false } });
  console.log(`${t.title} (${t.object_count} obj, ${aiOnly.length} new from AI):`);
  names.forEach(n => console.log(`  - ${n}`));
  console.log('');
});
