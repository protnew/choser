/**
 * E2E Council Test — full validation
 * Checks: scores structure, all cells filled, grades 1-10, sources present
 */
const body = JSON.stringify({
    topic: "iPhone 15 Pro vs Samsung Galaxy S24",
    question: "Какой телефон лучше для бизнеса",
    mode: "parallel",
    searchMode: "memory",
    num_personas: 3,
    num_parameters: 3
});

const http = require('http');
const req = http.request({
    hostname: 'localhost',
    port: 3002,
    path: '/v1/api/council/decide-stream',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout: 300000
}, (res) => {
    let buffer = '';
    res.on('data', (chunk) => { buffer += chunk.toString(); });
    res.on('end', () => {
        const lines = buffer.split('\n');
        const events = {};
        let currentEvent = null;

        for (const line of lines) {
            if (line.startsWith('event:')) currentEvent = line.replace('event:', '').trim();
            if (line.startsWith('data:') && currentEvent) {
                if (!events[currentEvent]) events[currentEvent] = [];
                try { events[currentEvent].push(JSON.parse(line.substring(5))); } catch(_) {}
            }
        }

        console.log('STATUS:', res.statusCode);
        console.log('EVENT_TYPES:', Object.keys(events).join(', '));
        console.log('');

        // Check vote events
        const votes = events.vote || [];
        console.log(`=== VOTES: ${votes.length} ===`);
        for (const v of votes) {
            const scoreCount = v.scores ? Object.keys(v.scores).length : 0;
            console.log(`  ${v.emoji} ${v.name}: rec=${v.recommendation}, score=${v.score}, objects=${scoreCount}`);
        }

        // Check table
        const tables = events.table || [];
        if (tables.length > 0) {
            const t = tables[0];
            console.log(`\n=== TABLE: ${t.objects.length} rows × ${t.parameters.length} cols ===`);
            console.log('Parameters:', t.parameters.map(p => `${p.name}(${p.weight}%)`).join(', '));
            console.log('');

            let totalCells = 0;
            let filledCells = 0;
            let emptyCells = [];
            let cellsWithSource = 0;
            let cellsWithReason = 0;

            for (const obj of t.objects) {
                process.stdout.write(`  ${obj.name} (${obj.price}): `);
                for (const param of t.parameters) {
                    totalCells++;
                    const cell = obj.scores[param.name];
                    if (cell && cell.grade > 0 && cell.value !== '—') {
                        filledCells++;
                        process.stdout.write(`${cell.grade} `);
                        if (cell.source && cell.source.startsWith('http')) cellsWithSource++;
                        if (cell.value && cell.value !== `${cell.grade}/10`) cellsWithReason++;
                    } else {
                        emptyCells.push(`${obj.name}/${param.name}`);
                        process.stdout.write('✗ ');
                    }
                }
                console.log('');
            }

            console.log(`\n=== COMPLETENESS ===`);
            console.log(`Fill rate: ${filledCells}/${totalCells} (${Math.round(filledCells/totalCells*100)}%)`);
            console.log(`With source: ${cellsWithSource}/${totalCells}`);
            console.log(`With reason: ${cellsWithReason}/${totalCells}`);
            if (emptyCells.length > 0) {
                console.log(`⚠️ Empty cells (${emptyCells.length}): ${emptyCells.join(', ')}`);
            }

            // Verdict
            const fillPct = filledCells / totalCells;
            if (fillPct === 1) console.log('\n✅ ALL CELLS FILLED');
            else if (fillPct >= 0.8) console.log('\n🟡 MOSTLY FILLED (' + Math.round(fillPct*100) + '%)');
            else console.log('\n❌ INCOMPLETE (' + Math.round(fillPct*100) + '%)');
        } else {
            console.log('\n❌ NO TABLE GENERATED');
        }

        // Check consensus
        const consensus = events.consensus || [];
        if (consensus.length > 0) {
            console.log(`\n=== CONSENSUS ===`);
            console.log(`Score: ${consensus[0].score}, Recommendation: ${consensus[0].recommendation}`);
            console.log(`Votes: ${consensus[0].votes}`);
        }

        // Check warnings
        const warnings = events.warning || [];
        if (warnings.length > 0) {
            console.log(`\n⚠️ WARNINGS:`);
            for (const w of warnings) {
                console.log(`  ${w.type}: ${w.message}`);
            }
        }

        // Done
        const done = events.done || [];
        if (done.length > 0) {
            console.log(`\n=== DONE ===`);
            console.log(`Tokens: in=${done[0].totalTokens?.input}, out=${done[0].totalTokens?.output}`);
        }
    });
});
req.on('error', (e) => { console.error('ERROR:', e.message); });
req.on('timeout', () => { req.destroy(); console.error('TIMEOUT'); });
req.write(body);
req.end();
