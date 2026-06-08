const Database = require('better-sqlite3');
const db = new Database('./data/choser.db');
const r = db.prepare("SELECT id, title FROM tables WHERE tags LIKE '%эксперимент%'").all();
console.log('Experiment tables:', r.length);
r.forEach(x => console.log(' ', x.id, x.title.substring(0, 50)));
