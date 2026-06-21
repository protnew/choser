import React, { useState, useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import {
    treeVertical, treeHorizontal,
    reactFlowOrthogonal, reactFlowDagre,
    d3TidyTree, d3ClusterForce,
    g6CompactBox, g6Radial,
    cytoscapeConcentric, cytoscapeGrid,
    lesMiserablesForce, lesMiserablesCircular,
    TREE_VIZ_OPTIONS,
} from '../../utils/echartsConfigs';
import { buildDecisionTree, flattenForGraph, TREE_CATEGORIES } from '../../utils/treeBuilder';

const API = import.meta.env.VITE_API_URL || '';
const STORAGE_KEY = 'choser_tree_state';

function loadTreeState() {
    try { const raw = sessionStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
}
function saveTreeState(state) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

/**
 * Apply initialTreeDepth to the ECharts option's FIRST series.
 * This is the ONLY correct way — ECharts reads series[0].initialTreeDepth, NOT option.initialTreeDepth.
 */
function applyExpand(option, expandAll) {
    if (!option || !option.series || !option.series[0]) return option;
    option.series[0].initialTreeDepth = expandAll ? -1 : 2;
    return option;
}

export default function TreeVizSelector({ rootName = 'Choser EDP', onSelectTable }) {
    const saved = loadTreeState();
    const [vizType, setVizType] = useState(saved?.vizType || 'tree-LR');
    const [tables, setTables] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeDomains, setActiveDomains] = useState(() => saved?.activeDomains ? new Set(saved.activeDomains) : new Set());
    const [winnersOnly, setWinnersOnly] = useState(saved?.winnersOnly || false);
    const [searchTerm, setSearchTerm] = useState(saved?.searchTerm || '');
    const [expandAll, setExpandAll] = useState(saved?.expandAll || false);

    const navigate = useNavigate();

    useEffect(() => {
        saveTreeState({ vizType, activeDomains: [...activeDomains], winnersOnly, searchTerm, expandAll });
    }, [vizType, activeDomains, winnersOnly, searchTerm, expandAll]);

    useEffect(() => { loadTables(); }, []);

    async function loadTables() {
        try {
            const res = await fetch(`${API}/v1/api/tables?limit=3000`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setTables(Array.isArray(json.data) ? json.data : Array.isArray(json.tables) ? json.tables : Array.isArray(json) ? json : []);
            setLoading(false);
        } catch (e) { setError(e.message); setLoading(false); }
    }

    function toggleDomain(name) {
        const next = new Set(activeDomains);
        next.has(name) ? next.delete(name) : next.add(name);
        setActiveDomains(next);
    }

    const filteredTables = useMemo(() => {
        if (!tables) return [];
        let result = tables;
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(t => ((t.title || '') + ' ' + (t.description || '') + ' ' + (t.tags || '')).toLowerCase().includes(q));
        }
        return result;
    }, [tables, searchTerm]);

    // Tree types only — graph/force types are separate
    const TREE_TYPES = new Set(['tree-TB', 'tree-LR', 'react-flow-ortho', 'react-flow-dagre', 'd3-tidy', 'g6-box', 'g6-radial', 'cyto-concentric', 'cyto-grid']);

    const option = useMemo(() => {
        if (!filteredTables.length) return null;

        const domains = activeDomains.size > 0 ? TREE_CATEGORIES.filter(c => activeDomains.has(c.name)) : TREE_CATEGORIES;
        const treeData = buildDecisionTree(filteredTables, rootName, domains, winnersOnly ? 1 : 0);

        // Graph types use flattened data, not tree structure
        if (vizType === 'lesmis-force' || vizType === 'lesmis-circular') {
            const flat = flattenForGraph(filteredTables, 100, domains);
            return vizType === 'lesmis-force' ? lesMiserablesForce(flat) : lesMiserablesCircular(flat);
        }

        // For d3-force, use capped graph to prevent crash
        if (vizType === 'd3-force') {
            return d3ClusterForce(treeData);
        }

        let opt;
        switch (vizType) {
            case 'tree-TB': opt = treeVertical(treeData); break;
            case 'tree-LR': opt = treeHorizontal(treeData); break;
            case 'react-flow-ortho': opt = reactFlowOrthogonal(treeData); break;
            case 'react-flow-dagre': opt = reactFlowDagre(treeData); break;
            case 'd3-tidy': opt = d3TidyTree(treeData); break;
            case 'g6-box': opt = g6CompactBox(treeData); break;
            case 'g6-radial': opt = g6Radial(treeData); break;
            case 'cyto-concentric': opt = cytoscapeConcentric(treeData); break;
            case 'cyto-grid': opt = cytoscapeGrid(treeData); break;
            default: opt = treeHorizontal(treeData);
        }

        // Apply expand/collapse to series[0] — the ONLY correct way
        return applyExpand(opt, expandAll);
    }, [vizType, filteredTables, rootName, activeDomains, expandAll, winnersOnly]);

    function onChartClick(params) {
        if (!params.data || !params.data.tableId) return;
        if (onSelectTable) onSelectTable(params.data.tableId);
        else navigate(`/table/${params.data.tableId}`);
    }

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#ffffff', fontSize: 16 }}>Загрузка таблиц...</div>;
    if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontSize: 16 }}>Ошибка: {error}</div>;

    // Expand button only meaningful for tree types
    const canExpand = TREE_TYPES.has(vizType);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
                padding: '10px 16px', borderBottom: '1px solid #1e293b',
                background: '#0f172a', flexShrink: 0,
            }}>
                <select value={vizType} onChange={e => setVizType(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 6, fontSize: 13,
                        border: '1px solid #475569', background: '#1e293b', color: '#ffffff',
                        cursor: 'pointer', fontWeight: 600, minWidth: 280 }}>
                    {TREE_VIZ_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value} style={{ background: '#1e293b', color: '#fff' }}>
                            {opt.icon} {opt.label}
                        </option>
                    ))}
                </select>

                <div style={{ width: 1, height: 24, background: '#1e293b' }} />

                <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>Домены:</span>
                {TREE_CATEGORIES.map(cat => (
                    <div key={cat.name}
                        style={{
                            padding: '5px 12px', borderRadius: 16, fontSize: 13, cursor: 'pointer',
                            fontWeight: 600, border: '1px solid',
                            background: activeDomains.has(cat.name) ? '#2563eb' : 'transparent',
                            color: activeDomains.has(cat.name) ? '#ffffff' : '#d1d5db',
                            borderColor: activeDomains.has(cat.name) ? '#2563eb' : '#334155',
                            transition: 'all 0.15s',
                        }}
                        onClick={() => toggleDomain(cat.name)}>
                        {cat.icon} {cat.name}
                    </div>
                ))}

                <div style={{ width: 1, height: 24, background: '#1e293b' }} />

                {/* Winners: 1 winner per subcategory branch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 16, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => setWinnersOnly(!winnersOnly)}
                    title="В каждой ветке дерева останется только 1 победитель (макс. utility)">
                    <span style={{ fontSize: 16 }}>{winnersOnly ? '✅' : '⬜'}</span>
                    <span style={{ color: winnersOnly ? '#ffffff' : '#d1d5db' }}>Только победители</span>
                </div>

                {/* Expand/Collapse — ONLY for tree types */}
                {canExpand && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 16, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => setExpandAll(!expandAll)}>
                        <span style={{ fontSize: 16 }}>{expandAll ? '📂' : '📁'}</span>
                        <span style={{ color: '#ffffff' }}>{expandAll ? 'Свернуть' : 'Развернуть'}</span>
                    </div>
                )}

                <input type="text" placeholder="Поиск..."
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    style={{ padding: '5px 12px', borderRadius: 16, fontSize: 13,
                        border: '1px solid #334155', background: '#1e293b', color: '#ffffff',
                        width: 180, outline: 'none' }} />

                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
                    {filteredTables.length} таблиц{winnersOnly ? ' · победители' : ''}
                </span>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
                <ReactECharts
                    option={option || {}}
                    style={{ height: '100%', width: '100%' }}
                    onEvents={{ click: onChartClick }}
                    opts={{ renderer: 'canvas' }}
                    notMerge={true}
                />
            </div>
        </div>
    );
}
