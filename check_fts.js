const Database = require('better-sqlite3');
const db = new Database('./data/choser.db');

// Check if FTS table exists
try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%fts%'").all();
    console.log('FTS tables:', tables);
} catch(e) { console.log('FTS check error:', e.message); }

// Try FTS search for 'echart'
try {
    const r = db.prepare("SELECT id FROM tables_fts WHERE tables_fts MATCH ?").all('echart*');
    console.log('FTS echart hits:', r.length, r.map(x=>x.id));
} catch(e) { console.log('FTS echart error:', e.message); }

// Try FTS search for 'визуализац'
try {
    const r = db.prepare("SELECT id FROM tables_fts WHERE tables_fts MATCH ?").all('визуализац*');
    console.log('FTS визуализац hits:', r.length, r.map(x=>x.id));
} catch(e) { console.log('FTS визуализац error:', e.message); }

// Fallback LIKE search
try {
    const r = db.prepare("SELECT id, title FROM tables WHERE title LIKE ? AND state != 'deleted'").all('%визуализац%');
    console.log('LIKE визуализац hits:', r.length, r);
} catch(e) { console.log('LIKE error:', e.message); }

// Check total FTS rows
try {
    const r = db.prepare("SELECT count(*) as cnt FROM tables_fts").get();
    console.log('FTS total rows:', r.cnt);
    
    const r2 = db.prepare("SELECT count(*) as cnt FROM tables WHERE state != 'deleted'").get();
    console.log('Tables total (non-deleted):', r2.cnt);
} catch(e) { console.log('Count error:', e.message); }
