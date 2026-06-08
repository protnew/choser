import React from 'react';
import { useCouncil } from './council/useCouncil';
import DecisionTags from './DecisionTags';

function roleBadge(role) {
    const map = { advisor: { label: 'Советник', color: '#3b82f6' }, critic: { label: 'Критик', color: '#ef4444' }, editor: { label: 'Редактор', color: '#10b981' }, leader: { label: 'Руководитель', color: '#f59e0b' } };
    const r = map[role] || map.advisor;
    return <span style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4, background: r.color + '20', color: r.color, fontWeight: 600 }}>{r.label}</span>;
}

export default function CouncilPanel({ tableId, onClose }) {
    const { personas, running, result, editing, editForm, setEditForm, togglePersona, startEdit, saveEdit, deletePersona, addPersona, runCouncil, runTestCouncil, setEditing, loaded } = useCouncil(tableId);
    const [numObjects, setNumObjects] = React.useState(3);
    const [numParams, setNumParams] = React.useState(5);
    const isDark = document.body.classList.contains('dark');
    const brd = isDark ? '#334155' : '#e2e8f0';
    const bg = isDark ? '#1e293b' : '#fff';
    const bgI = isDark ? '#0f172a' : '#f8fafc';
    const tM = isDark ? '#f1f5f9' : '#0f172a';
    const tS = isDark ? '#94a3b8' : '#64748b';
    const input = { width: '100%', padding: 8, borderRadius: 4, border: `1px solid ${isDark ? '#475569' : '#d1d5db'}`, background: isDark ? '#1e293b' : '#fff', color: tM, fontSize: 13 };
    const btn = { padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 };

    const [activeTab, setActiveTab] = React.useState('config');
    const [logs, setLogs] = React.useState(null);
    const [expandedLog, setExpandedLog] = React.useState(null);

    const loadLogs = React.useCallback(async () => {
        if (!result?.jobId) return;
        try {
            const token = localStorage.getItem('choser_token');
            const resp = await fetch(`/v1/api/council/decisions/${result.jobId}/logs`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            const data = await resp.json();
            setLogs(data.logs || []);
        } catch (e) { console.error('Failed to load logs', e); }
    }, [result?.jobId]);

    React.useEffect(() => { if (activeTab === 'logs') loadLogs(); }, [activeTab, loadLogs]);

    const hasResult = !!result?.votes;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background: bg, color: tM, borderRadius: 12, width: '90%', maxWidth: 720, maxHeight: '85vh', overflow: 'auto', padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: `1px solid ${brd}`, paddingBottom: 12 }}>
                    <div>
                        <h2 style={{ fontSize: 18, margin: 0 }}>🏛️ Совет AI-агентов</h2>
                        <span style={{ fontSize: 12, color: tS }}>{!loaded ? '⏳ Загрузка...' : `${personas.filter(p => p.enabled).length} из ${personas.length} активно`}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...btn, background: '#8b5cf6', color: '#fff' }} onClick={runTestCouncil} disabled={running || !loaded} title="Тест: Какую LLM-подписку выбрать?">{running ? '⏳...' : '🧪 Тест'}</button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <label style={{ fontSize: 12, color: tS }}>Объекты:</label>
                            <input type="number" min={2} max={20} value={numObjects} onChange={e => setNumObjects(Number(e.target.value))} style={{ ...input, width: 48, padding: '4px 6px', textAlign: 'center' }} />
                            <label style={{ fontSize: 12, color: tS }}>Параметры:</label>
                            <input type="number" min={2} max={20} value={numParams} onChange={e => setNumParams(Number(e.target.value))} style={{ ...input, width: 48, padding: '4px 6px', textAlign: 'center' }} />
                            <button style={{ ...btn, background: '#3b82f6', color: '#fff' }} onClick={() => runCouncil(null, numObjects, numParams)} disabled={running || !loaded}>{running ? '⏳ Советует...' : '🚀 Запустить'}</button>
                        </div>
                        <button style={{ ...btn, background: 'transparent', border: `1px solid ${isDark ? '#475569' : '#d1d5db'}`, color: tS }} onClick={onClose}>✕</button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                    <button style={{ ...btn, ...(activeTab === 'config' ? { background: '#3b82f6', color: '#fff' } : { background: 'transparent', border: `1px solid ${brd}`, color: tS }) }} onClick={() => setActiveTab('config')}>⚙️ Настройка</button>
                    <button style={{ ...btn, ...(activeTab === 'results' ? { background: '#3b82f6', color: '#fff' } : { background: 'transparent', border: `1px solid ${brd}`, color: tS }) }} onClick={() => setActiveTab('results')}>📊 Результат {result?.votes ? `(${result.votes.length})` : ''}</button>
                    {hasResult && <button style={{ ...btn, ...(activeTab === 'logs' ? { background: '#8b5cf6', color: '#fff' } : { background: 'transparent', border: `1px solid ${brd}`, color: tS }) }} onClick={() => setActiveTab('logs')}>🔍 Промпты</button>}
                </div>

                {/* Config */}
                {activeTab === 'config' && <>
                    {!loaded && <div style={{ textAlign: 'center', padding: 20, color: tS }}>⏳ Загрузка персон...</div>}
                    {loaded && personas.map((p, idx) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: `1px solid ${brd}`, marginBottom: 8, background: bgI, opacity: p.enabled ? 1 : 0.5 }}>
                            <span style={{ cursor: 'grab', color: isDark ? '#475569' : '#cbd5e1', fontSize: 16 }}>⠿</span>
                            <span style={{ fontSize: 24 }}>{p.emoji}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <strong style={{ fontSize: 14 }}>{p.name}</strong>
                                    {roleBadge(p.role)}
                                    <span style={{ fontSize: 12, color: tS }}>#{idx + 1} · temp={p.temperature} · w={p.weight}</span>
                                </div>
                                <div style={{ fontSize: 12, color: tS, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.system_prompt?.substring(0, 80)}...</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button style={{ ...btn, fontSize: 16, background: 'transparent', border: 'none' }} onClick={() => togglePersona(p.id, p.enabled)}>{p.enabled ? '✅' : '⬜'}</button>
                                <button style={{ ...btn, background: 'transparent', border: `1px solid ${brd}`, fontSize: 12, color: tS }} onClick={() => editing === p.id ? setEditing(null) : startEdit(p)}>{editing === p.id ? '▲' : '✏️'}</button>
                                <button style={{ ...btn, background: 'transparent', border: 'none', color: '#ef4444', fontSize: 14 }} onClick={() => deletePersona(p.id)}>🗑</button>
                            </div>
                        </div>
                    ))}

                    {editing && (
                        <div style={{ padding: 12, borderRadius: 8, border: `1px solid #3b82f6`, background: bgI, marginBottom: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div><label style={{ fontSize: 12, color: tS }}>Имя</label><input style={input} value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                                <div><label style={{ fontSize: 12, color: tS }}>Emoji</label><input style={input} value={editForm.emoji || ''} onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))} /></div>
                                <div><label style={{ fontSize: 12, color: tS }}>Роль</label><select style={input} value={editForm.role || 'advisor'} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}><option value="advisor">Советник</option><option value="critic">Критик</option><option value="editor">Редактор</option><option value="leader">Руководитель</option></select></div>
                                <div><label style={{ fontSize: 12, color: tS }}>Модель</label><input style={input} value={editForm.model || ''} onChange={e => setEditForm(f => ({ ...f, model: e.target.value }))} /></div>
                                <div><label style={{ fontSize: 12, color: tS }}>Температура</label><input style={input} type="number" step="0.1" min="0" max="2" value={editForm.temperature ?? 0.7} onChange={e => setEditForm(f => ({ ...f, temperature: parseFloat(e.target.value) }))} /></div>
                                <div><label style={{ fontSize: 12, color: tS }}>Вес</label><input style={input} type="number" step="0.1" min="0" max="10" value={editForm.weight ?? 1} onChange={e => setEditForm(f => ({ ...f, weight: parseFloat(e.target.value) }))} /></div>
                            </div>
                            <div style={{ marginTop: 8 }}><label style={{ fontSize: 12, color: tS }}>System Prompt</label><textarea style={{ ...input, minHeight: 80 }} value={editForm.system_prompt || ''} onChange={e => setEditForm(f => ({ ...f, system_prompt: e.target.value }))} /></div>
                            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                <button style={{ ...btn, background: '#3b82f6', color: '#fff' }} onClick={saveEdit}>💾 Сохранить</button>
                                <button style={{ ...btn, background: 'transparent', border: `1px solid ${brd}`, color: tS }} onClick={() => setEditing(null)}>Отмена</button>
                            </div>
                        </div>
                    )}

                    <button style={{ ...btn, background: 'transparent', border: `2px dashed ${brd}`, color: tS, width: '100%', padding: 10 }} onClick={addPersona}>+ Добавить персону</button>
                </>}

                {/* Results */}
                {activeTab === 'results' && <>
                    {running && <div style={{ textAlign: 'center', padding: 40 }}><div style={{ fontSize: 40 }}>⏳</div><div style={{ color: tS, marginTop: 8 }}>Совет обсуждает...</div></div>}
                    {result?.error && <div style={{ padding: 16, background: '#fef2f2', borderRadius: 8, color: '#ef4444' }}>❌ {result.error}</div>}
                    {result?.votes && <>
                        {result.tokens && (result.tokens.input > 0 || result.tokens.output > 0) && (
                            <div style={{ display: 'flex', gap: 12, padding: '8px 12px', borderRadius: 6, background: bgI, border: `1px solid ${brd}`, marginBottom: 12, fontSize: 12 }}>
                                <span style={{ color: tS }}>🔢 Токены:</span>
                                <span>вход <strong style={{ color: '#3b82f6' }}>{result.tokens.input.toLocaleString()}</strong></span>
                                <span>выход <strong style={{ color: '#10b981' }}>{result.tokens.output.toLocaleString()}</strong></span>
                                <span style={{ color: tS }}>итого <strong>{(result.tokens.input + result.tokens.output).toLocaleString()}</strong></span>
                            </div>
                        )}
                        {result.votes.map((v, i) => (
                            <div key={i} style={{ padding: 14, borderRadius: 8, border: `1px solid ${brd}`, marginBottom: 8, background: bgI }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{v.emoji} {v.name} {roleBadge(v.role)}</div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        {v.tokens && (v.tokens.input > 0 || v.tokens.output > 0) && <span style={{ fontSize: 12, color: tS, background: bg, padding: '1px 5px', borderRadius: 3 }}>↑{v.tokens.input} ↓{v.tokens.output}</span>}
                                        <span style={{ fontSize: 12, color: tS }}>{v.score != null ? `Score: ${v.score}/100` : ''}{v.confidence != null ? ` · Ув: ${v.confidence}/10` : ''}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{v.response}</div>
                                {v.recommendation && <div style={{ marginTop: 4, fontSize: 12, color: '#3b82f6' }}>→ {v.recommendation}</div>}
                            </div>
                        ))}
                        {result.editorSummary && (
                            <div style={{ padding: 16, borderRadius: 8, marginTop: 12, background: `linear-gradient(135deg, ${isDark ? '#052e16' : '#f0fdf4'}, ${isDark ? '#1e293b' : '#dcfce7'})`, border: `1px solid ${isDark ? '#166534' : '#bbf7d0'}` }}>
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>📝 Резюме Редактора</div>
                                <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{result.editorSummary}</div>
                            </div>
                        )}
                        <DecisionTags tableId={tableId} result={result} isDark={isDark} brd={brd} bgI={bgI} tS={tS} tM={tM} />
                    </>}
                    {!result && !running && <div style={{ textAlign: 'center', padding: 40, color: tS }}><div style={{ fontSize: 40, marginBottom: 12 }}>📊</div><div>Нажмите «🧪 Тест» или «🚀 Запустить»</div></div>}
                </>}

                {/* Logs */}
                {activeTab === 'logs' && <>
                    {logs && logs.length > 0 && <button style={{ ...btn, background: '#6366f1', color: '#fff', marginBottom: 12 }} onClick={() => {
                        const text = logs.map((l, i) => `${'═'.repeat(60)}\n👤 ${l.persona_name} (${l.model})\n↑${l.tokens_input} ↓${l.tokens_output} · ${(l.duration_ms / 1000).toFixed(1)}s\n${'─'.repeat(40)}\nSYSTEM:\n${l.system_prompt}\n${'─'.repeat(40)}\nUSER:\n${l.user_prompt}\n${'─'.repeat(40)}\nAI:\n${typeof l.ai_response === 'string' ? l.ai_response : JSON.stringify(l.ai_response, null, 2)}\n`).join('\n');
                        navigator.clipboard.writeText(text).then(() => alert('Логи скопированы в буфер обмена ✅')).catch(() => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); alert('Логи скопированы ✅'); });
                    }}>📋 Скопировать все логи</button>}
                    {!logs && <div style={{ textAlign: 'center', padding: 40, color: tS }}>Загрузка логов...</div>}
                    {logs && logs.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: tS }}>Логов нет</div>}
                    {logs && logs.map((log, i) => (
                        <div key={log.id || i} style={{ borderRadius: 8, border: `1px solid ${brd}`, marginBottom: 8, background: bgI, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', background: expandedLog === i ? (isDark ? '#1e3a5f' : '#eff6ff') : 'transparent' }} onClick={() => setExpandedLog(expandedLog === i ? null : i)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <strong style={{ fontSize: 13 }}>{log.persona_name}</strong>
                                    <span style={{ fontSize: 12, color: tS, background: bg, padding: '1px 5px', borderRadius: 3 }}>{log.model}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: tS }}>
                                    <span>↑{log.tokens_input} ↓{log.tokens_output}</span>
                                    <span>{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : ''}</span>
                                    <span>{expandedLog === i ? '▲' : '▼'}</span>
                                </div>
                            </div>
                            {expandedLog === i && (
                                <div style={{ borderTop: `1px solid ${brd}`, padding: 12 }}>
                                    <div style={{ marginBottom: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#8b5cf6', marginBottom: 4 }}>SYSTEM PROMPT:</div>
                                        <pre style={{ fontSize: 12, padding: 8, borderRadius: 4, background: bg, overflow: 'auto', maxHeight: 120, whiteSpace: 'pre-wrap', margin: 0, color: tS }}>{log.system_prompt}</pre>
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', marginBottom: 4 }}>USER PROMPT:</div>
                                        <pre style={{ fontSize: 12, padding: 8, borderRadius: 4, background: bg, overflow: 'auto', maxHeight: 120, whiteSpace: 'pre-wrap', margin: 0, color: tM }}>{log.user_prompt}</pre>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 4 }}>AI RESPONSE:</div>
                                        <pre style={{ fontSize: 12, padding: 8, borderRadius: 4, background: bg, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap', margin: 0, color: tM }}>{typeof log.ai_response === 'string' ? log.ai_response : JSON.stringify(log.ai_response, null, 2)}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </>}
            </div>
        </div>
    );
}
