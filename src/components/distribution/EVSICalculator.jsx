import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import NormalTab from './NormalTab.jsx';
import EmpiricalTab from './EmpiricalTab.jsx';

export default function EVSICalculator({ tables }) {
    const [tab, setTab] = useState('empirical');
    const { theme } = useApp(); const D = theme === 'dark';

    const validTables = (tables || []).filter(t => t.scores && t.scores.length > 2);
    const baseSamples = validTables.reduce((a, t) => a + t.scores.length, 0);
    const allScores = validTables.flatMap(t => t.scores).sort((a, b) => a - b);
    const N = allScores.length;

    const ts = (t) => ({
        padding: '10px 22px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
        borderBottom: tab === t ? '3px solid #059669' : '3px solid transparent',
        color: tab === t ? '#059669' : (D ? '#d1d5db' : '#374151'),
        background: tab === t ? (D ? '#1f2937' : '#f9fafb') : 'transparent',
        borderTopLeftRadius: 8, borderTopRightRadius: 8,
    });

    return (
        <div style={{ background: D ? '#1e293b' : '#fff', padding: 24, borderRadius: 12, border: `1px solid ${D ? '#374151' : '#e5e7eb'}`, marginTop: 40 }}>
            <h3 style={{ margin: 0, color: D ? '#ffffff' : '#000000', fontSize: 17 }}>5. Оптимальная точка остановки поиска (EVSI)</h3>
            <p style={{ margin: '4px 0 16px', fontSize: 13, color: D ? '#d1d5db' : '#374151' }}>Когда затраты на поиск превышают ожидаемую пользу — пора останавливаться.</p>
            <div style={{ display: 'flex', borderBottom: `1px solid ${D ? '#374151' : '#e5e7eb'}`, marginBottom: 16, gap: 4 }}>
                <div style={ts('normal')} onClick={() => setTab('normal')}>📈 Параметрический (Normal)</div>
                <div style={ts('empirical')} onClick={() => setTab('empirical')}>📊 Эмпирический (Order Stats)</div>
            </div>
            {tab === 'normal' ? <NormalTab allScores={allScores} N={N} /> : <EmpiricalTab allScores={allScores} N={N} />}
            <div style={{ marginTop: 12, fontSize: 12, color: D ? '#d1d5db' : '#374151', textAlign: 'center', paddingTop: 8, borderTop: `1px solid ${D ? '#374151' : '#e5e7eb'}` }}>
                {baseSamples} вариантов из {validTables.length} таблиц. {baseSamples >= 30 ? '✅ Статистически значимая выборка' : '⚠️ Низкая достоверность'}
            </div>
        </div>
    );
}
