import React from 'react';

export function Box({ bg, brd, p, children }) {
    return <div style={{ background: bg, border: `1px solid ${brd}`, borderRadius: 10, padding: p }}>{children}</div>;
}

export function Cd({ l, v, c, D, sub }) {
    return <div style={{ padding: 8, background: D ? '#1f2937' : '#f9fafb', borderRadius: 5, borderLeft: `3px solid ${c}` }}>
        <div style={{ fontSize: 12, color: 'inherit', textTransform: 'uppercase', fontWeight: 600 }}>{l}</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1, color: D ? '#fff' : '#000' }}>{v}</div>
        {sub && <div style={{ fontSize: 12, color: 'inherit', marginTop: 1 }}>{sub}</div>}
    </div>;
}

export function Cr({ ok, l, sub }) {
    return <div style={{ padding: '6px 10px', borderRadius: 6, background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: ok ? '#10b981' : '#ef4444' }}>{ok ? '✅' : '⛔'} {l}</div>
        {sub && <div style={{ fontSize: 12, color: 'inherit', marginTop: 2 }}>{sub}</div>}
    </div>;
}

export const monoStyle = { fontFamily: "'Consolas', 'Courier New', monospace", whiteSpace: 'pre-wrap', lineHeight: '1.75' };

export function niceScale(lo, hi, ticks) {
    if (lo === hi) { lo -= 1; hi += 1; }
    const rough = (hi - lo) / (ticks || 6);
    const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(rough) || 1)));
    const norm = rough / mag;
    const s = norm < 1.5 ? mag : norm < 3 ? 2 * mag : norm < 7 ? 5 * mag : 10 * mag;
    return { min: Math.floor(lo / s) * s, max: Math.ceil(hi / s) * s, step: s };
}
