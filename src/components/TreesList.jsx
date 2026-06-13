import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

export default function TreesList() {
    const navigate = useNavigate();
    const { theme } = useApp();
    const isDark = theme === 'dark';

    const trees = [
        {
            id: 'proxi',
            title: 'Proxi Messenger Architecture',
            desc: 'Магистральное дерево решений децентрализованного мессенджера. Показывает победителей на 4 ветвях (Платформа, Топология, Криптография, Клиент).',
            decisions: 108,
            tables: 35,
            icon: '🛡️'
        },
        {
            id: 'choser',
            title: 'Choser Engine Architecture',
            desc: 'Архитектурные развилки самого движка Choser (Cloudflare Stack, Hono, D1, Drizzle, React).',
            decisions: 45,
            tables: 16,
            icon: '🧠'
        }
    ];

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>🌳 Деревья Решений (Winning Paths)</h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Выберите магистральное дерево проекта для визуализации зависимостей и принятых решений.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                {trees.map(tree => (
                    <div 
                        key={tree.id}
                        onClick={() => navigate(`/trees/${tree.id}`)}
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            padding: '24px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = isDark ? '0 12px 24px rgba(0,0,0,0.4)' : '0 12px 24px rgba(0,0,0,0.1)';
                            e.currentTarget.style.borderColor = '#10b981';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ fontSize: '40px', background: isDark ? '#1e293b' : '#f1f5f9', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
                                {tree.icon}
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{tree.title}</h3>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                                    <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>{tree.tables} матриц</span>
                                    <span style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>{tree.decisions} развилок</span>
                                </div>
                            </div>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, flex: 1 }}>
                            {tree.desc}
                        </p>
                        <button style={{ 
                            background: 'transparent', 
                            border: '1px solid var(--border)', 
                            color: 'var(--text)', 
                            padding: '10px', 
                            borderRadius: '8px',
                            fontWeight: '500',
                            marginTop: 'auto'
                        }}>
                            Открыть граф →
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
