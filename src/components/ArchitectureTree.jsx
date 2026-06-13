import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import TreeVizSelector from './viz/TreeVizSelector';

/**
 * ArchitectureTree — страница дерева решений.
 * Делегирует рендеринг в TreeVizSelector (7 типов визуализации).
 * Данные загружаются из API (реальные таблицы Choser).
 */
export default function ArchitectureTree() {
    const { theme } = useApp();
    const { id } = useParams();
    const navigate = useNavigate();

    const isDark = theme === 'dark';
    const bg = isDark ? '#0f172a' : '#f8fafc';
    const tM = isDark ? '#e2e8f0' : '#1e293b';
    const brd = isDark ? '#334155' : '#e2e8f0';

    const rootName = id === 'choser' ? 'Choser EDP' : id === 'proxi' ? 'Proxi Messenger' : 'Choser EDP';

    function handleSelectTable(tableId) {
        navigate(`/table/${tableId}`);
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: bg, color: tM,
        }}>
            {/* HEADER */}
            <div style={{
                padding: '12px 20px', borderBottom: `1px solid ${brd}`,
                display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
            }}>
                <button
                    onClick={() => navigate('/trees')}
                    style={{
                        padding: '4px 12px', borderRadius: 6, fontSize: 13,
                        border: `1px solid ${brd}`, background: bg, color: tM, cursor: 'pointer',
                    }}
                >
                    ← Назад
                </button>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                    🌳 Дерево решений — {rootName}
                </h2>
            </div>

            {/* TREE VISUALIZATION */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <TreeVizSelector
                    rootName={rootName}
                    onSelectTable={handleSelectTable}
                />
            </div>
        </div>
    );
}
