/**
 * echartsConfigs.js — ECharts configs for Choser EDP
 *
 * DESIGN RULES:
 * - Label fontSize: MIN 14px (node text), MIN 12px (axis/legend)
 * - Label color: #ffffff (pure white) on dark background
 * - Label background: dark rounded rect with padding for readability
 * - No gray (#333, #666, #999) anywhere — only white or slate-200
 * - Max nodes per chart: 150 (anti-crash)
 * - Force layout: limited repulsion (max 200 nodes)
 *
 * TREE OPTIONS (keep simple):
 * 1. ECharts tree-TB (top-to-bottom)
 * 2. ECharts tree-LR (left-to-right)
 * 3. React Flow orthogonal [React Flow]
 * 4. React Flow dagre [React Flow]
 * 5. D3 tidy tree [D3.js]
 * 6. D3 force cluster [D3.js]
 * 7. G6 compact box [G6]
 * 8. G6 radial [G6]
 * 9. Cytoscape concentric [Cytoscape]
 * 10. Cytoscape grid [Cytoscape]
 * 11. Les Misérables force [ECharts] — table relationships
 * 12. Les Misérables circular [ECharts] — table relationships
 */

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════
const COLORS = {
    white: '#ffffff',
    labelDim: '#e2e8f0',
    labelBg: 'rgba(15, 23, 42, 0.85)',
    line: '#475569',
    root: '#2563eb',
    cat1: '#3b82f6',
    cat2: '#8b5cf6',
    cat3: '#06b6d4',
    cat4: '#10b981',
    cat5: '#f59e0b',
    cat6: '#ef4444',
    accent: '#22c55e',
};

const CAT_COLORS = [COLORS.cat1, COLORS.cat2, COLORS.cat3, COLORS.cat4, COLORS.cat5, COLORS.cat6];

// Common tooltip style — dark with white text
const darkTooltip = {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: '#fff', fontSize: 14 },
};

// Common label style — white text with dark background for readability
const readableLabel = {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 500,
    backgroundColor: COLORS.labelBg,
    padding: [3, 6],
    borderRadius: 4,
};

// ═══════════════════════════════════════
// TREE VISUALIZATION CONFIGS
// ═══════════════════════════════════════

/**
 * ECharts tree top-to-bottom
 */
export function treeVertical(rootData) {
    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip, trigger: 'item',
            formatter: p => p.data ? `<b>${p.data.name}</b>${p.data.tableId ? '<br/>Таблица: ' + p.data.tableId : ''}` : '' },
        series: [{
            type: 'tree',
            data: [rootData],
            top: '4%', left: '10%', bottom: '4%', right: '10%',
            layout: 'orthogonal',
            orient: 'TB',
            symbol: 'circle',
            symbolSize: 16,
            label: { ...readableLabel, position: 'top', distance: 8 },
            leaves: { label: { ...readableLabel, position: 'bottom', distance: 8, transform: [{ rotate: -20 }] } },
            emphasis: { focus: 'relative', label: { fontSize: 16, fontWeight: 700 } },
            expandAndCollapse: true,
            initialTreeDepth: 2,
            animationDuration: 400,
            animationDurationUpdate: 400,
            lineStyle: { color: COLORS.line, width: 1.5, curveness: 0.5 },
            itemStyle: { color: COLORS.cat1, borderColor: COLORS.root, borderWidth: 2 },
        }]
    };
}

/**
 * ECharts tree left-to-right (DEFAULT — most readable)
 */
export function treeHorizontal(rootData) {
    const cfg = treeVertical(rootData);
    cfg.series[0].orient = 'LR';
    cfg.series[0].top = '3%';
    cfg.series[0].left = '5%';
    cfg.series[0].bottom = '3%';
    cfg.series[0].right = '20%';
    cfg.series[0].initialTreeDepth = 3;
    cfg.series[0].label = { ...readableLabel, position: 'left', verticalAlign: 'middle', distance: 8 };
    cfg.series[0].leaves = { label: { ...readableLabel, position: 'right', verticalAlign: 'middle', distance: 8 } };
    return cfg;
}

/**
 * React Flow style — orthogonal edges, fixed grid positions
 */
export function reactFlowOrthogonal(rootData) {
    return graphFromTree(rootData, 'none', 'polyline');
}

/**
 * React Flow dagre style — layered layout
 */
