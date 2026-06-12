# Choser Database Seeding & MCP Tool Interaction

## Context
The Choser Engine UI (Parametric Decision Tables) is strictly tied to a specific JSON schema in the SQLite database (`choser.db`). 

While Cloud-based MCP tools can be used to research information, **directly injecting complex formatted Markdown tables via MCP text tools often fails** because the Choser UI expects atomic `rows` with `{ name, price, p_foo: { grade: X, value: "..." } }`. 

## Best Practices for Agentic Work
When an AI agent is asked to "create a new table in Choser" or "update parameters in Choser", the agent **should not** try to use conversational `add_table` MCP tool if it expects deep custom JSON formats that the generic MCP tool can't handle perfectly.

Instead, the agent should:
1. Write a local Node.js script (e.g. `seed_table.cjs`).
2. Use `better-sqlite3` to connect to `C:/ChoserDB/data/choser.db` (or the equivalent local path).
3. Construct the `columns` array with `key`, `title`, `weight`, `type: 'text'`.
4. Construct the `rows` array with objects containing nested parameters (`{ grade: number, value: string }`).
5. Insert the data natively using an `INSERT OR REPLACE INTO tables` transaction, ensuring to stringify JSON.
6. **CRITICAL:** If the backend is running in a Docker container (e.g., `choser-edp`), the SQLite in-memory cache may hold stale data. After running the Node.js script natively on the host, the agent MUST run `docker restart choser-edp` to force the UI to read the updated `.db` file.

## Schema Example
```javascript
const columns = [
  { key: 'p_perf', title: 'Performance', weight: 8, type: 'text' }
];
const rows = [
  {
    name: 'XTLS Reality',
    price: 0,
    p_perf: { grade: 10, value: 'Zero-copy splice...' }
  }
];
// SQLite operations...
db.prepare('INSERT OR REPLACE INTO tables (id, title, state, param_count, object_count) VALUES (?, ?, ?, ?, ?)')
  .run('table-id', 'Title', 'открытая', columns.length, rows.length);
db.prepare('INSERT INTO columns (table_id, definition) VALUES (?, ?)').run('table-id', JSON.stringify(columns));
db.prepare('INSERT INTO rows (table_id, data) VALUES (?, ?)').run('table-id', JSON.stringify(row));
```

## Troubleshooting
- **API returns "Not found" / 404:** Check if `state` is set correctly (use `'открытая'`). Check if Docker container needs a restart.
- **UI doesn't render parameter values:** Make sure the structure is exactly `{ grade: X, value: "string" }` for every parameter.
