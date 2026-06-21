import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { normalPDF, weibullPDF, betaPDF } from '../../utils/statistics';

// ═══════════════════════════════════════════════════════════════
// Histogram with fitted distribution curves
// ═══════════════════════════════════════════════════════════════

export function GlobalHistogramChart({ divId, scores, fitResult, D, tS, aL, gL }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !echarts || !scores || !fitResult) return;
        if (el.offsetWidth < 10) return;
        if (chartRef.current) { try { chartRef.current.dispose(); } catch (e) {} chartRef.current = null; }

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
                { name: 'Гистограмма', type: 'bar', data: histDensity, barMaxWidth: 30,
                    itemStyle: { color: 'rgba(139,92,246,0.3)', borderColor: 'rgba(139,92,246,0.6)', borderWidth: 1 } },
                { name: 'Normal', type: 'line', data: normalCurve, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#3b82f6' } },
                { name: 'Weibull', type: 'line', data: weibullCurve, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#10b981' } },
                { name: 'Beta', type: 'line', data: betaCurve, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#f59e0b' } },
            ]
        });
        ec.resize();

        const ro = new ResizeObserver(() => { if (chartRef.current) chartRef.current.resize(); });
        ro.observe(el);
        return () => { ro.disconnect(); if (chartRef.current) { try { chartRef.current.dispose(); } catch (e) {} chartRef.current = null; } };
    }, [scores, fitResult, D, tS, aL, gL]);

    return <div id={divId} ref={containerRef} style={{ width: '100%', minHeight: 300, height: 320 }} />;
}

// ═══════════════════════════════════════════════════════════════
// EVSI Comparison chart (Normal vs Weibull vs Empirical)
// ═══════════════════════════════════════════════════════════════