export function reactFlowDagre(rootData) {
    return graphFromTree(rootData, 'none', 'curve', { layered: true });
}

/**
 * D3 tidy tree — curved bezier edges, left-to-right
 */
export function d3TidyTree(rootData) {
    const cfg = treeHorizontal(rootData);
    cfg.series[0].lineStyle = { color: COLORS.line, width: 1.5, curveness: 0.8 };
    cfg.series[0].edgeShape = 'curve';
    cfg.series[0].symbolSize = 12;
    cfg.series[0].itemStyle = { color: COLORS.cat1, borderColor: COLORS.root, borderWidth: 1.5 };
    cfg.series[0].label = { ...readableLabel, position: 'left', verticalAlign: 'middle', distance: 10 };
    return cfg;
}

/**
 * D3 force cluster — physics with category grouping
 */
export function d3ClusterForce(rootData) {
    return graphFromTree(rootData, 'force', 'curve', { force: true });
}

/**
 * G6 compact box — rectangular nodes with text inside
 */
export function g6CompactBox(rootData) {
    const cfg = treeHorizontal(rootData);
    cfg.series[0].symbol = 'roundRect';
    cfg.series[0].symbolSize = [80, 28];
    cfg.series[0].label = {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: 600,
        position: 'inside',
        verticalAlign: 'middle',
    };
    cfg.series[0].leaves = { label: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: 500,
        position: 'inside',
        verticalAlign: 'middle',
    }};
    cfg.series[0].lineStyle = { color: COLORS.line, width: 2, curveness: 0.5 };
    cfg.series[0].edgeShape = 'polyline';
    cfg.series[0].itemStyle = { color: COLORS.cat1, borderColor: COLORS.root, borderWidth: 2, borderRadius: 4 };
    return cfg;
}

/**
 * G6 radial dendrogram — straight lines radiating from center
 */
export function g6Radial(rootData) {
    const cfg = treeVertical(rootData);
    cfg.series[0].layout = 'radial';
    cfg.series[0].label = { ...readableLabel, fontSize: 14 };
    cfg.series[0].leaves = { label: { ...readableLabel, fontSize: 13 } };
    cfg.series[0].lineStyle = { color: COLORS.line, width: 1, curveness: 0 };
    cfg.series[0].initialTreeDepth = 2;
    delete cfg.series[0].orient;
    return cfg;
}

/**
 * Cytoscape concentric — rings
 */
export function cytoscapeConcentric(rootData) {
    return graphFromTree(rootData, 'none', 'curve', { concentric: true });
}

/**
 * Cytoscape grid — breadth-first grid
 */
export function cytoscapeGrid(rootData) {
    return graphFromTree(rootData, 'none', 'polyline', { grid: true });
}

