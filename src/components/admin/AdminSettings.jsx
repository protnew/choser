import React, { useState, useEffect } from 'react';
import { API } from '../../utils/api';

const AVAILABLE_MODELS = [
    { id: '', label: 'По умолчанию (chain)' },
    { id: 'glm-5.1', label: 'GLM-5.1' },
    { id: 'glm-5', label: 'GLM-5' },
    { id: 'glm-5-turbo', label: 'GLM-5 Turbo' },
    { id: 'glm-4.7', label: 'GLM-4.7' },
    { id: 'glm-4.7-flash', label: 'GLM-4.7 Flash' },
    { id: 'glm-4.7-flashx', label: 'GLM-4.7 FlashX' },
];

export default function AdminSettings({ theme }) {
    const [personas, setPersonas] = useState([]);
    const [systemPrompt, setSystemPrompt] = useState('');
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(null);
    const [msg, setMsg] = useState('');

    const dark = theme === 'dark';
    const bg = dark ? '#1e293b' : '#f9fafb';
    const cardBg = dark ? '#0f172a' : '#fff';
    const border = dark ? '#334155' : '#e2e8f0';
    const text = dark ? '#e2e8f0' : '#1e293b';
    const muted = dark ? '#94a3b8' : '#64748b';

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [settingsData, personasData] = await Promise.all([
                API.get('/api/admin/settings'),
                API.get('/api/council/personas')
            ]);
            // EDP format: { settings: { key: { value: ..., updated_at: ... } } }
            if (settingsData?.settings) {
                setSettings(settingsData.settings);
                const sp = settingsData.settings.system_prompt;
                setSystemPrompt(sp?.value || '');
            } else if (settingsData?.system_prompt) {
                setSystemPrompt(settingsData.system_prompt);
            }
            if (personasData?.personas) setPersonas(personasData.personas);
        } catch (e) { console.error('Settings load error:', e); }
        setLoading(false);
    };

    const saveSystemPrompt = async () => {
        setSaving('_prompt');
        try {
            // Try PUT endpoint first (EDP format)
            const r = await API.put('/api/admin/settings/system_prompt', { value: systemPrompt });
            if (r && !r.error) {
                setMsg('✅ Промпт сохранён');
            } else {
                // Fallback to POST
                const r2 = await API.post('/api/admin/settings', { id: 'system_prompt', value: systemPrompt });
                setMsg(r2?.success ? '✅ Промпт сохранён' : '❌ ' + (r2?.error || 'Ошибка'));
            }
        } catch (e) {
            setMsg('❌ ' + e.message);
        }
        setSaving(null);
        setTimeout(() => setMsg(''), 3000);
    };

    const togglePersona = async (id, currentEnabled) => {
        const newEnabled = currentEnabled ? 0 : 1;
        setSaving(id);
        try {
            await API.put(`/api/council/personas/${id}`, { enabled: newEnabled });
            setPersonas(prev => prev.map(p => p.id === id ? { ...p, enabled: newEnabled } : p));
        } catch (e) { console.error(e); }
        setSaving(null);
    };

    const updatePersona = (id, field, value) => {
        setPersonas(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
        // Debounced auto-save
        clearTimeout(window._personaSaveTimer?.[id]);
        if (!window._personaSaveTimer) window._personaSaveTimer = {};
        window._personaSaveTimer[id] = setTimeout(async () => {
            const p = personas.find(x => x.id === id);
            if (!p) return;
            try {
                await API.put(`/api/council/personas/${id}`, {
                    model: p.model, temperature: p.temperature, weight: p.weight,
                    system_prompt: p.system_prompt, name: p.name,
                });
                setMsg(`✅ ${p.emoji} ${p.name} автосохранение`);
                setTimeout(() => setMsg(''), 1500);
            } catch (e) { console.error(e); }
        }, 800);
    };

    const [councilMode, setCouncilMode] = useState('sequential');

    const [newAgent, setNewAgent] = useState({ name: '', role: 'Custom', system_prompt: '', emoji: '🤖' });

    const addNewAgent = async () => {
        if (!newAgent.name.trim()) { setMsg('❌ Введите имя агента'); setTimeout(() => setMsg(''), 3000); return; }
        try {
            await API.post('/api/council/personas', {
                id: 'custom_' + Date.now(),
                name: newAgent.name.trim(),
                role: newAgent.role,
                system_prompt: newAgent.system_prompt || `Ты — ${newAgent.name.trim()}. Анализируй и давай рекомендации.`,
                enabled: 1,
                sort_order: personas.length + 1,
                temperature: 0.5,
                weight: 1.0,
                model: '',
            });
            setNewAgent({ name: '', role: 'Custom', system_prompt: '', emoji: '🤖' });
            await loadAll();
            setMsg('✅ Агент добавлен');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) { setMsg('❌ ' + e.message); setTimeout(() => setMsg(''), 3000); }
    };

    const deleteAgent = async (id) => {
        if (!confirm('Удалить этого агента?')) return;
        try {
            await API.delete(`/api/council/personas/${id}`);
            await loadAll();
            setMsg('✅ Агент удалён');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) { setMsg('❌ ' + e.message); setTimeout(() => setMsg(''), 3000); }
    };

    // Council profiles/presets
    const PROFILES = [
        {
            name: '📊 Универсальная таблица выбора',
            desc: 'Параметрическое сравнение с весами и коэффициентами. Максимальный консенсус.',
            emoji: '📊',
            weights: { ceo: 1.0, cfo: 1.2, ciso: 0.8, coo: 1.1, legal: 0.9, chro: 0.7, tech: 1.0, user_advocate: 1.3, critic: 1.1, editor: 0.5 },
            systemHint: 'Таблица параметрического сравнения объектов с весами коэффициентов. Анализируй данные как таблицу принятия решений.'
        },
        {
            name: '💰 Финансовое решение',
            desc: 'CFO и CEO имеют решающий голос. ROI, затраты, окупаемость.',
            emoji: '💰',
            weights: { ceo: 1.5, cfo: 2.0, ciso: 0.5, coo: 0.8, legal: 0.7, chro: 0.3, tech: 0.6, user_advocate: 0.5, critic: 1.0, editor: 0.5 },
            systemHint: 'Финансовое решение: оценивай ROI, затраты, окупаемость, бюджет, финансовые риски.'
        },
        {
            name: '🔒 Кибербезопасность',
            desc: 'CISO доминирует. Угрозы, уязвимости, комплаенс.',
            emoji: '🔒',
            weights: { ceo: 0.8, cfo: 0.6, ciso: 2.0, coo: 0.7, legal: 1.3, chro: 0.3, tech: 1.2, user_advocate: 0.4, critic: 1.0, editor: 0.5 },
            systemHint: 'Решение по кибербезопасности: оценивай угрозы, уязвимости, комплаенс, инциденты.'
        },
        {
            name: '🚀 Технологический выбор',
            desc: 'CTO и Tech Lead решают. Архитектура, стек, масштабируемость.',
            emoji: '🚀',
            weights: { ceo: 0.8, cfo: 0.7, ciso: 0.8, coo: 0.6, legal: 0.5, chro: 0.4, tech: 2.0, user_advocate: 0.8, critic: 1.2, editor: 0.5 },
            systemHint: 'Технологический выбор: оценивай архитектуру, стек, масштабируемость, производительность.'
        },
        {
            name: '⚖️ Юридический/Комплаенс',
            desc: 'Юрисконсульт и Legal доминируют. Риски, регуляция, договоры.',
            emoji: '⚖️',
            weights: { ceo: 0.7, cfo: 0.8, ciso: 1.0, coo: 0.6, legal: 2.0, chro: 0.5, tech: 0.4, user_advocate: 0.5, critic: 1.3, editor: 0.5 },
            systemHint: 'Юридическое решение: оценивай правовые риски, регуляцию, договоры, комплаенс.'
        },
        {
            name: '👥 HR и команда',
            desc: 'CHRO и User Advocate на первом плане. Люди, культура, найм.',
            emoji: '👥',
            weights: { ceo: 0.8, cfo: 0.6, ciso: 0.3, coo: 1.0, legal: 0.5, chro: 2.0, tech: 0.4, user_advocate: 1.5, critic: 0.8, editor: 0.5 },
            systemHint: 'HR решение: оценивай влияние на команду, культуру, найм, обучение, мотивацию.'
        },
        {
            name: '🏗️ Операционное решение',
            desc: 'COO и CEO ведут. Процессы, сроки, ресурсы.',
            emoji: '🏗️',
            weights: { ceo: 1.3, cfo: 0.8, ciso: 0.5, coo: 2.0, legal: 0.6, chro: 0.8, tech: 0.7, user_advocate: 0.6, critic: 1.0, editor: 0.5 },
            systemHint: 'Операционное решение: оценивай процессы, сроки, ресурсы, эффективность, узкие места.'
        },
        {
            name: '🎯 Критический анализ',
            desc: 'Критик доминирует. Найти слабые места, риски, альтернативы.',
            emoji: '🎯',
            weights: { ceo: 0.7, cfo: 0.8, ciso: 0.8, coo: 0.7, legal: 0.8, chro: 0.5, tech: 0.7, user_advocate: 0.8, critic: 2.5, editor: 0.5 },
            systemHint: 'Критический анализ: ищи слабые места, скрытые риски, слишком оптимистичные допущения.'
        },
        {
            name: '🏛️ Совет директоров (баланс)',
            desc: 'Все равны. Классический баланс интересов.',
            emoji: '🏛️',
            weights: { ceo: 1.0, cfo: 1.0, ciso: 1.0, coo: 1.0, legal: 1.0, chro: 1.0, tech: 1.0, user_advocate: 1.0, critic: 1.0, editor: 0.5 },
            systemHint: 'Сбалансированное решение Совета директоров: учитывай все аспекты equally.'
        },
        {
            name: '⚡ Быстрое решение (3 агента)',
            desc: 'Только CEO, CFO и Critic. Быстро и жёстко.',
            emoji: '⚡',
            weights: { ceo: 1.5, cfo: 1.5, ciso: 0, coo: 0, legal: 0, chro: 0, tech: 0, user_advocate: 0, critic: 1.5, editor: 0 },
            systemHint: 'Быстрое решение: CEO + CFO + Critic. Минимум дискуссии, максимум скорости.'
        },
    ];

    const applyProfile = async (profile) => {
        try {
            for (const p of personas) {
                const newWeight = profile.weights[p.id] ?? p.weight;
                const newEnabled = newWeight > 0 ? 1 : 0;
                await API.put(`/api/council/personas/${p.id}`, {
                    weight: newWeight,
                    enabled: newEnabled,
                });
            }
            await loadAll();
            setMsg(`✅ Профиль «${profile.name}» применён`);
            setTimeout(() => setMsg(''), 3000);
        } catch (e) { setMsg('❌ ' + e.message); setTimeout(() => setMsg(''), 3000); }
    };

    const inputStyle = {
        padding: '6px 10px', border: `1px solid ${border}`, borderRadius: '6px',
        background: cardBg, color: text, fontSize: '13px', width: '100%', boxSizing: 'border-box'
    };

    if (loading) return <div style={{ padding: '20px', color: muted }}>Загрузка настроек...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {msg && <div style={{ padding: '8px 16px', background: '#22c55e22', border: '1px solid #22c55e', borderRadius: '8px', color: '#22c55e', fontSize: '13px' }}>{msg}</div>}

            {/* System Prompt */}
            <div style={{ background: bg, padding: '20px', borderRadius: '8px', border: `1px solid ${border}` }}>
                <h3 style={{ margin: '0 0 8px', color: text }}>🤖 Системный промпт для AI</h3>
                <p style={{ fontSize: '12px', color: muted, margin: '0 0 12px' }}>Определяет поведение AI при генерации таблиц.</p>
                <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                    style={{ ...inputStyle, height: '200px', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }} />
                <button onClick={saveSystemPrompt} disabled={saving === '_prompt'}
                    style={{ marginTop: '10px', padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', opacity: saving === '_prompt' ? 0.5 : 1 }}>
                    {saving === '_prompt' ? '⏳' : '💾'} Сохранить промпт
                </button>
            </div>

            {/* Council Personas */}
            <div style={{ background: bg, padding: '20px', borderRadius: '8px', border: `1px solid ${border}` }}>
                <h3 style={{ margin: '0 0 4px', color: text }}>🎭 Совет агентов (Council)</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <p style={{ fontSize: '12px', color: muted, margin: 0 }}>
                        10 директоров для параметрических таблиц выбора. Все изменения автосохраняются.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: muted }}>Режим:</span>
                        <button onClick={() => setCouncilMode('sequential')} style={{ padding: '3px 8px', border: councilMode === 'sequential' ? '2px solid #3b82f6' : '1px solid ' + border, borderRadius: '4px', background: councilMode === 'sequential' ? '#3b82f622' : cardBg, color: councilMode === 'sequential' ? '#3b82f6' : muted, cursor: 'pointer', fontSize: '10px', fontWeight: councilMode === 'sequential' ? 600 : 400 }}>🔄 По очереди</button>
                        <button onClick={() => setCouncilMode('parallel')} style={{ padding: '3px 8px', border: councilMode === 'parallel' ? '2px solid #22c55e' : '1px solid ' + border, borderRadius: '4px', background: councilMode === 'parallel' ? '#22c55e22' : cardBg, color: councilMode === 'parallel' ? '#22c55e' : muted, cursor: 'pointer', fontSize: '10px', fontWeight: councilMode === 'parallel' ? 600 : 400 }}>⚡ Параллельно</button>
                    </div>
                    <button onClick={async () => {
                        if (!confirm('Сбросить всех директоров на значения по умолчанию?')) return;
                        try {
                            await API.post('/api/council/personas/reset');
                            await loadAll();
                            setMsg('✅ Директора сброшены');
                            setTimeout(() => setMsg(''), 3000);
                        } catch (e) { setMsg('❌ ' + e.message); }
                    }} style={{ padding: '6px 14px', background: '#ef444422', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        🔄 Сброс на defaults
                    </button>
                </div>

                {/* Profiles */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: text, marginBottom: '6px' }}>🎯 Профили решений (быстрая настройка весов)</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {PROFILES.map((p, i) => (
                            <button key={i} onClick={() => applyProfile(p)} title={p.desc}
                                style={{ padding: '6px 12px', background: dark ? '#1e293b' : '#f0f9ff', border: `1px solid ${border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: text, whiteSpace: 'nowrap' }}>
                                {p.emoji} {p.name.replace(p.emoji + ' ', '')}
                            </button>
                        ))}
                    </div>
                </div>

                {personas.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: muted }}>
                        Персон пока нет. Нажмите «+ Новый агент» ниже.
                    </div>
                )}

                {/* Add new agent form */}
                <div style={{ background: dark ? '#1e293b' : '#f0f9ff', border: `2px dashed ${border}`, borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '18px' }}>{newAgent.emoji}</span>
                        <input placeholder="Имя агента" value={newAgent.name} onChange={e => setNewAgent(p => ({...p, name: e.target.value}))}
                            style={{ ...inputStyle, width: '180px' }} />
                        <input placeholder="Эмодзи" value={newAgent.emoji} onChange={e => setNewAgent(p => ({...p, emoji: e.target.value}))}
                            style={{ ...inputStyle, width: '50px', textAlign: 'center' }} />
                        <input placeholder="Системный промпт (необязательно)" value={newAgent.system_prompt} onChange={e => setNewAgent(p => ({...p, system_prompt: e.target.value}))}
                            style={{ ...inputStyle, flex: 1, minWidth: '200px' }} />
                        <button onClick={addNewAgent}
                            style={{ padding: '6px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            ➕ Новый агент
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {personas.map((p, idx) => (
                        <div key={p.id} style={{
                            background: cardBg, border: `1px solid ${border}`, borderRadius: '8px',
                            padding: '16px', opacity: p.enabled ? 1 : 0.5,
                            transition: 'opacity 0.2s'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                {/* Order number + up/down */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#6366f1' }}>#{idx + 1}</span>
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                        <button onClick={async () => {
                                            if (idx === 0) return;
                                            const newOrder = personas.map(p => p.id);
                                            [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
                                            try { await API.put('/api/council/personas/reorder', { order: newOrder }); await loadAll(); } catch (e) {}
                                        }} disabled={idx === 0} style={{ padding: '1px 5px', fontSize: '10px', border: '1px solid ' + border, borderRadius: 3, background: cardBg, cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                                        <button onClick={async () => {
                                            if (idx === personas.length - 1) return;
                                            const newOrder = personas.map(p => p.id);
                                            [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                                            try { await API.put('/api/council/personas/reorder', { order: newOrder }); await loadAll(); } catch (e) {}
                                        }} disabled={idx === personas.length - 1} style={{ padding: '1px 5px', fontSize: '10px', border: '1px solid ' + border, borderRadius: 3, background: cardBg, cursor: idx === personas.length - 1 ? 'default' : 'pointer', opacity: idx === personas.length - 1 ? 0.3 : 1 }}>▼</button>
                                    </div>
                                </div>

                                <button onClick={() => togglePersona(p.id, p.enabled)}
                                    style={{
                                        width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer',
                                        background: p.enabled ? '#22c55e' : '#64748b', position: 'relative',
                                        transition: 'background 0.2s', flexShrink: 0
                                    }}>
                                    <div style={{
                                        width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                                        position: 'absolute', top: '3px',
                                        left: p.enabled ? '25px' : '3px',
                                        transition: 'left 0.2s'
                                    }} />
                                </button>

                                <span style={{ fontSize: '20px' }}>{p.emoji}</span>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: text }}>{p.name}</span>
                                <span style={{ fontSize: '11px', color: muted, background: dark ? '#1e293b' : '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                                    {p.role}
                                </span>

                                <select value={p.model || ''} onChange={e => updatePersona(p.id, 'model', e.target.value)}
                                    style={{ ...inputStyle, width: 'auto', minWidth: '160px' }}>
                                    {AVAILABLE_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                </select>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', color: muted }}>🌡️</span>
                                    <input type="range" min="0" max="1" step="0.1"
                                        value={p.temperature} onChange={e => updatePersona(p.id, 'temperature', parseFloat(e.target.value))}
                                        style={{ width: '80px' }} />
                                    <span style={{ fontSize: '12px', color: text, minWidth: '28px' }}>{p.temperature}</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', color: muted }}>⚖️</span>
                                    <input type="number" min="0.1" max="2" step="0.1"
                                        value={p.weight} onChange={e => updatePersona(p.id, 'weight', parseFloat(e.target.value))}
                                        style={{ ...inputStyle, width: '60px', textAlign: 'center' }} />
                                </div>

                                {p.id.startsWith('custom_') && (
                                    <button onClick={() => deleteAgent(p.id)}
                                        style={{ padding: '4px 8px', background: '#ef444422', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                        🗑️
                                    </button>
                                )}
                            </div>

                            <textarea value={p.system_prompt || ''} onChange={e => updatePersona(p.id, 'system_prompt', e.target.value)}
                                placeholder="Системный промпт агента..."
                                style={{
                                    ...inputStyle, height: '60px', fontSize: '12px', fontFamily: 'monospace',
                                    resize: 'vertical', opacity: p.enabled ? 1 : 0.6
                                }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
