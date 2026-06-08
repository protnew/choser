import React from 'react'
import { useDecisionData } from './decision/useDecisionData'
import AiVsHumanTable from './decision/AiVsHumanTable'
import InteractiveSimplification from './decision/InteractiveSimplification'

export default function DecisionTab() {
    const {
        aiVsHuman, sensitivity, loading, error,
        interParams, interResult, interLoading,
        setInterParams, setAutoRun, runAiVsHuman, runSensitivity, runInteractive, getDetails
    } = useDecisionData()

    return (
        <div style={{ padding: '16px', maxWidth: '1100px' }}>
            <h2 style={{ fontSize: '1.3em', marginBottom: '16px' }}>🎯 Правильные решения — аналитика качества принятия решений</h2>
            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: 8, borderRadius: 8, marginBottom: 12, fontSize: '0.9em' }}>{error}</div>}

            <AiVsHumanTable aiVsHuman={aiVsHuman} loading={loading} runAiVsHuman={runAiVsHuman} getDetails={getDetails} />

            <InteractiveSimplification
                interParams={interParams} setInterParams={setInterParams}
                interResult={interResult} interLoading={interLoading}
                runInteractive={runInteractive} setAutoRun={setAutoRun}
            />

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 20, marginTop: 20 }}>
                <h3 style={{ margin: '0 0 8px 0' }}>📊 Чувствительность лидеров</h3>
                <div style={{ fontSize: '0.85em', lineHeight: 1.6, color: '#334155' }}>
                    <b>Что меняется при упрощении:</b><br/>
                    🟢 <b>Лёгкое:</b> ½ параметров + без весов + 1–3 балла<br/>
                    🟡 <b>Среднее:</b> ½ параметров + без весов + бинарная оценка<br/>
                    🔴 <b>Радикальное:</b> топ-2 параметра + без весов + 1–3 балла<br/>
                    <b>Оригинал:</b> все параметры + с весами + 1–10
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                    <button onClick={runSensitivity} disabled={loading === 'sensitivity'} style={{
                        background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none',
                        padding: '8px 16px', borderRadius: 8, fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer', fontSize: '0.85em'
                    }}>{loading === 'sensitivity' ? '⏳ Считаю...' : '🔄 Пересчитать'}</button>
                    {sensitivity && <span style={{ fontSize: '0.82em', color: 'inherit' }}>Анализ: {sensitivity.analyzed} из {sensitivity.totalTables} таблиц</span>}
                </div>
            </div>
        </div>
    )
}