// ═══════════════════════════════════════
// GRAPH BUILDER — converts tree to graph series
// ═══════════════════════════════════════
function graphFromTree(rootData, layout, edgeCurve, opts = {}) {
    const nodes = [];
    const links = [];
    const categories = [];

    // Walk tree, build nodes + links
    let nodeCount = 0;
    

    function walk(node, depth, parentId, catIdx) {
        if (nodeCount > 150) return;
        if (depth > 3) return;

        const name = node.name || '';
        const myCat = depth === 0 ? -1 : catIdx;
        if (depth > 0 && myCat >= 0 && !categories.find(c => c.name === name.split(' ')[0])) {
            // Category node
        }

        const size = depth === 0 ? 50 : depth === 1 ? 32 : depth === 2 ? 24 : 16;
        nodes.push({
            name: name,
            symbolSize: size,
            category: Math.max(0, catIdx),
            tableId: node.tableId,
            itemStyle: {
                color: depth === 0 ? COLORS.root : CAT_COLORS[catIdx % CAT_COLORS.length],
                borderColor: COLORS.root,
                borderWidth: depth === 0 ? 3 : 1.5,
            },
            label: {
                show: depth <= 2,
                color: COLORS.white,
                fontSize: depth === 0 ? 16 : depth === 1 ? 14 : 13,
                fontWeight: depth <= 1 ? 700 : 500,
                backgroundColor: COLORS.labelBg,
                padding: [2, 5],
                borderRadius: 3,
                position: 'bottom',
                distance: 5,
            },
        });
        nodeCount++;

        if (parentId !== null && parentId !== undefined) {
            links.push({ source: nodes[parentId].name, target: name });
        }

        if (node.children) {
            // Limit children to prevent crash
            const children = node.children.slice(0, depth === 0 ? 6 : depth === 1 ? 4 : depth === 2 ? 5 : 3);
            children.forEach(child => walk(child, depth + 1, nodes.length - 1, catIdx >= 0 ? catIdx : nodes.length - 2));
        }
    }

    walk(rootData, 0, null, -1);

    // Build categories from level-1 nodes
    (rootData.children || []).forEach((child, i) => {
        categories.push({ name: child.name.replace(/^[^\s]+\s/, '') });
    });

    // Position nodes based on layout option
    if (opts.concentric) {
        nodes.forEach((n, i) => {
            const depth = n.symbolSize > 40 ? 0 : n.symbolSize > 28 ? 1 : n.symbolSize > 20 ? 2 : 3;
            const ringRadius = [0, 150, 280, 400][depth] || 400;
            const sameRing = nodes.filter(x => x.symbolSize === n.symbolSize);
            const idx = sameRing.indexOf(n);
            const angle = (idx / sameRing.length) * 2 * Math.PI;
            n.x = 400 + Math.cos(angle) * ringRadius;
            n.y = 350 + Math.sin(angle) * ringRadius;
            n.fixed = true;
        });
    } else if (opts.grid) {
        const cols = Math.ceil(Math.sqrt(nodes.length));
        nodes.forEach((n, i) => {
            n.x = (i % cols) * 120 + 50;
            n.y = Math.floor(i / cols) * 80 + 50;
            n.fixed = true;
        });
    } else if (opts.layered) {
        const levels = {};
        nodes.forEach(n => {
            const d = n.symbolSize > 40 ? 0 : n.symbolSize > 28 ? 1 : n.symbolSize > 20 ? 2 : 3;
            if (!levels[d]) levels[d] = [];
            levels[d].push(n);
        });
        Object.entries(levels).forEach(([depth, ns]) => {
            ns.forEach((n, i) => {
                n.x = i * 130 + 50;
                n.y = parseInt(depth) * 180 + 50;
                n.fixed = true;
            });
        });
    }

    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip,
            formatter: p => p.dataType === 'edge' ? '' :
                `<b>${p.data.name}</b>${p.data.tableId ? '<br/>Таблица: ' + p.data.tableId : ''}` },
        legend: [{ data: categories.map(c => c.name), bottom: 5,
            textStyle: { fontSize: 12, color: COLORS.labelDim },
            itemStyle: { color: COLORS.cat1 } }],
        series: [{
            type: 'graph',
            layout: layout,
            data: nodes,
            links: links,
            categories: categories.length > 0 ? categories : undefined,
            roam: true,
            label: { show: true, fontSize: 13, color: COLORS.white },
            labelLayout: { hideOverlap: true },
            force: opts.force ? {
                repulsion: 120,
                edgeLength: [50, 120],
                gravity: 0.15,
                layoutAnimation: true,
            } : undefined,
            lineStyle: { color: COLORS.line, width: 1.5, curveness: edgeCurve === 'curve' ? 0.4 : 0, opacity: 0.6 },
            emphasis: { focus: 'adjacency', lineStyle: { width: 3, color: COLORS.accent, opacity: 1 } },
        }]
    };
}

// ═══════════════════════════════════════
// LES MISÉRABLES — table relationship graphs
// Max 100 nodes, force/circular layout
// ═══════════════════════════════════════

export function lesMiserablesForce(tables) {
    const nodes = [];
    const links = [];
    const categories = [];

    const grouped = {};
    tables.forEach(t => {
        const cat = t.category || 'Прочее';
        if (!grouped[cat]) { grouped[cat] = []; categories.push({ name: cat }); }
        grouped[cat].push(t);
    });

    Object.entries(grouped).forEach(([cat, items]) => {
        const ci = categories.findIndex(c => c.name === cat);
        items.forEach(t => {
            nodes.push({
                name: t.title || t.id,
                symbolSize: 12 + Math.min(20, (t.utility || 100) / 50),
                category: ci,
                tableId: t.id,
            });
        });
    });

    // Links within same category only (sparse)
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            if (nodes[i].category === nodes[j].category && Math.random() < 0.1) {
                links.push({ source: nodes[i].name, target: nodes[j].name });
            }
        }
    }

    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip,
            formatter: p => p.dataType === 'edge' ? '' :
                `<b>${p.data.name}</b><br/>Категория: ${categories[p.data.category]?.name || ''}` },
        legend: [{ data: categories.map(c => c.name), bottom: 5,
            textStyle: { fontSize: 12, color: COLORS.labelDim }, type: 'scroll' }],
        series: [{
            type: 'graph',
            layout: 'force',
            data: nodes,
            links: links,
            categories: categories,
            roam: true,
            label: { show: false },
            labelLayout: { hideOverlap: true },
            emphasis: { focus: 'adjacency', label: { show: true, fontSize: 14, color: COLORS.white, fontWeight: 700, backgroundColor: COLORS.labelBg, padding: [3, 6] } },
            force: { repulsion: 100, edgeLength: [30, 70], gravity: 0.12, layoutAnimation: true },
            lineStyle: { color: 'source', curveness: 0.3, width: 1, opacity: 0.25 },
        }]
    };
}

