import React, { useState } from 'react';
import { t } from '../../i18n';
import { useLang } from '../../contexts/LangContext';
import { ChoserLog } from '../../utils/log';

/**
 * B7: Chat tab — shows full conversation between user and AI agents
 * Displays topic, context, agent responses in chat format
 */
export default function ChatTab({ lastResult, topic, topicDesc, isDark, brd, bg, bgI, tM, tS }) {
    const [expandedAgent, setExpandedAgent] = useState(null);

    if (!lastResult) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: tS }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                <div style={{ fontSize: 14 }}>{t('council.noChat') || 'Запустите совет, чтобы увидеть переписку'}</div>
            </div>
        );
    }

    const bubbleUser = {
        background: isDark ? '#1e3a5f' : '#dbeafe',
        color: tM, borderRadius: '12px 12px 4px 12px',
        padding: '10px 14px', maxWidth: '80%', marginLeft: 'auto',
        fontSize: 13, lineHeight: 1.6,
    };
    const bubbleAgent = {
        background: bgI, color: tM,
        borderRadius: '12px 12px 12px 4px',
        padding: '10px 14px', maxWidth: '80%',
        fontSize: 13, lineHeight: 1.6,
    };

    return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
            {/* User question */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={bubbleUser}>
                    <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>👤 User</div>
                    <strong>{topic}</strong>
                    {topicDesc && (
                        <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>{topicDesc.substring(0, 200)}</div>
                    )}
                </div>
            </div>

            {/* Consensus (if any) */}
            {lastResult.consensus?.recommendation && String(lastResult.consensus.recommendation) !== 'insufficient_data' && (
                <div style={{ display: 'flex' }}>
                    <div style={{
                        ...bubbleAgent,
                        border: `2px solid ${isDark ? '#166534' : '#22c55e'}`,
                        background: isDark ? '#052e16' : '#f0fdf4',
                    }}>
                        <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>🏛️ {t('table.consensus') || 'Консенсус'}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>
                            {String(lastResult.consensus.recommendation)}
                        </div>
                    </div>
                </div>
            )}

            {/* Agent responses */}
            {(lastResult.votes || []).map((v, i) => {
                const isExpanded = expandedAgent === i;
                const responseText = v.response || '';
                const shortText = responseText.length > 300 ? responseText.substring(0, 300) + '...' : responseText;

                return (
                    <div key={i} style={{ display: 'flex' }}>
                        <div style={{ ...bubbleAgent, flex: 1, maxWidth: '85%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, opacity: 0.6 }}>
                                    {v.emoji} {v.name}
                                    {v.recommendation && v.recommendation !== 'insufficient_data' && (
                                        <span style={{ color: '#22c55e', marginLeft: 6, fontWeight: 600 }}>
                                            → {v.recommendation}
                                        </span>
                                    )}
                                </span>
                                <span style={{ fontSize: 11, color: tS, fontFamily: 'monospace' }}>
                                    {v.debug?.duration_ms ? `${(v.debug.duration_ms / 1000).toFixed(1)}s` : ''}
                                    {v.debug?.tokens_out ? ` ${v.debug.tokens_out}tok` : ''}
                                </span>
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap', color: tM }}>
                                {isExpanded ? responseText : shortText}
                            </div>
                            {responseText.length > 300 && (
                                <button onClick={() => setExpandedAgent(isExpanded ? null : i)}
                                    style={{
                                        marginTop: 4, padding: '2px 8px', fontSize: 12,
                                        background: 'transparent', border: 'none',
                                        color: '#3b82f6', cursor: 'pointer',
                                    }}>
                                    {isExpanded ? '↑ свернуть' : '↓ читать полностью'}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Editor summary */}
            {lastResult.editorSummary && (
                <div style={{ display: 'flex' }}>
                    <div style={{
                        ...bubbleAgent,
                        border: `1px solid ${isDark ? '#166534' : '#bbf7d0'}`,
                        background: isDark ? '#052e16' : '#f0fdf4',
                    }}>
                        <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>📝 {t('table.editorSummary')}</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{lastResult.editorSummary}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
