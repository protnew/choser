const Database = require('better-sqlite3');
const db = new Database('./data/choser.db');
// Hide political tables
const toHide = ['Забастовки в России'];
toHide.forEach(title => {
  const r = db.prepare("UPDATE tables SET state = 'скрытая' WHERE title = ?").run(title);
  console.log(`${title}: hidden ${r.changes} rows`);
});
// Delete its experiment too
db.prepare("DELETE FROM tables WHERE title = 'Забастовки в России — AI эксперимент'").run();
db.prepare("DELETE FROM decision_analytics WHERE table_title = 'Забастовки в России' AND type = 'ai_vs_human'").run();
console.log('Cleaned');
