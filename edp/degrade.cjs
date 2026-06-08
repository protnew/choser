const db = require('better-sqlite3')('./data/choser.db');

const tableId = 'sablon-dla-vybora-crm';
const title = db.prepare('SELECT title FROM tables WHERE id = ?').get(tableId).title;
const cols = JSON.parse(db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(tableId).definition);
const rows = db.prepare('SELECT data FROM rows WHERE table_id = ?').all(tableId).map(r => JSON.parse(r.data));

// Build param map with weights
const params = cols.filter(c => c.weight > 0 && c.key).map(c => ({
  key: c.key, title: c.title, weight: c.weight, type: c.type
})).sort((a,b) => b.weight - a.weight);

console.log('=== ТАБЛИЦА:', title, '===');
console.log('Объектов:', rows.length, '| Параметров с весами:', params.length);
console.log();

// Object names
const getName = r => r['Название'] || r['name'] || r['Объект'] || Object.values(r)[0] || '?';

// Score calculation
function calcScores(paramKeys, useWeights, roundFn) {
  const paramMap = new Map(params.map(p => [p.key, p]));
  return rows.map(row => {
    let score = 0, totalWeight = 0;
    for (const key of paramKeys) {
      const col = paramMap.get(key);
      const raw = row[key];
      let val;
      if (raw && typeof raw === 'object') {
        val = parseFloat(raw.grade) || parseFloat(raw.value) || 0;
      } else {
        val = parseFloat(raw) || 0;
      }
      const w = useWeights ? (col?.weight || 1) : 1;
      score += roundFn(val) * w;
      totalWeight += w;
    }
    return { name: getName(row), score: totalWeight > 0 ? +(score / totalWeight).toFixed(4) : 0 };
  }).sort((a, b) => b.score - a.score);
}

const identity = v => v;
const binary = v => v >= 7 ? 1 : 0;
const threePoint = v => Math.max(0, Math.min(3, Math.round(v / 3.33)));
const allKeys = params.map(p => p.key);

// BASELINE
const baseline = calcScores(allKeys, true, identity);
console.log('--- BASELINE (полная модель: все веса, все параметры, шкала 1-10) ---');
baseline.slice(0, 10).forEach((r, i) => console.log(`  ${i+1}. ${r.name} — ${r.score.toFixed(2)}`));
console.log();

// Helper: compare with baseline
function compare(label, modified) {
  const base3 = baseline.slice(0, 3).map(r => r.name);
  const mod3 = modified.slice(0, 3).map(r => r.name);
  const match = [0,1,2].map(i => ({ pos: i+1, base: base3[i], mod: mod3[i], ok: base3[i] === mod3[i] }));
  const exactN = match.filter(m => m.ok).length;
  console.log(`--- ${label} ---`);
  modified.slice(0, 10).forEach((r, i) => {
    const was = baseline.find(b => b.name === r.name);
    const delta = r.score - (was?.score || 0);
    const moved = was ? i+1 - (baseline.indexOf(was)+1) : 0;
    const arrow = moved > 0 ? `↓${moved}` : moved < 0 ? `↑${-moved}` : '=';
    console.log(`  ${i+1}. ${r.name} — ${r.score.toFixed(2)} (${arrow})`);
  });
  console.log(`  Совпадение топ-3: ${exactN}/3 (${Math.round(exactN/3*100)}%)`);
  match.forEach(m => {
    console.log(`    ${m.pos}-е место: ${m.ok ? '✓' : '✗'} baseline="${m.base}" | modified="${m.mod}"`);
  });
  console.log();
  return exactN;
}

// 1. Remove weights
const noWeights = calcScores(allKeys, false, identity);
compare('БЕЗ ВЕСОВ (все критерии равнозначны)', noWeights);

// 2. Keep top 10 params
const top10 = calcScores(allKeys.slice(0, 10), true, identity);
compare(`ТОП-10 ПАРАМЕТРОВ (из ${params.length})`, top10);

// 3. Keep top 5 params
const top5 = calcScores(allKeys.slice(0, 5), true, identity);
compare(`ТОП-5 ПАРАМЕТРОВ (из ${params.length})`, top5);

// 4. Binary scale
const binaryScores = calcScores(allKeys, true, binary);
compare('БИНАРНАЯ ШКАЛА (≥7=1, <7=0)', binaryScores);

// 5. 3-point scale
const threeScores = calcScores(allKeys, true, threePoint);
compare('3-БАЛЛЬНАЯ ШКАЛА (1-3)', threeScores);

// 6. Combo: no weights + top 10 + binary
const combo = calcScores(allKeys.slice(0, 10), false, binary);
compare('КОМБО: без весов + топ-10 + бинарная', combo);

// Summary
console.log('=== СВОДКА ===');
console.log(`Baseline топ-3: ${baseline.slice(0,3).map(r=>r.name).join(' | ')}`);
console.log();
const scenarios = [
  ['Без весов', noWeights],
  ['Топ-10 параметров', top10],
  ['Топ-5 параметров', top5],
  ['Бинарная шкала', binaryScores],
  ['3-балльная шкала', threeScores],
  ['Комбо (всё вместе)', combo],
];
const base3 = baseline.slice(0, 3).map(r => r.name);
console.log('Сценарий                    | Топ-3 совпал | Лидер сменился? | Новый лидер');
console.log('-----------------------------|---------------|-----------------|------------');
for (const [label, scores] of scenarios) {
  const mod3 = scores.slice(0, 3).map(r => r.name);
  const match = [0,1,2].filter(i => base3[i] === mod3[i]).length;
  const leaderChanged = base3[0] !== mod3[0];
  console.log(`${label.padEnd(28)} | ${match}/3 (${Math.round(match/3*100)}%)      | ${leaderChanged ? 'ДА' : 'нет'}            | ${leaderChanged ? mod3[0] : base3[0]}`);
}

db.close();
