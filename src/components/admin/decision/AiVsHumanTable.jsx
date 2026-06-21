import React from 'react'
import { posBadge } from './aiVsHumanUtils.jsx'
import { useAiVsHumanData } from './useAiVsHumanData'
import AiVsHumanRowDetail from './AiVsHumanRowDetail'
import AiVsHumanCharts from './AiVsHumanCharts'

export default function AiVsHumanTable({ aiVsHuman, loading, runAiVsHuman, getDetails }) {
    const {
        expandedRow, setExpandedRow,
        page, setPage, totalPages, pageData, pageStart,
        aiAverages, pieChartOption
    } = useAiVsHumanData(aiVsHuman, getDetails)

    return (
        <>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <Header count={aiVsHuman?.length || 0} loading={loading} onRun={runAiVsHuman} />

                {aiVsHuman?.length ? (
                    <>
                        <SummaryTable
                            aiVsHuman={aiVsHuman} pageData={pageData} pageStart={pageStart}
                            expandedRow={expandedRow} setExpandedRow={setExpandedRow}
                            getDetails={getDetails} aiAverages={aiAverages}
                        />
                        {totalPages > 1 && (
                            <Pagination page={page} setPage={setPage} totalPages={totalPages} />
                        )}
                    </>
                ) : (
                    <div style={{ color: 'inherit', padding: 20, textAlign: 'center' }}>Нажмите «Запросить нейросеть»</div>
                )}
            </div>
            <AiVsHumanCharts aiVsHuman={aiVsHuman} pieChartOption={pieChartOption} />
        </>
    )
}

function Header({ count, loading, onRun }) {
    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>🤖 AI vs Человек — детальное сравнение ({count} таблиц)</h3>
                <button onClick={onRun} disabled={loading === 'ai-vs-human'} style={{
                    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: 'white', border: 'none',
                    padding: '8px 16px', borderRadius: 8, fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer', fontSize: '0.85em'
                }}>{loading === 'ai-vs-human' ? '⏳ Спрашиваю...' : '🚀 Запросить нейросеть'}</button>
            </div>
            <div style={{ fontSize: '0.82em', color: '#475569', lineHeight: 1.5, marginBottom: 8 }}>
                <b>📊 Пересечение</b> — объектов в обоих списках (любой порядок). <b>🏆 Точное</b> — 1=1, 2=2, 3=3. <b>🔄 Частичное</b> — в топ-3 обоих, но на другом месте.
            </div>
        </>
    )
}

function SummaryTable({ aiVsHuman, pageData, pageStart, expandedRow, setExpandedRow, getDetails, aiAverages }) {
    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
                <thead>
                    <tr style={{ background: '#6366f1', color: 'white' }}>
                        <th style={{ padding: '8px 6px', textAlign: 'center', width: 30 }}>#</th>
                        <th style={{ padding: '8px 6px', textAlign: 'left' }}>Таблица</th>
                        <th style={{ padding: '8px 6px', textAlign: 'center' }}>Объектов<br/><small>ИИ / Чел.</small></th>
                        <th style={{ padding: '8px 6px', textAlign: 'center' }}>📊 Пересечение</th>
                        <th style={{ padding: '8px 6px', textAlign: 'center' }}>🏆 Точное</th>
                        <th style={{ padding: '8px 6px', textAlign: 'center' }}>🔄 Частичное</th>
                    </tr>
                </thead>
                <tbody>
                    {pageData.map((r, pi) => {
                        const i = pageStart + pi
                        const d = getDetails(r)
                        const isOpen = expandedRow === i
                        const overlapColor = r.match_percent >= 70 ? '#22c55e' : r.match_percent >= 50 ? '#84cc16' : r.match_percent >= 30 ? '#f59e0b' : '#ef4444'
                        return (
                            <React.Fragment key={i}>
                                <tr style={{ background: isOpen ? '#ede9fe' : (pi % 2 ? '#f8fafc' : 'white'), cursor: 'pointer' }}
                                    onClick={() => setExpandedRow(isOpen ? null : i)}>
                                    <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 'bold', color: '#6366f1' }}>{i + 1}</td>
                                    <td style={{ padding: '8px 6px' }}>
                                        <a href={`/#/${r.table_id}`} onClick={e => e.stopPropagation()}
                                           style={{ color: '#4338ca', textDecoration: 'none', fontWeight: 600 }}>{r.table_title}</a>
                                        <span style={{ marginLeft: 6, color: 'inherit', fontSize: '0.8em' }}>{isOpen ? '▲' : '▼'}</span>
                                    </td>
                                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                        <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>{r.ai_count}</span>
                                        <span style={{ color: 'inherit' }}> / </span>
                                        <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{r.human_count}</span>
                                    </td>
                                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                        <span style={{ background: overlapColor, color: 'white', borderRadius: 4, padding: '2px 6px', fontWeight: 'bold' }}>{r.match_percent}%</span>
                                        <br/><small style={{ color: 'inherit' }}>{r.match_count}/{Math.max(r.ai_count, r.human_count)}</small>
                                    </td>
                                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>{posBadge(d.position_match_percent || 0, d.position_match || 0)}</td>
                                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                        <span style={{ background: d.partial_match > 0 ? '#f97316' : '#94a3b8', color: 'white', borderRadius: 4, padding: '2px 6px', fontWeight: 'bold', fontSize: '0.85em' }}>
                                            {d.partial_match_percent || 0}% ({d.partial_match || 0}/3)
                                        </span>
                                    </td>
                                </tr>
                                {isOpen && (
                                    <tr><td colSpan={6} style={{ padding: 0 }}>
                                        <AiVsHumanRowDetail record={r} details={d} />
                                    </td></tr>
                                )}
                            </React.Fragment>
                        )
                    })}
                    {aiAverages && <AveragesRow aiVsHuman={aiVsHuman} aiAverages={aiAverages} />}
                </tbody>
            </table>
        </div>
    )
}

