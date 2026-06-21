import React, { useState } from 'react';
import { API } from '../../utils/api';
import { t } from '../../i18n';
import { useLang } from '../../contexts/LangContext';
import { ChoserLog } from '../../utils/log';

/**
 * B8: Publish tab — share results publicly/privately
 * - Toggle public/private
 * - AI auto-generate description
 * - Copy share link
 */
export default function PublishTab({ lastResult, topic, comparison, shareLink, shareResult, isDark, brd, bg, bgI, tM, tS }) {
    const { locale } = useLang();
    const [isPublic, setIsPublic] = useState(false);
    const [aiDescription, setAiDescription] = useState('');
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerateDescription = async () => {
        setGenerating(true);
        try {
            // Generate from data
            const parts = [];
            parts.push(`**${topic || 'Решение'}**`);
            if (comparison?.rows?.length > 0) {
                const winner = comparison.rows[0];
                parts.push(`Лидер: ${String(winner.name || '').replace('👑 ', '')} (score: ${(winner._u || 0).toFixed(0)}/1000)`);
                if (comparison.rows.length > 1) {
                    parts.push(`Альтернативы: ${comparison.rows.slice(1, 3).map(r => String(r.name || '').replace('👑 ', '')).join(', ')}`);
                }
                parts.push(`Критериев: ${comparison.columns.length}`);
            }
            if (lastResult?.votes?.length) {
                parts.push(`Экспертов: ${lastResult.votes.length}`);
                const recs = {};
                for (const v of lastResult.votes) {
                    if (v.recommendation && v.recommendation !== 'insufficient_data') {
                        recs[v.recommendation] = (recs[v.recommendation] || 0) + 1;
                    }
                }
                const topRec = Object.entries(recs).sort((a, b) => b[1] - a[1])[0];
                if (topRec) parts.push(`Большинство экспертов (${topRec[1]}/${lastResult.votes.length}) рекомендуют: ${topRec[0]}`);
            }
            setAiDescription(parts.join('\n'));
        } catch (err) {
            ChoserLog.error('PUBLISH', 'generate description error', err);
        }
        setGenerating(false);
    };

    const handleCopyLink = () => {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!lastResult) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: tS }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🌐</div>
                <div style={{ fontSize: 14 }}>{t('council.noPublish') || 'Запустите совет для публикации'}</div>
            </div>
        );
    }

    return (
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: tM }}>🌐 {t('table.publish') || 'Публикация'}</div>

            {/* Public/Private toggle */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 14, borderRadius: 10, background: bgI, border: `1px solid ${brd}`,
            }}>
                <label style={{ fontSize: 13, color: tM, fontWeight: 600 }}>
                    <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)}
                        style={{ marginRight: 8, transform: 'scale(1.2)' }} />
                    {isPublic ? '🌍 Публичный доступ' : '🔒 Только по ссылке'}
                </label>
            </div>

            {/* AI Description */}
            <div style={{
                padding: 14, borderRadius: 10, background: bgI, border: `1px solid ${brd}`,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: tM }}>📝 {t('table.aiDescription') || 'AI-описание'}</span>
                    <button onClick={handleGenerateDescription} disabled={generating}
                        style={{
                            padding: '4px 12px', fontSize: 12,
                            background: generating ? '#64748b' : '#3b82f6',
                            color: '#fff', border: 'none', borderRadius: 6,
                            cursor: generating ? 'wait' : 'pointer', fontWeight: 600,
                        }}>
                        {generating ? '⏳ Генерация...' : '✨ Сгенерировать'}
                    </button>
                </div>
                {aiDescription && (
                    <div style={{
                        fontSize: 13, lineHeight: 1.7, color: tM,
                        whiteSpace: 'pre-wrap', padding: 10,
                        background: bg, borderRadius: 8, border: `1px solid ${brd}`,
                    }}>
                        {aiDescription}
                    </div>
                )}
            </div>

            {/* Share link */}
            <div style={{
                padding: 14, borderRadius: 10, background: bgI, border: `1px solid ${brd}`,
            }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: tM, marginBottom: 8 }}>🔗 {t('table.shareLink') || 'Ссылка'}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => shareResult(comparison)}
                        style={{
                            flex: 1, padding: '8px 14px', fontSize: 13,
                            background: shareLink ? '#22c55e22' : '#3b82f6',
                            color: shareLink ? '#22c55e' : '#fff',
                            border: shareLink ? `1px solid #22c55e` : 'none',
                            borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                        }}>
                        {shareLink ? '✅ Создана' : '📤 Создать ссылку'}
                    </button>
                    {shareLink && (
                        <button onClick={handleCopyLink}
                            style={{
                                padding: '8px 14px', fontSize: 13,
                                background: copied ? '#22c55e' : bg,
                                color: copied ? '#fff' : tM,
                                border: `1px solid ${brd}`, borderRadius: 8,
                                cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
                            }}>
                            {copied ? '✓ Скопировано' : '📋 Копировать'}
                        </button>
                    )}
                </div>
                {shareLink && (
                    <div style={{
                        marginTop: 8, padding: '6px 10px', fontSize: 12,
                        background: bg, borderRadius: 6, border: `1px solid ${brd}`,
                        color: tS, fontFamily: 'monospace', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {shareLink}
                    </div>
                )}
                <div style={{ fontSize: 11, color: tS, marginTop: 6 }}>
                    {t('table.hours24') || 'Доступна 24 часа'}
                </div>
            </div>

            {/* Summary card */}
            {comparison && comparison.rows && (
                <div style={{
                    padding: 14, borderRadius: 10,
                    background: isDark ? '#1e293b' : '#f8fafc',
                    border: `1px solid ${brd}`,
                }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: tS, marginBottom: 8, textTransform: 'uppercase' }}>
                        {t('table.preview') || 'Превью'}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: tM }}>{topic}</div>
                    <div style={{ fontSize: 12, color: tS, marginTop: 4 }}>
                        {comparison.rows.length} объектов · {comparison.columns.length} критериев
                        {lastResult.votes && ` · ${lastResult.votes.length} агентов`}
                    </div>
                </div>
            )}
        </div>
    );
}
