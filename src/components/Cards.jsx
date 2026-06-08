import React from 'react';
import { bar } from '../utils/calc';
import { useApp } from '../contexts/AppContext';

export default function Cards({ data, cols, tableId, onCardClick }) {
    const { theme } = useApp();
    const isDark = theme === 'dark';

    if (!data || data.length === 0) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Нет данных</div>;
    }

    return (
        <div className="card-view-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', padding: '16px' }}>
            {data.map((row, idx) => (
                <div
                    key={row.id || idx}
                    className="m-card"
                    onClick={() => !tableId && onCardClick && onCardClick(row.id)}
                    style={{
                        cursor: !tableId ? 'pointer' : 'default',
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        background: isDark ? '#1e293b' : '#fff',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)'; }}
                >
                    <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: `1px solid ${isDark ? '#334155' : '#eee'}`, paddingBottom: '8px' }}>
                        <div className="m-card-title" style={{ fontWeight: 'bold', color: isDark ? '#93c5fd' : '#0056b3' }}>
                            {row.name || row.title || 'Без названия'}
                        </div>
                        <div className="m-card-price" style={{ fontWeight: 'bold', color: '#16a34a' }}>
                            {row.price ? `$${row.price}` : ''}
                        </div>
                    </div>
                    {(row._u > 0 || row._up > 0) && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            {row._u > 0 && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: isDark ? '#1e3a5f' : '#dbeafe', color: isDark ? '#93c5fd' : '#1d4ed8' }}>Польза: {(row._u || 0).toFixed(0)}</span>}
                            {row._up > 0 && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: isDark ? '#064e3b' : '#dcfce7', color: isDark ? '#6ee7b7' : '#166534' }}>U/P: {(row._up || 0).toFixed(2)}</span>}
                        </div>
                    )}
                    <div className="m-card-body" style={{ fontSize: '13px', color: isDark ? '#cbd5e1' : '#444' }}>
                        {cols.map(col => {
                            if (col.key === 'name' || col.key === 'price' || col.key === 'title') return null;
                            const cell = row[col.key];
                            let val = '-';
                            if (cell) val = (typeof cell === 'object' && cell.value) ? cell.value : cell;

                            return (
                                <div key={col.key} className="m-card-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', borderBottom: `1px dashed ${isDark ? '#334155' : '#eee'}`, paddingBottom: '3px' }}>
                                    <span style={{ opacity: 0.7 }}>{col.title}</span>
                                    <span style={{ fontWeight: 500 }}>{val}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