export function lesMiserablesCircular(tables) {
    const nodes = [];
    const links = [];
    const categories = [];

    const grouped = {};
    tables.forEach(t => {
        const cat = t.category || 'Прочее';
        if (!grouped[cat]) { grouped[cat] = []; categories.push({ name: cat }); }
        grouped[cat].push(t);
    });

    Object.entries(grouped).forEach(([cat, items]) => {
        const ci = categories.findIndex(c => c.name === cat);
        items.forEach(t => {
            nodes.push({
                name: t.title || t.id,
                symbolSize: 10 + Math.min(16, (t.utility || 100) / 60),
                category: ci,
                tableId: t.id,
            });
        });
    });

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            if (nodes[i].category === nodes[j].category && Math.random() < 0.08) {
                links.push({ source: nodes[i].name, target: nodes[j].name });
            }
        }
    }

    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip,
            formatter: p => p.dataType === 'edge' ? '' : `<b>${p.data.name}</b>` },
        legend: [{ data: categories.map(c => c.name), bottom: 5,
            textStyle: { fontSize: 12, color: COLORS.labelDim }, type: 'scroll' }],
        series: [{
            type: 'graph',
            layout: 'circular',
            data: nodes,
            links: links,
            categories: categories,
            roam: true,
            circular: { rotateLabel: true },
            label: { show: false },
            labelLayout: { hideOverlap: true },
            emphasis: { focus: 'adjacency', label: { show: true, fontSize: 13, color: COLORS.white, backgroundColor: COLORS.labelBg, padding: [2, 5] } },
            lineStyle: { color: COLORS.line, curveness: 0.2, width: 1, opacity: 0.3 },
        }]
    };
}

// ═══════════════════════════════════════
// TABLE VISUALIZATION CONFIGS (11 types)
// All labels: WHITE on dark, readable
// ═══════════════════════════════════════

export function heatmapConfig(rows, columns) {
    const paramKeys = columns.map(c => c.key);
    const paramTitles = columns.map(c => c.title.substring(0, 15));
    const objectNames = rows.map(r => r.name);
    const data = [];
    rows.forEach((row, i) => {
        paramKeys.forEach((key, j) => { data.push([j, i, row[key]?.grade || 0]); });
    });
    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip, position: 'top',
            formatter: p => `<b>${rows[p.value[1]]?.name || ''}</b><br/>${columns[p.value[0]]?.title}: <b>${p.value[2]}</b>` },
        grid: { top: 60, bottom: 80, left: 120, right: 30 },
        xAxis: { type: 'category', data: paramTitles, splitArea: { show: true },
            axisLabel: { fontSize: 12, color: COLORS.labelDim, rotate: 30, interval: 0 } },
        yAxis: { type: 'category', data: objectNames, splitArea: { show: true },
            axisLabel: { fontSize: 13, color: COLORS.white } },
        visualMap: { min: 0, max: 10, calculable: true, orient: 'horizontal',
            left: 'center', bottom: 10, textStyle: { color: COLORS.white, fontSize: 12 },
            inRange: { color: ['#991b1b', '#f59e0b', '#22c55e'] } },
        series: [{ type: 'heatmap', data,
            label: { show: true, fontSize: 13, fontWeight: 'bold', color: COLORS.white },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(255,255,255,0.3)' } } }]
    };
}

