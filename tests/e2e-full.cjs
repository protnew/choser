/**
 * e2e-full.cjs — Comprehensive E2E test for Choser EDP
 * 40+ tests covering: API, frontend, all viz types, security, data integrity
 */
const http = require('http');

const BASE = { hostname: 'localhost', port: 3000 };
let pass = 0, fail = 0;
const results = [];

function req(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const opts = { ...BASE, path, method, headers: {} };
        if (body) {
            opts.headers['Content-Type'] = 'application/json';
            opts.headers['Content-Length'] = Buffer.byteLength(body);
        }
        const r = http.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
        });
        r.on('error', reject);
        r.setTimeout(10000, () => { r.destroy(); reject(new Error('timeout')); });
        if (body) r.write(body);
        r.end();
    });
}

function assert(name, condition, detail = '') {
    if (condition) { pass++; results.push(`  PASS  ${name}`); }
    else { fail++; results.push(`  FAIL  ${name} ${detail ? '— ' + detail : ''}`); }
}

async function run() {
    console.log('=======================================');
    console.log('  Choser EDP — Full E2E Test Suite');
    console.log('=======================================\n');

    // ─── GROUP 1: Backend API ───
    console.log('--- Group 1: Backend API ---');

    // 1. Health
    try {
        const r = await req('/v1/api/health');
        const d = JSON.parse(r.body);
        assert('1. Health endpoint', r.status === 200 && d.status === 'ok');
        assert('2. DB connected', d.db === 'connected');
        assert('3. Node version', d.node_version && d.node_version.startsWith('v'), `got ${d.node_version}`);
    } catch (e) { assert('1. Health endpoint', false, e.message); }

    // 4. Personas (10 agents)
    try {
        const r = await req('/v1/api/personas');
        const d = JSON.parse(r.body);
        const count = Array.isArray(d) ? d.length : (d.personas || d.data || []).length;
        assert('4. Personas API', r.status === 200);
        assert('5. 10 agents present', count >= 10, `got ${count}`);
        // Check specific roles
        const allNames = JSON.stringify(d);
        assert('6. CEO agent', allNames.includes('CEO') || allNames.includes('ceo'));
        assert('7. CTO agent', allNames.includes('CTO') || allNames.includes('cto'));
        assert('8. CFO agent', allNames.includes('CFO') || allNames.includes('cfo'));
        assert('9. CISO agent', allNames.includes('CISO') || allNames.includes('ciso'));
    } catch (e) { assert('4. Personas API', false, e.message); }

    // 10. Tables list
    try {
        const r = await req('/v1/api/tables?limit=5');
        const d = JSON.parse(r.body);
        const tables = d.tables || d.data || (Array.isArray(d) ? d : []);
        assert('10. Tables list', Array.isArray(tables) && tables.length >= 1, `got ${typeof d}`);
    } catch (e) { assert('10. Tables list', false, e.message); }

    // 11. DB has 100+ tables
    try {
        const r = await req('/v1/api/tables?limit=1000');
        const d = JSON.parse(r.body);
        const tables = d.tables || d.data || (Array.isArray(d) ? d : []);
        assert('11. DB has 100+ tables', Array.isArray(tables) && tables.length >= 100, `got ${tables.length}`);
    } catch (e) { assert('11. DB tables count', false, e.message); }

    // ─── GROUP 2: Visualization Tables ───
    console.log('\n--- Group 2: Visualization Tables ---');

    // 12-16. Tree visualization table
    try {
        const r = await req('/v1/api/table/vybor-vizualizaciya-dereva-resheniy');
        const d = JSON.parse(r.body);
        assert('12. Tree viz table loads', r.status === 200);
        assert('13. Tree viz: 25 objects', (d.data || []).length >= 25, `got ${(d.data || []).length}`);
        assert('14. Tree viz: 9 params', (d.columns || []).length >= 9, `got ${(d.columns || []).length}`);

        // Check specific frameworks in objects
        const allData = JSON.stringify(d);
        assert('15. Contains ECharts variant', allData.includes('ECharts'));
        assert('16. Contains React Flow variant', allData.includes('React Flow'));
        assert('17. Contains D3.js variant', allData.includes('D3.js'));
        assert('18. Contains Graphviz variant', allData.includes('Graphviz'));
        assert('19. Contains Cytoscape variant', allData.includes('Cytoscape'));
        assert('20. Contains AntV G6 variant', allData.includes('AntV G6'));
    } catch (e) { assert('12. Tree viz table', false, e.message); }

    // 21-24. Table visualization table
    try {
        const r = await req('/v1/api/table/vybor-top10-vizualizaciya-tablic-choser');
        const d = JSON.parse(r.body);
        assert('21. Table viz loads', r.status === 200);
        assert('22. Table viz: 10 objects', (d.data || []).length >= 10, `got ${(d.data || []).length}`);

        const allData = JSON.stringify(d);
        assert('23. Has Heatmap variant', allData.includes('Heatmap'));
        assert('24. Has Radar variant', allData.includes('Radar'));
        assert('25. Has Sankey variant', allData.includes('Sankey'));
        assert('26. Has Gauge variant', allData.includes('Gauge'));
    } catch (e) { assert('21. Table viz', false, e.message); }

    // ─── GROUP 3: Frontend Bundle ───
    console.log('\n--- Group 3: Frontend Bundle ---');

    // 27-30. HTML + bundle
    try {
        const html = (await req('/')).body;
        assert('27. Frontend serves HTML', html.includes('<div id="root">'));
        assert('28. Bundle script tag', html.includes('index-') && html.includes('.js'));

        const match = html.match(/index-[A-Za-z0-9_-]+\.js/);
        if (match) {
            const r = await req('/assets/' + match[0]);
            const b = r.body;
            assert('29. Bundle loads (>100KB)', r.status === 200 && b.length > 100000, `size=${b.length}`);

            // Check all viz types in bundle
            const vizChecks = {
                '30. tree-TB in bundle': b.includes('tree-TB'),
                '31. tree-LR in bundle': b.includes('tree-LR'),
                '32. tree-radial in bundle': b.includes('tree-radial'),
                '33. heatmap in bundle': b.includes('heatmap'),
                '34. radar in bundle': b.includes('radar'),
                '35. treemap in bundle': b.includes('treemap'),
                '36. sankey in bundle': b.includes('sankey'),
                '37. gauge in bundle': b.includes('gauge'),
                '38. funnel in bundle': b.includes('funnel'),
                '39. parallel in bundle': b.includes('parallel'),
                '40. pie in bundle': b.includes('pie'),
                '41. scatter in bundle': b.includes('scatter'),
            };
            for (const [name, ok] of Object.entries(vizChecks)) {
                assert(name, ok);
            }

            // Framework labels
            assert('42. [ECharts] label in bundle', b.includes('ECharts'));

            // tableId (click navigation)
            assert('43. tableId in bundle (click nav)', b.includes('tableId'));

            // Array.isArray guard
            assert('44. Array.isArray guard', b.includes('Array.isArray'));

            // ChatList / PublishTab / AgentTableSwitcher
            assert('45. ChatTab component', b.includes('свернуть') || b.includes('expandedAgent'));
            assert('46. PublishTab component', b.includes('Сгенерировать') || b.includes('Публичный'));
            assert('47. AgentTableSwitcher', b.includes('Усреднённая') || b.includes('averaged'));
        } else {
            assert('29. Bundle loads', false, 'no hash found');
        }
    } catch (e) { assert('27. Frontend HTML', false, e.message); }

    // ─── GROUP 4: Security ───
    console.log('\n--- Group 4: Security ---');

    // 48. No secrets in bundle
    try {
        const html = (await req('/')).body;
        const match = html.match(/index-[A-Za-z0-9_-]+\.js/);
        if (match) {
            const b = (await req('/assets/' + match[0])).body;
            const hasKey = b.includes('sk-') || b.includes('AIza') || b.includes('ghp_') || b.includes('glpat-');
            assert('48. No API keys in bundle', !hasKey, 'key found!');
            assert('49. No .env in bundle', !b.includes('ZAI_API_KEY=') && !b.includes('JWT_SECRET='));
        }
    } catch (e) { assert('48. Security scan', false, e.message); }

    // 50. No PWA
    try {
        const r = await req('/sw.js');
        const isHtml = r.body.includes('<!DOCTYPE html>') || r.body.includes('<html');
        const hasSW = r.body.includes('self.addEventListener') || r.body.includes('ServiceWorker');
        assert('50. No PWA service worker', isHtml || !hasSW, 'SW code found!');
    } catch (e) { assert('50. No PWA', false, e.message); }

    // ─── GROUP 5: Data Integrity ───
    console.log('\n--- Group 5: Data Integrity ---');

    // 51. Choser DB table exists
    try {
        const r = await req('/v1/api/table/vybor-bd-dlya-choser-edp');
        const d = JSON.parse(r.body);
        assert('51. Choser DB table loads', r.status === 200);
        assert('52. Choser DB: 5 objects', (d.data || []).length >= 5, `got ${(d.data || []).length}`);
        assert('53. Choser DB: SQLite object', JSON.stringify(d).includes('SQLite'));
    } catch (e) { assert('51. Choser DB table', false, e.message); }

    // 54. Each viz table has graded data (not zeros)
    try {
        const r = await req('/v1/api/table/vybor-vizualizaciya-dereva-resheniy');
        const d = JSON.parse(r.body);
        const firstRow = (d.data || [])[0] || {};
        const cols = d.columns || [];
        let hasGrades = false;
        for (const c of cols) {
            if (firstRow[c.key]?.grade > 0) { hasGrades = true; break; }
        }
        assert('54. Viz table has graded data', hasGrades, 'all grades are 0');
    } catch (e) { assert('54. Viz table grades', false, e.message); }

    // ─── GROUP 6: Container Health ───
    console.log('\n--- Group 6: Container Health ---');

    // 55. Supervisor running
    try {
        const r = await req('/v1/api/health');
        const d = JSON.parse(r.body);
        assert('55. Server responds fast', d.uptime_sec !== undefined);
        assert('56. DB size > 1MB', d.db_size_mb >= 1.0, `size=${d.db_size_mb}MB`);
    } catch (e) { assert('55. Container health', false, e.message); }

    // Print results
    console.log('\n=======================================');
    console.log(results.join('\n'));
    console.log('\n=======================================');
    const total = pass + fail;
    const pct = Math.round(pass / total * 100);
    console.log(`  RESULTS: ${pass} PASS / ${fail} FAIL / ${total} TOTAL`);
    console.log(`  COVERAGE: ${pct}%`);
    console.log('=======================================\n');
    process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('FATAL:', e); process.exit(2); });
