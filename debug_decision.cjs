const Database = require('better-sqlite3');
const db = new Database('./data/choser.db');
const tables = db.prepare("SELECT t.id, t.title FROM tables t WHERE t.state != 'deleted' AND t.object_count >= 3 AND t.param_count >= 4 LIMIT 3").all();
for (const table of tables) {
    const colRow = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(table.id);
    const rows = db.prepare('SELECT data FROM rows WHERE table_id = ?').all(table.id);
    if (!colRow) { console.log('NO COLS:', table.id); continue; }
    const columns = JSON.parse(colRow.definition);
    const paramCols = columns.filter(c => c.type === 'number' || c.weight > 0);
    console.log(table.id, 'cols:', columns.length, 'paramCols:', paramCols.length, 'rows:', rows.length);
    if (paramCols.length >= 4 && rows.length > 0) {
        try {
            const row = JSON.parse(rows[0].data);
            const val = parseFloat(row[paramCols[0].title]);
            console.log('  first col:', paramCols[0].title, 'val:', row[paramCols[0].title], 'parsed:', val);
        } catch(e) { console.log('  parse error:', e.message); }
    }
}
