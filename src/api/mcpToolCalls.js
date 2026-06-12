import { AI_SERVICE } from '../ai_service.js';
import { TABLE_STATES, loadTable, saveRows } from '../utils/db.js';
import { jsonRpcResponse, jsonRpcError } from './mcpResources.js';

export async function handleToolCall(db, env, body) {
    const { name, arguments: args } = body.params;

    const handlers = {
        search_tables: () => handleSearchTables(db, body, args),
        get_table_data: () => handleGetTableData(db, body, args),
        sql_query_read_only: () => handleSqlQuery(db, body, args),
        get_table_formatted: () => handleGetTableFormatted(db, body, args),
        generate_table: () => handleGenerateTable(db, env, body, args),
        refine_table: () => handleRefineTable(db, env, body, args),
        deep_research: () => handleDeepResearch(db, env, body, args),
        research_status: () => handleResearchStatus(db, env, body, args),
    };

    const handler = handlers[name];
    if (!handler) return jsonRpcError(body.id, -32601, `Tool '${name}' not found`);

    try { return await handler(); }
    catch (e) { return jsonRpcError(body.id, -32000, e.message); }
}

async function handleSearchTables(db, body, args) {
    const q = `%${args.query}%`;
    const { results } = await db.prepare(
        `SELECT id, title, description FROM tables WHERE (title LIKE ? OR description LIKE ?) AND state != ? LIMIT 20`
    ).bind(q, q, TABLE_STATES.DELETED).all();
    return jsonRpcResponse(body.id, { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] });
}

async function handleGetTableData(db, body, args) {
    const tableId = args.table_id || args.id;
    const limit = args.limit || 10;
    const tableData = await loadTable(db, tableId, { rowLimit: limit, kv: null });
    if (!tableData) throw new Error(`Table '${tableId}' not found`);
    const responseData = {
        info: { title: tableData.meta.title, description: tableData.meta.description, updated: tableData.meta.updated_at },
        schema: tableData.columns.map(col => ({ key: col.key, name: col.title, type: col.type, weight: col.weight })),
        data: tableData.rows
    };
    return jsonRpcResponse(body.id, { content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }] });
}

async function handleSqlQuery(db, body, args) {
    const sql = args.query.trim();
    if (!/^SELECT\s/i.test(sql)) throw new Error("Only SELECT queries are allowed.");
    const forbidden = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|GRANT|TRUNCATE|EXEC|REPLACE)\b/i;
    if (forbidden.test(sql)) throw new Error("Forbidden keywords detected.");
    const { results } = await db.prepare(sql).all();
    return jsonRpcResponse(body.id, { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] });
}

