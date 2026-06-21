import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useApp } from '../../contexts/AppContext';

function normalCDF(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const t2 = t * t, t3 = t2 * t, t4 = t3 * t, t5 = t4 * t;
    const p = 0.3989422804014327 * Math.exp(-z * z / 2);
    let cdf = 1 - p * (0.319381530 * t - 0.356563782 * t2 + 1.781477937 * t3 - 1.821255978 * t4 + 1.330274429 * t5);
    return z < 0 ? 1 - cdf : cdf;
}
function normalPDF(z) { return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); }
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

export default function NormalTab({ allScores, N }) {
    const [K, setK] = useState(250);
    const [k, setKk] = useState(5);
    const { theme } = useApp(); const D = theme === 'dark';

    if (N < 3) return <div style={{ padding: 20, color: D ? '#d1d5db' : '#374151', textAlign: 'center' }}>Мало данных (нужно ≥3).</div>;

    const mu = allScores.reduce((a, b) => a + b, 0) / N;
    const sigma = Math.sqrt(allScores.reduce((a, b) => a + (b - mu) ** 2, 0) / (N - 1));
    const cv = mu > 0 ? sigma / mu : 0;
    const xMax = allScores[N - 1];
    const Z = sigma > 0 ? (xMax - mu) / sigma : 0;

    const calcEben = (zS, sig, kk) => {
        let integral = 0;
        const dz = Math.min(zS + 6, 8) - zS >= 0 ? (Math.min(zS + 6, 8) - zS) / 200 : 0;
        const zLo = zS, zHi = Math.min(zS + 6, 8);
        for (let i = 0; i <= 200; i++) {
            const z = zLo + i * dz;
            const w = (i === 0 || i === 200) ? 0.5 : 1;
            integral += w * (z - zS) * kk * normalPDF(z) * Math.pow(normalCDF(z), kk - 1) * dz;
        }
        return sig * integral;
    };

    const rows = [];
    for (let n = 2; n <= N; n++) {
        const sub = allScores.slice(0, n);
        const m = sub.reduce((a, b) => a + b, 0) / n;
        const s = Math.sqrt(sub.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
        const xm = sub[n - 1];
        const z = s > 0 ? (xm - m) / s : 0;
        const se = s / Math.sqrt(2 * (n - 1));
        const eben = s > 0 ? calcEben(z, s, k) : 0;
        const ebenLo = s > 0 ? calcEben(z, Math.max(0.001, s - 1.96 * se), k) : 0;
        const ebenHi = s > 0 ? calcEben(z, s + 1.96 * se, k) : 0;
        rows.push({ n, xMax: xm, mu: m, sigma: s, Z: z, eben, ebenLo, ebenHi, evsi: eben - K, evsiLo: ebenLo - K, evsiHi: ebenHi - K, cost: K });
    }

    const evsiArr = rows.map(r => r.evsi);
    const ebenArr = rows.map(r => r.eben);
    const yMin = Math.min(0, ...evsiArr, ...rows.map(r => r.evsiLo));
    const yMax = Math.max(...ebenArr, ...rows.map(r => r.ebenHi), K * 1.1);
    const sc = niceScale(yMin * 1.05, yMax * 1.05);

    const option = {
        animation: false,
        grid: { top: 50, bottom: 85, left: 60, right: 25 },
        title: { text: 'EVSI по размеру выборки (Normal)', subtext: `μ=${mu.toFixed(2)} σ=${sigma.toFixed(2)} k=${k}`, left: 'center', top: 3, textStyle: { fontSize: 13, color: D ? '#ffffff' : '#000000' }, subtextStyle: { fontSize: 12, color: D ? '#d1d5db' : '#374151' } },
        tooltip: { trigger: 'axis', backgroundColor: D ? '#1e293b' : '#fff', borderColor: D ? '#374151' : '#e5e7eb', borderWidth: 1, textStyle: { color: D ? '#ffffff' : '#000000', fontSize: 12 } },
        legend: {
            bottom: 0, itemWidth: 20, itemHeight: 3, itemGap: 10,
            textStyle: { color: D ? '#d1d5db' : '#374151', fontSize: 12 },
            data: [
                { name: 'EVSI (чистая выгода)', icon: 'roundRect', itemStyle: { color: CLR.evsi } },
                { name: 'E[выгода]', icon: 'roundRect', itemStyle: { color: CLR.eben } },
                { name: 'Стоимость K', icon: 'roundRect', itemStyle: { color: CLR.cost } },
                { name: '95% ДИ EVSI', icon: 'roundRect', itemStyle: { color: CLR.ci } },
                { name: 'Линия СТОП (=0)', icon: 'roundRect', itemStyle: { color: CLR.stop } },
            ],
        },
        xAxis: { type: 'category', data: rows.map(r => `N=${r.n}`), axisLabel: { color: D ? '#d1d5db' : '#374151' }, axisLine: { lineStyle: { color: D ? '#374151' : '#e5e7eb' } } },
        yAxis: { type: 'value', min: sc.min, max: sc.max, interval: sc.step, axisLabel: { color: D ? '#d1d5db' : '#374151' }, splitLine: { lineStyle: { type: 'dashed', color: D ? '#374151' : '#e5e7eb' } } },
        series: [
            { name: 'Линия СТОП (=0)', type: 'line', data: rows.map(() => 0), lineStyle: { color: CLR.stop, width: 2, type: 'dashed' }, symbol: 'none', tooltip: { show: false }, z: 25 },
            { name: '_ciLo', type: 'line', data: rows.map(r => r.evsiLo), lineStyle: { opacity: 0 }, symbol: 'none', stack: 'ci', tooltip: { show: false }, silent: true },
            { name: '95% ДИ EVSI', type: 'line', data: rows.map(r => r.evsiHi - r.evsiLo), lineStyle: { opacity: 0 }, symbol: 'none', areaStyle: { color: CLR.ciFill }, stack: 'ci', tooltip: { show: false }, silent: true },
            { name: '_ciHiL', type: 'line', data: rows.map(r => r.evsiHi), lineStyle: { color: CLR.ci, width: 1, type: 'dotted' }, symbol: 'none', tooltip: { show: false }, z: 5 },
            { name: '_ciLoL', type: 'line', data: rows.map(r => r.evsiLo), lineStyle: { color: CLR.ci, width: 1, type: 'dotted' }, symbol: 'none', tooltip: { show: false }, z: 5 },
            { name: 'EVSI (чистая выгода)', type: 'line', smooth: true, z: 20, data: evsiArr, lineStyle: { color: CLR.evsi, width: 3 }, itemStyle: { color: CLR.evsi }, symbol: 'circle', symbolSize: 6 },
            { name: 'E[выгода]', type: 'line', smooth: true, data: ebenArr, lineStyle: { color: CLR.eben, width: 2, type: 'dashed' }, itemStyle: { color: CLR.eben }, symbol: 'none' },
            { name: 'Стоимость K', type: 'line', data: rows.map(r => r.cost), lineStyle: { color: CLR.cost, width: 2 }, itemStyle: { color: CLR.cost }, symbol: 'none' },
        ],
    };

    return (
        <div>
            <div style={{ background: D ? '#1f2937' : '#f9fafb', padding: 12, borderRadius: 8, border: `1px solid ${D ? '#374151' : '#e5e7eb'}`, marginBottom: 14, fontSize: 13, color: D ? '#d1d5db' : '#374151' }}>
                <b style={{ color: D ? '#ffffff' : '#000000' }}>Параметрический EVSI — N(μ,σ²)</b>. μ={mu.toFixed(3)}, σ={sigma.toFixed(3)}, CV={cv.toFixed(2)}.
                {cv > 0.5 && <span style={{ color: CLR.stop }}> ⚠️ CV&gt;0.5 — нормальность сомнительна.</span>}
            </div>
            <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
                <div><label style={{ display: 'block', fontSize: 12, color: D ? '#d1d5db' : '#374151', marginBottom: 2 }}>Стоимость шага</label><input type="number" value={K} onChange={e => setK(Number(e.target.value))} style={{ padding: '5px 8px', borderRadius: 5, border: `1px solid ${D ? '#374151' : '#e5e7eb'}`, width: 90 }} /></div>
                <div><label style={{ display: 'block', fontSize: 12, color: D ? '#d1d5db' : '#374151', marginBottom: 2 }}>Кандидатов/шаг</label><input type="number" value={k} onChange={e => setKk(Math.max(1, Number(e.target.value)))} style={{ padding: '5px 8px', borderRadius: 5, border: `1px solid ${D ? '#374151' : '#e5e7eb'}`, width: 70 }} /></div>
            </div>
            <div style={{ height: 380 }}><ReactECharts option={option} style={{ height: '100%', width: '100%' }} /></div>
        </div>
    );
}
