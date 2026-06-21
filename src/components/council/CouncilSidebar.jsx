import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../../utils/api';
import { TEST_TOPIC } from '../../utils/councilTable.js';
import { t } from '../../i18n';
import { useLang } from '../../contexts/LangContext';
import { ChoserLog } from '../../utils/log';

/* ── Tooltip ── */
function WithTooltip({ text, children }) {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const timerRef = useRef(null);
    const wrapRef = useRef(null);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const handleEnter = () => {
        timerRef.current = setTimeout(() => {
            if (wrapRef.current) {
                const r = wrapRef.current.getBoundingClientRect();
                setPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
            }
            setShow(true);
        }, 1500);
    };
    const handleLeave = () => { clearTimeout(timerRef.current); setShow(false); };

    return (
        <div ref={wrapRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave}
             style={{ position: 'relative', display: 'inline-flex' }}>
            {children}
            {show && text && createPortal(
                <div style={{
                    position: 'fixed', top: pos.top, left: pos.left,
                    transform: 'translateX(-50%)', zIndex: 9999,
                    background: '#1e293b', color: '#fff',
                    padding: '8px 12px', borderRadius: 8, fontSize: 12,
                    lineHeight: 1.4, maxWidth: 280,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                    pointerEvents: 'none', whiteSpace: 'normal', textAlign: 'left',
                }}>{text}</div>,
                document.body
            )}
        </div>
    );
}

/* ── Section label helper ── */
function SectionLabel({ children, brd }) {
    return (
        <div style={{
            fontSize: 12, fontWeight: 700, color: 'inherit',
            textTransform: 'uppercase', letterSpacing: 0.5,
            padding: '6px 14px 3px', borderTop: `1px solid ${brd}`,
        }}>{children}</div>
    );
}

