import React from 'react';
import { t } from '../../i18n';
import { useLang } from '../../contexts/LangContext';

export default function CouncilProgress({ personas, enabledAgents, agentStatuses, currentThinking, elapsedMs, mode, isDark, brd, bg, bgI, tM, tS }) {
    const { locale } = useLang();
    const activeList = personas.filter(p => enabledAgents[p.id] !== false);
    const doneCount = Object.values(agentStatuses).filter(s => s.status === 'done').length;
    const totalTokens = Object.values(agentStatuses).reduce((s, a) => s + (a.tokens_in || 0) + (a.tokens_out || 0), 0);
    const fmt = ms => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
    const statusLabel = s => s === 'done' ? t('progress.statusDone') : s === 'thinking' ? t('progress.statusThinking') : t('progress.statusWaiting');
    const statusColor = s => s === 'done' ? '#22c55e' : s === 'thinking' ? '#6366f1' : '#9ca3af';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: bg, padding: '24px 28px 16px' }}>
            {/* Pulse animation keyframes */}
            <style>{`
                @keyframes councilPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.04); }
                }
                @keyframes councilGlow {
                    0%, 100% { box-shadow: 0 0 8px #6366f144; }
                    50% { box-shadow: 0 0 20px #6366f188; }
                }
            `}</style>

            {/* ── Header: Timer + current thinker ── */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 40, fontWeight: 700, color: tM, fontVariantNumeric: 'tabular-nums', letterSpacing: 2 }}>
                    {fmt(elapsedMs)}
                </div>
                {currentThinking && (
                    <div style={{
                        marginTop: 8, fontSize: 20, fontWeight: 700, color: isDark ? '#a5b4fc' : '#4338ca',
                        animation: 'councilPulse 2s ease-in-out infinite',
                        display: 'inline-block',
                    }}>
                        {currentThinking.emoji} {currentThinking.name} {t('progress.thinking')}
                    </div>
                )}
            </div>

            {/* ── Agent cards grid ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 12,
                flex: 1,
                overflow: 'auto',
                alignContent: 'start',
            }}>
                {activeList.map(p => {
                    const rawSt = agentStatuses[p.id];
                    // In parallel mode, default unknown agents to 'thinking' when running
                    const st = rawSt?.status ? rawSt : { status: mode === 'parallel' ? 'thinking' : 'waiting', duration_ms: 0, tokens_in: 0, tokens_out: 0 };
                    const isThinking = st.status === 'thinking';
                    const isDone = st.status === 'done';
                    const tok = (st.tokens_in || 0) + (st.tokens_out || 0);
                    // Progress: done=100%, thinking=estimate by tokens, waiting=0%
                    const pct = isDone ? 100 : isThinking ? Math.min(90, Math.round(tok / 5)) : 0;
                    return (
                        <div key={p.id} style={{
                            background: isThinking ? (isDark ? '#1e293b' : '#eef2ff') : bgI,
                            border: `1px solid ${isThinking ? '#6366f188' : brd}`,
                            borderRadius: 12,
                            padding: '14px 16px',
                            animation: isThinking ? 'councilGlow 2s ease-in-out infinite' : 'none',
                            transition: 'border-color 0.3s, background 0.3s',
                        }}>
                            {/* Avatar + Name + Status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <span style={{ fontSize: 26, lineHeight: 1 }}>{p.emoji || '🤖'}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: isThinking ? (isDark ? '#e0e7ff' : '#4338ca') : tM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {p.name || p.id}
                                    </div>
                                    <div style={{ fontSize: 12, color: statusColor(st.status), fontWeight: 500, marginTop: 2 }}>
                                        {statusLabel(st.status)}
                                    </div>
                                </div>
                                {isThinking && (
                                    <div style={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: '#6366f1',
                                        animation: 'councilPulse 1s ease-in-out infinite',
                                        flexShrink: 0,
                                    }} />
                                )}
                            </div>

                            {/* Progress bar */}
                            <div style={{ height: 4, background: brd, borderRadius: 4, overflow: 'hidden', marginBottom: isThinking ? 8 : 0 }}>
                                <div style={{
                                    height: '100%',
                                    width: `${pct}%`,
                                    background: isDone ? 'linear-gradient(90deg, #22c55e, #16a34a)' : isThinking ? 'linear-gradient(90deg, #6366f1, #818cf8)' : brd,
                                    borderRadius: 4,
                                    transition: 'width 0.5s ease',
                                }} />
                            </div>

                            {/* Live stats for thinking agent */}
                            {isThinking && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: tS }}>
                                    <span>🔢 {tok.toLocaleString()} tok</span>
                                    <span>⏱ {fmt(st.duration_ms || 0)}</span>
                                </div>
                            )}
                            {/* Done stats */}
                            {isDone && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'inherit', marginTop: 6 }}>
                                    <span>🔢 {tok.toLocaleString()} tok</span>
                                    <span>⏱ {fmt(st.duration_ms || 0)}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Bottom summary ── */}
            <div style={{
                display: 'flex', justifyContent: 'center', gap: 32,
                marginTop: 16, paddingTop: 14, borderTop: `1px solid ${brd}`,
                fontSize: 13, color: tS, flexShrink: 0,
            }}>
                <span>✅ {doneCount}/{activeList.length} {t('progress.agentsDone')}</span>
                <span>🔢 {totalTokens.toLocaleString()} {t('progress.tokensSpent')}</span>
                <span>⏱ {fmt(elapsedMs)}</span>
            </div>
        </div>
    );
}
