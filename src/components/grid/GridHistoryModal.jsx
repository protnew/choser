import React from 'react';

export default function GridHistoryModal({ versions, loadingVersions, onLoadVersion, onClose, theme }) {
    return (
        <div style={{
            position: 'absolute', top: '50px', left: '20px', width: '300px',
            background: theme === 'dark' ? '#1e293b' : 'white', borderRadius: '8px', zIndex: 1000,
            boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`, display: 'flex', flexDirection: 'column',
            maxHeight: 'calc(100vh - 100px)'
        }}>
            <div style={{ padding: '12px 15px', borderBottom: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme === 'dark' ? '#0f172a' : '#f8fafc', borderRadius: '8px 8px 0 0' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}>История версий</h3>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px' }}>&times;</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '10px' }}>
                {loadingVersions ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'inherit', fontSize: '13px' }}>Загрузка...</div>
                ) : versions.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'inherit', fontSize: '13px' }}>История пуста</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {versions.map((v, i) => (
                            <div key={v.id} style={{
                                padding: '10px',
                                border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
                                borderRadius: '6px',
                                background: i === 0 ? (theme === 'dark' ? '#052e16' : '#f0fdf4') : (theme === 'dark' ? '#1e293b' : 'white'),
                                cursor: 'pointer'
                            }}
                                onClick={() => onLoadVersion(v.id)}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = theme === 'dark' ? '#334155' : '#e2e8f0'}
                            >
                                <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                                    {new Date(v.created_at * 1000).toLocaleString()} {i === 0 && '(Последняя)'}
                                </div>
                                <div style={{ fontSize: '11px', color: 'inherit', marginTop: '2px' }}>
                                    Нажмите, чтобы загрузить эту версию
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
