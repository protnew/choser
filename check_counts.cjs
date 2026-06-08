const Database = require('better-sqlite3');
const db = new Database('./data/choser.db');
const r = db.prepare("SELECT count(*) as cnt FROM decision_analytics WHERE type = 'sensitivity'").get();
console.log('sensitivity rows:', r.cnt);
const r2 = db.prepare("SELECT count(*) as cnt FROM decision_analytics WHERE type = 'ai_vs_human'").get();
console.log('ai_vs_human rows:', r2.cnt);
