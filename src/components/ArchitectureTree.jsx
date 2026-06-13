import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useApp } from '../contexts/AppContext';

export default function ArchitectureTree() {
    const { theme } = useApp();
    const isDark = theme === 'dark';

    const treeData = {
        name: 'Proxi Architecture\\n(108 Decisions Total)',
        symbolSize: 15,
        itemStyle: { color: isDark ? '#3b82f6' : '#2563eb' },
        children: [
            {
                name: '1. Platform',
                itemStyle: { color: '#8b5cf6' },
                children: [
                    { name: 'T31: Backend Language\\n🏆 Go (Golang)\\n📊 13 objs, 10 params\\n✅ TABLE (Seeded)', value: 130 },
                    { name: 'T35: UI Framework\\n🏆 Svelte + Flutter\\n📊 10 objs, 10 params\\n✅ TABLE (Seeded)', value: 100 }
                ]
            },
            {
                name: '2. Network & Topology',
                itemStyle: { color: '#10b981' },
                children: [
                    {
                        name: 'T34: General Topology\\n🏆 P2P + AutoRelay\\n📊 13 objs, 10 params\\n✅ TABLE (Seeded)',
                        value: 130,
                        children: [
                            {
                                name: 'T30: Multiplexer\\n🏆 sing-box + libp2p\\n📊 12 objs, 10 params\\n✅ TABLE (Seeded)',
                                value: 120,
                                children: [
                                    {
                                        name: 'T8: Transport Layer\\n🏆 XTLS / Hysteria 2\\n📊 10 objs, 10 params\\n⏳ TABLE (Batch 3)',
                                        value: 100,
                                        itemStyle: { color: '#f59e0b' },
                                        children: [
                                            { name: 'T6: Relay Hosting\\n🏆 VPS + Cloudflare\\n📊 3 objs, 5 params\\n✅ DONE', value: 15, itemStyle: { color: '#64748b' } },
                                            { name: 'T5: CI/CD\\n🏆 GH Actions\\n📊 3 objs, 4 params\\n✅ DONE', value: 12, itemStyle: { color: '#64748b' } }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                name: '3. Content & Economy',
                itemStyle: { color: '#ec4899' },
                children: [
                    {
                        name: 'T37: Distributed Storage\\n🏆 Reed-Solomon\\n📊 10 objs, 10 params\\n⏳ TABLE (Batch 3)',
                        value: 100,
                        itemStyle: { color: '#f59e0b' },
                        children: [
                            { name: 'T20: Streaming Protocol\\n🏆 HLS over P2P\\n📊 10 objs, 10 params\\n⏳ TABLE (Batch 4)', value: 100, itemStyle: { color: '#f59e0b' } },
                            {
                                name: 'T23: Proof-of-Storage\\n🏆 Challenge-Response\\n📊 10 objs, 10 params\\n⏳ TABLE (Batch 4)',
                                value: 100,
                                itemStyle: { color: '#f59e0b' },
                                children: [
                                    {
                                        name: 'T22: Token Ledger\\n🏆 Nostr State Events\\n📊 10 objs, 10 params\\n⏳ TABLE (Batch 4)',
                                        value: 100,
                                        itemStyle: { color: '#f59e0b' },
                                        children: [
                                            { name: 'T25: Payment Gateway\\n🏆 Lightning Network\\n📊 10 objs, 10 params\\n⏳ TABLE (Batch 4)', value: 100, itemStyle: { color: '#f59e0b' } }
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
                itemStyle: { color: '#ef4444' },
                children: [
                    {
                        name: 'T17: Identity & Routing\\n🏆 Kademlia + Nostr\\n📊 12 objs, 10 params\\n✅ TABLE (Seeded)',
                        value: 120,
                        children: [
                            {
                                name: 'T16: E2E Encryption\\n🏆 Noise Protocol\\n📊 10 objs, 10 params\\n⏳ TABLE (Batch 3)',
                                value: 100,
                                itemStyle: { color: '#f59e0b' },
                                children: [
                                    {
                                        name: 'T13: Groups Crypto\\n🏆 Sender Keys\\n📊 10 objs, 10 params\\n⏳ TABLE (Batch 3)',
                                        value: 100,
                                        itemStyle: { color: '#f59e0b' },
                                        children: [
                                            { name: 'T15: Symmetric Crypto\\n🏆 AES-256-GCM\\n📊 4 objs, 5 params\\n✅ DONE', value: 20, itemStyle: { color: '#64748b' } }
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
                itemStyle: { color: '#06b6d4' },
                children: [
                    {
                        name: 'T32: Database Layer\\n🏆 SQLite WAL + FTS5\\n📊 11 objs, 10 params\\n✅ TABLE (Seeded)',
                        value: 110,
                        children: [
                            { name: 'T31: Offline Sync\\n🏆 Service Worker\\n📊 4 objs, 5 params\\n✅ DONE', value: 20, itemStyle: { color: '#64748b' } },
                            { name: 'T30: State Mgmt\\n🏆 Svelte 5 Runes\\n📊 5 objs, 5 params\\n✅ DONE', value: 25, itemStyle: { color: '#64748b' } }
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
            formatter: (params) => {
                const lines = params.data.name.split('\\n');
                let html = `<div style="font-weight:bold;margin-bottom:4px;">${lines[0]}</div>`;
                for(let i=1; i<lines.length; i++) {
                    html += `<div>${lines[i]}</div>`;
                }
                return html;
            }
        },
        series: [
            {
                type: 'tree',
                data: [treeData],
                top: '5%',
                left: '10%',
                bottom: '5%',
                right: '20%',
                symbolSize: (value) => Math.max(Math.min(value / 5, 20), 8),
                edgeShape: 'polyline',
                edgeForkPosition: '63%',
                initialTreeDepth: 5,
                lineStyle: {
                    color: isDark ? '#475569' : '#cbd5e1',
                    width: 2
                },
                label: {
                    position: 'top',
                    verticalAlign: 'middle',
                    align: 'center',
                    fontSize: 12,
                    color: isDark ? '#e2e8f0' : '#1e293b',
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderWidth: 1,
                    borderRadius: 4,
                    padding: [4, 6],
                    formatter: (params) => params.data.name.split('\\n')[0]
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

    // Calculate critical path stats
    const totalDecisions = 108;
    const totalTablesNeeded = 35;
    const seededTables = 5;
    const doneDecisions = 73; // The rest of the 108 decisions that don't need tables
    const tablesToBuild = totalTablesNeeded - seededTables;

    const { id } = useParams();
    const navigate = useNavigate();

    // В будущем здесь можно загружать разные деревья в зависимости от id (proxi, choser и т.д.)
    const treeTitle = id === 'choser' ? 'Архитектурное Дерево (Choser)' : 'Архитектурное Дерево (Proxi Messenger)';

    return (
        <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', background: 'var(--bg)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        onClick={() => navigate('/trees')} 
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        ← К списку
                    </button>
                    <div>
                        <h2 style={{ margin: 0 }}>{treeTitle}</h2>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Визуализация критической магистрали из {totalDecisions} решений</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', background: 'var(--surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>{totalDecisions}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Всего развилок</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{seededTables}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Глубоких матриц</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{tablesToBuild}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Матриц в очереди</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#64748b' }}>{doneDecisions}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Узлов DONE</div>
                    </div>
                </div>
            </div>
            
            <div style={{ flex: 1, background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <ReactECharts 
                    option={option} 
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                />
            </div>
        </div>
    );
}
