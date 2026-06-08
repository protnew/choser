import React from 'react';
import EChart from '../EChartShared';
import { Box, Cd } from './shared';

export default function EbmMathHeader({ ebmData, baseCost, setBaseCost, D, bg, bgI, brd, tM, tS, gL, aL }) {
    const s = ebmData.stats;
    const r = ebmData.report;
    const k = s.candidatesPerStep;
    const sigma2 = (parseFloat(s.stdDev) ** 2).toFixed(0);

    return (<>
        {/* HEADER */}
        <Box bg={bg} brd={brd} p={18}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{ebmData.icon}</span>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: 17, color: tM }}>{ebmData.title}</h2>
                    <p style={{ margin: '2px 0 0', color: tS, fontSize: 12, lineHeight: 1.4 }}>{r.recommendation}</p>
                </div>
            </div>
            <div style={{ padding: '6px 10px', borderRadius: 6, background: s.isProxy ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.1)', fontSize: 12, color: tS, marginBottom: 10 }}>
                <b>💰 Полезность:</b>{' '}
                {s.isProxy ? <span style={{ color: '#f59e0b', fontWeight: 600 }}>ОЦЕНКА, НЕ ФАКТ — {s.utilityComment}</span> : <span style={{ color: '#10b981' }}>ПРЯМАЯ — {s.utilityComment}</span>}
                {s.priceMultiplier > 1 && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 600 }}>⚠️ ×{s.priceMultiplier} ({s.priceScaleLabel})</span>}
            </div>
            <div style={{ background: bgI, padding: '8px 12px', borderRadius: 6, border: `1px solid ${brd}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: tM }}>⚙️ ₽/1K tok:</span>
                <input type="number" step="0.01" min="0" value={baseCost} onChange={e => setBaseCost(parseFloat(e.target.value) || 0.50)} style={{ padding: '3px 6px', borderRadius: 4, border: `1px solid ${brd}`, background: D ? '#1e293b' : '#fff', color: tM, width: 70, fontSize: 12 }} />
                <span style={{ fontSize: 12, color: tS }}>{s.tokensPerStep?.toLocaleString()} tok/шаг, {k} канд./шаг</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 6 }}>
                <Cd l="Выборка n" v={`${s.n} шт`} c="#3b82f6" D={D} />
                <Cd l="Лидер xMax" v={`${s.xMax}₽`} c="#10b981" D={D} sub={`Топ ${s.leaderPercentile}%`} />
                <Cd l="Среднее μ" v={`${s.mean}₽`} c="#64748b" D={D} />
                <Cd l="StdDev σ" v={`${s.stdDev}₽`} c="#8b5cf6" D={D} sub={`CV=${s.cv} (${s.cvLabel})`} />
                <Cd l="K (шаг)" v={`${s.K}₽`} c="#ef4444" D={D} sub="Стоимость" />
                <Cd l="E[выгода]" v={`${s.expectedBenefitRub}₽`} c={parseFloat(s.expectedBenefitRub) > parseFloat(s.K) ? '#10b981' : '#ef4444'} D={D} />
                <Cd l="EVSI" v={`${s.evsi}₽`} c={parseFloat(s.evsi) > 0 ? '#10b981' : '#ef4444'} D={D} sub="E[выг] − K" />
                <Cd l="P(шаг)" v={`${s.pStep}%`} c={parseFloat(s.pStep) > 0.5 ? '#3b82f6' : '#ef4444'} D={D} sub={`P(1)=${s.pSingle}%`} />
                <Cd l="E[шагов]" v={s.expectedSteps} c="#f59e0b" D={D} sub="До успеха" />
                <Cd l="Потрачено" v={`${s.accCostRub}₽`} c="#f97316" D={D} sub={s.accTokens?.toLocaleString() + ' tok'} />
                <Cd l="Чистая" v={`${s.netPosition}₽`} c={parseFloat(s.netPosition) > 0 ? '#10b981' : '#ef4444'} D={D} sub="Выгода−Затраты" />
            </div>
        </Box>

        {/* GRAPHS */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>2. График EVSI по шагам</b>
            <div style={{ fontSize: 12, color: 'inherit', marginTop: 4, marginBottom: 8 }}>Факт: N={s.n}. Прогноз: ~{s.expectedSteps} шагов.</div>
            <EChart divId="echart1" data={s.steps} forecast={s.forecastSteps} currentN={s.n} foundOptimal={s.foundOptimal} type="evsi" D={D} tS={tS} aL={aL} gL={gL} sK={s.K} />
        </Box>

        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>3. Распределение полезность/стоимость</b>
            <EChart divId="echart-ratio" data={s.steps} type="ratio-dist" D={D} tS={tS} aL={aL} gL={gL}
                xMax={parseFloat(s.xMax)} mean={parseFloat(s.mean)} stdDev={parseFloat(s.stdDev)} n={s.n}
                utilityValues={s.utilityValues} priceValues={s.priceValues} />
        </Box>

        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>4. Наглядный вид</b>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: '2 1 400px', minWidth: 320 }}>
                    <EChart divId="echart-alt-dist" data={s.steps} type="alt-dist" D={D} tS={tS} aL={aL} gL={gL}
                        xMax={parseFloat(s.xMax)} mean={parseFloat(s.mean)} stdDev={parseFloat(s.stdDev)} n={s.n} k={k} utilityValues={s.utilityValues} />
                </div>
                <div style={{ flex: '1 1 280px', minWidth: 260 }}>
                    <EChart divId="echart-alt-decision" data={s.steps} type="alt-decision" D={D} tS={tS} aL={aL} gL={gL}
                        benefit={parseFloat(s.expectedBenefitRub)} cost={parseFloat(s.K)} evsi={parseFloat(s.evsi)} pStep={parseFloat(s.pStep)} eSteps={s.expectedSteps} n={s.n} />
                </div>
            </div>
        </Box>

        {/* INFOGRAPHIC */}
        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>5. Простым языком: стоит ли продолжать поиск?</b>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '18px 24px', borderRadius: 10,
                background: parseFloat(s.evsi) > 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))' : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
                border: '2px solid ' + (parseFloat(s.evsi) > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'), marginBottom: 16, marginTop: 14 }}>
                <span style={{ fontSize: 36 }}>{parseFloat(s.evsi) > 0 ? '🟢' : '🔴'}</span>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: parseFloat(s.evsi) > 0 ? '#10b981' : '#ef4444', lineHeight: 1.2 }}>
                        {parseFloat(s.evsi) > 0 ? 'ПРОДОЛЖАЙТЕ ПОИСК' : 'ОСТАНОВИТЕСЬ'}
                    </div>
                    <div style={{ fontSize: 13, color: tS, marginTop: 2 }}>
                        {parseFloat(s.evsi) > 0 ? `Каждый шаг +${(parseFloat(s.evsi)).toFixed(0)}₽ чистой выгоды` : `Каждый шаг убыточен на ${Math.abs(parseFloat(s.evsi)).toFixed(0)}₽`}
                    </div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
                <div style={{ background: D ? '#1f2937' : '#f9fafb', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'inherit', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Шанс найти лучше</div>
                    <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 6px' }}>
                        <svg viewBox="0 0 80 80" width="80" height="80"><circle cx="40" cy="40" r="34" fill="none" stroke={D ? '#1e293b' : '#e2e8f0'} strokeWidth="8" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#8b5cf6" strokeWidth="8" strokeDasharray={`${Math.min(parseFloat(s.pStep), 100) * 2.14} 214`} strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 40 40)" />
                        <text x="40" y="38" textAnchor="middle" fill={tM} fontSize="14" fontWeight="700">{parseFloat(s.pStep).toFixed(1)}%</text>
                        <text x="40" y="50" textAnchor="middle" fill="#94a3b8" fontSize="8">за шаг</text></svg>
                    </div>
                    <div style={{ fontSize: 12, color: 'inherit' }}>из {k} кандидатов</div>
                </div>
                <div style={{ background: D ? '#1f2937' : '#f9fafb', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'inherit', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Стоимость шага</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#ef4444' }}>{parseFloat(s.K).toFixed(0)}₽</div>
                </div>
                <div style={{ background: D ? '#1f2937' : '#f9fafb', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'inherit', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Ожидаемая выгода</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#10b981' }}>{parseFloat(s.expectedBenefitRub).toFixed(0)}₽</div>
                </div>
                <div style={{ background: D ? '#1f2937' : '#f9fafb', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'inherit', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>До успеха</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#f59e0b' }}>~{s.expectedSteps} шагов</div>
                    <div style={{ fontSize: 12, color: 'inherit', marginTop: 4 }}>{(parseFloat(s.expectedSteps) * parseFloat(s.K)).toFixed(0)}₽</div>
                </div>
            </div>
            {/* Progress bar */}
            <div style={{ background: D ? '#1f2937' : '#f9fafb', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: tM }}>Где лучший вариант относительно среднего</span>
                    <span style={{ fontSize: 12, color: 'inherit' }}>Z = {s.Z}</span>
                </div>
                <div style={{ position: 'relative', height: 28, borderRadius: 6, background: D ? '#1e293b' : '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: Math.max(2, ((parseFloat(s.mean) - parseFloat(s.xMin)) / (parseFloat(s.xMax) - parseFloat(s.xMin) + 1)) * 100) + '%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: '6px 0 0 6px', opacity: 0.5 }} />
                    <div style={{ position: 'absolute', top: 0, height: '100%', left: Math.max(1, ((parseFloat(s.mean) - parseFloat(s.xMin)) / (parseFloat(s.xMax) - parseFloat(s.xMin) + 1)) * 100) + '%', borderLeft: '2px dashed #3b82f6', paddingLeft: 4, display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 700, whiteSpace: 'nowrap' }}>μ={parseFloat(s.mean).toFixed(0)}₽</span>
                    </div>
                    <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', display: 'flex', alignItems: 'center', paddingRight: 6 }}>
                        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap' }}>★ {parseFloat(s.xMax).toFixed(0)}₽</span>
                    </div>
                </div>
            </div>
            <div style={{ fontSize: 12, color: tS, lineHeight: 1.7, padding: '10px 14px', background: D ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,46,0.05)', borderRadius: 8, borderLeft: '4px solid #8b5cf6' }}>
                {parseFloat(s.evsi) > 0
                    ? <>Лучший (<b style={{color:'#10b981'}}>★ {parseFloat(s.xMax).toFixed(0)}₽</b>) на <b>{s.Z}σ</b> выше среднего. Шанс найти лучше <b>{parseFloat(s.pStep).toFixed(1)}%</b>. <b style={{color:'#10b981'}}>Искать выгодно.</b></>
                    : <>Лучший (<b style={{color:'#10b981'}}>★ {parseFloat(s.xMax).toFixed(0)}₽</b>) на <b>{s.Z}σ</b> выше среднего. Затраты ({parseFloat(s.K).toFixed(0)}₽) {'>'} выгода ({parseFloat(s.expectedBenefitRub).toFixed(0)}₽). <b style={{color:'#ef4444'}}>Искать убыточно.</b></>}
            </div>
        </Box>
    </>);
}
