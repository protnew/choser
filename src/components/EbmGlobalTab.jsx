import React from 'react';
import { useApp } from '../contexts/AppContext';
import { GlobalHistogramChart, EvsiComparisonChart } from './ebm/EbmCharts';
import { Box, Cd, monoStyle } from './ebm/shared';
import { useEbmGlobal } from './ebm/useEbmGlobal';

// ═══ Main Component ═══

export default function EbmGlobalTab({ ebmData, baseCost, setBaseCost, paramCount }) {
    const { theme } = useApp();
    const D = theme === 'dark';
    const mono = monoStyle;
    const bg = D ? '#1e293b' : 'white';
    const bgI = D ? '#1f2937' : '#f9fafb';
    const brd = D ? '#374151' : '#e5e7eb';
    const tM = D ? '#ffffff' : '#000000';
    const tS = D ? '#94a3b8' : '#64748b';
    const gL = D ? '#374151' : '#e5e7eb';
    const aL = D ? '#374151' : '#e5e7eb';

    const { globalScores, loading, error, fitResult, evsiComparison, evsiSteps } = useEbmGlobal(ebmData);
    // ═══ РЕНДЕР ═══

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: tS }}><div style={{ fontSize: 40 }}>🌍</div><h3>Загрузка глобальных данных...</h3><p>Собираем оценки из всех таблиц</p></div>;
    if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}><div style={{ fontSize: 40 }}>⚠️</div><h3>Ошибка загрузки</h3><p>{error}</p></div>;
    if (!globalScores || globalScores.scores.length < 3) return <div style={{ padding: 40, textAlign: 'center', color: tS }}><div style={{ fontSize: 40 }}>🟢</div><h3>Недостаточно данных</h3><p>Нужно минимум 3 объекта с ценами. Сейчас: {globalScores?.scores.length || 0}</p></div>;

    const gs = globalScores;

    return (
        <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>

            {/* ЗАГОЛОВОК */}
            <Box bg={bg} brd={brd} p={18}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 28 }}>🌍</span>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: 17, color: tM }}>EBM Global — анализ всех таблиц</h2>
                        <p style={{ margin: '2px 0 0', color: tS, fontSize: 12 }}>{gs.tablesWithPrices} таблиц с ценами, {gs.scores.length} объектов</p>
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

            {/* 1. ГИСТОГРАММА */}
            <Box bg={bg} brd={brd} p={14}>
                <b style={{ color: tM, fontSize: 14 }}>1. Глобальные данные — распределение нормализованных scores</b>
                <div style={{ fontSize: 12, color: 'inherit', marginTop: 4, marginBottom: 8 }}>
                    Все scores ({gs.scores.length}) из {gs.tablesWithPrices} таблиц с ценами. Кривые: Normal, Weibull, Beta.
                </div>
                <GlobalHistogramChart divId="global-hist" scores={gs.scores} fitResult={fitResult} D={D} tS={tS} aL={aL} gL={gL} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                    {[{l:'SSE Normal',v:fitResult?.sseNormal,c:'#3b82f6'},{l:'SSE Weibull',v:fitResult?.sseWeibull,c:'#10b981'},{l:'SSE Beta',v:fitResult?.sseBeta,c:'#f59e0b'}].map(x=>(
                        <div key={x.l} style={{ padding: 6, borderRadius: 5, background: bgI, borderLeft: `3px solid ${x.c}` }}>
                            <div style={{ fontSize: 12, color: 'inherit', fontWeight: 600 }}>{x.l}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: tM }}>{x.v?.toFixed(4)}</div>
                        </div>
                    ))}
                </div>
            </Box>

            {/* 2. FIT */}
            {fitResult && <Box bg={bg} brd={brd} p={14}>
                <b style={{ color: tM, fontSize: 14 }}>2. Fit распределения</b>
                <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
Лучший fit: ${fitResult.bestFit.toUpperCase()} (по минимальному SSE)

Normal(μ, σ):  μ=${fitResult.normalParams.mu.toFixed(4)}  σ=${fitResult.normalParams.sigma.toFixed(4)}  SSE=${fitResult.sseNormal.toFixed(6)}
Weibull(α, β): α=${fitResult.weibullParams.shape.toFixed(4)}  β=${fitResult.weibullParams.scale.toFixed(4)}  SSE=${fitResult.sseWeibull.toFixed(6)}
Beta(α, β):    α=${fitResult.betaParams.alpha.toFixed(4)}  β=${fitResult.betaParams.beta.toFixed(4)}  SSE=${fitResult.sseBeta.toFixed(6)}

Метод: Method of Moments (Normal, Weibull), MoM (Beta)`}</div>
            </Box>}

            {/* 3. EVSI по Weibull (основной метод) */}
            {evsiComparison && <Box bg={bg} brd={brd} p={14}>
                <b style={{ color: tM, fontSize: 14 }}>3. EVSI по Weibull (основной метод {fitResult?.bestFit === 'weibull' ? '✓ лучший fit' : `( SSE=${fitResult?.sseWeibull.toFixed(4)} )`})</b>
                <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
Формула EVSI (Weibull):

  EVSI_weibull = E[benefit_weibull] − K

  E[benefit] = ∫_{xMax}^∞ (x − xMax) × k × f_W(x) × F_W(x)^{k−1} dx

  где f_W(x) = (α/β) × (x/β)^{α−1} × exp(−(x/β)^α)   — Weibull PDF
       F_W(x) = 1 − exp(−(x/β)^α)                      — Weibull CDF
       f_max(x) = k × f_W(x) × F_W(x)^{k−1}            — k-й максимум

Параметры Weibull (из глобального fit):
  shape α = ${fitResult?.weibullParams.shape.toFixed(4)}
  scale β = ${fitResult?.weibullParams.scale.toFixed(4)} (нормализованные scores)
  scale β × ratio = ${(fitResult?.weibullParams.scale * (evsiComparison.stdDev / (fitResult?.stdDev || 1))).toFixed(2)}₽ (пересчёт в рубли)

Параметры текущей таблицы:
  k = ${evsiComparison.k} кандидатов/шаг
  xMax = ${evsiComparison.xMax}₽ (лучший найденный объект)
  μ = ${evsiComparison.mean.toFixed(0)}₽  σ = ${evsiComparison.stdDev.toFixed(0)}₽
  K = ${evsiComparison.K.toFixed(2)}₽ (стоимость шага поиска)

Результат:
  E[benefit_weibull] = ${evsiComparison.benefitWeibull.toFixed(2)}₽
  EVSI_weibull = ${evsiComparison.benefitWeibull.toFixed(2)} − ${evsiComparison.K.toFixed(2)} = ${evsiComparison.evsiWeibull.toFixed(2)}₽
  ${evsiComparison.evsiWeibull > 0 ? '→ EVSI > 0 → ИСКАТЬ ВЫГОДНО (следующий шаг принесёт в среднем +' + evsiComparison.evsiWeibull.toFixed(0) + '₽)' : '→ EVSI ≤ 0 → СТОП (поиск убыточен, −' + Math.abs(evsiComparison.evsiWeibull).toFixed(0) + '₽/шаг)'}`}</div>
            </Box>}

            {/* 4. EVSI по Normal (альтернатива) */}
            {evsiComparison && <Box bg={bg} brd={brd} p={14}>
                <b style={{ color: tM, fontSize: 14 }}>4. EVSI по Normal (альтернатива {fitResult?.bestFit === 'normal' ? '✓ лучший fit' : `( SSE=${fitResult?.sseNormal.toFixed(4)} )`})</b>
                <div style={{ marginTop: 4, fontSize: 12, color: '#f59e0b', marginBottom: 8, padding: '4px 8px', background: D ? '#1e293b' : '#fef3c7', borderRadius: 4, borderLeft: '3px solid #f59e0b' }}>
                    Normal — классический подход из учебников EBM. Предполагает симметричное распределение цен. Мы используем его как baseline для сравнения с Weibull (у которого хвосты толще → обычно рекомендует искать дольше).
                </div>
                <div style={{ fontSize: 12, color: tS, ...mono }}>{`
Формула EVSI (Normal):

  EVSI_normal = σ × ∫_Z^∞ (z − Z) × k × φ(z) × Φ(z)^{k−1} dz − K

  где φ(z) = (1/√2π) × exp(−z²/2)       — стандартная нормальная PDF
       Φ(z) = ∫_{−∞}^z φ(t) dt             — стандартная нормальная CDF
       f_max(z) = k × φ(z) × Φ(z)^{k−1}   — плотность k-го максимума
       Z = (xMax − μ) / σ                    — стандартизованное расстояние

Численный метод: трапеции, 200 шагов, предел интегрирования [Z, Z+6]

Параметры:
  Z = ${evsiComparison.Z.toFixed(3)} (чем больше Z, тем дальше xMax от среднего)
  σ = ${evsiComparison.stdDev.toFixed(0)}₽ (стандартное отклонение популяции)
  μ = ${evsiComparison.mean.toFixed(0)}₽ (среднее популяции)
  k = ${evsiComparison.k}  K = ${evsiComparison.K.toFixed(2)}₽

Результат:
  E[benefit_normal] = ${evsiComparison.benefitNormal.toFixed(2)}₽
  EVSI_normal = ${evsiComparison.benefitNormal.toFixed(2)} − ${evsiComparison.K.toFixed(2)} = ${evsiComparison.evsiNormal.toFixed(2)}₽
  ${evsiComparison.evsiNormal > 0 ? '→ EVSI > 0 → ИСКАТЬ' : '→ EVSI ≤ 0 → СТОП'}

Разница Normal vs Weibull:
  Δ = ${(evsiComparison.evsiWeibull - evsiComparison.evsiNormal).toFixed(2)}₽
  ${evsiComparison.evsiWeibull > evsiComparison.evsiNormal ? 'Weibull рекомендует искать дольше (толстые хвосты → выше шанс найти лидера)' : 'Normal консервативнее (тонкие хвосты → ниже ожидание)'}

💡 Полный расчёт Normal (per-table) доступен на вкладке «📈 Математика EBM»`}</div>
            </Box>}

            {/* 5. EVSI по Empirical (KDE) */}
            {evsiComparison && <Box bg={bg} brd={brd} p={14}>
                <b style={{ color: tM, fontSize: 14 }}>5. EVSI по Empirical (KDE — без параметрических допущений)</b>
                <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
Формула EVSI (Empirical/KDE):

  EVSI_empirical = E[benefit_empirical] − K

  E[benefit] = ∫_{xMax}^∞ (x − xMax) × k × f̂(x) × F̂(x)^{k−1} dx

  где f̂(x) = (1/nh) × Σ Gaussian_kernel((x − xi)/h)  — Kernel Density Estimate
       F̂(x) = (1/n) × Σ Φ((x − xi)/h)                  — Kernel CDF
       h = 1.06 × range / n^{0.2}                       — bandwidth (Silverman)

Данные: ${globalScores?.scores?.length || 0} нормализованных scores из ${gs.tablesWithPrices} таблиц
  bandwidth h = ${globalScores?.scores?.length > 2 ? (1.06 * (Math.max(...globalScores.scores) - Math.min(...globalScores.scores)) / Math.pow(globalScores.scores.length, 0.2)).toFixed(4) : '—'}

Результат:
  E[benefit_empirical] = ${evsiComparison.benefitEmpirical.toFixed(2)}₽
  EVSI_empirical = ${evsiComparison.benefitEmpirical.toFixed(2)} − ${evsiComparison.K.toFixed(2)} = ${evsiComparison.evsiEmpirical.toFixed(2)}₽
  ${evsiComparison.evsiEmpirical > 0 ? '→ ИСКАТЬ' : '→ СТОП'}`}</div>
            </Box>}

            {/* 6. СРАВНИТЕЛЬНЫЙ ГРАФИК */}
            {evsiSteps.length > 0 && <Box bg={bg} brd={brd} p={14}>
                <b style={{ color: tM, fontSize: 14 }}>6. Сравнительный график EVSI</b>
                <div style={{ fontSize: 12, color: 'inherit', marginTop: 4, marginBottom: 8 }}>
                    3 линии: синяя = Normal, зелёная = Weibull, жёлтая = Empirical. <b>Синяя вертикальная линия = "вы здесь" (текущий N)</b>. <b>Зелёные значки 📍 = точки останова</b> (последний N где EVSI{'>'}0). Красная горизонталь = граница EVSI=0.
                </div>
                <EvsiComparisonChart divId="global-evsi" steps={evsiSteps} D={D} tS={tS} aL={aL} gL={gL} />
            </Box>}

            {/* 7. ТАБЛИЦА */}
            {evsiSteps.length > 0 && <Box bg={bg} brd={brd} p={14}>
                <b style={{ color: tM, fontSize: 14 }}>7. Таблица расчётных значений (все N, все методы)</b>
                <div style={{ fontSize: 12, color: 'inherit', marginTop: 4, marginBottom: 8 }}>
                    Каждая строка = один шаг поиска. EVSI{'>'}0 = искать выгодно. ✅ = хотя бы один метод рекомендует «ИСКАТЬ». ⛔ = все методы говорят «СТОП».
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'Consolas', monospace" }}>
                        <thead>
                            <tr style={{ borderBottom: `2px solid ${brd}` }}>
                                <th style={{ textAlign: 'left', padding: '4px 6px', color: tS }}>N</th>
                                <th style={{ textAlign: 'right', padding: '4px 6px', color: '#3b82f6' }}>Normal ₽</th>
                                <th style={{ textAlign: 'right', padding: '4px 6px', color: '#10b981' }}>Weibull ₽</th>
                                <th style={{ textAlign: 'right', padding: '4px 6px', color: '#f59e0b' }}>Empirical ₽</th>
                                <th style={{ textAlign: 'center', padding: '4px 6px', color: tS }}>Лучший метод</th>
                                <th style={{ textAlign: 'center', padding: '4px 6px', color: tS }}>Вердикт</th>
                            </tr>
                        </thead>
                        <tbody>
                            {evsiSteps.map((st, i) => {
                                const vals = [st.evsiNormal, st.evsiWeibull, st.evsiEmpirical];
                                const best = Math.max(...vals);
                                const bestIdx = vals.indexOf(best);
                                const bestName = ['Normal','Weibull','Empirical'][bestIdx];
                                const bestColor = ['#3b82f6','#10b981','#f59e0b'][bestIdx];
                                return (
                                    <tr key={i} style={{ borderBottom: `1px solid ${gL}` }}>
                                        <td style={{ padding: '3px 6px', color: tM, fontWeight: i === evsiSteps.length - 1 ? 700 : 400 }}>{st.n}</td>
                                        <td style={{ padding: '3px 6px', textAlign: 'right', color: bestIdx===0 ? '#3b82f6' : tS, fontWeight: bestIdx===0 ? 600 : 400 }}>{st.evsiNormal.toFixed(1)}</td>
                                        <td style={{ padding: '3px 6px', textAlign: 'right', color: bestIdx===1 ? '#10b981' : tS, fontWeight: bestIdx===1 ? 600 : 400 }}>{st.evsiWeibull.toFixed(1)}</td>
                                        <td style={{ padding: '3px 6px', textAlign: 'right', color: bestIdx===2 ? '#f59e0b' : tS, fontWeight: bestIdx===2 ? 600 : 400 }}>{st.evsiEmpirical.toFixed(1)}</td>
                                        <td style={{ padding: '3px 6px', textAlign: 'center', color: bestColor, fontSize: 12 }}>{bestName}</td>
                                        <td style={{ padding: '3px 6px', textAlign: 'center', color: best > 0 ? '#10b981' : '#ef4444' }}>{best > 0 ? '✅' : '⛔'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Box>}

            {/* 8. ДОПУЩЕНИЯ */}
            <Box bg={bg} brd={brd} p={14}>
                <b style={{ color: tM, fontSize: 14 }}>8. Допущения и ограничения</b>
                <div style={{ marginTop: 8, fontSize: 12, color: tS, lineHeight: 1.8 }}>
                    <b style={{ color: '#f59e0b' }}>⚠️ Ключевые допущения:</b>
                    <div style={{ marginTop: 3 }}>• <b>Глобальное распределение:</b> все нормализованные scores из всех таблиц объединены в одну выборку. Предполагается, что scores из разных категорий сопоставимы после нормализации.</div>
                    <div>• <b>Method of Moments:</b> параметры Weibull/Beta оценены через MoM, не MLE. Для малых выборок — грубая оценка.</div>
                    <div>• <b>Масштабирование:</b> Weibull/Empirical EVSI масштабируются от нормализованного [0,1] к рублёвому через ratio текущей таблицы: scaleRatio = σ_table / σ_global.</div>
                    <div>• <b>KDE для Empirical:</b> Gaussian kernel с правилом Silverman для bandwidth. Сглаживает multimodality — если данные бимодальные, Empirical может занижать EVSI.</div>
                    <div>• <b>σ популяции постоянен:</b> не уменьшается с ростом выборки (только SE = σ/√n уменьшается).</div>
                    <div>• <b>Независимость:</b> оценки объектов предполагаются независимыми (нет коррекции на бренд/категорию).</div>
                    <div>• <b>Только таблицы с ценами:</b> таблицы без цен исключены из глобальной выборки.</div>
                    <div>• <b>k-й максимум:</b> f_max(x) = k × f(x) × F(x)^{'{'}k−1{'}'} — плотность максимума из k независимых выборок.</div>
                </div>
            </Box>
        </div>
    );
}
