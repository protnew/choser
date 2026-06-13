const Database = require('better-sqlite3');
const db = new Database('./data/choser.db');
const users = db.prepare('SELECT id, username, role FROM users').all();
console.log(JSON.stringify(users));
