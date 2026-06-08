const Database = require('better-sqlite3');
const db = new Database('./data/choser.db');
// Check that API filters hidden tables
const all = db.prepare("SELECT id, title, state FROM tables WHERE state != 'deleted' AND state != 'скрытая' AND title NOT LIKE '%политич%' AND title NOT LIKE '%Сири%' AND title NOT LIKE '%Забастовк%' ORDER BY rowid ASC LIMIT 5").all();
console.log('Visible (first 5):');
all.forEach(t => console.log(`  ${t.title} [${t.state}]`));

// Check hidden
const hidden = db.prepare("SELECT id, title, state FROM tables WHERE state = 'скрытая'").all();
console.log(`\nHidden (${hidden.length}):`);
hidden.forEach(t => console.log(`  ${t.title} [${t.state}]`));

// Verify API endpoint would exclude them
const apiCount = db.prepare("SELECT COUNT(*) as c FROM tables WHERE state != 'deleted' AND state != 'скрытая'").get().c;
const totalCount = db.prepare("SELECT COUNT(*) as c FROM tables WHERE state != 'deleted'").get().c;
console.log(`\nAPI visible: ${apiCount}, Total (incl hidden): ${totalCount}`);
