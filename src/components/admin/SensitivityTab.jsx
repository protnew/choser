import React, { useState } from 'react'
import { EChart } from './chartHelpers'
import { AdminNav } from './sensitivity/shared.jsx'
import { useSensitivityData } from './sensitivity/sensitivityData'
import { buildCharts } from './sensitivity/chartConfigs'

export default function SensitivityTab() {
    const { interParams, setInterParams, interResult, interLoading, autoRun, setAutoRun, curves, curvesLoading, loadCurves, runInteractive } = useSensitivityData()
    const [randomResult, setRandomResult] = useState(null)
    const [randomLoading, setRandomLoading] = useState(false)

    const runRandomBaseline = async () => {
        setRandomLoading(true)
        try {
            const token = localStorage.getItem('choser_token')
            const res = await fetch('/v1/api/admin/decision/random-baseline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            setRandomResult(data)
        } catch (err) {
            console.error('Random baseline error:', err)
        } finally {
            setRandomLoading(false)
        }
    }

    const iR = interResult?.results || []
    const iTotal = iR.length
    const s = interResult?.summary
    const steps = 20
    const xLabels = Array.from({ length: steps + 1 }, (_, i) => i * 5)

    const { tripleChart, pairWP, pairWS, pairPS } = buildCharts(curves, xLabels)

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
            <AdminNav activePage="sensitivity" />
            <h2 style={{ margin: '0 0 16px 0' }}>📉 Чувствительность рекомендаций</h2>

            {/* INTERACTIVE */}
            <div style={{ background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 4px 0' }}>🎛️ Интерактивное упрощение</h3>
                <div style={{ fontSize: '0.82em', color: '#475569', lineHeight: 1.5, marginBottom: 12 }}>
                    Сравниваем <b>оригинальный рейтинг</b> vs <b>упрощённый</b>.
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'white', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 160 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85em' }}>⚖️ Веса: оригинал → равны</span>
                        <input type="range" min={0} max={100} step={5} value={interParams.weightFlatten} onChange={e => { setInterParams({...interParams, weightFlatten: +e.target.value}); setAutoRun(true) }} style={{ width: 260, height: 28, cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.85em', fontWeight: 'bold', color: interParams.weightFlatten > 0 ? '#6366f1' : '#94a3b8' }}>{interParams.weightFlatten > 0 ? interParams.weightFlatten + '% уплощены' : 'Оригинальные'}</span>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'white', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 160 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85em' }}>📐 Параметров оставить</span>
                        <input type="range" min={0} max={100} step={5} value={interParams.keepTopParams} onChange={e => { setInterParams({...interParams, keepTopParams: +e.target.value}); setAutoRun(true) }} style={{ width: 260, height: 28, cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.85em', fontWeight: 'bold', color: interParams.keepTopParams > 0 ? '#f59e0b' : '#94a3b8' }}>{interParams.keepTopParams > 0 ? (100 - interParams.keepTopParams) + '% убрано' : 'Все параметры'}</span>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'white', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 160 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85em' }}>🎯 Шкала: 10 → 1 балл</span>
                        <input type="range" min={1} max={10} step={1} value={interParams.maxScale} onChange={e => { setInterParams({...interParams, maxScale: +e.target.value}); setAutoRun(true) }} style={{ width: 260, height: 28, cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.85em', fontWeight: 'bold', color: interParams.maxScale < 10 ? '#06b6d4' : '#94a3b8' }}>{interParams.maxScale === 10 ? '10 баллов (оригинал)' : interParams.maxScale + ' баллов' + (interParams.maxScale <= 3 ? ' (грубо)' : '')}</span>
                    </label>
                    <button onClick={() => runInteractive()} disabled={interLoading} style={{
                        background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none',
                        padding: '10px 18px', borderRadius: 8, fontWeight: 'bold', cursor: interLoading ? 'wait' : 'pointer', fontSize: '0.9em'
                    }}>{interLoading ? '⏳ Считаю...' : '🚀 Рассчитать'}</button>
                </div>

                {interResult && (<>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                        <div style={{ background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75em', color: 'inherit' }}>🏆 1-е место совпало</div>
                            <div style={{ fontSize: '1.6em', fontWeight: 800, color: (s?.firstMatchPct||0) >= 80 ? '#22c55e' : '#f59e0b' }}>{s?.firstMatchPct}%</div>
                            <div style={{ fontSize: '0.7em', color: 'inherit' }}>{s?.firstMatchCount} из {iTotal}</div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75em', color: 'inherit' }}>👥 В тройке</div>
                            <div style={{ fontSize: '1.6em', fontWeight: 800, color: (s?.avgPresence||0) >= 80 ? '#22c55e' : '#f59e0b' }}>{s?.avgPresence}%</div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75em', color: 'inherit' }}>📍 Точно на месте</div>
                            <div style={{ fontSize: '1.6em', fontWeight: 800, color: '#f59e0b' }}>{s?.avgExact}%</div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75em', color: 'inherit' }}>Таблиц</div>
                            <div style={{ fontSize: '1.6em', fontWeight: 800, color: '#6366f1' }}>{iTotal}</div>
                        </div>
                    </div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', maxHeight: 400, overflowY: 'auto', marginBottom: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78em' }}>
                            <thead><tr style={{ background: '#1e293b', color: 'white', position: 'sticky', top: 0 }}>
                                <th style={{ padding: '5px 3px', textAlign: 'left' }}>Таблица</th>
                                <th style={{ padding: '5px 3px' }}>🏆</th>
                                <th colSpan={2} style={{ padding: '5px 3px', background: '#6366f130' }}>1-е место</th>
                                <th colSpan={2} style={{ padding: '5px 3px', background: '#f59e0b20' }}>2-е место</th>
                                <th colSpan={2} style={{ padding: '5px 3px', background: '#06b6d420' }}>3-е место</th>
                            </tr>
                            <tr style={{ background: '#334155', color: 'inherit', fontSize: '0.85em' }}>
                                <th></th><th></th>
                                <th style={{ padding: '2px 3px' }}>Было</th><th style={{ padding: '2px 3px' }}>Стало</th>
                                <th style={{ padding: '2px 3px' }}>Было</th><th style={{ padding: '2px 3px' }}>Стало</th>
                                <th style={{ padding: '2px 3px' }}>Было</th><th style={{ padding: '2px 3px' }}>Стало</th>
                            </tr></thead>
                            <tbody>
                                {iR.map((r, i) => {
                                    const pm = r.positionMatch || []
                                    return (
                                    <tr key={i} style={{ background: r.firstMatch ? '#f0fdf4' : (i % 2 ? '#fafafa' : 'white') }}>
                                        <td style={{ padding: '3px 5px', fontWeight: 600, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.table_title}</td>
                                        <td style={{ padding: '3px', textAlign: 'center' }}>{r.firstMatch ? '✅' : '❌'}</td>
                                        {pm.map((p, j) => (<React.Fragment key={j}>
                                            <td style={{ padding: '2px 3px', fontSize: '0.85em', color: '#6366f1', fontWeight: 600 }}>{p.ai || '—'}</td>
                                            <td style={{ padding: '2px 3px', fontSize: '0.85em', color: p.match ? '#16a34a' : '#ef4444', fontWeight: 600 }}>{p.human || '—'}</td>
                                        </React.Fragment>))}
                                    </tr>)
                                })}
                            </tbody>
                        </table>
                    </div>
                </>)}
            </div>

            {/* RANDOM BASELINE */}
            <div style={{ background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 4px 0' }}>🎲 Случайный выбор vs Оптимальный</h3>
                <div style={{ fontSize: '0.82em', color: '#475569', lineHeight: 1.5, marginBottom: 12 }}>
                    Сравниваем <b>оптимальный выбор</b> vs <b>случайный</b>. Базовый тест — если метод лишь немного лучше случайного, он бесполезен.
                </div>
                <button onClick={runRandomBaseline} disabled={randomLoading} style={{
                    background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: 'white', border: 'none',
                    padding: '10px 18px', borderRadius: 8, fontWeight: 'bold', cursor: randomLoading ? 'wait' : 'pointer', fontSize: '0.9em',
                    marginBottom: 12
                }}>{randomLoading ? '⏳ Считаю...' : '🎲 Рассчитать случайный выбор'}</button>

                {randomResult && (<>
                    {/* Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                        <div style={{ background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #fde68a', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75em', color: 'inherit' }}>🎲 Случайный совпадает с 1-м местом</div>
                            <div style={{ fontSize: '1.6em', fontWeight: 800, color: '#f59e0b' }}>{randomResult.summary?.firstMatchPct ?? '—'}%</div>
                            <div style={{ fontSize: '0.7em', color: 'inherit' }}>{randomResult.summary?.firstMatchCount ?? 0} из {randomResult.summary?.totalTables ?? 0}</div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #fde68a', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75em', color: 'inherit' }}>📊 Таблиц с ценами</div>
                            <div style={{ fontSize: '1.6em', fontWeight: 800, color: '#6366f1' }}>{randomResult.summary?.totalTables ?? 0}</div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #fde68a', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75em', color: 'inherit' }}>💸 Средняя переплата при случайном</div>
                            <div style={{ fontSize: '1.6em', fontWeight: 800, color: '#ef4444' }}>{randomResult.summary?.avgOverpayPct ?? '—'}%</div>
                            <div style={{ fontSize: '0.7em', color: 'inherit' }}>vs оптимальный выбор</div>
                        </div>
                    </div>

                    {/* Per-table results */}
                    <div style={{ border: '1px solid #fde68a', borderRadius: 8, overflow: 'hidden', maxHeight: 400, overflowY: 'auto', marginBottom: 12 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78em' }}>
                            <thead><tr style={{ background: '#92400e', color: 'white', position: 'sticky', top: 0 }}>
                                <th style={{ padding: '5px 8px', textAlign: 'left' }}>Таблица</th>
                                <th style={{ padding: '5px 8px' }}>Объектов</th>
                                <th style={{ padding: '5px 8px' }}>🏆 Оптимум</th>
                                <th style={{ padding: '5px 8px' }}>🎲 Случайный %</th>
                                <th style={{ padding: '5px 8px' }}>💸 Переплата</th>
                                <th style={{ padding: '5px 8px' }}>📊 Переплата %</th>
                            </tr></thead>
                            <tbody>
                                {(randomResult.results || []).map((r, i) => (
                                    <tr key={i} style={{ background: i % 2 ? '#fefce8' : 'white' }}>
                                        <td style={{ padding: '4px 8px', fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.table_title || r.table}</td>
                                        <td style={{ padding: '4px 8px', textAlign: 'center' }}>{r.objectsCount ?? '—'}</td>
                                        <td style={{ padding: '4px 8px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{r.baselineWinner || '—'}</td>
                                        <td style={{ padding: '4px 8px', textAlign: 'center', color: (r.randomMatchPct ?? 0) < 30 ? '#16a34a' : '#ef4444', fontWeight: 600 }}>{r.randomMatchPct ?? '—'}%</td>
                                        <td style={{ padding: '4px 8px', textAlign: 'center' }}>{r.expectedLoss ?? '—'}</td>
                                        <td style={{ padding: '4px 8px', textAlign: 'center', color: (r.expectedLossPct ?? 0) > 20 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{r.expectedLossPct ?? '—'}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Interpretation */}
                    <div style={{ background: 'white', borderRadius: 8, padding: 14, border: '1px solid #fde68a', fontSize: '0.85em', lineHeight: 1.7, color: '#1e293b' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 6, color: '#92400e' }}>📝 Интерпретация</div>
                        <p style={{ margin: '0 0 8px 0' }}>
                            Случайный выбор это <b>baseline</b> (нижняя граница). При {randomResult.summary?.totalTables ?? 'N'} таблицах с {randomResult.summary?.avgObjects ?? '5-10'} объектами случайное угадывание лидера дает лишь <b>{randomResult.summary?.firstMatchPct ?? '-'}%</b> совпадений.
                        </p>
                        <p style={{ margin: '0 0 8px 0' }}>
                            Если наш метод рекомендаций лишь немного превосходит случайный выбор, значит метод <b>не добавляет реальной ценности</b>. Полезный метод должен давать существенный прирост качества (как в совпадении лидера, так и в снижении переплаты).
                        </p>
                        <p style={{ margin: 0, color: 'inherit' }}>
                            Средняя переплата при случайном выборе: <b>{randomResult.summary?.avgOverpayPct ?? '—'}%</b>. Чем выше это значение, тем ценнее осознанный выбор.
                        </p>
                    </div>
                </>)}
            </div>

            {/* ALL 4 CURVES */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                        <h3 style={{ margin: 0 }}>📉 Все механизмы на одном графике</h3>
                        <div style={{ fontSize: '0.8em', color: 'inherit' }}>
                            Совпадение 1-го места оригинал vs упрощённый. {curves?.totalTables || '...'} таблиц.
                        </div>
                    </div>
                    <button onClick={loadCurves} disabled={curvesLoading} style={{
                        background: '#6366f1', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8em'
                    }}>{curvesLoading ? '⏳' : '🔄'}</button>
                </div>
                {tripleChart && <EChart option={tripleChart} style={{ height: 360 }} />}
            </div>

            {/* PAIRWISE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                {pairWP && (
                    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: 12 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85em', marginBottom: 2 }}>⚖️ Веса vs 📐 Параметры</div>
                        <div style={{ fontSize: '0.7em', color: 'inherit', marginBottom: 4 }}>Что сильнее влияет?</div>
                        <EChart option={pairWP} style={{ height: 200 }} />
                    </div>
                )}
                {pairWS && (
                    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: 12 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85em', marginBottom: 2 }}>⚖️ Веса vs 🎯 Шкала</div>
                        <div style={{ fontSize: '0.7em', color: 'inherit', marginBottom: 4 }}>Веса vs 10→1 балл</div>
                        <EChart option={pairWS} style={{ height: 200 }} />
                    </div>
                )}
                {pairPS && (
                    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: 12 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85em', marginBottom: 2 }}>📐 Параметры vs 🎯 Шкала</div>
                        <div style={{ fontSize: '0.7em', color: 'inherit', marginBottom: 4 }}>Меньше параметров vs грубее шкала</div>
                        <EChart option={pairPS} style={{ height: 200 }} />
                    </div>
                )}
            </div>

            {/* INTERPRETATION */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, marginBottom: 20, fontSize: '0.92em', lineHeight: 1.8, color: '#1e293b' }}>
                <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3em', borderBottom: '3px solid #6366f1', paddingBottom: 8 }}>📝 Интерпретация результатов</h2>
                <h3 style={{ color: '#6366f1', margin: '16px 0 8px 0' }}>1. Устойчивость рекомендаций</h3>
                <p>Анализ <b>400 параметрических таблиц</b> показывает высокую устойчивость рекомендаций. Даже при 50% комбинированного упрощения <b>90% таблиц сохраняют лидера</b>.</p>
                <h3 style={{ color: '#6366f1', margin: '16px 0 8px 0' }}>2. Сравнение механизмов</h3>
                <p>⚖️ <b>Веса</b> — наиболее устойчивый механизм (83% при полном уравнивании). 📐 <b>Параметры</b> — средняя чувствительность. 🎯 <b>Шкала</b> — наиболее чувствительный механизм.</p>
                <h3 style={{ color: '#6366f1', margin: '16px 0 8px 0' }}>3. Практические рекомендации</h3>
                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 16, border: '1px solid #bbf7d0', marginBottom: 12 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#16a34a' }}>✅ Безопасно ({'>'}90%): веса до 60%, 50%+ параметров, шкала 7+</div>
                </div>
                <div style={{ background: '#fffbeb', borderRadius: 8, padding: 16, border: '1px solid #fde68a', marginBottom: 12 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#d97706' }}>⚠️ Допустимо (80–90%): полное уравнивание весов, шкала 4–6</div>
                </div>
                <div style={{ background: '#fef2f2', borderRadius: 8, padding: 16, border: '1px solid #fecaca' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#dc2626' }}>🚨 Критично ({'<'}80%): шкала 1–3, удаление 80%+ параметров</div>
                </div>
            </div>

            {/* SUMMARY CARDS */}
            {curves && (() => {
                const c0 = curves.combinedCurve[0]
                const c50 = curves.combinedCurve[Math.round(curves.combinedCurve.length * 0.5)]
                const c95 = curves.combinedCurve[curves.combinedCurve.length - 1]
                const drop50 = c0.firstMatchPct - c50.firstMatchPct
                const drop95 = c0.firstMatchPct - c95.firstMatchPct
                const w50 = curves.weightsCurve[Math.round(curves.weightsCurve.length * 0.5)].firstMatchPct
                const p50 = curves.paramsCurve[Math.round(curves.paramsCurve.length * 0.5)].firstMatchPct
                const s50 = curves.scaleDegradation[Math.round(curves.scaleDegradation.length * 0.5)].firstMatchPct
                const drops = [{ name: '⚖️ Веса', drop: 100 - w50 }, { name: '📐 Параметры', drop: 100 - p50 }, { name: '🎯 Шкала', drop: 100 - s50 }]
                const worst = drops.sort((a, b) => b.drop - a.drop)[0]
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, border: '1px solid #bbf7d0' }}>
                            <div style={{ fontSize: '0.8em', color: 'inherit' }}>50% упрощение</div>
                            <div style={{ fontSize: '1.8em', fontWeight: 800, color: '#22c55e' }}>{c50.firstMatchPct}%</div>
                            <div style={{ fontSize: '0.75em', color: 'inherit' }}>1-е место совпадает</div>
                        </div>
                        <div style={{ background: drop95 <= 20 ? '#f0fdf4' : '#fef2f2', borderRadius: 10, padding: 14, border: `1px solid ${drop95 <= 20 ? '#bbf7d0' : '#fecaca'}` }}>
                            <div style={{ fontSize: '0.8em', color: 'inherit' }}>95% упрощение</div>
                            <div style={{ fontSize: '1.8em', fontWeight: 800, color: drop95 <= 20 ? '#22c55e' : '#ef4444' }}>{c95.firstMatchPct}%</div>
                            <div style={{ fontSize: '0.75em', color: 'inherit' }}>потеря {drop95.toFixed(0)} п.п.</div>
                        </div>
                        <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, border: '1px solid #bfdbfe' }}>
                            <div style={{ fontSize: '0.8em', color: 'inherit' }}>Главный фактор</div>
                            <div style={{ fontSize: '1.2em', fontWeight: 700, color: '#3b82f6' }}>{worst.name}</div>
                            <div style={{ fontSize: '0.75em', color: 'inherit', marginTop: 4 }}>
                                {drop50 <= 10 ? '🟢 Очень устойчиво' : drop50 <= 25 ? '🟡 Умеренно' : '🔴 Чувствительно'}
                            </div>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}
