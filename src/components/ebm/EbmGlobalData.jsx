import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import {
    normalPDF, weibullPDF, betaPDF
} from '../../utils/statistics';

// ═══════════════════════════════════════════════════════════════
// Histogram with fitted curves (Normal, Weibull, Beta)
// ═══════════════════════════════════════════════════════════════

function HistogramChart({ divId, scores, fitResult, D, tS, aL, gL }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !echarts || !scores || !fitResult) return;
        if (el.offsetWidth < 10) return;
        if (chartRef.current) { try { chartRef.current.dispose(); } catch (e) { } chartRef.current = null; }

        const ec = echarts.init(el, D ? 'dark' : null);
        chartRef.current = ec;

        const bins = 25;
        const minS = fitResult.minS;
        const maxS = fitResult.maxS;
        const range = maxS - minS || 1;
        const binWidth = range / bins;
        const counts = new Array(bins).fill(0);
        scores.forEach(s => {
            let bin = Math.floor((s - minS) / binWidth);
            if (bin >= bins) bin = bins - 1;
            counts[bin]++;
        });
        const n = scores.length;
        const histDensity = counts.map(c => c / (n * binWidth));
        const xLabels = Array.from({ length: bins }, (_, i) => (minS + (i + 0.5) * binWidth).toFixed(3));

        // Density curves
        const xCurve = Array.from({ length: 100 }, (_, i) => minS + (i / 99) * range);
        const normalCurve = xCurve.map(x => normalPDF(x, fitResult.normalParams.mu, fitResult.normalParams.sigma));
        const weibullCurve = xCurve.map(x => weibullPDF(x, fitResult.weibullParams.shape, fitResult.weibullParams.scale));
        const betaCurve = xCurve.map(x => {
            const xs = (x - fitResult.betaParams.offset) / fitResult.betaParams.scale;
            return betaPDF(Math.max(0.001, Math.min(0.999, xs)), fitResult.betaParams.alpha, fitResult.betaParams.beta) / fitResult.betaParams.scale;
        });

        ec.setOption({
            backgroundColor: 'transparent',
            title: { text: 'Гистограмма scores + fit кривые', left: 'center', textStyle: { fontSize: 12, color: tS } },
            tooltip: { trigger: 'axis', confine: true },
            legend: { data: ['Гистограмма', 'Normal', 'Weibull', 'Beta'], bottom: 0, textStyle: { color: tS, fontSize: 12 } },
            grid: { left: 55, right: 20, bottom: 50, top: 40, containLabel: false },
            xAxis: { type: 'category', data: xLabels, axisLine: { lineStyle: { color: aL } }, axisLabel: { fontSize: 8, interval: Math.floor(bins / 6) } },
            yAxis: { type: 'value', name: 'Плотность', splitLine: { lineStyle: { color: gL } }, axisLabel: { fontSize: 12 } },
            dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
            series: [
                {
                    name: 'Гистограмма', type: 'bar', data: histDensity, barMaxWidth: 30,
                    itemStyle: { color: 'rgba(139,92,246,0.3)', borderColor: 'rgba(139,92,246,0.6)', borderWidth: 1 }
                },
                {
                    name: 'Normal', type: 'line', data: normalCurve, smooth: true, symbol: 'none',
                    lineStyle: { width: 2, color: '#3b82f6' }
                },
                {
                    name: 'Weibull', type: 'line', data: weibullCurve, smooth: true, symbol: 'none',
                    lineStyle: { width: 2, color: '#10b981' }
                },
                {
                    name: 'Beta', type: 'line', data: betaCurve, smooth: true, symbol: 'none',
                    lineStyle: { width: 2, color: '#f59e0b' }
                },
            ]
        });
        ec.resize();

        const ro = new ResizeObserver(() => {
            if (chartRef.current) chartRef.current.resize();
        });
        ro.observe(el);
        return () => { ro.disconnect(); if (chartRef.current) { try { chartRef.current.dispose(); } catch (e) { } chartRef.current = null; } };
    }, [scores, fitResult, D, tS, aL, gL]);

    return <div id={divId} ref={containerRef} style={{ width: '100%', minHeight: 300, height: 320 }} />;
}

// ═══════════════════════════════════════════════════════════════
// Helper components
// ═══════════════════════════════════════════════════════════════

function Box({ bg, brd, p, children }) { return <div style={{ background: bg, border: `1px solid ${brd}`, borderRadius: 10, padding: p }}>{children}</div>; }
function Cd({ l, v, c, D, sub }) { return <div style={{ padding: 8, background: D ? '#1f2937' : '#f9fafb', borderRadius: 5, borderLeft: `3px solid ${c}` }}>
    <div style={{ fontSize: 12, color: 'inherit', textTransform: 'uppercase', fontWeight: 600 }}>{l}</div>
    <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1, color: D ? '#fff' : '#000' }}>{v}</div>
    {sub && <div style={{ fontSize: 12, color: 'inherit', marginTop: 1 }}>{sub}</div>}
</div>; }

