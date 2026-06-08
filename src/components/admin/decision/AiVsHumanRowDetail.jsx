import React from 'react'

export default function AiVsHumanRowDetail({ record, details }) {
    const d = details
    return (
        <div style={{ background: '#faf5ff', padding: 16, borderTop: '2px solid #6366f1' }}>
            <div style={{ marginBottom: 12 }}>
                <b>🏆 Позиционное совпадение:</b>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    {(d.human_top3 || []).map((name, pos) => {
                        const aiName = (d.ai_top3 || [])[pos]
                        const isMatch = aiName && name && aiName.toLowerCase().trim() === name.toLowerCase().trim()
                        return (
                            <div key={pos} style={{ background: isMatch ? '#dcfce7' : '#fee2e2', border: `2px solid ${isMatch ? '#22c55e' : '#ef4444'}`, borderRadius: 8, padding: '6px 10px', minWidth: 140 }}>
                                <div style={{ fontSize: '0.75em', color: 'inherit' }}>{pos + 1}-е место</div>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9em' }}>👤 {name || '—'}</div>
                                <div style={{ fontSize: '0.9em', color: '#7c3aed' }}>🤖 {aiName || '—'}</div>
                                <div style={{ fontSize: '0.75em', fontWeight: 'bold', color: isMatch ? '#22c55e' : '#ef4444' }}>{isMatch ? '✅' : '❌'}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <ObjectList label="🤖 ИИ" count={record.ai_count} objectsJson={record.ai_objects} compareJson={record.human_objects} color="#7c3aed" />
                <ObjectList label="👤 Человек" count={record.human_count} objectsJson={record.human_objects} compareJson={record.ai_objects} color="#3b82f6" />
            </div>
            <div style={{ marginTop: 8, fontSize: '0.8em', color: 'inherit' }}>✅ = объект есть в обоих списках</div>
        </div>
    )
}

function ObjectList({ label, count, objectsJson, compareJson, color }) {
    return (
        <div>
            <b style={{ color }}>{label} ({count}):</b>
            <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 4 }}>
                {(() => { try {
                    const list = JSON.parse(objectsJson)
                    const compareSet = new Set(JSON.parse(compareJson).map(s => s.toLowerCase().trim()))
                    return list.map((name, j) => {
                        const isOv = compareSet.has(name.toLowerCase().trim())
                        return <div key={j} style={{ padding: '2px 6px', fontSize: '0.85em', background: isOv ? '#dcfce7' : 'transparent', borderRadius: 3 }}>
                            • {name} {isOv ? '✅' : ''}
                        </div>
                    })
                } catch { return null } })()}
            </div>
        </div>
    )
}