export function radarConfig(rows, columns) {
    const indicator = columns.map(c => ({ name: c.title.substring(0, 12), max: 10 }));
    const series = rows.slice(0, 8).map(r => ({
        value: columns.map(c => r[c.key]?.grade || 0), name: r.name }));
    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip, trigger: 'item' },
        legend: { type: 'scroll', bottom: 5, textStyle: { fontSize: 12, color: COLORS.labelDim } },
        series: [{ type: 'radar', data: series,
            areaStyle: { opacity: 0.15 }, lineStyle: { width: 2 }, symbolSize: 5,
            emphasis: { areaStyle: { opacity: 0.35 } } }],
        radar: { indicator, radius: '65%',
            axisName: { fontSize: 13, color: COLORS.white },
            splitArea: { areaStyle: { color: ['rgba(30,41,59,0.3)', 'rgba(51,65,85,0.3)'] } },
            splitLine: { lineStyle: { color: '#334155' } },
            axisLine: { lineStyle: { color: '#475569' } } }
    };
}

export function barHorizontalConfig(rows, columns) {
    const sorted = [...rows].sort((a, b) => {
        const ua = columns.reduce((s,c) => s + (a[c.key]?.grade||0) * c.weight / 100, 0);
        const ub = columns.reduce((s,c) => s + (b[c.key]?.grade||0) * c.weight / 100, 0);
        return ub - ua;
    });
    const stackData = {};
    columns.forEach(c => { stackData[c.title.substring(0,12)] = sorted.map(r => (r[c.key]?.grade || 0) * c.weight / 10); });
    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { type: 'scroll', bottom: 5, textStyle: { fontSize: 11, color: COLORS.labelDim } },
        grid: { left: 140, right: 30, top: 30, bottom: 60 },
        xAxis: { type: 'value', axisLabel: { color: COLORS.labelDim, fontSize: 12 } },
        yAxis: { type: 'category', data: sorted.map(r => r.name),
            axisLabel: { fontSize: 13, color: COLORS.white } },
        series: Object.entries(stackData).map(([name, data], i) => ({
            type: 'bar', name, stack: 'total',
            data: data.map(v => Math.round(v * 10) / 10),
            emphasis: { focus: 'series' } })),
    };
}

export function scatterConfig(rows, columns) {
    const data = rows.map(r => {
        const u = columns.reduce((s,c) => s + (r[c.key]?.grade||0) * c.weight / 100, 0);
        return [r.price || 0, Math.round(u * 100), r.name];
    }).filter(d => d[0] > 0);
    const noPrice = rows.filter(r => !r.price || r.price === 0).map(r => {
        const u = columns.reduce((s,c) => s + (r[c.key]?.grade||0) * c.weight / 100, 0);
        return [0, Math.round(u * 100), r.name];
    });
    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip, formatter: p => `<b>${p.data[2]}</b><br/>Цена: ${p.data[0]}<br/>Utility: ${p.data[1]}` },
        grid: { left: 60, right: 30, top: 30, bottom: 50 },
        xAxis: { type: 'value', name: 'Цена', nameLocation: 'middle', nameGap: 30,
            axisLabel: { color: COLORS.labelDim, fontSize: 12 }, nameTextStyle: { color: COLORS.white, fontSize: 13 } },
        yAxis: { type: 'value', name: 'Utility', nameLocation: 'middle', nameGap: 40,
            axisLabel: { color: COLORS.labelDim, fontSize: 12 }, nameTextStyle: { color: COLORS.white, fontSize: 13 } },
        series: [
            { type: 'scatter', data, symbolSize: d => Math.sqrt(d[1]) * 2,
              itemStyle: { color: COLORS.cat1, opacity: 0.8 },
              label: { show: true, formatter: p => p.data[2], fontSize: 11, position: 'top', color: COLORS.labelDim } },
            { type: 'scatter', data: noPrice, symbolSize: d => Math.sqrt(d[1]) * 2,
              itemStyle: { color: '#94a3b8', opacity: 0.5 },
              label: { show: true, formatter: p => p.data[2], fontSize: 11, position: 'top', color: COLORS.labelDim } },
        ],
    };
}

