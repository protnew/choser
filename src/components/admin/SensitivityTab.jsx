import React, { useState } from 'react'
import { EChart } from './chartHelpers'
import { AdminNav } from './sensitivity/shared.jsx'
import { useSensitivityData } from './sensitivity/sensitivityData'
import { buildCharts } from './sensitivity/chartConfigs'

export default function SensitivityTab({ theme = 'dark' }) {
    const isDark = theme === 'dark';
    const DK = isDark;
    const TX = isDark ? '#ffffff' : '#000000';
    const SB = isDark ? '#d1d5db' : '#374151';
    const CARD_BG = isDark ? '#1e293b' : '#ffffff';
    const INNER_BG = isDark ? '#0f172a' : '#f9fafb';
    const BORDER = isDark ? '#334155' : '#e5e7eb';
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

    const cardStyle = { background: CARD_BG, borderRadius: 12, padding: 20, marginBottom: 20, border: `1px solid ${BORDER}` };
    const innerCard = { background: INNER_BG, borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` };
    const sectionTitle = { fontSize: 16, fontWeight: 700, color: TX, margin: '0 0 4px 0' };
    const sectionDesc = { fontSize: 13, color: SB, fontWeight: 500, marginBottom: 14, lineHeight: 1.5 };
    const statNum = { fontSize: 28, fontWeight: 800 };
    const statLabel = { fontSize: 12, color: SB, fontWeight: 500 };

    const SliderCard = ({ icon, label, value, children, color }) => (
        <div style={{ ...innerCard, minWidth: 180 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TX, marginBottom: 6 }}>{icon} {label}</div>
            {children}
            <div style={{ fontSize: 13, fontWeight: 700, color: value > 0 ? color : SB, marginTop: 4 }}>
                {value > 0 ? `${value}%` : 'Оригинал'}
            </div>
        </div>
    );

    const SummaryCard = ({ icon, label, value, sub, color }) => (
        <div style={{ ...innerCard, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: SB, fontWeight: 600 }}>{icon} {label}</div>
            <div style={{ ...statNum, color }}>{value}</div>
            <div style={{ ...statLabel }}>{sub}</div>
        </div>
    );

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
            <AdminNav activePage="sensitivity" />
            <h2 style={{ fontSize: 22, fontWeight: 700, color: TX, margin: '0 0 20px 0' }}>Чувствительность рекомендаций</h2>

            {/* INTERACTIVE */}
            <div style={{ ...cardStyle, borderColor: '#22c55e', borderWidth: 2 }}>
                <div style={sectionTitle}>Интерактивное упрощение</div>
                <div style={sectionDesc}>
                    Сравниваем <b style={{ color: TX }}>оригинальный рейтинг</b> vs <b style={{ color: TX }}>упрощённый</b>.
                    Меняйте параметры и смотрите, насколько стабилен топ-3.
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                    <div style={{ ...innerCard, minWidth: 200 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TX, marginBottom: 6 }}>⚖️ Веса: оригинал → равны</div>
                        <input type="range" min={0} max={100} step={5} value={interParams.weightFlatten} onChange={e => { setInterParams({...interParams, weightFlatten: +e.target.value}); setAutoRun(true) }} style={{ width: '100%', height: 28, cursor: 'pointer' }} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: interParams.weightFlatten > 0 ? '#818cf8' : SB }}>
                            {interParams.weightFlatten > 0 ? `${interParams.weightFlatten}% уплощены` : 'Оригинальные'}
                        </div>
                    </div>
                    <div style={{ ...innerCard, minWidth: 200 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TX, marginBottom: 6 }}>📐 Параметров оставить</div>
                        <input type="range" min={0} max={100} step={5} value={interParams.keepTopParams} onChange={e => { setInterParams({...interParams, keepTopParams: +e.target.value}); setAutoRun(true) }} style={{ width: '100%', height: 28, cursor: 'pointer' }} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: interParams.keepTopParams > 0 ? '#fbbf24' : SB }}>
                            {interParams.keepTopParams > 0 ? `${100 - interParams.keepTopParams}% убрано` : 'Все параметры'}
                        </div>
                    </div>
                    <div style={{ ...innerCard, minWidth: 200 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TX, marginBottom: 6 }}>🎯 Шкала: 10 → 1 балл</div>
                        <input type="range" min={1} max={10} step={1} value={interParams.maxScale} onChange={e => { setInterParams({...interParams, maxScale: +e.target.value}); setAutoRun(true) }} style={{ width: '100%', height: 28, cursor: 'pointer' }} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: interParams.maxScale < 10 ? '#22d3ee' : SB }}>
                            {interParams.maxScale === 10 ? '10 баллов (оригинал)' : `${interParams.maxScale} баллов`}
                        </div>
                    </div>
                    <button onClick={() => runInteractive()} disabled={interLoading} style={{
                        background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none',
                        padding: '12px 20px', borderRadius: 10, fontWeight: 700, cursor: interLoading ? 'wait' : 'pointer',
                        fontSize: 14, alignSelf: 'flex-start'
                    }}>{interLoading ? '⏳ Анализ...' : '▶️ Запустить'}</button>
                </div>

                {interResult && (<>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                        <SummaryCard icon="🏆" label="1-е место совпало" value={`${s?.firstMatchPct}%`} sub={`${s?.firstMatchCount} из ${iTotal}`} color={(s?.firstMatchPct||0) >= 80 ? '#22c55e' : '#f59e0b'} />
                        <SummaryCard icon="👥" label="В тройке" value={`${s?.avgPresence}%`} sub="Топ-3 стабильность" color={(s?.avgPresence||0) >= 80 ? '#22c55e' : '#f59e0b'} />
                        <SummaryCard icon="📍" label="Точно на месте" value={`${s?.avgExact}%`} sub="Позиция совпала" color="#f59e0b" />
                        <SummaryCard icon="📊" label="Таблиц" value={iTotal} sub="Проанализировано" color="#818cf8" />
                    </div>
                    <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: INNER_BG }}>
                            <thead>
                                <tr style={{ background: '#334155', position: 'sticky', top: 0 }}>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', color: TX, fontSize: 13, fontWeight: 700 }}>Таблица</th>
                                    <th style={{ padding: '8px 6px', color: TX }}>🏆</th>
                                    <th colSpan={2} style={{ padding: '8px 6px', background: '#818cf830', color: TX, fontSize: 12 }}>1-е место</th>
                                    <th colSpan={2} style={{ padding: '8px 6px', background: '#f59e0b20', color: TX, fontSize: 12 }}>2-е место</th>
                                    <th colSpan={2} style={{ padding: '8px 6px', background: '#22d3ee20', color: TX, fontSize: 12 }}>3-е место</th>
                                </tr>
                                <tr style={{ background: '#1e293b' }}>
                                    <th></th><th></th>
                                    <th style={{ padding: '3px 6px', color: SB, fontSize: 11 }}>Было</th><th style={{ padding: '3px 6px', color: SB, fontSize: 11 }}>Стало</th>
                                    <th style={{ padding: '3px 6px', color: SB, fontSize: 11 }}>Было</th><th style={{ padding: '3px 6px', color: SB, fontSize: 11 }}>Стало</th>
                                    <th style={{ padding: '3px 6px', color: SB, fontSize: 11 }}>Было</th><th style={{ padding: '3px 6px', color: SB, fontSize: 11 }}>Стало</th>
                                </tr>
                            </thead>
                            <tbody>
                                {iR.map((r, i) => {
                                    const pm = r.positionMatch || []
                                    return (
                                    <tr key={i} style={{ background: r.firstMatch ? '#052e16' : (i % 2 ? '#0f172a' : '#1e293b') }}>
                                        <td style={{ padding: '6px 10px', fontWeight: 600, color: TX, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.table_title}</td>
                                        <td style={{ padding: '6px', textAlign: 'center' }}>{r.firstMatch ? '✅' : '❌'}</td>
                                        {pm.map((p, j) => (
                                            <React.Fragment key={j}>
                                                <td style={{ padding: '4px 6px', fontSize: 12, color: '#a5b4fc', fontWeight: 600 }}>{p.ai || '—'}</td>
                                                <td style={{ padding: '4px 6px', fontSize: 12, color: p.match ? '#4ade80' : '#f87171', fontWeight: 600 }}>{p.human || '—'}</td>
                                            </React.Fragment>
                                        ))}
                                    </tr>)
                                })}
                            </tbody>
                        </table>
                    </div>
                </>)}
            </div>

            {/* RANDOM BASELINE */}
            <div style={{ ...cardStyle, borderColor: '#f59e0b', borderWidth: 2 }}>
                <div style={sectionTitle}>Случайный выбор vs Оптимальный</div>
                <div style={sectionDesc}>
                    Сравниваем <b style={{ color: TX }}>оптимальный выбор</b> vs <b style={{ color: TX }}>случайный</b>.
                    Базовый тест: если метод лишь немного лучше случайного, он бесполезен.
                </div>
                <button onClick={runRandomBaseline} disabled={randomLoading} style={{
                    background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: 'white', border: 'none',
                    padding: '12px 20px', borderRadius: 10, fontWeight: 700, cursor: randomLoading ? 'wait' : 'pointer',
                    fontSize: 14, marginBottom: 16
                }}>{randomLoading ? '⏳ Считаю...' : '🎲 Рассчитать случайный выбор'}</button>

                {randomResult && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                        <SummaryCard icon="📊" label="Таблиц" value={randomResult.summary?.tableCount || 0} sub="Проанализировано" color="#818cf8" />
                        <SummaryCard icon="🎯" label="Оптимальный" value={`${randomResult.summary?.optimalAvgUtility?.toFixed(0) || 0}`} sub="Средняя полезность" color="#22c55e" />
                        <SummaryCard icon="🎲" label="Случайный" value={`${randomResult.summary?.randomAvgUtility?.toFixed(0) || 0}`} sub="Средняя полезность" color="#ef4444" />
                        <SummaryCard icon="📈" label="Превышение" value={`+${randomResult.summary?.improvementPct?.toFixed(0) || 0}%`} sub="Оптимально vs Случайно" color="#22c55e" />
                    </div>
                )}
            </div>

            {/* SENSITIVITY CURVES */}
            <div style={cardStyle}>
                <div style={sectionTitle}>Кривые чувствительности</div>
                <div style={sectionDesc}>Как меняется топ-3 при изменении одного параметра от 0 до 100%</div>
                {!curves && !curvesLoading && (
                    <button onClick={() => loadCurves()} style={{
                        background: '#334155', color: TX, border: `1px solid ${BORDER}`,
                        padding: '12px 20px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14
                    }}>📈 Загрузить кривые</button>
                )}
                {curvesLoading && <div style={{ padding: 40, textAlign: 'center', color: SB, fontSize: 14 }}>⏳ Расчёт кривых...</div>}
                {curves && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                        <EChart option={tripleChart} style={{ width: '100%', height: 400 }} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(400px,1fr))', gap: 16 }}>
                            <EChart option={pairWP} style={{ width: '100%', height: 320 }} />
                            <EChart option={pairWS} style={{ width: '100%', height: 320 }} />
                            <EChart option={pairPS} style={{ width: '100%', height: 320 }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
