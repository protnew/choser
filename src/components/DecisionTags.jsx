import React, { useState } from 'react';

const PRESET_TAGS = ['✅ принято', '❌ отклонено', '⏳ отложено', '🔄 пересмотр', '🎯最优', '💰 дорого', '⚡ быстро', '🔒 безопасно', '📈 рост', '⚠️ риск'];

export default function DecisionTags({ tableId, result, isDark, brd, bgI, tS, tM }) {
    const [tags, setTags] = useState([]);
    const [note, setNote] = useState('');
    const [saved, setSaved] = useState(false);

    const addTag = (tag) => {
        if (!tags.includes(tag)) setTags(prev => [...prev, tag]);
        setSaved(false);
    };

    const removeTag = (tag) => {
        setTags(prev => prev.filter(t => t !== tag));
        setSaved(false);
    };

    const save = async () => {
        try {
            const token = localStorage.getItem('choser_token');
            await fetch(`/v1/api/tables/${tableId}/decision-tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({
                    tags,
                    note,
                    winner: result?.consensus?.recommendation || null,
                    score: result?.consensus?.score || null,
                    tokens: result?.tokens || null,
                    ts: Date.now()
                })
            });
            setSaved(true);
        } catch (e) {
            console.error('Failed to save tags', e);
        }
    };

    return (
        <div style={{ marginTop: 12, padding: 14, borderRadius: 8, border: `1px solid ${brd}`, background: bgI }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>🏷️ Теги решения</div>

            {/* Preset tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {PRESET_TAGS.map(tag => (
                    <button key={tag} onClick={() => addTag(tag)}
                        style={{ padding: '3px 8px', borderRadius: 4, fontSize: 12, border: `1px solid ${brd}`, background: tags.includes(tag) ? '#3b82f6' : 'transparent', color: tags.includes(tag) ? '#fff' : tS, cursor: 'pointer' }}>
                        {tag}
                    </button>
                ))}
            </div>

            {/* Active tags */}
            {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {tags.map(tag => (
                        <span key={tag} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 12, background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f640' }}>
                            {tag} <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => removeTag(tag)}>×</span>
                        </span>
                    ))}
                </div>
            )}

            {/* Note */}
            <textarea placeholder="Заметка к решению..." value={note} onChange={e => { setNote(e.target.value); setSaved(false); }}
                style={{ width: '100%', minHeight: 40, padding: 6, borderRadius: 4, border: `1px solid ${brd}`, background: isDark ? '#0f172a' : '#fff', color: tM, fontSize: 12, resize: 'vertical' }} />

            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={save} style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: saved ? '#10b981' : '#3b82f6', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                    {saved ? '✅ Сохранено' : '💾 Сохранить'}
                </button>
            </div>
        </div>
    );
}
