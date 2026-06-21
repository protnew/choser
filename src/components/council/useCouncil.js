import React, { useState, useCallback, useEffect } from 'react';

const TEST_TOPIC = 'Какую подписку на LLM-сервис выбрать?\n\nКонтекст: Сравнение 10 подписок на LLM-сервисы по 18 параметрам: цена, лимиты токенов, количество моделей, качество кода, мультимодальность, контекстное окно, API доступ, скорость ответа, fine-tuning, безопасность, поддержка RAG, агенты, интеграции, документация, community, SLA, цена за 1M токенов ввода, цена за 1M токенов вывода. Бюджет: до $200/мес. Цель: выбор оптимальной подписки для AI-разработки.';

export function useCouncil(tableId) {
    const [personas, setPersonas] = useState([]);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [editing, setEditing] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', role: 'advisor', system_prompt: '', model: 'openai/gpt-4o-mini', temperature: 0.7 });
    const [loaded, setLoaded] = useState(false);

    const loadPersonas = useCallback(async () => {
        try {
            const token = localStorage.getItem('choser_token');
            const resp = await fetch('/v1/api/council/personas', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            const data = await resp.json();
            if (data.personas) setPersonas(data.personas);
            setLoaded(true);
        } catch (e) { console.error('Failed to load personas', e); setLoaded(true); }
    }, []);

    useEffect(() => { loadPersonas(); }, [loadPersonas]);

    const togglePersona = async (id, currentEnabled) => {
        const newEnabled = currentEnabled ? 0 : 1;
        setPersonas(prev => prev.map(p => p.id === id ? { ...p, enabled: newEnabled } : p));
        try {
            const token = localStorage.getItem('choser_token');
            await fetch(`/v1/api/council/personas/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ enabled: newEnabled }) });
        } catch (e) { console.error(e); }
    };

    const startEdit = (persona) => {
        setEditing(persona.id);
        setEditForm({ name: persona.name, role: persona.role, system_prompt: persona.system_prompt, model: persona.model || 'openai/gpt-4o-mini', temperature: persona.temperature ?? 0.7 });
    };

    const saveEdit = async () => {
        try {
            const token = localStorage.getItem('choser_token');
            await fetch(`/v1/api/council/personas/${editing}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(editForm) });
            setEditing(null);
            loadPersonas();
        } catch (e) { alert('Ошибка сохранения: ' + e.message); }
    };

    const deletePersona = async (id) => {
        if (!confirm('Удалить персону?')) return;
        try {
            const token = localStorage.getItem('choser_token');
            await fetch(`/v1/api/council/personas/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
            loadPersonas();
        } catch (e) { alert('Ошибка: ' + e.message); }
    };

    const addPersona = async () => {
        const name = prompt('Имя персоны:');
        if (!name) return;
        try {
            const token = localStorage.getItem('choser_token');
            await fetch('/v1/api/council/personas', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ name, role: 'advisor', system_prompt: `Ты — ${name}, эксперт-аналитик.`, model: 'openai/gpt-4o-mini' }) });
            loadPersonas();
        } catch (e) { alert('Ошибка: ' + e.message); }
    };

    const runCouncil = async (overrideTopic, numObjects, numParams) => {
        if (!loaded) { alert('Персоны ещё загружаются, подождите...'); return; }
        setRunning(true); setResult(null);
        try {
            const token = localStorage.getItem('choser_token');
            const body = { tableId };
            if (overrideTopic) body.topic = overrideTopic;
            if (numObjects) body.numObjects = numObjects;
            if (numParams) body.numParams = numParams;
            const resp = await fetch('/v1/api/council/decide', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
            const data = await resp.json();
            if (data.error) throw new Error(data.error);
            setResult(data);
        } catch (e) { setResult({ error: e.message }); }
        finally { setRunning(false); }
    };

    const runTestCouncil = () => runCouncil(TEST_TOPIC);

    return { personas, running, result, editing, editForm, setEditForm, togglePersona, startEdit, saveEdit, deletePersona, addPersona, runCouncil, runTestCouncil, setEditing, loaded };
}
