import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

// ═══════════════════════════════════════════════════════════════
// ECHARTS: EVSI Comparison Chart
// ═══════════════════════════════════════════════════════════════

function EvsiComparisonChart({ divId, steps, D, tS, aL, gL }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !echarts || !steps || steps.length === 0) return;
        if (el.offsetWidth < 10) return;
        if (chartRef.current) { try { chartRef.current.dispose(); } catch (e) { } chartRef.current = null; }

        const ec = echarts.init(el, D ? 'dark' : null);
        chartRef.current = ec;

        const xData = steps.map(s => s.n);
        const normalD = steps.map(s => +s.evsiNormal.toFixed(2));
        const weibullD = steps.map(s => +s.evsiWeibull.toFixed(2));
        const empiricalD = steps.map(s => +s.evsiEmpirical.toFixed(2));

        ec.setOption({
            backgroundColor: 'transparent',
            title: { text: 'EVSI: Normal vs Weibull vs Empirical', left: 'center', textStyle: { fontSize: 12, color: tS } },
            tooltip: {
                trigger: 'axis', confine: true,
                formatter: function (params) {
                    let html = '<b>N=' + (params[0]?.axisValue || '') + '</b><br/>';
                    params.forEach(p => {
                        const val = typeof p.value === 'number' ? p.value.toFixed(1) : p.value;
                        html += '<span style="font-size:11px">' + p.seriesName + ': <b>' + val + '₽</b></span><br/>';
                    });
                    return html;
                }
            },
            legend: { data: ['Normal', 'Weibull', 'Empirical'], bottom: 0, textStyle: { color: tS, fontSize: 12 } },
            grid: { left: 55, right: 20, bottom: 50, top: 40, containLabel: false },
            xAxis: { type: 'category', data: xData, name: 'N', axisLine: { lineStyle: { color: aL } }, axisLabel: { fontSize: 12 } },
            yAxis: { type: 'value', name: 'EVSI (₽)', splitLine: { lineStyle: { color: gL } }, axisLabel: { fontSize: 12 } },
            dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
            series: [
                {
                    name: 'Normal', type: 'line', data: normalD, smooth: false, symbol: 'circle', symbolSize: 5,
                    lineStyle: { width: 2, color: '#3b82f6' }, itemStyle: { color: '#3b82f6' }
                },
                {
                    name: 'Weibull', type: 'line', data: weibullD, smooth: false, symbol: 'diamond', symbolSize: 5,
                    lineStyle: { width: 2, color: '#10b981' }, itemStyle: { color: '#10b981' }
                },
                {
                    name: 'Empirical', type: 'line', data: empiricalD, smooth: false, symbol: 'triangle', symbolSize: 5,
                    lineStyle: { width: 2, color: '#f59e0b' }, itemStyle: { color: '#f59e0b' }
                },
                {
                    type: 'line', data: xData.map(() => 0), symbol: 'none',
                    lineStyle: { width: 2, color: '#ef4444', type: 'dashed' },
                    markLine: { silent: true, symbol: 'none', data: [{ yAxis: 0, lineStyle: { color: '#ef4444', width: 1.5, type: 'dashed' }, label: { formatter: 'EVSI=0', color: '#ef4444', fontSize: 12, position: 'insideEndTop' } }] }
                },
            ]
        });
        ec.resize();

        const ro = new ResizeObserver(() => {
            if (chartRef.current) chartRef.current.resize();
        });
        ro.observe(el);
        return () => { ro.disconnect(); if (chartRef.current) { try { chartRef.current.dispose(); } catch (e) { } chartRef.current = null; } };
    }, [steps, D, tS, aL, gL]);

    return <div id={divId} ref={containerRef} style={{ width: '100%', minHeight: 300, height: 340 }} />;
}

// ═══════════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════════

function Box({ bg, brd, p, children }) { return <div style={{ background: bg, border: `1px solid ${brd}`, borderRadius: 10, padding: p }}>{children}</div>; }

// ═══════════════════════════════════════════════════════════════
// Main: Section 5 (Comparison Chart) + Section 6 (Table)
// ═══════════════════════════════════════════════════════════════

export default function EbmGlobalChart({ evsiSteps, D, bg, brd, tM, tS, aL, gL }) {
    if (!evsiSteps || evsiSteps.length === 0) return null;

    return (
        <>
            {/* ═══ 5. СРАВНИТЕЛЬНЫЙ ГРАФИК ═══ */}
            <Box bg={bg} brd={brd} p={14}>
                <b style={{ color: tM, fontSize: 14 }}>5. Сравнительный график EVSI</b>
                <div style={{ fontSize: 12, color: 'inherit', marginTop: 4, marginBottom: 8 }}>
                    3 линии: EVSI(Normal) vs EVSI(Weibull) vs EVSI(Empirical). Ось X: число изученных объектов (текущая таблица).
                </div>
                <EvsiComparisonChart
                    divId="global-evsi"
                    steps={evsiSteps}
                    D={D} tS={tS} aL={aL} gL={gL}
                />
            </Box>

            {/* ═══ 6. ТАБЛИЦА РАСЧЁТНЫХ ЗНАЧЕНИЙ ═══ */}
            <Box bg={bg} brd={brd} p={14}>
                <b style={{ color: tM, fontSize: 14 }}>6. Таблица расчётных значений</b>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'Consolas', monospace" }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid ' + (D ? '#374151' : '#e5e7eb') }}>
                                <th style={{ textAlign: 'left', padding: '4px 6px', color: tS }}>N</th>
                                <th style={{ textAlign: 'right', padding: '4px 6px', color: '#3b82f6' }}>EVSI Normal ₽</th>
                                <th style={{ textAlign: 'right', padding: '4px 6px', color: '#10b981' }}>EVSI Weibull ₽</th>
                                <th style={{ textAlign: 'right', padding: '4px 6px', color: '#f59e0b' }}>EVSI Empirical ₽</th>
                                <th style={{ textAlign: 'center', padding: '4px 6px', color: tS }}>Лучший</th>
                            </tr>
                        </thead>
                        <tbody>
                            {evsiSteps.map((st, i) => {
                                const best = Math.max(st.evsiNormal, st.evsiWeibull, st.evsiEmpirical);
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid ' + (D ? '#374151' : '#e5e7eb') }}>
                                        <td style={{ padding: '3px 6px', color: tM, fontWeight: i === evsiSteps.length - 1 ? 700 : 400 }}>{st.n}</td>
                                        <td style={{ padding: '3px 6px', textAlign: 'right', color: st.evsiNormal === best ? '#3b82f6' : tS, fontWeight: st.evsiNormal === best ? 700 : 400 }}>{st.evsiNormal.toFixed(1)}</td>
                                        <td style={{ padding: '3px 6px', textAlign: 'right', color: st.evsiWeibull === best ? '#10b981' : tS, fontWeight: st.evsiWeibull === best ? 700 : 400 }}>{st.evsiWeibull.toFixed(1)}</td>
                                        <td style={{ padding: '3px 6px', textAlign: 'right', color: st.evsiEmpirical === best ? '#f59e0b' : tS, fontWeight: st.evsiEmpirical === best ? 700 : 400 }}>{st.evsiEmpirical.toFixed(1)}</td>
                                        <td style={{ padding: '3px 6px', textAlign: 'center', color: best > 0 ? '#10b981' : '#ef4444' }}>{best > 0 ? '✅' : '⛔'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Box>
        </>
    );
}