function AveragesRow({ aiVsHuman, aiAverages }) {
    const a = aiAverages
    const cellStyle = { padding: '8px 6px', textAlign: 'center' }
    return (
        <tr style={{ background: '#6366f1', color: 'white', fontWeight: 'bold' }}>
            <td style={cellStyle}>📊</td>
            <td style={{ padding: '8px 6px' }}>СРЕДНЕЕ ({aiVsHuman.length} таблиц)</td>
            <td style={cellStyle}>{a.avgAiCount} / {a.avgHumanCount}</td>
            <td style={cellStyle}>
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '2px 6px' }}>{a.avgOverlap}%</span>
                <br/><small>{a.avgOverlapCount}/{a.avgMax}</small>
            </td>
            <td style={cellStyle}>
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '2px 6px' }}>{a.avgExact}%</span>
                <br/><small>{a.avgExactN}/3</small>
            </td>
            <td style={cellStyle}>
                <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '2px 6px' }}>{a.avgPartial}%</span>
                <br/><small>{a.avgPartialN}/3</small>
            </td>
        </tr>
    )
}

function Pagination({ page, setPage, totalPages }) {
    const window = 3
    let start = Math.max(0, page - window)
    let end = Math.min(totalPages, page + window + 1)
    if (end - start < window * 2 + 1) { if (start === 0) end = Math.min(totalPages, window * 2 + 1); else start = Math.max(0, totalPages - window * 2 - 1) }
    const pages = Array.from({ length: end - start }, (_, i) => start + i)
    const btnStyle = (active, disabled = false) => ({
        padding: '6px 12px', border: `1px solid ${active ? '#6366f1' : '#e2e8f0'}`, borderRadius: 6,
        background: active ? '#6366f1' : 'white', color: active ? 'white' : '#334155',
        fontWeight: active ? 'bold' : 'normal', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1, fontSize: '0.85em', minWidth: 36
    })
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 12 }}>
            <button disabled={page === 0} onClick={() => setPage(0)} style={btnStyle(false, page === 0)}>⟨⟨</button>
            <button disabled={page === 0} onClick={() => setPage(page - 1)} style={btnStyle(false, page === 0)}>⟨</button>
            {start > 0 && <span style={{ padding: '0 4px', color: 'inherit' }}>…</span>}
            {pages.map(p => (<button key={p} onClick={() => setPage(p)} style={btnStyle(p === page)}>{p + 1}</button>))}
            {end < totalPages && <span style={{ padding: '0 4px', color: 'inherit' }}>…</span>}
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} style={btnStyle(false, page >= totalPages - 1)}>⟩</button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} style={btnStyle(false, page >= totalPages - 1)}>⟩⟩</button>
            <span style={{ marginLeft: 8, fontSize: '0.8em', color: 'inherit' }}>Стр. {page + 1} из {totalPages}</span>
        </div>
    )
}
