import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useApp } from '../contexts/AppContext';

export default function ArchitectureTree() {
    const { theme } = useApp();
    const isDark = theme === 'dark';
    const [showRejected, setShowRejected] = useState(false);

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

    // Helper for rejected nodes
    const rejNode = (name, title) => ({
        name: title,
        winnerName: name,
        isRejected: true,
        value: 50,
        itemStyle: { color: isDark ? '#334155' : '#f1f5f9', borderColor: '#ef4444', borderWidth: 2, borderType: 'dashed' },
        lineStyle: { color: '#ef4444', width: 1, type: 'dashed' }
    });

    const getTreeData = (showRej) => {
        const childrenOfPlatform = [
            winNode('T31: Backend', '🏆 Go (Golang)', 13, 10, 100),
            winNode('T35: UI Framework', '🏆 Svelte + Flutter', 10, 10, 100)
        ];
        if (showRej) {
            childrenOfPlatform.push(
                rejNode('T31: Backend', '❌ Rust (Долгая компиляция)'),
                rejNode('T31: Backend', '❌ Node.js (Слабая многопоточность)'),
                rejNode('T35: UI Framework', '❌ React Native (Проблемы с JNI)')
            );
        }

        const childrenOfMultiplexer = [
            {
                ...winNode('T8: Transport Layer', '🏆 XTLS / Hysteria 2', 10, 10, 0),
                children: [
                    winNode('T6: Relay Hosting', '🏆 VPS + Cloudflare', 3, 5, null, true),
                    winNode('T5: CI/CD', '🏆 GH Actions', 3, 4, null, true)
                ]
            }
        ];
        if (showRej) {
            childrenOfMultiplexer.push(rejNode('T8: Transport', '❌ OpenVPN (Устарело)'));
        }

        const childrenOfTopology = [
            {
                ...winNode('T30: Multiplexer', '🏆 sing-box + libp2p', 12, 10, 100),
                children: childrenOfMultiplexer
            }
        ];
        if (showRej) {
            childrenOfTopology.push(
                rejNode('T30: Multiplexer', '❌ Xray-core (Нет нативного TUN)'),
                rejNode('T30: Multiplexer', '❌ Свой с нуля (Годы разработки)')
            );
        }

        const childrenOfStorage = [
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
        ];
        if (showRej) {
            childrenOfStorage.push(
                rejNode('T20: Streaming', '❌ WebRTC (Плохо через NAT)'),
                rejNode('T37: Storage', '❌ IPFS (Слишком тяжелый)')
            );
        }

        return {
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
                    children: childrenOfPlatform
                },
                {
                    name: '2. Network',
                    winnerName: 'Topology',
                    itemStyle: { color: '#10b981' },
                    lineStyle: { color: '#10b981', width: 3 },
                    children: [
                        {
                            ...winNode('T34: General Topology', '🏆 P2P + AutoRelay', 13, 10, 100),
                            children: childrenOfTopology
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
                            children: childrenOfStorage
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
    };

    const treeData = useMemo(() => getTreeData(showRejected), [showRejected, isDark]);

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
                left: '10%',
                bottom: '5%',
                right: '25%',
                roam: true, // Позволяет зумировать и панорамировать
                symbolSize: (value, params) => {
                    const d = params.data;
                    if (d.isRejected) return 10;
                    if (!d.params) return 14;
                    return Math.max(14, d.params * 1.5);
                },
                edgeShape: 'polyline', // Делаем угловатые связи для инженерного вида
                edgeForkPosition: '63%',
                initialTreeDepth: 2, // Сворачиваем дерево по умолчанию, чтобы не было наложения
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
                        let html = `{title|${d.winnerName}}\n{${d.isRejected ? 'rejected' : 'winner'}|${d.name}}`;
                        if (d.params) {
                            html += `\n{stats|${d.params} params • ${d.objs} objs}`;
                        }
                        if (d.isRejected) {
                            html += `\n{barRej|ОТКЛОНЕНО}`;
                        } else if (d.quality !== undefined && d.quality !== null) {
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
                        rejected: {
                            fontSize: 13,
                            color: '#ef4444',
                            textDecoration: 'line-through',
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
                        },
                        barRej: {
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
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
    const primaryPrompt = id === 'choser' 
        ? 'Задача: Спроектировать отказоустойчивую архитектуру для платформы Choser с фокусом на Edge Computing, Cloudflare Workers и SQLite-в-браузере.'
        : 'Первичный промпт (Цель): Спроектировать децентрализованный мессенджер с гибридной P2P-топологией, встроенным туннелированием (обход блокировок) и криптографией уровня Signal, оптимизированный под работу в агрессивных сетях.';

    return (
        <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', maxWidth: '60%' }}>
                    <button 
                        onClick={() => navigate('/trees')} 
                        className="tbtn"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}
                    >
                        ← К списку
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--text-color)' }}>{treeTitle}</h2>
                        <div style={{ margin: '12px 0 0 0', padding: '12px 16px', background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', borderLeft: '4px solid #3b82f6', borderRadius: '4px', fontSize: '13px', color: 'var(--text-color)', lineHeight: '1.5' }}>
                            <strong>🎯 {primaryPrompt}</strong>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <button 
                            className={`tbtn ${!showRejected ? 'active' : ''}`} 
                            style={{ margin: 0, background: !showRejected ? '#10b981' : 'transparent', color: !showRejected ? '#fff' : 'var(--text-muted)', border: 'none' }}
                            onClick={() => setShowRejected(false)}
                        >
                            Магистраль Победителей
                        </button>
                        <button 
                            className={`tbtn ${showRejected ? 'active' : ''}`} 
                            style={{ margin: 0, background: showRejected ? 'var(--bg-main)' : 'transparent', color: showRejected ? '#ef4444' : 'var(--text-muted)', border: 'none' }}
                            onClick={() => setShowRejected(true)}
                        >
                            Показать отброшенные
                        </button>
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
            
            <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: isDark ? '0 10px 25px rgba(0,0,0,0.5)' : '0 4px 6px rgba(0,0,0,0.05)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '16px', background: 'var(--bg-main)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 2 }}></div> Готова</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: 2 }}></div> В очереди</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 12, height: 12, background: '#64748b', borderRadius: 2 }}></div> Inherited</div>
                    {showRejected && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 2 }}></div> Отброшена</div>}
                </div>
                
                <ReactECharts 
                    option={option} 
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                />
            </div>
        </div>
    );
}
