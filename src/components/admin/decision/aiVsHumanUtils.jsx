import React from 'react';

export const posBadge = (pct, match, outOf = 3) => {
    const color = pct === 100 ? '#22c55e' : pct >= 67 ? '#84cc16' : pct >= 33 ? '#f59e0b' : '#ef4444';
    return <span style={{ background: color, color: 'white', borderRadius: 4, padding: '2px 6px', fontSize: '0.85em', fontWeight: 'bold' }}>{pct}% ({match}/{outOf})</span>;
};

export const normMatch = (a, h) => {
    const al = a.toLowerCase().trim(), hl = h.toLowerCase().trim();
    if (al === hl) return 'exact';
    const stripUrl = s => { try { const u = new URL(s.startsWith('http') ? s : 'https://' + s); return u.hostname.replace(/^www\./, ''); } catch { return s.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, ''); } };
    const ad = stripUrl(a).toLowerCase(), hd = stripUrl(h).toLowerCase();
    if (ad === hd) return 'url';
    if (ad.includes(hd) || hd.includes(ad)) return 'substring';
    const nums = s => (s.toLowerCase().match(/\d+[.,]?\d*\s*(гб|gb|мб|mb|тб|tb|ghz|мгц|mhz|ddr)/g) || []).map(n => n.replace(/\s/g, ''));
    const na = nums(a), nh = nums(h);
    if (na.length && nh.length && na.some(n => nh.includes(n))) return 'semantic';
    const aw = al.replace(/[-_]/g, ' ').replace(/[^a-zа-яё0-9 ]/g, '').split(' ').filter(w => w.length > 2);
    const hw = hl.replace(/[-_]/g, ' ').replace(/[^a-zа-яё0-9 ]/g, '').split(' ').filter(w => w.length > 2);
    const overlap = aw.filter(w => hw.some(w2 => w.includes(w2) || w2.includes(w)));
    if (overlap.length >= Math.min(aw.length, hw.length) * 0.5 && overlap.length > 0) return 'words';
    return null;
};

export function buildPartialAnalysis(aiVsHuman) {
    if (!aiVsHuman?.length) return null;
    const tableStats = [];
    for (const r of aiVsHuman) {
        try {
            const ai = JSON.parse(r.ai_objects || '[]');
            const human = JSON.parse(r.human_objects || '[]');
            const pairs = [];
            for (const a of ai) { for (const h of human) { const t = normMatch(a, h); if (t && t !== 'exact') pairs.push({ ai: a, human: h, type: t }); } }
            if (pairs.length > 0) tableStats.push({ table: r.table_title, tableId: r.table_id, idx: aiVsHuman.indexOf(r) + 1, matchPercent: r.match_percent, pairs });
        } catch {}
    }
    const byType = {};
    let totalPairs = 0;
    for (const t of tableStats) { for (const p of t.pairs) { byType[p.type] = (byType[p.type] || 0) + 1; totalPairs++; } }
    return { tableStats, counts: byType, total: totalPairs, tablesAffected: tableStats.length };
}
