/**
 * Council n8n — альтернативный Совет через n8n workflow
 * НЕ заменяет текущий DecisionPage. Отдельная кнопка "🏛️ n8n Совет".
 * n8n доступен через host.docker.internal:5678
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../utils/api';
import { useApp } from '../contexts/AppContext';

const N8N_BASE = '/n8n-proxy';  // proxied through Choser server

export default function CouncilN8n({ tableId, onClose }) {
    const { theme } = useApp();
    const navigate = useNavigate();
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(tableId || '');
    const [topic, setTopic] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [personas, setPersonas] = useState([]);
    const [mode, setMode] = useState('parallel');
    const [error, setError] = useState(null);
    const [wantTree, setWantTree] = useState(false);
    const scrollRef = useRef(null);
    const abortRef = useRef(null);

    const isDark = theme === 'dark';
    const colors = {
        bg: isDark ? '#0f172a' : '#f8fafc',
        bgCard: isDark ? '#1e293b' : '#ffffff',
        text: isDark ? '#f8fafc' : '#0f172a',
        textMuted: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? '#334155' : '#e2e8f0',
        accent: isDark ? '#60a5fa' : '#3b82f6',
    };

    // Load tables list
    useEffect(() => {
        API.get('/v1/api/tables?limit=1000').then(resp => {
            const data = resp.data || resp || [];
            setTables(data);
        }).catch(e => setError('Не удалось загрузить список таблиц'));
    }, []);

    // Load n8n personas
    useEffect(() => {
        fetch(`${N8N_BASE}/webhook/choser-personas`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setPersonas(Array.isArray(data) ? data : []))
            .catch(() => setPersonas([]));
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSubmit = useCallback(async () => {
        if (!topic.trim() || loading) return;
        setLoading(true);
        setError(null);
        const userMsg = { role: 'user', text: topic, time: new Date().toLocaleTimeString('ru-RU') };
        setMessages(prev => [...prev, userMsg]);

        abortRef.current = new AbortController();

        try {
            const resp = await fetch(`${N8N_BASE}/webhook/choser-council`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topic.trim(),
                    tableId: selectedTable || null,
                    mode,
                }),
                signal: abortRef.current.signal,
            });

            if (!resp.ok) throw new Error(`n8n error: ${resp.status}`);

            const data = await resp.json();
            const agents = Array.isArray(data) ? data : (data.agents || data.responses || [data]);

            for (const agent of agents) {
                const agentMsg = {
                    role: 'agent',
                    name: agent.name || agent.persona || 'Агент',
                    text: agent.response || agent.text || agent.message || '',
                    recommendation: agent.recommendation || agent.verdict || '',
                    time: new Date().toLocaleTimeString('ru-RU'),
                };
                setMessages(prev => [...prev, agentMsg]);
            }

            // Summary if present
            if (data.summary || data.consensus) {
                setMessages(prev => [...prev, {
                    role: 'summary',
                    text: data.summary || (typeof data.consensus === 'object' ? JSON.stringify(data.consensus) : data.consensus),
                    time: new Date().toLocaleTimeString('ru-RU'),
                }]);
            }

            // Decision tree if checkbox is checked
            if (wantTree && topic.trim()) {
                setMessages(prev => [...prev, { role: 'agent', name: 'Дерево решений', text: 'Строим дерево...', time: new Date().toLocaleTimeString('ru-RU'), isPending: true }]);
                try {
                    const treeResp = await fetch('/api/decision-tree', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ topic: topic.trim() }),
                    });
                    const treeData = await treeResp.json();
                    setMessages(prev => prev.filter(m => !m.isPending));
                    if (treeData.tree) {
                        setMessages(prev => [...prev, {
                            role: 'tree',
                            tree: treeData.tree,
                            time: new Date().toLocaleTimeString('ru-RU'),
                        }]);
                    }
                } catch(treeErr) {
                    setMessages(prev => prev.filter(m => !m.isPending));
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                setError(e.message);
                setMessages(prev => [...prev, {
                    role: 'error',
                    text: `n8n не отвечает. Проверьте workflow на http://localhost:5678`,
                    time: new Date().toLocaleTimeString('ru-RU'),
                }]);
            }
        } finally {
            setLoading(false);
            abortRef.current = null;
        }
    }, [topic, loading, selectedTable, mode]);

    const handleStop = () => {
        if (abortRef.current) abortRef.current.abort();
        setLoading(false);
    };

    const handleClear = () => {
        setMessages([]);
        setError(null);
    };

    const renderTreeAscii = (node, prefix, isLast) => {
        if (!node) return '';
        if (prefix === '') {
            prefix = '';
            isLast = true;
            var line = node.name + '\n';
        } else {
            var connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ';
            var valStr = node.value ? ' [' + node.value + ']' : '';
            var line = prefix + connector + node.name + valStr + '\n';
            prefix += isLast ? '    ' : '\u2502   ';
        }
        var children = node.children || [];
        for (var i = 0; i < children.length; i++) {
            line += renderTreeAscii(children[i], prefix, i === children.length - 1);
        }
        return line;
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            height: '100%', minHeight: 0,
            background: colors.bg, color: colors.text,
            padding: '12px 16px',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.1em' }}>Совет через n8n</h2>
                    <span style={{ fontSize: '0.7em', color: colors.textMuted }}>
                        Workflow engine: localhost:5678 | {personas.length} агентов доступно
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleClear} className="tbtn" style={{
                        padding: '6px 12px', background: colors.bgCard,
                        border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer', color: colors.text,
                    }}>Очистить</button>
                    {onClose && <button onClick={onClose} className="tbtn" style={{
                        padding: '6px 12px', background: colors.bgCard,
                        border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer', color: colors.text,
                    }}>Закрыть</button>}
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)} style={{
                    padding: '6px 10px', background: colors.bgCard, color: colors.text,
                    border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 13, maxWidth: 300,
                }}>
                    <option value="">Без контекста таблицы</option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <select value={mode} onChange={e => setMode(e.target.value)} style={{
                    padding: '6px 10px', background: colors.bgCard, color: colors.text,
                    border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 13,
                }}>
                    <option value="parallel">Параллельный режим</option>
                    <option value="sequential">Последовательный режим</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: colors.text, cursor: 'pointer' }}>
                    <input type="checkbox" checked={wantTree} onChange={e => setWantTree(e.target.checked)} style={{ width: 16, height: 16, accentColor: colors.accent, cursor: 'pointer' }} />
                    Дерево решений
                </label>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{
                flex: 1, minHeight: 0, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 8,
                padding: 12, background: colors.bgCard,
                border: `1px solid ${colors.border}`, borderRadius: 8,
            }}>
                {messages.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🏛️</div>
                        <div>Опишите решение для анализа через n8n workflow</div>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                    }}>
                        {msg.role === 'user' && (
                            <div style={{
                                background: colors.accent, color: '#fff',
                                padding: '8px 14px', borderRadius: '12px 12px 4px 12px',
                                fontSize: 14,
                            }}>{msg.text}</div>
                        )}
                        {msg.role === 'agent' && (
                            <div style={{
                                background: isDark ? '#334155' : '#f1f5f9', color: colors.text,
                                padding: '8px 14px', borderRadius: '12px 12px 12px 4px',
                                fontSize: 13, border: `1px solid ${colors.border}`,
                            }}>
                                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, color: colors.accent }}>
                                    {msg.name} <span style={{ color: colors.textMuted, fontWeight: 400 }}>{msg.time}</span>
                                </div>
                                <div>{msg.text}</div>
                                {msg.recommendation && (
                                    <div style={{ marginTop: 6, fontWeight: 600, fontSize: 12 }}>
                                        Вердикт: {msg.recommendation}
                                    </div>
                                )}
                            </div>
                        )}
                        {msg.role === 'summary' && (
                            <div style={{
                                background: colors.accent + '20', border: `1px solid ${colors.accent}`,
                                padding: '10px 14px', borderRadius: 8, fontSize: 13,
                                color: colors.text,
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>Итог</div>
                                {msg.text}
                            </div>
                        )}
                        {msg.role === 'tree' && (
                            <div style={{
                                background: isDark ? '#0f172a' : '#f8fafc', color: colors.text,
                                padding: '12px 16px', borderRadius: 8, fontSize: 13,
                                border: `1px solid ${colors.accent}`, fontFamily: 'monospace',
                                whiteSpace: 'pre', overflowX: 'auto', lineHeight: 1.8,
                            }}>
                                <div style={{ fontFamily: 'inherit', fontWeight: 700, marginBottom: 8, color: colors.accent }}>Дерево решений</div>
                                {renderTreeAscii(msg.tree, '', true)}
                            </div>
                        )}
                        {msg.role === 'error' && (
                            <div style={{
                                color: '#dc2626', padding: '8px 14px', fontSize: 13,
                                background: isDark ? '#450a0a' : '#fef2f2',
                                borderRadius: 8, border: '1px solid #dc2626',
                            }}>{msg.text}</div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', color: colors.textMuted, fontSize: 13, padding: 8 }}>
                        n8n workflow выполняется...
                    </div>
                )}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                    placeholder="Опишите решение для анализа..."
                    style={{
                        flex: 1, padding: '10px 14px', background: colors.bgCard, color: colors.text,
                        border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14,
                    }}
                />
                {loading ? (
                    <button onClick={handleStop} className="tbtn" style={{
                        padding: '10px 20px', background: '#dc2626', color: '#fff',
                        border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                    }}>Стоп</button>
                ) : (
                    <button onClick={handleSubmit} className="tbtn" style={{
                        padding: '10px 20px', background: colors.accent, color: '#fff',
                        border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                    }}>Отправить</button>
                )}
            </div>
        </div>
    );
}