// ═══════════════════════════════════════════════════════════════
// Main: Global Data + Histogram (sections 1-2)
// ═══════════════════════════════════════════════════════════════

export default function EbmGlobalData({ globalScores, fitResult, D, bg, brd, tM, tS, aL, gL }) {
    const gs = globalScores;
    const mono = { fontFamily: "'Consolas', 'Courier New', monospace", whiteSpace: 'pre-wrap', lineHeight: '1.75' };

    return (
        <>
            {/* ═══ ЗАГОЛОВОК ═══ */}
            <Box bg={bg} brd={brd} p={18}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 28 }}>🌍</span>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: 17, color: tM }}>EBM Global — анализ всех таблиц</h2>
                        <p style={{ margin: '2px 0 0', color: tS, fontSize: 12, lineHeight: 1.4 }}>
                            Распределение оценок по {gs.tablesWithPrices} таблицам с ценами, {gs.scores.length} объектов
                        </p>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6 }}>
                    <Cd l="Таблиц" v={`${gs.tablesWithPrices}/${gs.tablesTotal}`} c="#3b82f6" D={D} sub="С ценами / всего" />
                    <Cd l="Объектов" v={`${gs.scores.length}`} c="#10b981" D={D} sub={`${gs.totalObjects} всего`} />
                    <Cd l="Среднее" v={fitResult?.mean.toFixed(3) || '—'} c="#64748b" D={D} />
                    <Cd l="StdDev σ" v={fitResult?.stdDev.toFixed(3) || '—'} c="#8b5cf6" D={D} />
                    <Cd l="Лучший fit" v={fitResult?.bestFit || '—'} c="#f59e0b" D={D} sub="По SSE" />
                </div>
            </Box>

            {/* ═══ 1. ГЛОБАЛЬНЫЕ ДАННЫЕ + ГИСТОГРАММА ═══ */}
            <Box bg={bg} brd={brd} p={14}>
                <b style={{ color: tM, fontSize: 14 }}>1. Глобальные данные — распределение нормализованных scores</b>
                <div style={{ fontSize: 12, color: 'inherit', marginTop: 4, marginBottom: 8 }}>
                    Все нормализованные scores ({gs.scores.length}) из {gs.tablesWithPrices} таблиц с ценами. Кривые: Normal, Weibull, Beta (оценка Method of Moments).
                </div>
                <HistogramChart
                    divId="global-hist"
                    scores={gs.scores}
                    fitResult={fitResult}
                    D={D} tS={tS} aL={aL} gL={gL}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                    <div style={{ padding: 6, borderRadius: 5, background: D ? '#1f2937' : '#f9fafb', borderLeft: '3px solid #3b82f6' }}>
                        <div style={{ fontSize: 12, color: 'inherit', fontWeight: 600 }}>SSE Normal</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: tM }}>{fitResult?.sseNormal.toFixed(4)}</div>
                    </div>
                    <div style={{ padding: 6, borderRadius: 5, background: D ? '#1f2937' : '#f9fafb', borderLeft: '3px solid #10b981' }}>
                        <div style={{ fontSize: 12, color: 'inherit', fontWeight: 600 }}>SSE Weibull</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: tM }}>{fitResult?.sseWeibull.toFixed(4)}</div>
                    </div>
                    <div style={{ padding: 6, borderRadius: 5, background: D ? '#1f2937' : '#f9fafb', borderLeft: '3px solid #f59e0b' }}>
                        <div style={{ fontSize: 12, color: 'inherit', fontWeight: 600 }}>SSE Beta</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: tM }}>{fitResult?.sseBeta.toFixed(4)}</div>
                    </div>
                </div>
            </Box>

            {/* ═══ 2. FIT РАСПРЕДЕЛЕНИЯ ═══ */}
            {fitResult && <Box bg={bg} brd={brd} p={14}>
                <b style={{ color: tM, fontSize: 14 }}>2. Fit распределения</b>
                <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
Лучший fit: ${fitResult.bestFit.toUpperCase()} (по минимальному SSE)

Normal(μ, σ):
  μ = ${fitResult.normalParams.mu.toFixed(4)}
  σ = ${fitResult.normalParams.sigma.toFixed(4)}
  SSE = ${fitResult.sseNormal.toFixed(6)}

Weibull(α, β):
  shape α = ${fitResult.weibullParams.shape.toFixed(4)}
  scale β = ${fitResult.weibullParams.scale.toFixed(4)}
  SSE = ${fitResult.sseWeibull.toFixed(6)}

Beta(α, β):
  α = ${fitResult.betaParams.alpha.toFixed(4)}
  β = ${fitResult.betaParams.beta.toFixed(4)}
  offset = ${fitResult.betaParams.offset.toFixed(4)}, scale = ${fitResult.betaParams.scale.toFixed(4)}
  SSE = ${fitResult.sseBeta.toFixed(6)}

Метод: Method of Moments (Normal, Weibull), MoM (Beta)
Оценка Weibull: Justus & Mikhail (1976) approximation`}</div>
            </Box>}
        </>
    );
}