async function handleGetTableFormatted(db, body, args) {
    const tableId = args.table_id || args.id;
    const limit = args.limit || 50;
    const format = args.format || 'markdown';
    const tableData = await loadTable(db, tableId, { rowLimit: limit, kv: null });
    if (!tableData) throw new Error(`Table '${tableId}' not found`);

    const { meta: tableMeta, columns, rows } = tableData;
    const totalWeight = columns.reduce((sum, col) => sum + (col.weight || 0), 0);

    rows.sort((a, b) => {
        const aRatio = a.price > 0 ? (a.utility / a.price) * 1000 : 999;
        const bRatio = b.price > 0 ? (b.utility / b.price) * 1000 : 999;
        return bRatio - aRatio;
    });

    if (format === 'json') {
        const jsonData = {
            info: { id: tableId, title: tableMeta.title, description: tableMeta.description, updated: tableMeta.updated_at },
            schema: columns.map(col => ({ key: col.key, title: col.title, type: col.type, weight: col.weight, weight_percent: totalWeight > 0 ? Math.round((col.weight / totalWeight) * 100) : 0 })),
            rows: rows.map(row => {
                const ratio = row.price > 0 ? Math.round((row.utility / row.price) * 1000) : 999;
                const params = {};
                for (const col of columns) {
                    const cell = row[col.key];
                    params[col.key] = (cell && typeof cell === 'object') ? { grade: cell.grade !== undefined ? cell.grade : null, value: cell.value || null } : { grade: null, value: null };
                }
                return { name: row.name || null, utility_cost_ratio: ratio, utility: row.utility || 0, price: row.price || 0, params };
            })
        };
        return jsonRpcResponse(body.id, { content: [{ type: "text", text: JSON.stringify(jsonData, null, 2) }] });
    }

    // Markdown
    let md = `# ${tableMeta.title}\n\n${tableMeta.description || ''}\n\n`;
    let header = '| Название | П/С | Полезность | Цена |';
    let separator = '|:---|:---:|:---:|:---:|';
    for (const col of columns) {
        const pct = totalWeight > 0 ? Math.round((col.weight / totalWeight) * 100) : 0;
        header += ` ${col.title} (${pct}%) | Описание |`;
        separator += ':---:|:---|';
    }
    md += header + '\n' + separator + '\n';
    for (const row of rows) {
        const ratio = row.price > 0 ? Math.round((row.utility / row.price) * 1000) : 999;
        let line = `| ${row.name || '-'} | ${ratio} | ${row.utility || 0} | ${row.price || 0} |`;
        for (const col of columns) {
            const cell = row[col.key];
            if (cell && typeof cell === 'object') {
                line += ` ${cell.grade !== undefined ? cell.grade : '-'} | ${(cell.value || '-').toString().replace(/\|/g, '/').replace(/\n/g, ' ')} |`;
            } else { line += ' - | - |'; }
        }
        md += line + '\n';
    }
    return jsonRpcResponse(body.id, { content: [{ type: "text", text: md }] });
}

