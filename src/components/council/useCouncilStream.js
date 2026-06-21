import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { API } from '../../utils/api';
import { buildComparisonTable, stripMarkdown } from '../../utils/councilTable.js';
import { ChoserLog } from '../../utils/log';

const DRAFT_KEY = 'choser_decision_draft';
const RESULT_KEY = 'choser_last_result';
const HISTORY_KEY = 'choser_council_history';

export function useCouncilStream() {
    // BUG 5 FIX: lazy initializer — _loadDraft вызывается только один раз, не на каждом рендере
    const [draft] = useState(() => { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); } catch { return {}; } });

    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [topic, setTopic] = useState(draft.topic || '');
    const [topicDesc, setTopicDesc] = useState(draft.topicDesc || '');
    const [numParameters, setNumParameters] = useState(draft.numParameters || 5);
    const [numObjects, setNumObjects] = useState(draft.numObjects || 3);
    const [personas, setPersonas] = useState([]);
    const [input, setInput] = useState('');
    const [running, setRunning] = useState(false);
    const [enabledAgents, setEnabledAgents] = useState(draft.enabledAgents || {});
    const [mode, setMode] = useState(draft.mode || 'sequential');
    const [searchMode, setSearchMode] = useState(draft.searchMode || 'none'); // 'none' | 'single' | 'multi'
    const [loaded, setLoaded] = useState(false);
    const [lastResult, setLastResult] = useState(() => { try { const r = sessionStorage.getItem(RESULT_KEY); return r ? JSON.parse(r) : null; } catch { return null; } });
    // BUG 6 FIX: бессмысленное условие lastResult ? 'table' : 'table' упрощено
    const [activeTab, setActiveTab] = useState('table');
    const [saveStatus, setSaveStatus] = useState('');
    const [shareLink, setShareLink] = useState('');
    const [agentStatuses, setAgentStatuses] = useState({}); // { personaId: { status, duration_ms, tokens_in, tokens_out, recommendation } }
    const [currentThinking, setCurrentThinking] = useState(null); // { id, name, emoji } of currently thinking agent
    const [tokenBudget, setTokenBudget] = useState(draft.tokenBudget || 200000);
    const [wantTree, setWantTree] = useState(false);
    const [maxDuration, setMaxDuration] = useState(draft.maxDuration || 20);
    const [runStartMs, setRunStartMs] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [councilWarning, setCouncilWarning] = useState(null);       // { type, empty_cells, fill_rate, message }
    const [councilRecommendation, setCouncilRecommendation] = useState(null); // { current, suggested, suggestions, token_estimate }
    const [councilHistory, setCouncilHistory] = useState(() => {
        try { const p = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
    });
    const [deletedHistory, setDeletedHistory] = useState(() => {
        try { const p = JSON.parse(localStorage.getItem(HISTORY_KEY + '_deleted') || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
    });
    const abortRef = useRef(null);

    const saveToHistory = useCallback((result, topicStr) => {
        try {
            const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            // Fix #1: Number duplicate names
            const sameTopicCount = hist.filter(h => {
                const base = h.topic.replace(/\s*#\d+$/, '');
                return base === (topicStr || '—');
            }).length;
            let displayTopic = topicStr || '—';
            if (sameTopicCount > 0) {
                displayTopic = `${topicStr} #${sameTopicCount + 1}`;
            }
            hist.unshift({ id: Date.now(), topic: displayTopic, timestamp: new Date().toISOString(), result });
            if (hist.length > 20) hist.pop();
            localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
            setCouncilHistory(hist);
        } catch {}
    }, []);

    const loadFromHistory = useCallback((result, topicStr) => {
        setLastResult(result);
        if (topicStr) setTopic(topicStr);
        setActiveTab('table');
    }, [setLastResult, setTopic]);

    const clearHistory = useCallback(() => {
        localStorage.removeItem(HISTORY_KEY);
        setCouncilHistory([]);
    }, []);

    // Fix #2/#3: Delete / rename / restore / permanent delete
    const deleteHistory = useCallback((id) => {
        const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const item = hist.find(h => h.id === id);
        if (!item) return;
        const remaining = hist.filter(h => h.id !== id);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(remaining));
        setCouncilHistory(remaining);
        const deleted = JSON.parse(localStorage.getItem(HISTORY_KEY + '_deleted') || '[]');
        deleted.unshift({ ...item, deletedAt: new Date().toISOString() });
        localStorage.setItem(HISTORY_KEY + '_deleted', JSON.stringify(deleted));
        setDeletedHistory(deleted);
    }, []);

    const renameHistory = useCallback((id, newTopic) => {
        const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const updated = hist.map(h => h.id === id ? { ...h, topic: newTopic } : h);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        setCouncilHistory(updated);
    }, []);

    const restoreHistory = useCallback((id) => {
        const deleted = JSON.parse(localStorage.getItem(HISTORY_KEY + '_deleted') || '[]');
        const item = deleted.find(d => d.id === id);
        if (!item) return;
        const remDeleted = deleted.filter(d => d.id !== id);
        localStorage.setItem(HISTORY_KEY + '_deleted', JSON.stringify(remDeleted));
        setDeletedHistory(remDeleted);
        const { deletedAt, ...restored } = item;
        const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        hist.unshift(restored);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
        setCouncilHistory(hist);
    }, []);

    const permanentDeleteHistory = useCallback((id) => {
        const deleted = JSON.parse(localStorage.getItem(HISTORY_KEY + '_deleted') || '[]');
        const remaining = deleted.filter(d => d.id !== id);
        localStorage.setItem(HISTORY_KEY + '_deleted', JSON.stringify(remaining));
        setDeletedHistory(remaining);
    }, []);

    const emptyTrash = useCallback(() => {
        localStorage.setItem(HISTORY_KEY + '_deleted', JSON.stringify([]));
        setDeletedHistory([]);
    }, []);

    // Fix #4: Stop council via AbortController
    const stopCouncil = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setRunning(false);
        setCurrentThinking(null);
    }, []);

    // Fix #9: Move history item to different time group (drag-and-drop)
    const moveHistory = useCallback((id, targetGroup) => {
        const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let newTimestamp;
        switch (targetGroup) {
            case 'today': newTimestamp = now.toISOString(); break;
            case 'yesterday': newTimestamp = new Date(today.getTime() - 86400000 + 3600000).toISOString(); break;
            case 'week': newTimestamp = new Date(today.getTime() - 3 * 86400000).toISOString(); break;
            case 'older': newTimestamp = new Date(today.getTime() - 10 * 86400000).toISOString(); break;
            default: return;
        }
        const updated = hist.map(h => h.id === id ? { ...h, timestamp: newTimestamp } : h);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        setCouncilHistory(updated);
    }, []);

    // Auto-save draft whenever form fields change
    useEffect(() => {
        const d = { topic, topicDesc, numParameters, numObjects, enabledAgents, mode, searchMode };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    }, [topic, topicDesc, numParameters, numObjects, enabledAgents, mode, searchMode]);

    // Auto-save lastResult whenever it changes
    useEffect(() => {
        if (lastResult) {
            try { sessionStorage.setItem(RESULT_KEY, JSON.stringify(lastResult)); } catch {}
        }
    }, [lastResult]);

    // Live timer
    useEffect(() => {
        if (!running || !runStartMs) return;
        const iv = setInterval(() => setElapsedMs(Date.now() - runStartMs), 200);
        return () => clearInterval(iv);
    }, [running, runStartMs]);

    // Init: load tables + personas
    useEffect(() => {
        API.get('/v1/api/tables?limit=50').then(d => { const t = d.tables || d; setTables(Array.isArray(t) ? t : []); }).catch(() => {});
        (async () => {
            try {
                if (!API.token) {
                    for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 300)); if (API.token) break; }
                    try { const d = await API.post('/v1/api/auth/dev-login', { role: 'admin' }); if (d.token) API.setToken(d.token); } catch {}
                }
                const d = await API.get('/v1/api/personas');
                setPersonas((d.personas || []).filter(p => p.enabled));
                // BUG 3 FIX: не перезаписывать enabledAgents из draft'а пользователя
                if (!draft.enabledAgents || Object.keys(draft.enabledAgents).length === 0) {
                    const init = {};
                    (d.personas || []).filter(p => p.enabled).forEach(p => { init[p.id] = p.id === 'ceo' || p.id === 'cfo'; });
                    setEnabledAgents(init);
                }
                setLoaded(true);
            } catch {
                console.error('[DecisionPage] Init failed');
                setLoaded(true);
            }
        })();
    }, []);

    // BUG 1 FIX: обёрнут в useCallback с полными deps для устранения stale closure
    const runCouncil = useCallback(async () => {
        console.log('[Council] runCouncil called', { topic: topic.trim(), running, loaded });
        if (!topic.trim() || running || !loaded) return;

        // BUG 4 FIX: проверяем searchMode === 'stop' ДО setRunning(true)
        if (searchMode === 'stop') {
            setSearchMode('none');
            return;
        }

        setRunning(true); setLastResult(null); setActiveTab('table'); setAgentStatuses({}); setRunStartMs(Date.now()); setElapsedMs(0);
        setCouncilWarning(null); setCouncilRecommendation(null);
        try {
            // Capture current enabled agents as immutable snapshot for this run
            const activePersonas = personas.filter(p => enabledAgents[p.id] !== false);
            if (activePersonas.length === 0) { setRunning(false); return; }
            const body = { question: input || `Что рекомендуете по вопросу: ${topic}? ${topicDesc}`, mode, personaIds: activePersonas.map(p => p.id), searchMode, numParameters, numObjects, tokenBudget };
            if (selectedTable) body.tableId = selectedTable.id; else if (topic) body.topic = topic;

            // BUG 2 FIX: удалён мёртвый код handleAgentToggle (нигде не использовался)

            // Mark enabled agents as "waiting"
            const statuses = {};
            activePersonas.forEach(p => { statuses[p.id] = { status: mode === 'sequential' ? 'waiting' : 'thinking', duration_ms: 0, tokens_in: 0, tokens_out: 0 }; });
            setAgentStatuses({ ...statuses });
            if (mode === 'sequential' && activePersonas.length > 0) setCurrentThinking(activePersonas[0]);

            // Try SSE streaming, fallback to regular POST
            let usedSSE = false;
            let reader = null;
            const controller = new AbortController();
            abortRef.current = controller;

            try {
                const token = API.token || localStorage.getItem('choser_token');
                const resp = await fetch('/v1/api/council/decide-stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });

                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

                usedSSE = true;
                const votes = [];
                reader = resp.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let consensus = null;
                let editorSummary = null;
                let totalTokens = { input: 0, output: 0 };
                let meta = {};

                // Parse SSE lines helper
                let sseEventType = '';
                let tableFromSSE = null;
                const parseSSELines = (lines) => {
                    for (const line of lines) {
                        if (line.startsWith('event: ')) { sseEventType = line.substring(7).trim(); continue; }
                        if (!line.startsWith('data: ')) continue;
                        let evt = {};
                        try { evt = JSON.parse(line.substring(6)); } catch { continue; }
                        const evType = sseEventType; sseEventType = '';
                        if (evType === 'table' || (evt.parameters && evt.objects)) {
                            tableFromSSE = evt.table || evt;
                        } else if (evType === 'vote' || (evt.persona && evt.name && evt.response !== undefined)) {
                            votes.push({ ...evt, weight: personas.find(p => p.id === evt.persona)?.weight || 1 });
                            totalTokens.input += evt.debug?.tokens_in || 0;
                            totalTokens.output += evt.debug?.tokens_out || 0;
                            setAgentStatuses(prev => ({ ...prev, [evt.persona]: { status: 'done', duration_ms: evt.debug?.duration_ms || 0, tokens_in: evt.debug?.tokens_in || 0, tokens_out: evt.debug?.tokens_out || 0, recommendation: evt.recommendation } }));
                            if (mode === 'sequential') {
                                const idx = activePersonas.findIndex(p => p.id === evt.persona);
                                const next = activePersonas[idx + 1];
                                if (next) { setAgentStatuses(prev => ({ ...prev, [next.id]: { status: 'thinking', duration_ms: 0, tokens_in: 0, tokens_out: 0 } })); setCurrentThinking(next); }
                                else setCurrentThinking(null);
                            }
                        } else if (evType === 'consensus' || (evt.recommendation && evt.votes !== undefined)) {
                            consensus = evt;
                        } else if (evType === 'warning') {
                            setCouncilWarning({ type: evt.type, empty_cells: evt.empty_cells, fill_rate: evt.fill_rate, message: evt.message });
                        } else if (evType === 'recommendation') {
                            setCouncilRecommendation({ current: evt.current, suggested: evt.suggested, suggestions: evt.suggestions, token_estimate: evt.token_estimate });
                        } else if (evType === 'error' || (evt.message && !evt.totalTokens)) {
                            console.warn('[Council] SSE error:', evt.message);
                        } else if (evt.totalTokens) {
                            meta = evt.meta || {}; totalTokens = evt.totalTokens;
                        }
                    }
                };

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    parseSSELines(lines);
                }

                // Process remaining buffer
                if (buffer.trim()) { parseSSELines(buffer.split('\n')); buffer = ''; }

                const sseResult = { votes, consensus, editorSummary, tableFromSSE, tokens: totalTokens, meta: { ...meta, total_duration_ms: votes.reduce((s, v) => s + (v.debug?.duration_ms || 0), 0) } };
                setLastResult(sseResult);
                saveToHistory(sseResult, topic);
            } catch (sseErr) {
                // SSE failed — fallback to regular POST
                console.warn('[Council] SSE failed, using POST fallback:', sseErr.message);
                const d = await API.post('/v1/api/council/decide', body);
                const doneSt = {}; activePersonas.forEach(p => { doneSt[p.id] = { status: 'done', duration_ms: 0, tokens_in: 0, tokens_out: 0 }; });
                setAgentStatuses(doneSt);
                setLastResult(d);
                saveToHistory(d, topic);
            }
        } catch (e) { setLastResult({ error: e.message }); }
        setRunning(false);
        setCurrentThinking(null);
    }, [topic, topicDesc, input, running, loaded, personas, enabledAgents, mode, searchMode, numParameters, numObjects, tokenBudget, selectedTable, saveToHistory]);

    const saveAsTable = async (comparison) => {
        if (!lastResult || !comparison) return;
        setSaveStatus('saving');
        try {
            // Build columns in exact Choser format
            const choserColumns = comparison.columns.map((c, i) => ({
                key: `param_${Date.now()}_${i}`,
                title: c.title,
                weight: c.weight,
                type: c.type || 'number'
            }));
            // Build rows in exact Choser format: { name, price, param_KEY: { grade, value }, link, notes }
            const choserRows = comparison.rows.map(r => {
                const clean = { name: r.name?.startsWith('👑 ') ? r.name.substring(3) : (r.name || '') };
                const priceStr = String(r.price || '');
                const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
                clean.price = priceNum;
                clean._priceLabel = priceStr !== '—' ? priceStr : '';
                clean.link = r.link || '';
                clean.notes = r.notes || '';
                for (let i = 0; i < comparison.columns.length; i++) {
                    const col = comparison.columns[i];
                    const cell = r[col.key];
                    const colKey = choserColumns[i].key;
                    if (typeof cell === 'object') {
                        clean[colKey] = { grade: cell.grade || 0, value: cell.value || '' };
                    } else {
                        clean[colKey] = { grade: 0, value: String(cell || '') };
                    }
                }
                return clean;
            });

            const created = await API.post('/v1/api/tables', {
                title: `Совет: ${topic}`,
                description: `${new Date().toLocaleString('ru')}. ${stripMarkdown(lastResult.editorSummary || '')}\n\n${(lastResult.votes || []).map(v => `${v.emoji} ${v.name}: ${v.recommendation || '—'}`).join('\n')}`,
                columns: choserColumns,
                data: choserRows,
            });
            setSaveStatus(created?.id ? 'saved' : 'error');
        } catch { setSaveStatus('error'); }
    };

    // Share result as UUID link (24h TTL)
    const shareResult = async (comparison) => {
        if (!lastResult || !comparison) return;
        try {
            const resp = await API.post('/v1/api/council/results', {
                topic: topic || 'Council Result',
                question: topicDesc || topic,
                result: lastResult,
            });
            if (resp.url) {
                setShareLink(resp.url);
                navigator.clipboard.writeText(resp.url).catch(() => {});
                setTimeout(() => setShareLink(''), 3000);
            }
        } catch (e) {
            console.error('[shareResult]', e);
        }
    };

    // Load shared result from URL ?result=UUID
    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const resultId = params.get('result');
        if (resultId && !lastResult) {
            (async () => {
                try {
                    const data = await API.get(`/v1/api/council/results/${resultId}`);
                    if (data.result) {
                        setLastResult(data.result);
                        setTopic(data.topic || '');
                        setTopicDesc(data.question || '');
                    }
                } catch (e) {
                    console.error('[loadSharedResult]', e);
                }
            })();
        }
    }, []);

    const comparison = useMemo(() => {
        ChoserLog.info('STREAM', 'useMemo comparison', { hasResult: !!lastResult, hasVotes: !!lastResult?.votes, hasSSE: !!lastResult?.tableFromSSE?.parameters?.length, hasChoser: !!lastResult?.choserTable?.columns?.length });
        if (!lastResult || lastResult.error) return null;
        // Prefer SSE table from backend editor
        if (lastResult.tableFromSSE?.parameters?.length) {
            const t = lastResult.tableFromSSE;
            const cols = (t.parameters || []).map((p, i) => ({
                key: `param_${i}`, title: p.name || p, weight: p.weight || Math.round(100 / (t.parameters.length || 1)), type: 'number', editable: false
            }));
            const rows = (t.objects || []).map((obj, ri) => {
                const row = { id: 'dec_' + ri, name: obj.name || `Объект ${ri+1}` };
                const scores = obj.scores || {};
                for (let i = 0; i < cols.length; i++) {
                    const pName = t.parameters[i]?.name || t.parameters[i];
                    const scoreData = scores[pName];
                    // Handle both {grade, value, source} and plain number
                    let grade, value, source;
                    if (typeof scoreData === 'object' && scoreData !== null) {
                        grade = typeof scoreData.grade === 'number' ? scoreData.grade : 0;
                        value = scoreData.value || scoreData.reason || `${grade}/10`;
                        source = scoreData.source || '';
                    } else {
                        grade = typeof scoreData === 'number' ? scoreData : 0;
                        value = `${grade}/10`;
                        source = '';
                    }
                    // Append source link to value if available
                    if (source && source.startsWith('http')) {
                        value = value + ` [🔗](${source})`;
                    } else if (source) {
                        value = value + ` (${source})`;
                    }
                    row[cols[i].key] = { grade, value };
                }
                // Price from backend
                const priceStr = String(obj.price || '');
                const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
                row.price = priceNum || priceStr;
                row.link = obj.link || '';
                row.notes = '';
                // Utility: weighted average using calc.js formula
                // Formula: score = Σ(grade_i × weight_i) / Σ(weight_i) × 100
                const allGrades = cols.map((c, ci) => {
                    const sd = scores[t.parameters[ci]?.name || t.parameters[ci]];
                    return typeof sd === 'object' ? (sd.grade ?? 0) : (typeof sd === 'number' ? sd : 0);
                });
                const totalW = cols.reduce((s, c) => s + (c.weight || 0), 0) || 1;
                const rawScore = allGrades.reduce((s, g, i) => s + g * (cols[i].weight || 0), 0);
                // FIX: match calc.js formula exactly — score = (rawScore/totalW) × 100 → [0, 1000]
                // Previous code had /10 making it [0,100], inconsistent with calc.js [0,1000]
                row._u = totalW > 0 ? rawScore / totalW * 100 : 0;  // scale: grade 10 → 1000 (matches calc.js)
                row._up = priceNum > 0 ? row._u / priceNum : 0;      // matches calc.js utilityPerPrice
                return row;
            });
            rows.sort((a, b) => (b._u || 0) - (a._u || 0));
            if (rows.length > 0 && rows[0]._u > 0) rows[0].name = '👑 ' + rows[0].name;
            return { rows, columns: cols };
        }
        // Prefer server-built Choser table
        if (lastResult.choserTable?.columns?.length && lastResult.choserTable?.rows?.length) return lastResult.choserTable;
        // Fallback to old vote-based table
        return buildComparisonTable(lastResult.votes || []);
    }, [lastResult, personas]); // BUG 9 FIX: добавлен personas в deps

    return {
        tables, selectedTable, setSelectedTable,
        topic, setTopic, topicDesc, setTopicDesc,
        numParameters, setNumParameters, numObjects, setNumObjects,
        personas, setPersonas,
        input, setInput,
        running, loaded,
        enabledAgents, setEnabledAgents,
        mode, setMode, searchMode, setSearchMode,
        lastResult, setLastResult,
        activeTab, setActiveTab,
        saveStatus, setSaveStatus, shareLink, setShareLink,
        agentStatuses, currentThinking, elapsedMs,
        councilWarning, councilRecommendation,
        tokenBudget, setTokenBudget, maxDuration, setMaxDuration, wantTree, setWantTree,
        runCouncil, stopCouncil, saveAsTable, shareResult,
        comparison,
        councilHistory, loadFromHistory, clearHistory,
        deletedHistory, deleteHistory, renameHistory,
        restoreHistory, permanentDeleteHistory, emptyTrash,
        moveHistory,
    };
}