/* ── Relative time ── */
function timeAgo(iso, locale) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    const ago = t('council.ago');
    if (diff < 60) return `30s ${ago}`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${ago}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ${ago}`;
    return `${Math.floor(diff / 86400)}d ${ago}`;
}

/* ═══════════════════ MAIN SIDEBAR ═══════════════════ */
export default function CouncilSidebar({
    navigate, topic, setTopic, topicDesc, setTopicDesc,
    numParameters, setNumParameters, numObjects, setNumObjects,
    tables, selectedTable, setSelectedTable,
    mode, setMode, searchMode, setSearchMode,
    personas, setPersonas, enabledAgents, setEnabledAgents,
    agentStatuses, running, loaded, currentThinking,
    tokenBudget, setTokenBudget, maxDuration, setMaxDuration,
    runCouncil, isDark, brd, bg, bgI, tM, tS, inp,
    // History props (from useCouncilStream via DecisionPage)
    councilHistory, loadFromHistory, clearHistory,
}) {
    const { locale } = useLang();
    const [editingAgent, setEditingAgent] = useState(null);

    ChoserLog.debug('SIDEBAR', 'render', { topic: topic?.slice(0, 40), loaded, running, historyCount: councilHistory?.length, personasCount: personas?.length });

    const enabledCount = personas.filter(p => enabledAgents[p.id] !== false).length;
    const totalCount = personas.length;

    return (
        <>
            <div style={{
                width: '100%', minWidth: 280, maxWidth: 800,
                borderRight: 'none', display: 'flex', flexDirection: 'column',
                background: bgI, flexShrink: 0, overflow: 'hidden',
            }}>
                {/* ── HEADER (compact) ── */}
                <div style={{
                    padding: '7px 14px', borderBottom: `1px solid ${brd}`,
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', flexShrink: 0,
                }}>
                    <h3 style={{ margin: 0, fontSize: 13, color: tM }}>
                        {t('council.sidebarTitle')}
                    </h3>
                    <button onClick={() => navigate('/')}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: tS }}>
                        {t('council.close')}
                    </button>
                </div>

                {/* ── START BUTTON — always visible, right after header ── */}
                <div style={{ padding: '8px 14px', borderBottom: `1px solid ${brd}`, flexShrink: 0 }}>
                    <button onClick={runCouncil} disabled={!topic.trim() || running || !loaded}
                        style={{
                            width: '100%', padding: 9,
                            background: (topic.trim() && loaded)
                                ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                                : (isDark ? '#334155' : '#cbd5e1'),
                            color: '#fff', border: 'none', borderRadius: 8,
                            cursor: (topic.trim() && loaded) ? 'pointer' : 'default',
                            fontSize: 13, fontWeight: 600, transition: 'background 0.3s',
                            minHeight: 38, opacity: running ? 0.8 : 1,
                        }}>
                        {!loaded
                            ? t('council.loadingAgents')
                            : running && currentThinking
                                ? `${currentThinking.emoji} ${currentThinking.name} ${t('progress.thinking')}`
                                : running
                                    ? `⏳ ${enabledCount} ${t('council.advisingAgents')}`
                                    : t('council.startBtn', { n: enabledCount })
                        }
                    </button>
                </div>

                {/* ── SCROLLABLE BODY ── */}
                <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>

                    {/* ── QUESTION ── */}
                    <SectionLabel brd={brd}>💬 {t('council.topic')}</SectionLabel>
                    <div style={{ padding: '4px 14px 8px' }}>
                        <input value={topic} onChange={e => setTopic(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runCouncil(); } }}
                            placeholder={t('council.exampleTopic')} style={inp} />
                        <textarea value={topicDesc} onChange={e => setTopicDesc(e.target.value)}
                            placeholder={t('council.contextPlaceholder')}
                            style={{ ...inp, height: 48, resize: 'vertical' }} />
                        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: tS, marginBottom: 2 }}>{t('council.parametersLabel')}</div>
                                <input type="number" value={numParameters}
                                    onChange={e => setNumParameters(parseInt(e.target.value) || 1)}
                                    min="1" max="20"
                                    style={{ ...inp, width: '100%', height: 28, marginBottom: 0 }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: tS, marginBottom: 2 }}>{t('council.objectsLabel')}</div>
                                <input type="number" value={numObjects}
                                    onChange={e => setNumObjects(parseInt(e.target.value) || 1)}
                                    min="1" max="20"
                                    style={{ ...inp, width: '100%', height: 28, marginBottom: 0 }} />
                            </div>
                        </div>
                        <span onClick={(e) => {
                            e.preventDefault();
                            setTopic(t('council.testTopicSet'));
                            setTopicDesc(TEST_TOPIC);
                            setSelectedTable(null);
                            setNumParameters(5);
                            setNumObjects(3);
                        }} style={{ fontSize: 12, color: tS, opacity: 0.6, cursor: 'pointer' }}>
                            🧪 test
                        </span>
                    </div>

                    {/* ── SETTINGS (compact) ── */}
                    <SectionLabel brd={brd}>⚙️ {t('council.settings')}</SectionLabel>
                    <div style={{ padding: '4px 14px 8px' }}>
                        {/* Table select */}
                        <select value={selectedTable?.id || ''}
                            onChange={e => {
                                const tbl = tables.find(x => x.id === e.target.value);
                                if (tbl) { setSelectedTable(tbl); setTopic(tbl.title); setTopicDesc(tbl.description || ''); }
                                else setSelectedTable(null);
                            }}
                            style={{ ...inp, marginBottom: 6, height: 28 }}>
                            <option value="">{t('council.noTableSelected')}</option>
                            {tables.map(tbl => <option key={tbl.id} value={tbl.id}>{tbl.title}</option>)}
                        </select>

                        {/* Mode */}
                        <div style={{ fontSize: 12, color: tS, marginBottom: 3, fontWeight: 600 }}>{t('council.mode')}</div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                            <WithTooltip text={t('council.tooltip.sequential')}>
                                <button onClick={() => setMode('sequential')}
                                    style={{
                                        flex: 1, padding: '3px 4px',
                                        border: mode === 'sequential' ? '2px solid #3b82f6' : `1px solid ${brd}`,
                                        borderRadius: 4,
                                        background: mode === 'sequential' ? '#3b82f622' : bg,
                                        color: mode === 'sequential' ? '#3b82f6' : tS,
                                        cursor: 'pointer', fontSize: 12,
                                    }}>{t('council.sequential')}</button>
                            </WithTooltip>
                            <WithTooltip text={t('council.tooltip.parallel')}>
                                <button onClick={() => setMode('parallel')}
                                    style={{
                                        flex: 1, padding: '3px 4px',
                                        border: mode === 'parallel' ? '2px solid #22c55e' : `1px solid ${brd}`,
                                        borderRadius: 4,
                                        background: mode === 'parallel' ? '#22c55e22' : bg,
                                        color: mode === 'parallel' ? '#22c55e' : tS,
                                        cursor: 'pointer', fontSize: 12,
                                    }}>{t('council.parallel')}</button>
                            </WithTooltip>
                        </div>

                        {/* Source */}
                        <div style={{ fontSize: 12, color: tS, marginBottom: 3, fontWeight: 600 }}>{t('council.source')}</div>
                        <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                            <WithTooltip text={t('council.tooltip.memory')}>
                                <button onClick={() => {
                                    if (running && searchMode === 'none') setSearchMode('stop');
                                    else if (!running) setSearchMode('none');
                                }} style={{
                                    flex: 1, padding: '3px 4px',
                                    border: searchMode === 'none' ? '2px solid #f59e0b' : `1px solid ${brd}`,
                                    borderRadius: 4,
                                    background: searchMode === 'none' ? '#f59e0b22' : bg,
                                    color: searchMode === 'none' ? '#f59e0b' : tS,
                                    cursor: 'pointer', fontSize: 12, textAlign: 'center',
                                }}>{running && searchMode === 'none' ? '⏹ Stop' : t('council.memory')}</button>
                            </WithTooltip>
                            <WithTooltip text={t('council.tooltip.single')}>
                                <button onClick={() => {
                                    if (running && searchMode === 'single') setSearchMode('stop');
                                    else if (!running) setSearchMode('single');
                                }} style={{
                                    flex: 1, padding: '3px 4px',
                                    border: searchMode === 'single' ? '2px solid #3b82f6' : `1px solid ${brd}`,
                                    borderRadius: 4,
                                    background: searchMode === 'single' ? '#3b82f622' : bg,
                                    color: searchMode === 'single' ? '#3b82f6' : tS,
                                    cursor: 'pointer', fontSize: 12, textAlign: 'center',
                                }}>{running && searchMode === 'single' ? '⏹ Stop' : t('council.web')}</button>
                            </WithTooltip>
                        </div>

                        {/* Sliders: Tokens & Time */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 8, color: tS }}>
                                    {t('council.tokensLabel')} {tokenBudget ? `${Math.round(tokenBudget / 1000)}K` : '80K'}
                                </div>
                                <input type="range" min="20000" max="200000" step="10000"
                                    value={tokenBudget || 80000}
                                    onChange={e => setTokenBudget(parseInt(e.target.value))}
                                    style={{ width: '100%', height: 4, accentColor: '#3b82f6' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 8, color: tS }}>
                                    {t('council.timeLabel')} {maxDuration || 15} min
                                </div>
                                <input type="range" min="5" max="30" step="5"
                                    value={maxDuration || 15}
                                    onChange={e => setMaxDuration(parseInt(e.target.value))}
                                    style={{ width: '100%', height: 4, accentColor: '#3b82f6' }} />
                            </div>
                        </div>
                    </div>

                    {/* ── AGENTS ── */}
                    <SectionLabel brd={brd}>
                        👥 {t('council.agents')} ({enabledCount}/{totalCount})
                    </SectionLabel>
                    <div style={{
                        padding: '2px 14px 4px',
                        display: 'flex', justifyContent: 'flex-end', gap: 3,
                    }}>
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
                    <div style={{ padding: '2px 14px 8px', maxHeight: 220, overflow: 'auto' }}>
                        {personas.map(p => {
                            const enabled = enabledAgents[p.id] !== false;
                            const st = agentStatuses[p.id];
                            const isThinking = enabled && st?.status === 'thinking';
                            const isDone = enabled && st?.status === 'done';
                            return (
                                <div key={p.id}
                                    onDoubleClick={() => setEditingAgent({ id: p.id, name: p.name, system_prompt: p.system_prompt || '' })}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '3px 6px', borderRadius: 5, marginBottom: 2,
                                        background: !enabled ? (isDark ? '#1a1a1a' : '#f1f1f1')
                                            : isThinking ? (isDark ? '#1e1b4b' : '#eef2ff')
                                            : isDone ? (isDark ? '#052e16' : '#f0fdf4')
                                            : bg,
                                        border: `1px solid ${!enabled ? 'transparent'
                                            : isThinking ? '#6366f1'
                                            : isDone ? '#22c55e'
                                            : brd}`,
                                        transition: 'all 0.3s',
                                        opacity: !enabled ? 0.5 : 1,
                                        cursor: 'pointer', position: 'relative',
                                    }}
                                    data-group="true"
                                >
                                    <button onClick={() => setEnabledAgents(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                                        style={{
                                            width: 16, height: 16,
                                            border: `2px solid ${enabled ? '#22c55e' : (isDark ? '#475569' : '#cbd5e1')}`,
                                            borderRadius: 3,
                                            background: enabled ? '#22c55e' : 'transparent',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: 12, color: '#fff',
                                            padding: 0, flexShrink: 0,
                                        }}>{enabled ? '✓' : ''}</button>
                                    <span style={{ fontSize: 14, opacity: !enabled ? 0.4 : 1 }}>{p.emoji}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 12, color: enabled ? tM : tS,
                                            fontWeight: isThinking ? 600 : 400,
                                            display: 'flex', alignItems: 'center', gap: 3,
                                        }}>
                                            {p.name}
                                            <span className="agent-edit-icon"
                                                style={{ fontSize: 12, opacity: 0, transition: 'opacity 0.15s', cursor: 'pointer', marginLeft: 2 }}>
                                                ✏️
                                            </span>
                                            {isThinking && <span style={{ fontSize: 12, color: '#6366f1' }}>💭</span>}
                                            {isDone && <span style={{ fontSize: 12, color: '#22c55e' }}>✓</span>}
                                        </div>
                                        {st && enabled && (st.duration_ms > 0 || st.tokens_in > 0) && (
                                            <div style={{ fontSize: 8, color: tS, display: 'flex', gap: 4, marginTop: 1 }}>
                                                {st.duration_ms > 0 && <span>⏱{(st.duration_ms / 1000).toFixed(1)}s</span>}
                                                {(st.tokens_in + st.tokens_out) > 0 && <span>🔢{st.tokens_in + st.tokens_out}</span>}
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ fontSize: 8, color: tS, opacity: 0.5 }}>w{p.weight}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── HISTORY ── */}
                    <SectionLabel brd={brd}>{t('council.history')}</SectionLabel>
                    <div style={{ padding: '4px 14px 6px', maxHeight: 200, overflow: 'auto' }}>
                        {(!councilHistory || councilHistory.length === 0) ? (
                            <div style={{ fontSize: 12, color: tS, opacity: 0.6, textAlign: 'center', padding: '10px 0' }}>
                                {t('council.historyEmpty')}
                            </div>
                        ) : (
                            <>
                                {councilHistory.map(item => (
                                    <button key={item.id}
                                        onClick={() => loadFromHistory(item.result, item.topic)}
                                        style={{
                                            display: 'block', width: '100%', textAlign: 'left',
                                            padding: '6px 8px', marginBottom: 3,
                                            borderRadius: 6, border: `1px solid ${brd}`,
                                            background: bg, cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = isDark ? '#1e293b' : '#f1f5f9'}
                                        onMouseLeave={e => e.currentTarget.style.background = bg}
                                    >
                                        <div style={{ fontSize: 12, color: tM, fontWeight: 500,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.topic || '—'}
                                        </div>
                                        <div style={{ fontSize: 12, color: tS, marginTop: 2 }}>
                                            {timeAgo(item.timestamp, locale)}
                                        </div>
                                    </button>
                                ))}
                                <button onClick={clearHistory}
                                    style={{
                                        width: '100%', padding: '4px 8px', marginTop: 4,
                                        border: 'none', background: 'none',
                                        color: tS, fontSize: 12, cursor: 'pointer', opacity: 0.7,
                                    }}>
                                    🗑️ {t('council.clearHistory')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── AGENT EDIT MODAL ── */}
            {editingAgent && createPortal(
                <div onClick={(e) => { if (e.target === e.currentTarget) setEditingAgent(null); }}
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
                            onChange={(e) => setEditingAgent(prev => ({ ...prev, name: e.target.value }))}
                            style={{
                                width: '100%', padding: '8px 12px', background: bgI, color: tM,
                                border: `1px solid ${brd}`, borderRadius: 8,
                                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                            }} autoFocus />
                        <label style={{ fontSize: 12, color: tS, marginBottom: 4, marginTop: 12, display: 'block' }}>
                            {t('council.systemPromptLabel')}
                        </label>
                        <textarea rows={10} value={editingAgent.system_prompt}
                            onChange={(e) => setEditingAgent(prev => ({ ...prev, system_prompt: e.target.value }))}
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
                                    let currentAgent = null;
                                    setEditingAgent(prev => { currentAgent = prev; return prev; });
                                    await API.put(`/v1/api/council/personas/${currentAgent.id}`, {
                                        name: currentAgent.name,
                                        system_prompt: currentAgent.system_prompt,
                                    });
                                    const savedAgent = currentAgent;
                                    setPersonas(prev => prev.map(p =>
                                        p.id === savedAgent.id
                                            ? { ...p, name: savedAgent.name, system_prompt: savedAgent.system_prompt }
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
