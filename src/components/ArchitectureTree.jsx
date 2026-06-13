import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useApp } from '../contexts/AppContext';

export default function ArchitectureTree() {
    const { theme } = useApp();
    const isDark = theme === 'dark';

    // Helper for winning nodes
    const winNode = (name, title, objs, params, quality, isDone = false) => ({
        name: title,
        winnerName: name,
        objs,
        params,
        quality,
        isDone,
        value: 100,
        itemStyle: { color: quality === 100 ? '#10b981' : (isDone ? '#64748b' : '#f59e0b'), borderColor: isDark ? '#1e293b' : '#fff', borderWidth: 2 },
        lineStyle: { color: '#10b981', width: 3 }
    });

    const treeData = {
        name: 'Proxi Architecture',
        winnerName: '108 Decisions',
        symbolSize: 20,
        itemStyle: { color: '#3b82f6' },
        children: [
            {
                name: '1. Platform',
                winnerName: 'Platform',
                itemStyle: { color: '#8b5cf6' },
                lineStyle: { color: '#10b981', width: 3 },
                children: [
                    winNode('T31: Backend', '🏆 Go (Golang)', 13, 10, 100),
                    winNode('T35: UI Framework', '🏆 Svelte + Flutter', 10, 10, 100)
                ]
            },
            {
                name: '2. Network',
                winnerName: 'Topology',
                itemStyle: { color: '#10b981' },
                lineStyle: { color: '#10b981', width: 3 },
                children: [
                    {
                        ...winNode('T34: General Topology', '🏆 P2P + AutoRelay', 13, 10, 100),
                        children: [
                            {
                                ...winNode('T30: Multiplexer', '🏆 sing-box + libp2p', 12, 10, 100),
                                children: [
                                    {
                                        ...winNode('T8: Transport Layer', '🏆 XTLS / Hysteria 2', 10, 10, 0),
                                        children: [
                                            winNode('T6: Relay Hosting', '🏆 VPS + Cloudflare', 3, 5, null, true),
                                            winNode('T5: CI/CD', '🏆 GH Actions', 3, 4, null, true)
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                name: '3. Content',
                winnerName: 'Economy',
                itemStyle: { color: '#ec4899' },
                lineStyle: { color: '#10b981', width: 3 },
                children: [
                    {
                        ...winNode('T37: Storage', '🏆 Reed-Solomon', 10, 10, 0),
                        children: [
                            winNode('T20: Streaming', '🏆 HLS over P2P', 10, 10, 0),
                            {
                                ...winNode('T23: Proof-of-Storage', '🏆 Challenge-Response', 10, 10, 0),
                                children: [
                                    {
                                        ...winNode('T22: Token Ledger', '🏆 Nostr State Events', 10, 10, 0),
                                        children: [
                                            winNode('T25: Payment Gateway', '🏆 Lightning Network', 10, 10, 0)
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                name: '4. Crypto & Trust',
                winnerName: 'Trust',
                itemStyle: { color: '#ef4444' },
                lineStyle: { color: '#10b981', width: 3 },
                children: [
                    {
                        ...winNode('T17: Identity & Routing', '🏆 Kademlia + Nostr', 12, 10, 100),
                        children: [
                            {
                                ...winNode('T16: E2E Encryption', '🏆 Noise Protocol', 10, 10, 0),
                                children: [
                                    {
                                        ...winNode('T13: Groups Crypto', '🏆 Sender Keys', 10, 10, 0),
                                        children: [
                                            winNode('T15: Symmetric Crypto', '🏆 AES-256-GCM', 4, 5, null, true)
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                name: '5. Local Client',
                winnerName: 'Client',
                itemStyle: { color: '#06b6d4' },
                lineStyle: { color: '#10b981', width: 3 },
                children: [
                    {
                        ...winNode('T32: Database Layer', '🏆 SQLite WAL + FTS5', 11, 10, 100),
                        children: [
                            winNode('T31: Offline Sync', '🏆 Service Worker', 4, 5, null, true),
                            winNode('T30: State Mgmt', '🏆 Svelte 5 Runes', 5, 5, null, true)
                        ]
                    }
                ]
            }
        ]
    };

    const option = useMemo(() => ({
        tooltip: {
            trigger: 'item',
            triggerOn: 'mousemove',
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            textStyle: { color: isDark ? '#f8fafc' : '#0f172a' },
            formatter: (params) => {
                const d = params.data;
                return `<strong>${d.winnerName}</strong><br/>${d.name}<br/>${d.params ? d.params + ' params, ' + d.objs + ' objs' : ''}`;
            }
        },
        series: [
            {
                type: 'tree',
                data: [treeData],
                top: '5%',
                left: '12%',
                bottom: '5%',
                right: '20%',
                symbolSize: (value, params) => {
                    const p = params.data.params;
                    if (!p) return 12;
                    return Math.max(12, p * 1.5);
                },
                edgeShape: 'polyline',
                edgeForkPosition: '63%',
                initialTreeDepth: 5,
                lineStyle: {
                    color: isDark ? '#334155' : '#cbd5e1',
                    width: 2
                },
                label: {
                    position: 'top',
                    verticalAlign: 'middle',
                    align: 'center',
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: [8, 12],
                    shadowColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)',
                    shadowBlur: 10,
                    formatter: function(params) {
                        const d = params.data;
                        let html = `{title|${d.winnerName}}\n{winner|${d.name}}`;
                        if (d.params) {
                            html += `\n{stats|${d.params} params • ${d.objs} objs}`;
                        }
                        if (d.quality !== undefined && d.quality !== null) {
                            const barClass = d.quality === 100 ? 'barDone' : 'barPend';
                            html += `\n{${barClass}|${d.quality}% DONE}`;
                        } else if (d.isDone) {
                            html += `\n{barSkip|DONE (Inherited)}`;
                        }
                        return html;
                    },
                    rich: {
                        title: {
                            fontSize: 11,
                            color: isDark ? '#94a3b8' : '#64748b',
                            padding: [0, 0, 4, 0]
                        },
                        winner: {
                            fontSize: 14,
                            fontWeight: 'bold',
                            color: isDark ? '#ffffff' : '#0f172a',
                            padding: [0, 0, 4, 0]
                        },
                        stats: {
                            fontSize: 11,
                            color: isDark ? '#cbd5e1' : '#475569',
                            padding: [4, 0, 8, 0],
                            fontWeight: '500'
                        },
                        barDone: {
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            borderRadius: 4,
                            padding: [4, 8],
                            fontSize: 11,
                            fontWeight: 'bold',
                            align: 'center',
                            width: '100%'
                        },
                        barPend: {
                            backgroundColor: '#f59e0b',
                            color: '#ffffff',
                            borderRadius: 4,
                            padding: [4, 8],
                            fontSize: 11,
                            fontWeight: 'bold',
                            align: 'center',
                            width: '100%'
                        },
                        barSkip: {
                            backgroundColor: isDark ? '#334155' : '#e2e8f0',
                            color: isDark ? '#94a3b8' : '#64748b',
                            borderRadius: 4,
                            padding: [4, 8],
                            fontSize: 11,
                            fontWeight: 'bold',
                            align: 'center',
                            width: '100%'
                        }
                    }
                },
                leaves: {
                    label: {
                        position: 'right',
                        verticalAlign: 'middle',
                        align: 'left'
                    }
                },
                expandAndCollapse: true,
                animationDuration: 550,
                animationDurationUpdate: 750
            }
        ]
    }), [isDark, treeData]);

    const totalDecisions = 108;
    const totalTablesNeeded = 35;
    const seededTables = 5;
    const doneDecisions = 73;
    const tablesToBuild = totalTablesNeeded - seededTables;

    const { id } = useParams();
    const navigate = useNavigate();

    const treeTitle = id === 'choser' ? 'Архитектурное Дерево (Choser)' : 'Архитектурное Дерево (Proxi Messenger)';

    return (
        <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        onClick={() => navigate('/trees')} 
                        className="tbtn"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        ← К списку
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--text-color)' }}>{treeTitle}</h2>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Визуализация критической магистрали из {totalDecisions} решений</p>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '13px', color: 'var(--text-color)', fontWeight: '500' }}>Магистраль Победителей</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#8b5cf6' }}>{totalDecisions}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Всего</div>
                        </div>
                        <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{seededTables}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Готово</div>
                        </div>
                        <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{tablesToBuild}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>В очереди</div>
                        </div>
                        <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#64748b' }}>{doneDecisions}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>DONE</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: isDark ? '0 10px 25px rgba(0,0,0,0.5)' : '0 4px 6px rgba(0,0,0,0.05)' }}>
                <ReactECharts 
                    option={option} 
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                />
            </div>
        </div>
    );
}
