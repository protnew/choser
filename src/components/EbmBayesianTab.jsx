import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import MethodView, { Box, Cd } from './ebm/MethodView';

export default function EbmBayesianTab({ ebmData, baseCost, setBaseCost, paramCount }) {
    const { theme } = useApp();
    const D = theme === 'dark';
    const [method, setMethod] = useState('bayesian');

    if (!ebmData || !ebmData.stats || !ebmData.stats.utilityValues) return null;
    const s = ebmData.stats;
    const uv = s.utilityValues;
    const pv = s.priceValues || [];
    const K = baseCost;
    const k = s.candidatesPerStep || 5;

    const bg = D ? '#1e293b' : '#fff';
    const bgI = D ? '#1f2937' : '#f9fafb';
    const brd = D ? '#374151' : '#e5e7eb';
    const tM = D ? '#ffffff' : '#000000';
    const tS = D ? '#d1d5db' : '#374151';
    const gL = D ? '#374151' : '#e5e7eb';
    const aL = D ? '#374151' : '#e5e7eb';
    const mono = { fontFamily: 'JetBrains Mono, Menlo, monospace' };

    return <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Box bg={bg} brd={brd} p={14}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 18, color: tM }}>EBM — Байесовский & Monte-Carlo EVSI</h2>
                <select value={method} onChange={e => setMethod(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${brd}`, background: bgI, color: tM, fontSize: 13 }}>
                    <option value="bayesian">🧪 Байесовский</option>
                    <option value="mc">🎲 Monte-Carlo Bootstrap</option>
                </select>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
                    <label style={{ fontSize: 12, color: tS }}>K (₽/шаг):</label>
                    <input type="number" value={K} onChange={e => setBaseCost(Number(e.target.value))} style={{ width: 80, padding: '4px 8px', borderRadius: 5, border: `1px solid ${brd}`, background: bgI, color: tM, fontSize: 13 }} />
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6, marginTop: 10 }}>
                <Cd l="Объектов" v={s.n} c="#3b82f6" D={D} />
                <Cd l="μ (₽)" v={s.mean} c="#3b82f6" D={D} />
                <Cd l="σ (₽)" v={s.stdDev} c="#8b5cf6" D={D} />
                <Cd l="CV" v={s.cv} c={parseFloat(s.cv) > 0.5 ? '#ef4444' : '#10b981'} D={D} />
                <Cd l="★ Лучший" v={`${s.xMax}₽`} c="#10b981" D={D} sub={`${s.leaderPercentile}% перцентиль`} />
                <Cd l="Частотный EVSI" v={`${s.evsi}₽`} c={parseFloat(s.evsi) > 0 ? '#10b981' : '#ef4444'} D={D} />
            </div>
        </Box>

        <MethodView method={method} uv={uv} pv={pv} K={K} k={k} s={s} D={D} bg={bg} bgI={bgI} brd={brd} tM={tM} tS={tS} gL={gL} aL={aL} mono={mono} />
    </div>;
}
