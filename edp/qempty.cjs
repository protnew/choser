process.chdir('/app');
const db = require('better-sqlite3')('./data/choser.db');
const empty = db.prepare("SELECT table_id, table_title, ai_count, human_count FROM decision_analytics WHERE type='ai_vs_human' AND ai_count=0").all();
const total = db.prepare("SELECT COUNT(id) as c FROM decision_analytics WHERE type='ai_vs_human'").get().c;
console.log('total:', total, 'empty AI:', empty.length, 'pct:', ((empty.length / total) * 100).toFixed(1));
empty.slice(0, 5).forEach(x => console.log(x.ai_count + '/' + x.human_count, x.table_title));
db.close();
