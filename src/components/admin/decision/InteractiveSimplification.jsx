import React from 'react'
import { EChart } from '../chartHelpers'

export default function InteractiveSimplification({ interParams, setInterParams, interResult, interLoading, runInteractive, setAutoRun }) {
    const iR = interResult?.results || []
    const iTotal = iR.length
    const iAvg = iTotal ? +(iR.reduce((s, r) => s + r.exactPct, 0) / iTotal).toFixed(1) : 0

    const chart3 = iTotal > 0 ? {
        tooltip: { trigger: 'axis' }, legend: { top: 0, textStyle: { fontSize: 12 } },
        grid: { left: 50, right: 30, top: 50, bottom: 40 },
        xAxis: { type: 'category', data: ['Средний %'], axisLabel: { fontSize: 12 } },
        yAxis: { type: 'value', max: 100, min: 0, name: '%' },
        series: [
            { name: 'Совпадение', type: 'bar', barWidth: '40%', data: [iAvg], itemStyle: { color: iAvg >= 80 ? '#22c55e' : iAvg >= 50 ? '#f59e0b' : '#ef4444' },
              label: { show: true, position: 'top', formatter: p => `${p.value}% (${iTotal} табл.)`, fontWeight: 'bold' } }
        ]
    } : null

    const chart4 = iTotal > 0 ? (() => {
        const bk = { '100%': 0, '67%': 0, '33%': 0, '0%': 0 }
        iR.forEach(r => { const p = r.exactPct; if (p === 100) bk['100%']++; else if (p >= 67) bk['67%']++; else if (p >= 33) bk['33%']++; else bk['0%']++ })
        const colors = { '100%': '#22c55e', '67%': '#84cc16', '33%': '#f59e0b', '0%': '#ef4444' }
        return { tooltip: { trigger: 'item' }, legend: { bottom: 0 },
            series: [{ type: 'pie', radius: ['30%', '60%'], center: ['50%', '45%'],
                data: Object.entries(bk).filter(([,v]) => v > 0).map(([k, v]) => ({
                    name: `Совпадение ${k} (${v} табл., ${((v/iTotal)*100).toFixed(0)}%)`, value: v, itemStyle: { color: colors[k] }
                })), label: { formatter: '{b}', fontSize: 12 } }] }
    })() : null

    const chart7 = iTotal > 0 ? (() => {
        const ranges = [{ label: '2–4', min: 0, max: 4 }, { label: '5–8', min: 5, max: 8 }, { label: '9–14', min: 9, max: 14 }, { label: '15+', min: 15, max: 999 }]
        return { tooltip: { trigger: 'axis' },
            grid: { left: 50, right: 30, top: 30, bottom: 40 }, xAxis: { type: 'category', data: ranges.map(r => r.label) }, yAxis: { type: 'value', name: '%', max: 100 },
            series: [{ name: 'Совпадение', type: 'bar', barWidth: '50%', itemStyle: { color: '#6366f1' },
                data: ranges.map(rng => {
                    const sub = iR.filter(r => (r.paramsTotal || 0) >= rng.min && (r.paramsTotal || 0) <= rng.max)
                    const v = sub.length ? +(sub.reduce((s, r) => s + r.exactPct, 0) / sub.length).toFixed(1) : 0
                    return { value: v, name: `${v}% (${sub.length})` }
                }), label: { show: true, position: 'top', fontSize: 12, formatter: p => p.data.name } }] }
    })() : null

    const chart8 = iTotal > 0 ? (() => {
        const full = iR.filter(r => r.exactCount === 3).length
        const partial = iR.filter(r => r.exactCount >= 1 && r.exactCount <= 2).length
        const lost = iR.filter(r => r.exactCount === 0).length
        return { tooltip: { trigger: 'item' }, legend: { bottom: 0 },
            series: [{ type: 'pie', radius: ['0%', '55%'],
                data: [
                    { name: `Все 3 на месте: ${full} (${((full/iTotal)*100).toFixed(0)}%)`, value: full, itemStyle: { color: '#22c55e' } },
                    { name: `1–2 ушли: ${partial} (${((partial/iTotal)*100).toFixed(0)}%)`, value: partial, itemStyle: { color: '#f59e0b' } },
                    { name: `Все ушли: ${lost} (${((lost/iTotal)*100).toFixed(0)}%)`, value: lost, itemStyle: { color: '#ef4444' } }
                ], label: { formatter: '{b}', fontSize: 12 } }] }
    })() : null

    const chart10 = iTotal > 0 ? {
        series: [{ type: 'gauge', startAngle: 200, endAngle: -20, min: 0, max: 100,
            detail: { formatter: v => `${v}%\n${iTotal} табл.`, fontSize: 16, offsetCenter: [0, '70%'] },
            data: [{ value: iAvg, name: 'Устойчивость' }],
            axisLine: { lineStyle: { width: 20, color: [[0.3, '#ef4444'], [0.6, '#f59e0b'], [1, '#22c55e']] } },
            title: { offsetCenter: [0, '90%'], fontSize: 14 } }]
    } : null

    const ChartBox = ({ title, num, note, children }) => (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 'bold', fontSize: '1em', marginBottom: 4 }}>
                <span style={{ background: '#6366f1', color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: '0.85em', marginRight: 8 }}>{num}</span>
                {title}
            </div>
            {note && <div style={{ fontSize: '0.82em', color: 'inherit', marginBottom: 8, lineHeight: 1.5 }}>{note}</div>}
            {children}
        </div>
    )

    return (
        <>
            <div style={{ background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: 12, padding: 16, marginBottom: 20, marginTop: 20 }}>
                <h3 style={{ margin: '0 0 8px 0' }}>🎛️ Интерактивное упрощение</h3>
                <div style={{ fontSize: '0.82em', color: '#475569', lineHeight: 1.5, marginBottom: 12 }}>
                    Меняйте параметры и смотрите как изменяется совпадение ИИ vs Человек.
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'white', padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <input type="checkbox" checked={interParams.removeWeights} onChange={e => { setInterParams({...interParams, removeWeights: e.target.checked}); setAutoRun(true) }} />
                        <span style={{ fontWeight: 600 }}>⚖️ Убрать веса</span>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'white', padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <span style={{ fontWeight: 600 }}>📐 Параметров (%)</span>
                        <input type="range" min={0} max={100} step={5} value={interParams.keepTopParams} onChange={e => { setInterParams({...interParams, keepTopParams: +e.target.value}); setAutoRun(true) }} style={{ width: 140 }} />
                        <span style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#6366f1' }}>{interParams.keepTopParams > 0 ? interParams.keepTopParams + '%' : 'Все'}</span>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'white', padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <span style={{ fontWeight: 600 }}>🎯 Шкала оценок</span>
                        <select value={interParams.scoreScale} onChange={e => { setInterParams({...interParams, scoreScale: e.target.value}); setAutoRun(true) }}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                            <option value="original">Оригинал (1–10)</option>
                            <option value="3point">3 балла (1–3)</option>
                            <option value="binary">Бинарная (≥7=1, &lt;7=0)</option>
                        </select>
                    </label>
                    <button onClick={runInteractive} disabled={interLoading} style={{
                        background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none',
                        padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', cursor: interLoading ? 'wait' : 'pointer', fontSize: '0.9em'
                    }}>{interLoading ? '⏳ Считаю...' : '🚀 Рассчитать'}</button>
                </div>

                {interResult && (
                    <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 12 }}>
                        <div style={{ background: 'white', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8em', color: 'inherit' }}>Среднее совпадение</div>
                            <div style={{ fontSize: '1.8em', fontWeight: 800, color: interResult.summary.avgExact >= 70 ? '#22c55e' : interResult.summary.avgExact >= 40 ? '#f59e0b' : '#ef4444' }}>{interResult.summary.avgExact}%</div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8em', color: 'inherit' }}>🏆 1-е место совпало</div>
                            <div style={{ fontSize: '1.8em', fontWeight: 800, color: interResult.summary.firstMatchPct >= 80 ? '#22c55e' : interResult.summary.firstMatchPct >= 50 ? '#f59e0b' : '#ef4444' }}>{interResult.summary.firstMatchPct}%</div>
                            <div style={{ fontSize: '0.7em', color: 'inherit' }}>({interResult.summary.firstMatchCount} из {interResult.total})</div>
                        </div>
                        <div style={{ background: 'white', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8em', color: 'inherit' }}>Присутствие в тройке</div>
                            <div style={{ fontSize: '1.8em', fontWeight: 800, color: interResult.summary.avgPresence >= 80 ? '#22c55e' : interResult.summary.avgPresence >= 50 ? '#f59e0b' : '#ef4444' }}>{interResult.summary.avgPresence}%</div>
                        </div>
                    </div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82em' }}>
                            <thead><tr style={{ background: '#22c55e', color: 'white', position: 'sticky', top: 0 }}>
                                <th style={{ padding: '8px 6px', textAlign: 'left' }}>Таблица</th>
                                <th style={{ padding: '8px 6px', textAlign: 'center' }}>Совпадение</th>
                                <th style={{ padding: '8px 6px', textAlign: 'center' }}>🏆 1-е</th>
                                <th style={{ padding: '8px 6px', textAlign: 'center' }}>Присутствие</th>
                                <th style={{ padding: '8px 6px', textAlign: 'center' }}>1-е место</th>
                                <th style={{ padding: '8px 6px', textAlign: 'center' }}>2-е место</th>
                                <th style={{ padding: '8px 6px', textAlign: 'center' }}>3-е место</th>
                            </tr></thead>
                            <tbody>
                                {interResult.results.map((r, i) => (
                                    <tr key={i} style={{ background: r.exactCount === 3 ? '#f0fdf4' : r.exactCount === 0 ? '#fef2f2' : (i % 2 ? '#fafafa' : 'white') }}>
                                        <td style={{ padding: '6px 8px', fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.table_title}</td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                            <span style={{ background: r.exactPct === 100 ? '#22c55e' : r.exactPct >= 67 ? '#84cc16' : r.exactPct >= 33 ? '#f59e0b' : '#ef4444', color: 'white', borderRadius: 4, padding: '2px 8px', fontWeight: 'bold' }}>
                                                {r.exactPct}% ({r.exactCount}/3)
                                            </span>
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}><span style={{ fontSize: '1.1em' }}>{r.firstMatch ? '✅' : '❌'}</span></td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                            <span style={{ background: r.presencePct === 100 ? '#22c55e' : r.presencePct >= 67 ? '#84cc16' : r.presencePct >= 33 ? '#f59e0b' : '#ef4444', color: 'white', borderRadius: 4, padding: '2px 8px', fontWeight: 'bold' }}>{r.presencePct}%</span>
                                        </td>
                                        {r.positionMatch.map((p, j) => {
                                            const typeColors = { exact: '#22c55e', normalized: '#16a34a', substring: '#84cc16', semantic: '#3b82f6', fuzzy: '#8b5cf6', none: '#ef4444' }
                                            const typeLabels = { exact: '≅ Точно', normalized: '≈ Норм.', substring: '⊂ Подстр.', semantic: '🔢 Семант.', fuzzy: '≈ Fuzzy', none: '✗ Нет' }
                                            const tc = typeColors[p.matchType] || '#94a3b8'
                                            return (
                                            <td key={j} style={{ padding: '6px 8px', textAlign: 'center', background: p.match ? tc + '15' : 'rgba(239,68,68,0.05)' }}>
                                                <div style={{ marginBottom: 2 }}><span style={{ background: tc + '25', color: tc, borderRadius: 4, padding: '1px 5px', fontSize: '0.7em', fontWeight: 'bold' }}>{typeLabels[p.matchType] || '?'}</span></div>
                                                <div style={{ fontSize: '0.8em', color: '#7c3aed', fontWeight: 600 }}>{p.ai || '—'}</div>
                                                <div style={{ fontSize: '0.7em', color: 'inherit' }}>vs</div>
                                                <div style={{ fontSize: '0.8em', color: '#3b82f6', fontWeight: 600 }}>{p.human || '—'}</div>
                                            </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}
            </div>

            <ChartBox title="Совпадение топ-3 при текущих настройках" num={3} note={`Анализ ${iTotal} таблиц.`}>
                {chart3 && <EChart option={chart3} style={{ height: 300 }} />}
            </ChartBox>
            <ChartBox title="Распределение совпадений" num={4} note={`Из ${iTotal} таблиц.`}>
                {chart4 && <EChart option={chart4} style={{ height: 300 }} />}
            </ChartBox>
            <ChartBox title="Совпадение vs количество параметров" num={5}>
                {chart7 && <EChart option={chart7} style={{ height: 300 }} />}
            </ChartBox>
            <ChartBox title="Потеря лидеров при текущем упрощении" num={6} note={`Из ${iTotal} таблиц.`}>
                {chart8 && <EChart option={chart8} style={{ height: 300 }} />}
            </ChartBox>
            <ChartBox title="Общая устойчивость решений Чосера" num={7}>
                {chart10 && <EChart option={chart10} style={{ height: 250 }} />}
            </ChartBox>
        </>
    )
}
