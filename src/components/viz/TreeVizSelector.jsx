import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import {
    treeVertical, treeHorizontal, treeRadial,
    treemapFromTree, sunburstFromTree, graphForce, sankeyFromTree,
    TREE_VIZ_OPTIONS,
} from '../../utils/echartsConfigs';

const API = import.meta.env.VITE_API_URL || '';

/**
 * TreeVizSelector — dropdown со всеми вариантами визуализации дерева решений.
 * Все варианты через ECharts (уже в проекте).
 */
export default function TreeVizSelector({ rootName = 'Choser EDP', onSelectTable }) {
    const [vizType, setVizType] = useState('tree-TB');
    const [treeData, setTreeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    React.useEffect(() => {
        loadTreeData();
    }, []);

    async function loadTreeData() {
        try {
            const res = await fetch(`${API}/v1/api/tables?limit=3000`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const categories = categorizeTables(Array.isArray(json.tables) ? json.tables : Array.isArray(json) ? json : []);
            setTreeData(categories);
            setLoading(false);
        } catch (e) {
            setError(e.message);
            setLoading(false);
        }
    }

    const option = useMemo(() => {
        if (!treeData) return null;

        function buildChildren(cats) {
            return Object.entries(cats)
                .filter(([_, items]) => items.length > 0)
                .map(([catName, items]) => ({
                    name: catName,
                    value: items.reduce((s, t) => s + (t.utility || 100), 0),
                    children: items.slice(0, 30).map(t => ({
                        name: t.title || t.id,
                        value: t.utility || 100,
                        tableId: t.id,
                    })),
                }));
        }

        const children = buildChildren(treeData);

        switch (vizType) {
            case 'tree-TB': return treeVertical(rootName, children);
            case 'tree-LR': return treeHorizontal(rootName, children);
            case 'tree-radial': return treeRadial(rootName, children);
            case 'treemap': return treemapFromTree(rootName, children);
            case 'sunburst': return sunburstFromTree(rootName, children);
            case 'graph-force': return graphForce(rootName, children);
            case 'sankey': return sankeyFromTree(rootName, children);
            default: return treeVertical(rootName, children);
        }
    }, [vizType, treeData, rootName]);

    function onChartClick(params) {
        if (!params.data || !params.data.tableId) return;
        const tableId = params.data.tableId;
        if (onSelectTable) {
            onSelectTable(tableId);
        } else {
            navigate(`/table/${tableId}`);
        }
    }

    const selectStyle = {
        padding: '6px 12px', borderRadius: 6, fontSize: 13,
        border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer',
        minWidth: 260, fontWeight: 500,
    };

    const labelStyle = {
        fontSize: 12, color: '#64748b', marginBottom: 2,
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Загрузка таблиц...</div>;
    if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Ошибка: {error}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* DROPDOWN */}
            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={labelStyle}>Визуализация:</span>
                <select
                    value={vizType}
                    onChange={e => setVizType(e.target.value)}
                    style={selectStyle}
                >
                    {TREE_VIZ_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* CHART */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <ReactECharts
                    option={option || {}}
                    style={{ height: '100%', width: '100%' }}
                    onEvents={{ click: onChartClick }}
                    opts={{ renderer: 'canvas' }}
                    notMerge={true}
                />
            </div>

            {/* FOOTER */}
            <div style={{ padding: '4px 12px', fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                Клик по узлу → переход к таблице выбора. Всего категорий: {treeData ? Object.keys(treeData).filter(k => treeData[k].length > 0).length : 0}
            </div>
        </div>
    );
}

// Categorize tables by keywords in title/tags
function categorizeTables(tables) {
    const cats = {
        'Базы данных': [],
        'Frontend / UI': [],
        'Backend / API': [],
        'AI / LLM': [],
        'Инфраструктура': [],
        'Безопасность': [],
        'Аналитика': [],
        'Прочее': [],
    };

    const rules = [
        ['Базы данных', ['бд', 'баз', 'database', 'sql', 'sqlite', 'postgres', 'mongo', 'redis', 'clickhouse']],
        ['Frontend / UI', ['react', 'vue', 'angular', 'frontend', 'фронтенд', 'ui', 'css', 'tailwind', 'chart', 'граф']],
        ['Backend / API', ['api', 'backend', 'бэкенд', 'fastapi', 'django', 'express', 'node', 'сервер', 'rest', 'graphql']],
        ['AI / LLM', ['ai', 'ии', 'llm', 'gpt', 'openai', 'embedding', 'машинн', 'нейрон', 'классифик']],
        ['Инфраструктура', ['docker', 'kubernetes', 'k8s', 'nginx', 'cloud', 'aws', 'облак', 'deploy', 'cicd', 'инфраструкт']],
        ['Безопасность', ['secur', 'безопас', 'auth', 'ssl', 'парол', 'шифр', 'уязв', 'vault']],
        ['Аналитика', ['аналит', 'bi', 'dashboard', 'дашборд', 'метрик', 'статист', 'olap']],
    ];

    tables.forEach(t => {
        const text = ((t.title || '') + ' ' + (t.tags || '') + ' ' + (t.description || '')).toLowerCase();
        let placed = false;
        for (const [cat, keywords] of rules) {
            if (keywords.some(kw => text.includes(kw))) {
                cats[cat].push(t);
                placed = true;
                break;
            }
        }
        if (!placed) cats['Прочее'].push(t);
    });

    return cats;
}