export function treemapTableConfig(rows, columns) {
    const data = rows.map(r => {
        const u = Math.round(columns.reduce((s,c) => s + (r[c.key]?.grade||0) * c.weight / 100, 0) * 100);
        return { name: r.name, value: Math.max(u, 1), utility: u,
            itemStyle: { color: u > 800 ? '#22c55e' : u > 500 ? '#f59e0b' : '#64748b' } };
    }).sort((a, b) => b.value - a.value);
    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip, formatter: p => `<b>${p.name}</b><br/>utility: ${p.data.utility}` },
        series: [{ type: 'treemap', data, roam: false, nodeClick: false,
            breadcrumb: { show: false },
            label: { show: true, fontSize: 14, formatter: '{b}\n{c}', color: COLORS.white, fontWeight: 600 },
            upperLabel: { show: false },
            itemStyle: { borderColor: '#0f172a', borderWidth: 3, gapWidth: 3 } }]
    };
}

export function sankeyTableConfig(rows, columns) {
    const nodes = [];
    const links = [];
    columns.slice(0, 6).forEach(c => nodes.push({ name: c.title.substring(0, 12) }));
    rows.slice(0, 10).forEach(r => nodes.push({ name: r.name }));
    rows.slice(0, 10).forEach(r => {
        columns.slice(0, 6).forEach(c => {
            const g = r[c.key]?.grade || 0;
            if (g > 0) links.push({ source: c.title.substring(0, 12), target: r.name, value: g * c.weight / 100 });
        });
    });
    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip, trigger: 'item' },
        series: [{ type: 'sankey', data: nodes, links, orient: 'horizontal',
            label: { fontSize: 13, color: COLORS.white },
            lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.4 },
            emphasis: { focus: 'adjacency' },
            top: 20, bottom: 20, left: 80, right: 120,
            itemStyle: { color: COLORS.cat1 } }]
    };
}

export function parallelConfig(rows, columns) {
    const dims = columns.map(c => ({ name: c.title.substring(0, 10), max: 10 }));
    const data = rows.slice(0, 10).map(r => columns.map(c => r[c.key]?.grade || 0));
    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip, trigger: 'item' },
        parallelAxis: dims.map((d, i) => ({ dim: i, name: d.name, max: d.max,
            axisLabel: { color: COLORS.labelDim, fontSize: 12 }, nameTextStyle: { color: COLORS.white, fontSize: 13 } })),
        parallel: { left: 50, right: 30, top: 40, bottom: 40,
            axisExpandable: true, axisExpandCenter: 200, axisExpandCount: 4 },
        series: [{ type: 'parallel', data,
            lineStyle: { width: 2, opacity: 0.5 },
            emphasis: { lineStyle: { width: 4, opacity: 1 } },
            inactiveOpacity: 0.05 }],
        legend: { data: rows.slice(0, 10).map(r => r.name), bottom: 5, textStyle: { fontSize: 10, color: COLORS.labelDim } },
    };
}

export function sunburstTableConfig(rows, columns) {
    const data = [{
        name: 'Таблица', itemStyle: { color: COLORS.root },
        children: columns.slice(0, 6).map(c => ({
            name: c.title.substring(0, 12),
            children: rows.slice(0, 6).map(r => ({ name: r.name, value: (r[c.key]?.grade || 0) * c.weight })),
        })),
    }];
    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip, formatter: p => `${p.name}: ${p.value}` },
        series: [{ type: 'sunburst', data, radius: [0, '95%'],
            label: { minAngle: 5, fontSize: 13, color: COLORS.white },
            itemStyle: { borderColor: '#0f172a', borderWidth: 1.5 },
            emphasis: { focus: 'ancestor' },
            levels: [{}, { r0: '10%', r: '45%' }, { r0: '45%', r: '95%' }] }]
    };
}

export function gaugeConfig(rows, columns) {
    const scored = rows.map(r => {
        const u = columns.reduce((s,c) => s + (r[c.key]?.grade||0) * c.weight / 100, 0);
        return { name: r.name, value: Math.round(u * 100) };
    }).sort((a, b) => b.value - a.value).slice(0, 6);
    return {
        backgroundColor: 'transparent',
        series: scored.map((item, i) => ({
            type: 'gauge',
            center: [[20, 25], [50, 25], [80, 25], [20, 75], [50, 75], [80, 75]][i] || [50, 50],
            radius: '22%', min: 0, max: 1000, startAngle: 200, endAngle: -20,
            title: { show: true, offsetCenter: [0, '40%'], fontSize: 12, color: COLORS.white },
            detail: { valueAnimation: true, fontSize: 16, offsetCenter: [0, '10%'],
                formatter: '{value}', color: COLORS.white },
            data: [{ value: item.value, name: item.name.substring(0, 14) }],
            axisLine: { lineStyle: { width: 10, color: [[0.4, '#ef4444'], [0.7, '#f59e0b'], [1, '#22c55e']] } },
            pointer: { width: 4 }, progress: { show: true, width: 10 },
            axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        }))
    };
}

