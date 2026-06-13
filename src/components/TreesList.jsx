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
            desc: 'Магистральное дерево решений децентрализованного мессенджера. Показывает победителей на 5 ветвях.',
            decisions: 108,
            tables: 35,
            quality: 100,
            icon: '🛡️'
        },
        {
            id: 'choser',
            title: 'Choser Engine Architecture',
            desc: 'Архитектурные развилки самого движка Choser (Cloudflare Stack, Hono, D1, Drizzle, React).',
            decisions: 45,
            tables: 16,
            quality: 100,
            icon: '🧠'
        }
    ];

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>🌳 Деревья Решений (Winning Paths)</h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Магистральные пути развития архитектуры проектов.</p>
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)' }}>
                <thead style={{ background: isDark ? '#334155' : '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                    <tr>
                        <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Название</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Описание</th>
                        <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Развилок</th>
                        <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Глуб. Матриц</th>
                        <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Готовность</th>
                        <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Действие</th>
                    </tr>
                </thead>
                <tbody>
                    {trees.map(t => (
                        <tr 
                            key={t.id} 
                            style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', cursor: 'pointer' }} 
                            onClick={() => navigate(`/trees/${t.id}`)}
                            onMouseEnter={e => e.currentTarget.style.background = isDark ? '#334155' : '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '24px', background: isDark ? '#0f172a' : '#fff', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid var(--border-color)' }}>{t.icon}</span>
                                <span style={{ fontWeight: '600', color: 'var(--primary-color)', fontSize: '16px' }}>{t.title}</span>
                            </td>
                            <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '300px', lineHeight: '1.5' }}>{t.desc}</td>
                            <td style={{ padding: '16px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>{t.decisions}</td>
                            <td style={{ padding: '16px', textAlign: 'center', fontWeight: 'bold', color: '#10b981', fontSize: '15px' }}>{t.tables}</td>
                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                <div style={{ background: isDark ? '#0f172a' : '#e2e8f0', borderRadius: '6px', height: '20px', width: '120px', overflow: 'hidden', margin: '0 auto', position: 'relative' }}>
                                    <div style={{ background: '#10b981', width: `${t.quality}%`, height: '100%', transition: 'width 1s' }}></div>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{t.quality}% DONE</div>
                                </div>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                <button className="tbtn tbtn-blue" style={{ padding: '6px 14px', margin: 0 }}>Открыть граф →</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
