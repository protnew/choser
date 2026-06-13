import React from 'react';

export default function GridToolbar({
    meta, theme, ebmData, showEbmTab, ebmMode, isHome, isDirty, saving, exportingPNG,
    tableSearch, setTableSearch, textWrapped, isWidthOptimized, isOptimalActive, autoHeight,
    setEbmMode, setShowEbmTab, onAddRow, onAddCol, onSave, onDeleteSelected, onDeleteTable,
    onExportToPNG, toggleTextWrap, autoSizeCols, optimizeView, setAutoHeight,
    setShowHistory, showHistory, gridApi, tableId, setShowCouncil, isEmbed, cols
}) {
    if (!tableId || !meta || isEmbed) return null;

    const totalWeight = Math.round((cols || []).reduce((sum, col) => sum + (Number(col.weight) || 0), 0));
    const weightIs100 = totalWeight === 100;

    return (
        <div style={{ padding: '4px 8px', borderBottom: '1px solid #1e293b33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '8px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                <h2 style={{ margin: '0 8px 0 0', fontSize: '15px', fontWeight: '600', color: theme === 'dark' ? '#f8fafc' : '#1e293b' }}>{meta.title}</h2>
                
                {ebmData && (
                    <div 
                        onClick={() => { setEbmMode('table'); setShowEbmTab(true); }}
                        title="Посмотреть подробный математический расчет по выборке"
                        style={{ ...ebmData.style, padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'transform 0.1s' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <span>{ebmData.icon}</span>
                        <span>{ebmData.title}</span>
                    </div>
                )}
                
                {ebmData && !showEbmTab && (
                    <button onClick={() => { setEbmMode('table'); setShowEbmTab(true); }} className="tbtn" title="EBM">📈 Математика EBM</button>
                )}
                {ebmData && !showEbmTab && (
                    <button onClick={() => { setEbmMode('global'); setShowEbmTab(true); }} className="tbtn" title="Global">🌍 EBM Global</button>
                )}
                {ebmData && !showEbmTab && (
                    <button onClick={() => { setEbmMode('bayesian'); setShowEbmTab(true); }} className="tbtn" title="Байес/MC">🧪 Байес/MC</button>
                )}
                
                {!isHome && !showEbmTab && (
                    <input type="text" placeholder="🔍 Поиск по таблице..." value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${theme === 'dark' ? '#475569' : '#cbd5e1'}`, background: theme === 'dark' ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)', color: theme === 'dark' ? '#f8fafc' : '#0f172a', fontSize: '12px', width: '160px', outline: 'none' }}
                    />
                )}

                {showEbmTab && (
                    <button onClick={() => { setShowEbmTab(false); setEbmMode(null); }} className="tbtn active">📊 Таблица</button>
                )}
                {showEbmTab && ebmMode !== 'global' && (
                    <button onClick={() => setEbmMode('global')} className="tbtn">🌍 Global</button>
                )}
                {showEbmTab && ebmMode !== 'table' && (
                    <button onClick={() => setEbmMode('table')} className="tbtn">📊 EBM таблица</button>
                )}
                {showEbmTab && ebmMode !== 'bayesian' && (
                    <button onClick={() => setEbmMode('bayesian')} className="tbtn">🧪 Байес/MC</button>
                )}
                
                {!showEbmTab && <button onClick={onAddRow} className="tbtn">+ Строка</button>}
                {!showEbmTab && <button onClick={onAddCol} className="tbtn">+ Колонка</button>}
                {!isHome && !showEbmTab && (
                    <button onClick={() => setShowCouncil(true)} className="tbtn btn-ai-glow" title="Запустить Совет AI-агентов">🏛️ Совет</button>
                )}
                <button onClick={() => { setShowHistory(!showHistory); }} className={`tbtn ${showHistory ? 'tbtn-blue' : ''}`}>🕒 История</button>
                {isDirty && <span style={{ color: theme === 'dark' ? '#fcd34d' : '#ea580c', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', background: theme === 'dark' ? '#78350f' : '#ffedd5', padding: '2px 6px', borderRadius: '4px' }}>⚠️ {isDirty ? 'Сохранить' : ''}</span>}
                {cols && cols.length > 0 && !showEbmTab && !isHome && (
                    <span style={{ 
                        fontSize: '12px', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        background: weightIs100 ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.2)',
                        color: weightIs100 ? '#166534' : '#854d0e',
                        fontWeight: '500'
                    }} title="Сумма весов всех параметров (оптимально 100%)">
                        Вес: {totalWeight}%
                    </span>
                )}
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                <button onClick={() => gridApi?.exportDataAsCsv()} className="tbtn tbtn-blue" title="CSV">CSV</button>
                <button
                    onClick={() => {
                        const tid = window.location.pathname.split('/table/')[1];
                        if (!tid) { alert('Откройте таблицу'); return; }
                        const token = localStorage.getItem('choser_token');
                        fetch(`/api/tables/${tid}/export/xlsx`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
                        .then(r => { if (!r.ok) throw new Error('Ошибка: ' + r.status); return r.blob(); })
                        .then(blob => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = (meta?.title || 'table').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_') + '.xlsx';
                            a.click(); URL.revokeObjectURL(url);
                        }).catch(e => alert('Ошибка: ' + e.message));
                    }}
                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', fontWeight: 600 }}
                    title="Excel"
                >📊 Excel</button>
                <button onClick={onExportToPNG} disabled={exportingPNG} className="tbtn tbtn-success" title="Картинка">
                    {exportingPNG ? '📸 Генерация...' : '📸 Картинка'}
                </button>
                <button onClick={() => toggleTextWrap()} className={`tbtn ${textWrapped ? 'active' : ''}`} title="Перенос текста">↵ Текст</button>
                <button onClick={() => autoSizeCols()} className={`tbtn ${isWidthOptimized ? 'active' : ''}`} title="Ширина">↔ Ширина</button>
                <button onClick={optimizeView} className={`tbtn ${isOptimalActive ? 'active' : ''}`} title="Оптимально">✨ Оптимально ↔️↕️</button>
                {!isHome && <button onClick={onDeleteSelected} className="tbtn" style={{ color: '#ef4444' }} title="Удалить строки">🗑️ Удалить</button>}
                <button onClick={() => setAutoHeight(!autoHeight)} className="tbtn" title={autoHeight ? "Свернуть" : "Раскрыть"}>
                    {autoHeight ? '↕️ Свернуть' : '↕️ Раскрыть'}
                </button>
                <button onClick={onSave} disabled={saving} className={`tbtn ${isDirty ? 'tbtn-success' : ''}`} style={{ fontWeight: isDirty ? 'bold' : 'normal' }}>
                    {saving ? '⏳ Сохранение...' : '💾 Сохранить'}
                </button>
                {!isHome && <button onClick={() => onDeleteTable(tableId)} className="tbtn" style={{ color: '#ef4444' }} title="Удалить таблицу">🗑️ Таблицу</button>}
            </div>
        </div>
    );
}
