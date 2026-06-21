import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useApp } from '../../contexts/AppContext';

function niceScale(lo, hi, n = 6) {
    const range = hi - lo || 1;
    const rough = range / n;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const res = rough / mag;
    const step = (res <= 1.5 ? 1 : res <= 3 ? 2 : res <= 7 ? 5 : 10) * mag;
    return { min: Math.floor(lo / step) * step, max: Math.ceil(hi / step) * step, step };
}

const CLR = {
    evsi: '#059669', eben: '#2563eb', cost: '#f59e0b', stop: '#ef4444',
    ci: 'rgba(5,150,105,0.45)', ciFill: 'rgba(5,150,105,0.12)',
};

export default function EmpiricalTab({ allScores, N }) {
    const [budget, setBudget] = useState(10000);
    const [costStep, setCostStep] = useState(250);
    const [steps, setSteps] = useState(25);
    const { theme } = useApp(); const D = theme === 'dark';

    const getEM = (n) => {
        if (N === 0) return 0;
        let em = 0;
        for (let i = 0; i < N; i++) em += allScores[i] * (Math.pow((i + 1) / N, n) - Math.pow(i / N, n));
        return Math.max(em, allScores[N - 1]);
    };
    const getPM = (n, p) => {
        if (N === 0) return 0;
        return allScores[Math.min(N - 1, Math.max(0, Math.floor(Math.pow(p, 1 / n) * N)))];
    };

    const baseEV = getEM(1);
    const curve = Array.from({ length: steps }, (_, i) => {
        const add = i + 1, tot = add + 1;
        const ev = getEM(tot);
        const p10 = getPM(tot, 0.10), p90 = getPM(tot, 0.90);
        const gross = (ev - baseEV) * budget;
        const cost = add * costStep;
        return { n: add, net: gross - cost, gross, loNet: (p10 - baseEV) * budget - cost, hiNet: (p90 - baseEV) * budget - cost, cost };
    });

    const best = curve.reduce((m, p) => p.net > m.net ? p : m, { n: 0, net: -Infinity, cost: 0 });
    const vals = curve.flatMap(p => [p.net, p.gross, p.cost, p.loNet, p.hiNet]);
    const sc = niceScale(Math.min(0, ...vals) * 1.05, Math.max(...vals) * 1.05);

    const option = {
        animation: false,
        grid: { top: 50, bottom: 85, left: 60, right: 25 },
        title: { text: 'Чистая выгода от дополнительных исследований', subtext: `${N} вариантов, ценность=$${budget.toLocaleString()}`, left: 'center', top: 3, textStyle: { fontSize: 13, color: D ? '#ffffff' : '#000000' }, subtextStyle: { fontSize: 12, color: D ? '#d1d5db' : '#374151' } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, backgroundColor: D ? '#1e293b' : '#fff', borderColor: D ? '#374151' : '#e5e7eb', borderWidth: 1, textStyle: { color: D ? '#ffffff' : '#000000', fontSize: 12 } },
        legend: {
            bottom: 0, itemWidth: 20, itemHeight: 3, itemGap: 10,
            textStyle: { color: D ? '#d1d5db' : '#374151', fontSize: 12 },
            data: [
                { name: 'Чистая выгода', icon: 'roundRect', itemStyle: { color: CLR.evsi } },
                { name: 'Валовая польза', icon: 'roundRect', itemStyle: { color: CLR.eben } },
                { name: 'Затраты', icon: 'roundRect', itemStyle: { color: CLR.cost } },
                { name: '80% ДИ', icon: 'roundRect', itemStyle: { color: CLR.ci } },
                { name: 'Линия СТОП (=0)', icon: 'roundRect', itemStyle: { color: CLR.stop } },
            ],
        },
        xAxis: { type: 'category', data: curve.map(p => `+${p.n}`), axisLabel: { color: D ? '#d1d5db' : '#374151' }, axisLine: { lineStyle: { color: D ? '#374151' : '#e5e7eb' } } },
        yAxis: { type: 'value', min: sc.min, max: sc.max, interval: sc.step, axisLabel: { color: D ? '#d1d5db' : '#374151', formatter: v => '$' + v.toLocaleString() }, splitLine: { lineStyle: { type: 'dashed', color: D ? '#374151' : '#e5e7eb' } } },
        series: [
            { name: 'Линия СТОП (=0)', type: 'line', data: curve.map(() => 0), lineStyle: { color: CLR.stop, width: 2, type: 'dashed' }, symbol: 'none', tooltip: { show: false }, z: 25 },
            { name: '_ciLo', type: 'line', data: curve.map(p => p.loNet), lineStyle: { opacity: 0 }, symbol: 'none', stack: 'ci', tooltip: { show: false }, silent: true },
            { name: '80% ДИ', type: 'line', data: curve.map(p => p.hiNet - p.loNet), lineStyle: { opacity: 0 }, symbol: 'none', areaStyle: { color: CLR.ciFill }, stack: 'ci', tooltip: { show: false }, silent: true },
            { name: '_ciHiL', type: 'line', data: curve.map(p => p.hiNet), lineStyle: { color: CLR.ci, width: 1, type: 'dotted' }, symbol: 'none', tooltip: { show: false }, z: 5 },
            { name: '_ciLoL', type: 'line', data: curve.map(p => p.loNet), lineStyle: { color: CLR.ci, width: 1, type: 'dotted' }, symbol: 'none', tooltip: { show: false }, z: 5 },
            { name: 'Чистая выгода', type: 'line', smooth: true, z: 20, data: curve.map(p => p.net), lineStyle: { color: CLR.evsi, width: 3 }, itemStyle: { color: CLR.evsi }, symbol: 'circle', symbolSize: 5 },
            { name: 'Валовая польза', type: 'line', smooth: true, data: curve.map(p => p.gross), lineStyle: { color: CLR.eben, width: 2, type: 'dashed' }, itemStyle: { color: CLR.eben }, symbol: 'none' },
            { name: 'Затраты', type: 'line', data: curve.map(p => p.cost), lineStyle: { color: CLR.cost, width: 2 }, itemStyle: { color: CLR.cost }, symbol: 'none' },
        ],
    };

    return (
        <div>
            <div style={{ background: D ? '#1f2937' : '#f9fafb', padding: 12, borderRadius: 8, border: `1px solid ${D ? '#374151' : '#e5e7eb'}`, marginBottom: 14, fontSize: 13, color: D ? '#d1d5db' : '#374151' }}>
                <b style={{ color: D ? '#ffffff' : '#000000' }}>Эмпирический EVSI — Order Statistics</b>. {N} реальных оценок, без допущений о распределении.
            </div>
            <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
                <div><label style={{ display: 'block', fontSize: 12, color: D ? '#d1d5db' : '#374151', marginBottom: 2 }}>Ценность ($)</label><input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} style={{ padding: '5px 8px', borderRadius: 5, border: `1px solid ${D ? '#374151' : '#e5e7eb'}`, width: 100 }} /></div>
                <div><label style={{ display: 'block', fontSize: 12, color: D ? '#d1d5db' : '#374151', marginBottom: 2 }}>Стоимость шага ($)</label><input type="number" value={costStep} onChange={e => setCostStep(Number(e.target.value))} style={{ padding: '5px 8px', borderRadius: 5, border: `1px solid ${D ? '#374151' : '#e5e7eb'}`, width: 100 }} /></div>
                <div><label style={{ display: 'block', fontSize: 12, color: D ? '#d1d5db' : '#374151', marginBottom: 2 }}>Горизонт</label><input type="number" value={steps} onChange={e => setSteps(Number(e.target.value))} style={{ padding: '5px 8px', borderRadius: 5, border: `1px solid ${D ? '#374151' : '#e5e7eb'}`, width: 70 }} /></div>
            </div>
            <div style={{ height: 380 }}><ReactECharts option={option} style={{ height: '100%', width: '100%' }} /></div>
            <div style={{ marginTop: 12, padding: 10, background: D ? '#1f2937' : '#f9fafb', borderRadius: 8, border: `1px solid ${D ? '#374151' : '#e5e7eb'}`, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ flex: 1, minWidth: 100 }}><div style={{ fontSize: 12, color: D ? '#d1d5db' : '#374151', textTransform: 'uppercase' }}>Оптимум</div><div style={{ fontSize: 17, fontWeight: 'bold', color: CLR.evsi }}>+{best.n} шагов</div></div>
                <div style={{ flex: 1, minWidth: 100 }}><div style={{ fontSize: 12, color: D ? '#d1d5db' : '#374151', textTransform: 'uppercase' }}>Чистая выгода</div><div style={{ fontSize: 17, fontWeight: 'bold', color: CLR.eben }}>${Math.round(best.net).toLocaleString()}</div></div>
                <div style={{ flex: 1, minWidth: 100 }}><div style={{ fontSize: 12, color: D ? '#d1d5db' : '#374151', textTransform: 'uppercase' }}>Затраты</div><div style={{ fontSize: 17, fontWeight: 'bold', color: CLR.cost }}>${Math.round(best.cost).toLocaleString()}</div></div>
                <div style={{ flex: 1, minWidth: 100 }}><div style={{ fontSize: 12, color: D ? '#d1d5db' : '#374151', textTransform: 'uppercase' }}>ROI</div><div style={{ fontSize: 17, fontWeight: 'bold', color: '#8b5cf6' }}>{best.cost > 0 ? Math.round((best.net / best.cost) * 100) : 0}%</div></div>
            </div>
        </div>
    );
}
