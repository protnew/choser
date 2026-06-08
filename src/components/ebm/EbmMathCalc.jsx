import React from 'react';
import EChart from '../EChartShared';
import { Box, Cr, monoStyle } from './shared';

export default function EbmMathCalc({ ebmData, baseCost, D, bg, brd, tM, tS, gL, aL }) {
    const mono = monoStyle;
    const s = ebmData.stats;
    const cb = ebmData.costBreakdown;
    const r = ebmData.report;
    const isStop = ebmData.status === 'STOP';
    const k = s.candidatesPerStep;
    const sigma2 = (parseFloat(s.stdDev) ** 2).toFixed(0);

    return (<>
        {/* DATA */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>1. Дано</b>
            <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
n = ${s.n} (объектов с оценками)
Полезность: ${s.utilitySource} — ${s.utilityComment}${s.isProxy ? '\n⚠️ ПРОКСИ' : ''}
Utility: [${s.utilityValues.map(v => v.toFixed(0)).join(', ')}]₽
xMax = ${s.xMax}₽, xMin = ${s.xMin}₽, k = ${k}`}</div>
        </Box>

        {/* TABLE */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>6. Таблица расчётных значений</b>
            <div style={{ fontSize: 12, color: 'inherit', marginTop: 4, marginBottom: 8 }}>
                {'Формула: EVSI(N) = σ_N × ∫_{Z_N}^∞ (z−Z_N) × ' + k + ' × φ(z) × Φ(z)^' + (k-1) + ' dz − K'}
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'Consolas', monospace" }}>
                    <thead><tr style={{ borderBottom: '2px solid ' + (D ? '#374151' : '#e5e7eb') }}>
                        <th style={{ textAlign: 'left', padding: '4px 6px', color: tS }}>N</th>
                        <th style={{ textAlign: 'right', padding: '4px 6px', color: tS }}>xMax ₽</th>
                        <th style={{ textAlign: 'right', padding: '4px 6px', color: tS }}>μ ₽</th>
                        <th style={{ textAlign: 'right', padding: '4px 6px', color: tS }}>σ ₽</th>
                        <th style={{ textAlign: 'right', padding: '4px 6px', color: tS }}>Z</th>
                        <th style={{ textAlign: 'right', padding: '4px 6px', color: tS }}>E[ben] ₽</th>
                        <th style={{ textAlign: 'right', padding: '4px 6px', color: tS }}>K ₽</th>
                        <th style={{ textAlign: 'right', padding: '4px 6px', color: '#8b5cf6', fontWeight: 700 }}>EVSI ₽</th>
                        <th style={{ textAlign: 'right', padding: '4px 6px', color: tS }}>Σзатр ₽</th>
                        <th style={{ textAlign: 'center', padding: '4px 6px', color: tS }}>?</th>
                    </tr></thead>
                    <tbody>
                        {s.steps.map((st, i) => {
                            const sZ = st.stdDev > 0 ? ((st.x - st.mean) / st.stdDev).toFixed(3) : '—';
                            const sBenefit = (st.evsi + parseFloat(s.K)).toFixed(1);
                            const evsiColor = st.evsi > 0 ? '#10b981' : '#ef4444';
                            return (<tr key={i} style={{ borderBottom: '1px solid ' + (D ? '#374151' : '#e5e7eb') }}>
                                <td style={{ padding: '3px 6px', color: tM, fontWeight: i === s.steps.length - 1 ? 700 : 400 }}>{st.n}</td>
                                <td style={{ padding: '3px 6px', textAlign: 'right', color: tS }}>{st.x.toFixed(0)}</td>
                                <td style={{ padding: '3px 6px', textAlign: 'right', color: tS }}>{st.mean.toFixed(0)}</td>
                                <td style={{ padding: '3px 6px', textAlign: 'right', color: tS }}>{st.stdDev.toFixed(0)}</td>
                                <td style={{ padding: '3px 6px', textAlign: 'right', color: tS }}>{sZ}</td>
                                <td style={{ padding: '3px 6px', textAlign: 'right', color: tS }}>{sBenefit}</td>
                                <td style={{ padding: '3px 6px', textAlign: 'right', color: tS }}>{s.K}</td>
                                <td style={{ padding: '3px 6px', textAlign: 'right', color: evsiColor, fontWeight: 700 }}>{st.evsi.toFixed(1)}</td>
                                <td style={{ padding: '3px 6px', textAlign: 'right', color: tS }}>{st.accCostRub.toFixed(0)}</td>
                                <td style={{ padding: '3px 6px', textAlign: 'center', color: st.shouldStop ? '#ef4444' : '#10b981' }}>{st.shouldStop ? '⛔' : '✅'}</td>
                            </tr>);
                        })}
                    </tbody>
                </table>
            </div>
        </Box>

        {/* HISTOGRAM */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>7. Полезность объектов (ранжированные)</b>
            <EChart divId="echart2" data={s.steps} type="hist" D={D} tS={tS} aL={aL} gL={gL} utilityValues={s.utilityValues} />
        </Box>

        {/* FORMULAS */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>8. Расчёт параметров</b>
            <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
Среднее: μ = ${s.mean}₽
Дисперсия: σ² = ${sigma2}
StdDev: σ = ${s.stdDev}₽
CV = ${s.cv} (${s.cvLabel})
Z = (${s.xMax} − ${s.mean}) / ${s.stdDev} = ${s.Z}`}</div>
        </Box>

        {/* COST K */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>9. Стоимость шага K = {cb.K}₽</b>
            <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
1) Токены = ${cb.directTokenCost}₽ (☁️${cb.cloudTokens} tok × ${baseCost}₽/1K + 🏠${cb.localTokens} tok)
2) Оркестрация = ${cb.orchestrationCost}₽${cb.orchestrationWarning === true ? '  ⚠️ >50%!' : ''}
3) Время = ${cb.timeCost}₽ (${cb.totalHumanSec}с × 600₽/ч)
4) Риск = ${cb.riskCost}₽
Итого: K = ${cb.K}₽`}</div>
        </Box>

        {/* PROBABILITIES */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>10. Вероятность улучшения</b>
            <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
P₁ = 1 − Φ(${s.Z}) = ${s.pSingle}%
Pₖ = 1 − (1 − P₁)^${k} = ${s.pStep}%
E[шагов] = 1 / Pₖ = ${s.expectedSteps}`}</div>
        </Box>

        {/* EVSI FORMULA */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>11. EVSI — формула</b>
            <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
EVSI = E[(max(X₁..X_k) − xMax)⁺] − K
E[benefit] = σ × ∫_Z^∞ (z − Z) × ${k} × φ(z) × Φ(z)^${k-1} dz = ${s.expectedBenefitRub}₽
EVSI = ${s.expectedBenefitRub} − ${s.K} = ${s.evsi}₽
${parseFloat(s.evsi) > 0 ? '→ ИСКАТЬ ВЫГОДНО' : '→ СТОП, ПОИСК УБЫТОЧЕН'}`}</div>
        </Box>

        {/* EXAMPLE */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>12. Пример расчёта пошагово</b>
            <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
xValues = [${s.steps.slice(0, 8).map(st => st.x.toFixed(0)).join(', ')}${s.steps.length > 8 ? ', ...' : ''}] (${s.n} значений)
μ = ${s.mean}₽, σ² = ${sigma2}, σ = ${s.stdDev}₽
Z = (${s.xMax} − ${s.mean}) / ${s.stdDev} = ${s.Z}
E[benefit] = ${s.expectedBenefitRub}₽ (трапеции N=200)
EVSI = ${s.expectedBenefitRub} − ${s.K} = ${s.evsi}₽
P₁ = ${s.pSingle}%, Pₖ = ${s.pStep}%, E[шагов] = ${s.expectedSteps}`}</div>
        </Box>

        {/* SUFFICIENCY */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>{s.suffIcon} 13. Достаточность выборки: {s.suffLabel}</b>
            <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
SEM = ${s.stdDev} / √${s.n} = ${s.currentSEM}
95% ДИ: [${s.ciLower}…${s.ciUpper}]₽ (±${s.currentPrecision}%)
n_min = ${s.nMin}, покрытие: ${s.sufficiencyRatio}×`}</div>
            <div style={{ width: '100%', height: 8, borderRadius: 4, background: D ? '#0f172a' : '#e2e8f0', overflow: 'hidden', marginTop: 6 }}>
                <div style={{ width: Math.min(100, parseFloat(s.sufficiencyRatio)*100) + '%', height: '100%', borderRadius: 4, background: s.suffLevel === 'green' ? '#10b981' : s.suffLevel === 'yellow' ? '#f59e0b' : '#ef4444' }} />
            </div>
        </Box>

        {/* CRITERIA */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>14. Критерии остановки</b>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                <Cr ok={!s.stopEVSI} l={`EVSI = ${s.evsi}₽`} sub={`E[выг] ${s.expectedBenefitRub} − K ${s.K}`} />
                <Cr ok={!s.stopProb} l={`P(шаг) = ${s.pStep}%`} sub={`Порог 0.5% | Z=${s.Z}`} />
                <Cr ok={parseFloat(s.netPosition) > 0} l={`Чистая = ${s.netPosition}₽`} sub="Выгода−Затраты" />
            </div>
        </Box>

        {/* DECISION */}
        <Box bg={bg} brd={brd} p={14}>
            <div style={{ fontSize: 13, color: tM, lineHeight: 1.6 }}>💡 <b>Вердикт:</b> {r.evsiExplain}</div>
            {!isStop && <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
10 шагов: затраты ${r.forecast.cost10}₽, выгода ${r.forecast.benefit10}₽, чистая +${r.forecast.net10}₽
До успеха: ~${s.expectedSteps} × ${s.K} = ${r.forecast.costToSuccess}₽`}</div>}
        </Box>

        {/* ASSUMPTIONS */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>15. Допущения и ограничения</b>
            <div style={{ marginTop: 8, fontSize: 12, color: tS, lineHeight: 1.8 }}>
                <b style={{ color: '#f59e0b' }}>⚠️ Ограничения:</b>
                {r.limitations.map((a, i) => <div key={i} style={{ marginTop: 3 }}>• {a}</div>)}
                <div style={{ marginTop: 10 }}><b>📝 Допущения:</b></div>
                {r.assumptions.map((a, i) => <div key={i} style={{ marginTop: 3 }}>• {a}</div>)}
            </div>
        </Box>

        {/* OPTIMIZATION TIPS */}
        {r.optimizationTips?.length > 0 && <Box bg="rgba(245,158,11,0.08)" brd="#f59e0b" p={14}>
            <b style={{ color: '#f59e0b', fontSize: 16 }}>⚡ Рекомендации по оптимизации</b>
            {r.optimizationTips.map((t, i) => <div key={i} style={{ marginTop: 6, fontSize: 12, color: tS }}>• {t}</div>)}
        </Box>}
    </>);
}