export function EvsiComparisonChart({ divId, steps, D, tS, aL, gL }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !echarts || !steps || steps.length === 0) return;
        if (el.offsetWidth < 10) return;
        if (chartRef.current) { try { chartRef.current.dispose(); } catch (e) {} chartRef.current = null; }

        const ec = echarts.init(el, D ? 'dark' : null);
        chartRef.current = ec;

        const xData = steps.map(s => s.n);
        const normalD = steps.map(s => +s.evsiNormal.toFixed(2));
        const weibullD = steps.map(s => +s.evsiWeibull.toFixed(2));
        const empiricalD = steps.map(s => +s.evsiEmpirical.toFixed(2));

        // Находим точки останова для каждого метода (последний N где EVSI>0)
        const lastPositiveNormal = [...steps].reverse().find(s => s.evsiNormal > 0);
        const lastPositiveWeibull = [...steps].reverse().find(s => s.evsiWeibull > 0);
        const lastPositiveEmpirical = [...steps].reverse().find(s => s.evsiEmpirical > 0);

        // Текущая позиция (N изученных объектов)
        const currentN = xData.length > 0 ? xData[xData.length - 1] : null;

        // Зелёные точки останова — последний N с EVSI>0 для каждого метода
        const stopPoints = [];
        if (lastPositiveNormal) stopPoints.push({ coord: [String(lastPositiveNormal.n), +lastPositiveNormal.evsiNormal.toFixed(1)], name: 'Normal стоп', color: '#3b82f6' });
        if (lastPositiveWeibull) stopPoints.push({ coord: [String(lastPositiveWeibull.n), +lastPositiveWeibull.evsiWeibull.toFixed(1)], name: 'Weibull стоп', color: '#10b981' });
        if (lastPositiveEmpirical) stopPoints.push({ coord: [String(lastPositiveEmpirical.n), +lastPositiveEmpirical.evsiEmpirical.toFixed(1)], name: 'Empirical стоп', color: '#f59e0b' });

        // markLines: EVSI=0 + "вы здесь" (текущий N)
        const markLines = [
            { yAxis: 0, lineStyle: { color: '#ef4444', width: 2, type: 'dashed' }, label: { formatter: 'EVSI = 0 (граница)', color: '#ef4444', position: 'insideEndTop', fontSize: 12 } },
        ];
        if (currentN) {
            markLines.push({ xAxis: String(currentN), lineStyle: { color: '#3b82f6', width: 2, type: 'solid' }, label: { formatter: '← Вы здесь (N=' + currentN + ')', color: '#3b82f6', position: 'insideStartTop', fontSize: 12 } });
        }

        ec.setOption({
            backgroundColor: 'transparent',
            title: { text: 'EVSI: Normal vs Weibull vs Empirical', left: 'center', textStyle: { fontSize: 12, color: tS },
                subtext: `Точки ● = момент остановки поиска (последний EVSI>0) | ${stopPoints.length > 0 ? 'Рекомендация: ИСКАТЬ до ближайшей ● точки' : 'Все методы: СТОП'}`,
                subtextStyle: { fontSize: 12, color: tS, lineHeight: 16 }
            },
            tooltip: { trigger: 'axis', confine: true,
                formatter: function (params) {
                    let html = '<b>N=' + (params[0]?.axisValue || '') + '</b><br/>';
                    params.forEach(p => {
                        if (p.value === null || p.value === undefined || p.seriesName === '_baseline') return;
                        const val = typeof p.value === 'number' ? p.value.toFixed(1) : p.value;
                        const verdict = p.value > 0 ? ' ✅ ИСКАТЬ' : p.value <= 0 ? ' ⛔ СТОП' : '';
                        html += '<span style="font-size:11px">' + p.seriesName + ': <b>' + val + '₽</b>' + verdict + '</span><br/>';
                    });
                    return html;
                }
            },
            legend: { data: ['Normal', 'Weibull', 'Empirical', 'Точки останова'], bottom: 0, textStyle: { color: tS, fontSize: 12 } },
            grid: { left: 55, right: 20, bottom: 55, top: 65, containLabel: false },
            xAxis: { type: 'category', data: xData, name: 'N (изучено объектов)', axisLine: { lineStyle: { color: aL } }, axisLabel: { fontSize: 12 } },
            yAxis: { type: 'value', name: 'EVSI (₽)', splitLine: { lineStyle: { color: gL } }, axisLabel: { fontSize: 12 } },
            dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
            graphic: [
                { type: 'text', right: 25, top: 65, style: { text: '▲ ИСКАТЬ (EVSI>0)', fill: 'rgba(16,185,129,0.4)', fontSize: 12, fontWeight: 'bold' }, silent: true },
                { type: 'text', right: 25, bottom: 57, style: { text: '▼ СТОП (EVSI≤0)', fill: 'rgba(239,68,68,0.4)', fontSize: 12, fontWeight: 'bold' }, silent: true },
            ],
            series: [
                { name: 'Normal', type: 'line', data: normalD, smooth: false, symbol: 'circle', symbolSize: 5,
                    lineStyle: { width: 2, color: '#3b82f6' }, itemStyle: { color: '#3b82f6' },
                    areaStyle: { color: 'rgba(59,130,246,0.05)' }
                },
                { name: 'Weibull', type: 'line', data: weibullD, smooth: false, symbol: 'diamond', symbolSize: 5,
                    lineStyle: { width: 2, color: '#10b981' }, itemStyle: { color: '#10b981' },
                    areaStyle: { color: 'rgba(16,185,129,0.05)' }
                },
                { name: 'Empirical', type: 'line', data: empiricalD, smooth: false, symbol: 'triangle', symbolSize: 5,
                    lineStyle: { width: 2, color: '#f59e0b' }, itemStyle: { color: '#f59e0b' },
                    areaStyle: { color: 'rgba(245,158,11,0.05)' }
                },
                // Зелёные точки останова
                { name: 'Точки останова', type: 'scatter',
                    data: stopPoints.map(p => ({ value: [...p.coord], itemStyle: { color: p.color } })),
                    symbolSize: 16, symbol: 'pin', z: 10,
                    label: { show: true, formatter: p => p.data.value[0] + '', color: '#fff', fontSize: 8, position: 'inside' },
                    tooltip: { formatter: p => `<b>${p.data.name}</b><br/>N=${p.data.value[0]}, EVSI=${p.data.value[1]}₽<br/>Дальше — СТОП` }
                },
                // Baseline с markLine
                { name: '_baseline', type: 'line', data: xData.map(() => 0), symbol: 'none',
                    lineStyle: { width: 0 },
                    markLine: { silent: true, symbol: 'none', data: markLines, animation: false }
                },
            ]
        });
        ec.resize();

        const ro = new ResizeObserver(() => { if (chartRef.current) chartRef.current.resize(); });
        ro.observe(el);
        return () => { ro.disconnect(); if (chartRef.current) { try { chartRef.current.dispose(); } catch (e) {} chartRef.current = null; } };
    }, [steps, D, tS, aL, gL]);

    return <div id={divId} ref={containerRef} style={{ width: '100%', minHeight: 300, height: 340 }} />;
}