export function pieConfig(rows, columns) {
    const data = rows.map(r => {
        const u = Math.round(columns.reduce((s,c) => s + (r[c.key]?.grade||0) * c.weight / 100, 0) * 100);
        return { name: r.name, value: Math.max(u, 1) };
    }).sort((a, b) => b.value - a.value);
    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip, trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { type: 'scroll', orient: 'vertical', right: 10, top: 20, bottom: 20,
            textStyle: { fontSize: 12, color: COLORS.labelDim } },
        series: [{ type: 'pie', radius: ['35%', '70%'], center: ['40%', '50%'], data,
            label: { fontSize: 12, color: COLORS.white, formatter: '{b}\n{d}%' },
            itemStyle: { borderColor: '#0f172a', borderWidth: 2 },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(255,255,255,0.3)' } } }]
    };
}

export function funnelConfig(rows, columns) {
    const data = rows.map(r => {
        const u = Math.round(columns.reduce((s,c) => s + (r[c.key]?.grade||0) * c.weight / 100, 0) * 100);
        return { name: r.name, value: Math.max(u, 1) };
    }).sort((a, b) => b.value - a.value);
    return {
        backgroundColor: 'transparent',
        tooltip: { ...darkTooltip, trigger: 'item', formatter: '{b}: {c}' },
        series: [{ type: 'funnel', data,
            label: { show: true, fontSize: 13, color: COLORS.white, position: 'inside' },
            itemStyle: { borderColor: '#0f172a', borderWidth: 1 } }]
    };
}

// ═══════════════════════════════════════
// OPTIONS LISTS — clean, with framework names
// ═══════════════════════════════════════

export const TREE_VIZ_OPTIONS = [
    { value: 'tree-TB', label: '1. Дерево сверху-вниз [ECharts]', icon: '🌳' },
    { value: 'tree-LR', label: '2. Дерево слева-направо [ECharts]', icon: '🌲' },
    { value: 'react-flow-ortho', label: '3. Ортогональная сетка [React Flow]', icon: '🔀' },
    { value: 'react-flow-dagre', label: '4. Многоуровневый граф [React Flow]', icon: '📚' },
    { value: 'd3-tidy', label: '5. Tidy tree с кривыми [D3.js]', icon: '🌿' },
    { value: 'd3-force', label: '6. Force кластер [D3.js]', icon: '🕸️' },
    { value: 'g6-box', label: '7. Компактные блоки [G6]', icon: '📦' },
    { value: 'g6-radial', label: '8. Радиальная схема [G6]', icon: '🌀' },
    { value: 'cyto-concentric', label: '9. Концентрические круги [Cytoscape]', icon: '🎯' },
    { value: 'cyto-grid', label: '10. Сетка [Cytoscape]', icon: '📐' },
    { value: 'lesmis-force', label: '11. Связи таблиц: force [ECharts]', icon: '🎭' },
    { value: 'lesmis-circular', label: '12. Связи таблиц: круг [ECharts]', icon: '🎡' },
];

export const TABLE_VIZ_OPTIONS = [
    { value: 'heatmap', label: '1. Тепловая карта [ECharts]', icon: '🔥' },
    { value: 'radar', label: '2. Радар [ECharts]', icon: '📡' },
    { value: 'bar', label: '3. Столбцы [ECharts]', icon: '📊' },
    { value: 'scatter', label: '4. Точечная [ECharts]', icon: '🔵' },
    { value: 'treemap', label: '5. Treemap [ECharts]', icon: '🟦' },
    { value: 'sankey', label: '6. Sankey [ECharts]', icon: '🌊' },
    { value: 'parallel', label: '7. Параллельные оси [ECharts]', icon: '‖' },
    { value: 'sunburst', label: '8. Sunburst [ECharts]', icon: '🎯' },
    { value: 'gauge', label: '9. Спидометры [ECharts]', icon: '⏱️' },
    { value: 'pie', label: '10. Круговая [ECharts]', icon: '🥧' },
    { value: 'funnel', label: '11. Воронка [ECharts]', icon: '🔻' },
];
