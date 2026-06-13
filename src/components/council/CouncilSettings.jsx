import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../../utils/api';
import { TEST_TOPIC } from '../../utils/councilTable.js';
import { t } from '../../i18n';
import { useLang } from '../../contexts/LangContext';
import { ChoserLog } from '../../utils/log';

/* ═══════════════ SETTINGS PANEL (RIGHT, ABOVE TABLE) ═══════════════ */
export default function CouncilSettings({
    topic, setTopic, topicDesc, setTopicDesc,
    numParameters, setNumParameters, numObjects, setNumObjects,
    tables, selectedTable, setSelectedTable,
    mode, setMode, searchMode, setSearchMode,
    personas, setPersonas, enabledAgents, setEnabledAgents,
    agentStatuses, running, loaded, currentThinking,
    tokenBudget, setTokenBudget, maxDuration, setMaxDuration,
    runCouncil, stopCouncil,
    isDark, brd, bg, bgI, tM, tS, inp,
}) {
    const { locale } = useLang();
    const [editingAgent, setEditingAgent] = useState(null);

    ChoserLog.debug('SETTINGS', 'render', { topic: topic?.slice(0, 40), loaded, running });

    const enabledCount = personas.filter(p => enabledAgents[p.id] !== false).length;
    const totalCount = personas.length;

    return (
        <>
            <div style={{
                maxHeight: '50%', overflow: 'auto',
                borderBottom: `1px solid ${brd}`,
                flexShrink: 0, background: bgI,
            }}>
                {/* ── ROW 1: TOPIC + TEST BUTTON ── */}
                <div style={{ padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: tS, marginBottom: 2 }}>
                            💬 {t('council.topic')}
                        </div>
                        <input value={topic} onChange={e => setTopic(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runCouncil(); } }}
                            placeholder={t('council.exampleTopic')} style={inp} />
                    </div>
                    <button onClick={() => {
                        setTopic('Какой смартфон выбрать?');
                        setTopicDesc(TEST_TOPIC);
                        setSelectedTable(null);
                        setNumParameters(5);
                        setNumObjects(3);
                    }} title={t('council.testBtn')} style={{
                        padding: '10px 16px', minHeight: 38,
                        background: isDark ? '#7c3aed' : '#8b5cf6',
                        color: '#fff', border: 'none', borderRadius: 8,
                        cursor: 'pointer', fontSize: 13, fontWeight: 700,
                        whiteSpace: 'nowrap',
                    }}>
                        🧪 {t('council.testFill') || 'Test data'}
                    </button>
                </div>

                {/* ── ROW 2: CONTEXT ── */}
                <div style={{ padding: '0 16px 4px' }}>
                    <textarea value={topicDesc} onChange={e => setTopicDesc(e.target.value)}
                        placeholder={t('council.contextPlaceholder')}
                        style={{ ...inp, height: 40, resize: 'vertical' }} />
                </div>

                {/* ── ROW 3: PARAMS + OBJECTS + MODE + SOURCE + TOKENS/TIME ── */}
                <div style={{ padding: '0 16px 4px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {/* Params/Objects */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        <div>
                            <div style={{ fontSize: 12, color: tS, marginBottom: 2 }}>{t('council.parametersLabel')}</div>
                            <input type="number" value={numParameters}
                                onChange={e => setNumParameters(parseInt(e.target.value) || 1)}
                                min="1" max="20"
                                style={{ ...inp, width: 60, height: 28, marginBottom: 0 }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: tS, marginBottom: 2 }}>{t('council.objectsLabel')}</div>
                            <input type="number" value={numObjects}
                                onChange={e => setNumObjects(parseInt(e.target.value) || 1)}
                                min="1" max="20"
                                style={{ ...inp, width: 60, height: 28, marginBottom: 0 }} />
                        </div>
                    </div>

                    {/* Mode */}
                    <div>
                        <div style={{ fontSize: 12, color: tS, marginBottom: 2, fontWeight: 600 }}>{t('council.mode')}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => setMode('sequential')} title={t('council.tooltip.sequential')} style={{
                                padding: '4px 8px', border: mode === 'sequential' ? '2px solid #3b82f6' : `1px solid ${brd}`,
                                borderRadius: 4, background: mode === 'sequential' ? '#3b82f622' : bg,
                                color: mode === 'sequential' ? '#3b82f6' : tS, cursor: 'pointer', fontSize: 12,
                            }}>{t('council.sequential')}</button>
                            <button onClick={() => setMode('parallel')} title={t('council.tooltip.parallel')} style={{
                                padding: '4px 8px', border: mode === 'parallel' ? '2px solid #22c55e' : `1px solid ${brd}`,
                                borderRadius: 4, background: mode === 'parallel' ? '#22c55e22' : bg,
                                color: mode === 'parallel' ? '#22c55e' : tS, cursor: 'pointer', fontSize: 12,
                            }}>{t('council.parallel')}</button>
                        </div>
                    </div>

                    {/* Source */}
                    <div>
                        <div style={{ fontSize: 12, color: tS, marginBottom: 2, fontWeight: 600 }}>{t('council.source')}</div>
                        <div style={{ display: 'flex', gap: 3 }}>
                            <button onClick={() => {
                                if (running && searchMode === 'none') setSearchMode('stop');
                                else if (!running) setSearchMode('none');
                            }} title={t('council.tooltip.memory')} style={{
                                padding: '4px 8px', border: searchMode === 'none' ? '2px solid #f59e0b' : `1px solid ${brd}`,
                                borderRadius: 4, background: searchMode === 'none' ? '#f59e0b22' : bg,
                                color: searchMode === 'none' ? '#f59e0b' : tS, cursor: 'pointer', fontSize: 12,
                            }}>{running && searchMode === 'none' ? '⏹ Stop' : t('council.memory')}</button>
                            <button onClick={() => {
                                if (running && searchMode === 'single') setSearchMode('stop');
                                else if (!running) setSearchMode('single');
                            }} title={t('council.tooltip.single')} style={{
                                padding: '4px 8px', border: searchMode === 'single' ? '2px solid #3b82f6' : `1px solid ${brd}`,
                                borderRadius: 4, background: searchMode === 'single' ? '#3b82f622' : bg,
                                color: searchMode === 'single' ? '#3b82f6' : tS, cursor: 'pointer', fontSize: 12,
                            }}>{running && searchMode === 'single' ? '⏹ Stop' : t('council.web')}</button>
                        </div>
                    </div>

                    {/* Tokens / Time — C3: numeric inputs */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div>
                            <div style={{ fontSize: 12, color: tS }}>
                                {t('council.tokensLabel')} {tokenBudget ? `${Math.round(tokenBudget / 1000)}K` : '80K'}
                            </div>
                            <input type="number" min="20" max="200" step="10"
                                value={Math.round((tokenBudget || 80000) / 1000)}
                                onChange={e => setTokenBudget(parseInt(e.target.value) * 1000 || 80000)}
                                placeholder="80"
                                style={{ ...inp, width: 70, height: 24, marginBottom: 0, fontSize: 12 }} />
                            <span style={{ fontSize: 12, color: tS, marginLeft: 2 }}>K</span>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: tS }}>
                                {t('council.timeLabel')} {maxDuration || 15} min
                            </div>
                            <input type="number" min="5" max="30" step="5"
                                value={maxDuration || 15}
                                onChange={e => setMaxDuration(parseInt(e.target.value) || 15)}
                                placeholder="15"
                                style={{ ...inp, width: 55, height: 24, marginBottom: 0, fontSize: 12 }} />
                            <span style={{ fontSize: 12, color: tS, marginLeft: 2 }}>min</span>
                        </div>
                    </div>
                </div>

                {/* ── TABLE SELECT ── */}
                <div style={{ padding: '4px 16px' }}>
                    <select value={selectedTable?.id || ''} onChange={e => {
                        const tbl = tables.find(x => x.id === e.target.value);
                        if (tbl) { setSelectedTable(tbl); setTopic(tbl.title); setTopicDesc(tbl.description || ''); }
                        else setSelectedTable(null);
                    }} style={{ ...inp, height: 28, marginBottom: 0 }}>
                        <option value="">{t('council.noTableSelected')}</option>
                        {tables.map(tbl => <option key={tbl.id} value={tbl.id}>{tbl.title}</option>)}
                    </select>
                </div>

                {/* ── AGENTS ── */}
                <div style={{ padding: '4px 16px 0' }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 4,
                    }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: tS }}>
                            👥 {t('council.agents')} ({enabledCount}/{totalCount})
                        </span>
                        <div style={{ display: 'flex', gap: 3 }}>
                            <button onClick={() => {
                                const a = {}; personas.forEach(p => { a[p.id] = true; }); setEnabledAgents(a);
                            }} style={{
                                fontSize: 12, padding: '1px 5px', border: `1px solid ${brd}`,
                                borderRadius: 3, background: bg, color: tS, cursor: 'pointer',
                            }}>{t('council.allYes')}</button>
                            <button onClick={() => {
                                const a = {}; personas.forEach(p => { a[p.id] = false; }); setEnabledAgents(a);
                            }} style={{
                                fontSize: 12, padding: '1px 5px', border: `1px solid ${brd}`,
                                borderRadius: 3, background: bg, color: tS, cursor: 'pointer',
                            }}>{t('council.allNo')}</button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingBottom: 4 }}>
                        {personas.map(p => {
                            const enabled = enabledAgents[p.id] !== false;
                            const st = agentStatuses[p.id];
                            const isThinking = enabled && st?.status === 'thinking';
                            const isDone = enabled && st?.status === 'done';
                            return (
                                <div key={p.id}
                                    onDoubleClick={() => setEditingAgent({ id: p.id, name: p.name, system_prompt: p.system_prompt || '' })}
                                    data-group="true"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 3,
                                        padding: '3px 6px', borderRadius: 5,
                                        background: !enabled ? (isDark ? '#1a1a1a' : '#f1f1f1')
                                            : isThinking ? (isDark ? '#1e1b4b' : '#eef2ff')
                                            : isDone ? (isDark ? '#052e16' : '#f0fdf4')
                                            : bg,
                                        border: `1px solid ${!enabled ? 'transparent'
                                            : isThinking ? '#6366f1'
                                            : isDone ? '#22c55e'
                                            : brd}`,
                                        transition: 'all 0.3s', opacity: !enabled ? 0.5 : 1,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <button onClick={() => setEnabledAgents(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                                        style={{
                                            width: 14, height: 14,
                                            border: `2px solid ${enabled ? '#22c55e' : (isDark ? '#475569' : '#cbd5e1')}`,
                                            borderRadius: 3, background: enabled ? '#22c55e' : 'transparent',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: 12, color: '#fff',
                                            padding: 0, flexShrink: 0,
                                        }}>{enabled ? '✓' : ''}</button>
                                    <span style={{ fontSize: 13, opacity: !enabled ? 0.4 : 1 }}>{p.emoji}</span>
                                    <span style={{
                                        fontSize: 12, color: enabled ? tM : tS,
                                        fontWeight: isThinking ? 600 : 400, whiteSpace: 'nowrap',
                                    }}>
                                        {p.name}
                                        {isThinking && <span style={{ color: '#6366f1', marginLeft: 2 }}>💭</span>}
                                        {isDone && <span style={{ color: '#22c55e', marginLeft: 2 }}>✓</span>}
                                    </span>
                                    <span style={{ fontSize: 12, color: tS, opacity: 0.5 }}>w{p.weight}</span>
                                    {st && enabled && (st.duration_ms > 0 || st.tokens_in > 0) && (
                                        <span style={{ fontSize: 12, color: tS }}>
                                            {st.duration_ms > 0 && `⏱${(st.duration_ms / 1000).toFixed(1)}s`}
                                        </span>
                                    )}
                                    <span className="agent-edit-icon"
                                        style={{ fontSize: 12, opacity: 0, transition: 'opacity 0.15s', cursor: 'pointer' }}>
                                        ✏️
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* ── START / STOP BUTTON — STICKY, OUTSIDE SCROLL ── */}
            <div style={{
                padding: '8px 16px',
                flexShrink: 0,
                borderTop: `1px solid ${brd}`,
                background: bg,
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
            }}>
                {running ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={stopCouncil}
                            style={{
                                flex: 1, padding: '8px 12px',
                                background: '#ef4444',
                                color: '#fff', border: 'none', borderRadius: 8,
                                cursor: 'pointer', fontSize: 14, fontWeight: 700,
                                minHeight: 40,
                            }}>
                            ⏹ {t('council.stopCouncil')}
                        </button>
                        {currentThinking && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '0 10px', background: isDark ? '#1e1b4b' : '#eef2ff',
                                borderRadius: 8, fontSize: 13, color: '#6366f1',
                                whiteSpace: 'nowrap',
                            }}>
                                {currentThinking.emoji} {currentThinking.name}
                            </div>
                        )}
                    </div>
                ) : (
                    <button onClick={runCouncil} disabled={!topic.trim() || !loaded}
                        style={{
                            width: '100%', padding: '8px 12px',
                            background: (topic.trim() && loaded)
                                ? '#f59e0b'
                                : (isDark ? '#334155' : '#cbd5e1'),
                            color: '#fff', border: 'none', borderRadius: 8,
                            cursor: (topic.trim() && loaded) ? 'pointer' : 'default',
                            fontSize: 14, fontWeight: 700, transition: 'background 0.3s',
                            minHeight: 40,
                        }}>
                        {!loaded
                            ? t('council.loadingAgents')
                            : `🚀 ${t('council.startBtn', { n: enabledCount })}`
                        }
                    </button>
                )}
            </div>

            {/* ── AGENT EDIT MODAL ── */}
            {editingAgent && createPortal(
                <div onClick={e => { if (e.target === e.currentTarget) setEditingAgent(null); }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <div style={{
                        background: bg, border: `1px solid ${brd}`,
                        borderRadius: 12, padding: 20, maxWidth: 600, width: '90%',
                        maxHeight: '85vh', overflowY: 'auto',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                    }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: tM, marginBottom: 14 }}>
                            {t('council.editAgentTitle')}
                        </div>
                        <label style={{ fontSize: 12, color: tS, marginBottom: 4, display: 'block' }}>
                            {t('council.agentNameLabel')}
                        </label>
                        <input type="text" value={editingAgent.name}
                            onChange={e => setEditingAgent(prev => ({ ...prev, name: e.target.value }))}
                            style={{
                                width: '100%', padding: '8px 12px', background: bgI, color: tM,
                                border: `1px solid ${brd}`, borderRadius: 8,
                                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                            }} autoFocus />
                        <label style={{ fontSize: 12, color: tS, marginBottom: 4, marginTop: 12, display: 'block' }}>
                            {t('council.systemPromptLabel')}
                        </label>
                        <textarea rows={10} value={editingAgent.system_prompt}
                            onChange={e => setEditingAgent(prev => ({ ...prev, system_prompt: e.target.value }))}
                            style={{
                                width: '100%', padding: '8px 12px', background: bgI, color: tM,
                                border: `1px solid ${brd}`, borderRadius: 8,
                                fontSize: 12, lineHeight: 1.5, fontFamily: 'monospace',
                                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                            }} />
                        {editingAgent._saving && (
                            <div style={{ fontSize: 12, color: tS, marginTop: 8 }}>{t('council.savingAgent')}</div>
                        )}
                        {editingAgent._error && (
                            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>❌ {editingAgent._error}</div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                            <button onClick={() => setEditingAgent(null)}
                                style={{
                                    padding: '8px 20px', background: 'transparent',
                                    color: tS, border: `1px solid ${brd}`,
                                    borderRadius: 8, cursor: 'pointer', fontSize: 13,
                                }}>{t('council.cancelBtn')}</button>
                            <button onClick={async () => {
                                setEditingAgent(prev => ({ ...prev, _saving: true, _error: null }));
                                try {
                                    await API.put(`/v1/api/council/personas/${editingAgent.id}`, {
                                        name: editingAgent.name,
                                        system_prompt: editingAgent.system_prompt,
                                    });
                                    setPersonas(prev => prev.map(p =>
                                        p.id === editingAgent.id
                                            ? { ...p, name: editingAgent.name, system_prompt: editingAgent.system_prompt }
                                            : p
                                    ));
                                    setEditingAgent(null);
                                } catch (err) {
                                    setEditingAgent(prev => ({
                                        ...prev, _saving: false,
                                        _error: err?.message || t('council.errorSaving'),
                                    }));
                                }
                            }} disabled={editingAgent._saving}
                                style={{
                                    padding: '8px 20px',
                                    background: editingAgent._saving ? (isDark ? '#475569' : '#cbd5e1') : '#3b82f6',
                                    color: '#fff', border: 'none', borderRadius: 8,
                                    cursor: editingAgent._saving ? 'wait' : 'pointer',
                                    fontSize: 13, fontWeight: 600,
                                }}>{t('council.saveAgent')}</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Hover CSS for agent edit icon */}
            <style>{`
                div[data-group="true"]:hover .agent-edit-icon {
                    opacity: 1 !important;
                }
            `}</style>
        </>
    );
}