async function handleGenerateTable(db, env, body, args) {
    const { prompt } = args;
    const generatedData = await AI_SERVICE.generateTable(env, prompt);
    const tableId = `ai-${Date.now()}`;
    const paramCount = (generatedData.columns || []).length;
    const objectCount = (generatedData.rows || generatedData.data || []).length;
    await db.prepare('INSERT INTO tables (id, title, description, state, param_count, object_count, author) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(tableId, generatedData.title, generatedData.description || '', TABLE_STATES.OPEN, paramCount, objectCount, 'AI').run();
    await db.prepare('INSERT INTO columns (table_id, definition) VALUES (?, ?)')
        .bind(tableId, JSON.stringify(generatedData.columns || [])).run();
    await saveRows(db, tableId, generatedData.rows || generatedData.data || [], { withTimestamps: true, kv: null });
    return jsonRpcResponse(body.id, { content: [{ type: "text", text: `Table generated successfully! ID: ${tableId}` }] });
}

async function handleRefineTable(db, env, body, args) {
    const { table_id, instruction } = args;
    const tableData = await loadTable(db, table_id, { kv: null });
    if (!tableData) throw new Error(`Table ${table_id} not found`);
    const refinedData = await AI_SERVICE.refineTable(env, { title: tableData.meta.title, description: tableData.meta.description, columns: tableData.columns, rows: tableData.rows }, instruction);
    const paramCount = (refinedData.columns || []).length;
    const objectCount = (refinedData.rows || []).length;
    await db.prepare(`UPDATE tables SET title = ?, description = ?, param_count = ?, object_count = ?, updated_at = date('now') WHERE id = ?`)
        .bind(refinedData.title, refinedData.description || '', paramCount, objectCount, table_id).run();
    await db.prepare('UPDATE columns SET definition = ? WHERE table_id = ?')
        .bind(JSON.stringify(refinedData.columns || []), table_id).run();
    await db.prepare('DELETE FROM rows WHERE table_id = ?').bind(table_id).run();
    await saveRows(db, table_id, refinedData.rows || [], { withTimestamps: true, kv: null });
    return jsonRpcResponse(body.id, { content: [{ type: "text", text: `Table refined successfully!` }] });
}

async function handleDeepResearch(db, env, body, args) {
    const { topic, depth = 3 } = args;
    const jobId = `research-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    await db.prepare(`INSERT INTO research_jobs (id, topic, depth, status, steps, result, created_at, updated_at) VALUES (?, ?, ?, 'pending', '[]', null, ?, ?)`)
        .bind(jobId, topic, Math.min(depth, 3), now, now).run();

    try {
        const result = await AI_SERVICE.deepResearch(env, topic, { phase: 'overview', previousData: null });
        const steps = [{ step: 1, name: 'Обзор (Broad Scan)', data: result, completed_at: new Date().toISOString() }];
        const status = depth <= 1 ? 'completed' : 'step_done';
        await db.prepare('UPDATE research_jobs SET steps = ?, status = ?, updated_at = ? WHERE id = ?')
            .bind(JSON.stringify(steps), status, new Date().toISOString(), jobId).run();
        if (status === 'completed') {
            await db.prepare('UPDATE research_jobs SET result = ? WHERE id = ?').bind(JSON.stringify(result), jobId).run();
        }
    } catch (stepErr) {
        await db.prepare('UPDATE research_jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?')
            .bind('failed', stepErr.message, new Date().toISOString(), jobId).run();
    }

    const job = await db.prepare('SELECT * FROM research_jobs WHERE id = ?').bind(jobId).first();
    return jsonRpcResponse(body.id, {
        content: [{ type: "text", text: JSON.stringify({
            job_id: jobId, status: job.status,
            message: job.status === 'completed' ? 'Research completed in 1 step!' : `Research started. Use research_status with job_id "${jobId}" to continue.`
        }, null, 2) }]
    });
}

async function handleResearchStatus(db, env, body, args) {
    const { job_id } = args;
    const job = await db.prepare('SELECT * FROM research_jobs WHERE id = ?').bind(job_id).first();
    if (!job) throw new Error(`Job '${job_id}' not found`);

    if (job.status === 'step_done') {
        const steps = JSON.parse(job.steps || '[]');
        const currentStep = steps.length;
        const phases = ['overview', 'deep_dive', 'verification'];
        const phaseNames = ['Обзор (Broad Scan)', 'Углубление (Deep Dive)', 'Верификация (Cross-Check)'];
        const prevData = steps[currentStep - 1]?.data;

        try {
            const result = await AI_SERVICE.deepResearch(env, job.topic, { phase: phases[currentStep] || 'verification', previousData: prevData });
            steps.push({ step: currentStep + 1, name: phaseNames[currentStep] || `Шаг ${currentStep + 1}`, data: result, completed_at: new Date().toISOString() });
            const isLast = steps.length >= job.depth;
            const newStatus = isLast ? 'completed' : 'step_done';
            await db.prepare('UPDATE research_jobs SET steps = ?, status = ?, result = ?, updated_at = ? WHERE id = ?')
                .bind(JSON.stringify(steps), newStatus, isLast ? JSON.stringify(result) : null, new Date().toISOString(), job_id).run();
        } catch (stepErr) {
            await db.prepare('UPDATE research_jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?')
                .bind('failed', stepErr.message, new Date().toISOString(), job_id).run();
        }

        const updated = await db.prepare('SELECT * FROM research_jobs WHERE id = ?').bind(job_id).first();
        return jsonRpcResponse(body.id, {
            content: [{ type: "text", text: JSON.stringify({
                job_id: updated.id, topic: updated.topic, status: updated.status,
                steps_completed: JSON.parse(updated.steps || '[]').length, total_steps: updated.depth,
                result: updated.result ? JSON.parse(updated.result) : null
            }, null, 2) }]
        });
    }

    return jsonRpcResponse(body.id, {
        content: [{ type: "text", text: JSON.stringify({
            job_id: job.id, topic: job.topic, status: job.status,
            steps_completed: JSON.parse(job.steps || '[]').length, total_steps: job.depth,
            result: job.result ? JSON.parse(job.result) : null, error: job.error
        }, null, 2) }]
    });
}
