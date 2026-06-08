import React from 'react'
import { EChart } from '../chartHelpers'
import { buildPartialAnalysis } from './aiVsHumanUtils.jsx'

export default function AiVsHumanCharts({ aiVsHuman, pieChartOption }) {
    const partialAnalysis = buildPartialAnalysis(aiVsHuman)

    return (
        <>
            {pieChartOption && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <ChartTitle number="1">Распределение позиционного совпадения лидеров</ChartTitle>
                    <div style={{ fontSize: '0.82em', color: 'inherit', marginBottom: 8 }}>У скольких таблиц все 3 позиции совпали.</div>
                    <EChart option={pieChartOption} style={{ height: 300 }} />
                </div>
            )}

            {partialAnalysis && partialAnalysis.tablesAffected > 0 && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <ChartTitle number="2">Неполные совпадения ({partialAnalysis.tablesAffected} таблиц, {partialAnalysis.total} пар)</ChartTitle>
                    <PartialCounts counts={partialAnalysis.counts} />
                    <PartialTable tableStats={partialAnalysis.tableStats} />
                </div>
            )}
        </>
    )
}

function ChartTitle({ number, children }) {
    return (
        <div style={{ fontWeight: 'bold', fontSize: '1em', marginBottom: 8 }}>
            <span style={{ background: '#6366f1', color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: '0.85em', marginRight: 8 }}>{number}</span>
            {children}
        </div>
    )
}

function PartialCounts({ counts }) {
    const labels = { url: '🔗 URL vs Название', substring: '📝 Подстрока', semantic: '🔢 Семантика', words: '🔤 Пересечение слов' }
    const colors = { url: '#3b82f6', substring: '#f59e0b', semantic: '#06b6d4', words: '#8b5cf6' }
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 12 }}>
            {Object.entries(counts).map(([type, count]) => (
                <div key={type} style={{ background: colors[type] + '15', border: `1px solid ${colors[type]}40`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9em', color: colors[type] }}>{labels[type] || type}</div>
                    <div style={{ fontSize: '1.4em', fontWeight: 800, color: colors[type] }}>{count}</div>
                </div>
            ))}
        </div>
    )
}

function PartialTable({ tableStats }) {
    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82em' }}>
                <thead><tr style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '6px 8px', textAlign: 'center', width: 30 }}>№</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Таблица</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Совп.</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Пар</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Примеры</th>
                </tr></thead>
                <tbody>
                    {tableStats.map((t, i) => (
                        <tr key={i} style={{ background: i % 2 ? '#fafafa' : 'white' }}>
                            <td style={{ padding: '6px 8px', textAlign: 'center', color: 'inherit' }}>{t.idx}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.table}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                <span style={{ background: t.matchPercent >= 50 ? '#22c55e20' : '#ef444420', color: t.matchPercent >= 50 ? '#22c55e' : '#ef4444', borderRadius: 4, padding: '1px 6px' }}>{t.matchPercent}%</span>
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', color: '#8b5cf6' }}>{t.pairs.length}</td>
                            <td style={{ padding: '6px 8px', fontSize: '0.8em' }}>
                                {t.pairs.slice(0, 2).map((p, j) => (
                                    <div key={j} style={{ marginBottom: 2 }}>
                                        <span style={{ color: '#7c3aed' }}>{p.ai}</span> ≈ <span style={{ color: '#3b82f6' }}>{p.human}</span> <span style={{ color: 'inherit', fontSize: '0.85em' }}>({p.type})</span>
                                    </div>
                                ))}
                                {t.pairs.length > 2 && <span style={{ color: 'inherit', fontSize: '0.8em' }}>+{t.pairs.length - 2} ещё</span>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
