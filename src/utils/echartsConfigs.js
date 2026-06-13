/**
 * echartsConfigs.js — конфигурации ECharts для всех типов визуализаций
 * 
 * TREE: tree-TB, tree-LR, tree-radial, treemap, sunburst, graph-force, sankey
 * TABLE: heatmap, radar, bar, scatter, treemap, sankey, parallel, sunburst, gauge, pie
 */

// ═══════════════════════════════════════
// TREE VISUALIZATION CONFIGS
// ═══════════════════════════════════════

export function treeVertical(rootName, children) {
    return {
        tooltip: { trigger: 'item', formatter: p => {
            if (!p.data) return '';
            return `<b>${p.data.name || ''}</b><br/>utility: ${p.data.value || '—'}`;
        }},
        series: [{
            type: 'tree',
            data: [buildTreeNode(rootName, children)],
            top: '5%', left: '15%', bottom: '5%', right: '15%',
            layout: 'orthogonal',
            orient: 'TB',
            symbolSize: 12,
            label: { position: 'top', rotate: 0, fontSize: 11, color: '#333' },
            leaves: { label: { position: 'bottom', rotate: 0 } },
            emphasis: { focus: 'descendant' },
            expandAndCollapse: true,
            animationDuration: 550,
            animationDurationUpdate: 750,
            lineStyle: { color: '#999', width: 1.5, curveness: 0.5 },
            itemStyle: { color: '#3b82f6', borderColor: '#1d4ed8' },
        }]
    };
}

export function treeHorizontal(rootName, children) {
    const cfg = treeVertical(rootName, children);
    cfg.series[0].orient = 'LR';
    cfg.series[0].top = '5%'; cfg.series[0].left = '10%';
    cfg.series[0].bottom = '5%'; cfg.series[0].right = '30%';
    cfg.series[0].label = { position: 'left', verticalAlign: 'middle', fontSize: 11, color: '#333' };
    cfg.series[0].leaves = { label: { position: 'right', verticalAlign: 'middle' } };
    return cfg;
}

export function treeRadial(rootName, children) {
    const cfg = treeVertical(rootName, children);
    cfg.series[0].layout = 'radial';
    cfg.series[0].label = { fontSize: 11, color: '#333' };
    cfg.series[0].leaves = { label: { fontSize: 11 } };
    delete cfg.series[0].orient;
    return cfg;
}

export function treemapFromTree(rootName, children) {
    const treeData = buildTreeNode(rootName, children);
    function flatten(node, depth = 0) {
        const item = {
            name: node.name,
            value: node.value || Math.max(1, (node.children||[]).reduce((s,c) => s + (c.value||100), 0)),
            itemStyle: { color: depth === 0 ? '#1e40af' : depth === 1 ? '#3b82f6' : '#93c5fd' },
        };
        if (node.children && node.children.length) {
            item.children = node.children.map(c => flatten(c, depth + 1));
        }
        return item;
    }
    return {
        tooltip: { formatter: p => `<b>${p.name}</b><br/>utility: ${p.value}` },
        series: [{
            type: 'treemap',
            data: [flatten(treeData)],
            roam: false,
            nodeClick: 'zoomToNode',
            breadcrumb: { show: true, bottom: 5 },
            label: { show: true, formatter: '{b}', fontSize: 11 },
            upperLabel: { show: true, height: 22, color: '#fff' },
            itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
            levels: [
                { itemStyle: { borderColor: '#1e3a5f', borderWidth: 4, gapWidth: 4 } },
                { color: ['#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#dbeafe'],
                  colorMappingBy: 'value' },
                { colorSaturation: [0.35, 0.5] },
            ],
        }]
    };
}

export function sunburstFromTree(rootName, children) {
    const treeData = buildTreeNode(rootName, children);
    function convert(node) {
        const item = { name: node.name, value: node.value || 1 };
        if (node.children && node.children.length) {
            item.children = node.children.map(convert);
            item.itemStyle = { color: node === treeData ? '#1e3a5f' : undefined };
        }
        return item;
    }
    return {
        tooltip: { formatter: p => `${p.name}: ${p.value}` },
        series: [{
            type: 'sunburst',
            data: [convert(treeData)].flatMap(d => d.children || [d]),
            radius: [0, '95%'],
            label: { minAngle: 8, fontSize: 10, color: '#333' },
            itemStyle: { borderColor: '#fff', borderWidth: 1.5 },
            emphasis: { focus: 'ancestor' },
            levels: [
                {},
                { r0: '15%', r: '50%', label: { rotate: 0 } },
                { r0: '50%', r: '80%', label: { rotate: 'tangential' } },
                { r0: '80%', r: '95%', label: { rotate: 'radial' } },
            ],
        }]
    };
}

export function graphForce(rootName, children) {
    const nodes = [{ name: rootName, symbolSize: 40, category: 0, itemStyle: { color: '#1e40af' } }];
    const links = [];
    const categories = [{ name: rootName }];
    
    children.forEach((cat, i) => {
        nodes.push({ name: cat.name, symbolSize: 28, category: i + 1, itemStyle: { color: '#3b82f6' } });
        categories.push({ name: cat.name });
        links.push({ source: rootName, target: cat.name });
        if (cat.children) {
            cat.children.forEach(leaf => {
                const leafName = leaf.name + '_' + i;
                nodes.push({ name: leafName, symbolSize: 18, category: i + 1, itemStyle: { color: '#93c5fd' } });
                links.push({ source: cat.name, target: leafName, value: leaf.value || 100 });
            });
        }
    });

    return {
        tooltip: { formatter: p => p.dataType === 'edge' ? '' : `<b>${p.data.name.replace(/_\d+$/, '')}</b>` },
        legend: [{ data: categories.map(c => c.name), bottom: 5, textStyle: { fontSize: 10 } }],
        series: [{
            type: 'graph',
            layout: 'force',
            data: nodes,
            links: links,
            categories: categories,
            roam: true,
            label: { show: true, fontSize: 10, position: 'right' },
            force: { repulsion: 300, edgeLength: [80, 200], gravity: 0.1 },
            lineStyle: { color: '#999', curveness: 0.3, width: 1.5 },
            emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
        }]
    };
}

export function sankeyFromTree(rootName, children) {
    const nodes = [{ name: rootName }];
    const links = [];
    children.forEach(cat => {
        nodes.push({ name: cat.name });
        const childSum = (cat.children || []).reduce((s, c) => s + (c.value || 100), 0) || 100;
        links.push({ source: rootName, target: cat.name, value: childSum });
        if (cat.children) {
            cat.children.forEach(leaf => {
                const leafName = `${leaf.name} [${cat.name}]`;
                nodes.push({ name: leafName });
                links.push({ source: cat.name, target: leafName, value: leaf.value || 100 });
            });
        }
    });
    return {
        tooltip: { trigger: 'item' },
        series: [{
            type: 'sankey',
            data: nodes,
            links: links,
            orient: 'horizontal',
            label: { fontSize: 10, color: '#333' },
            lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.5 },
            emphasis: { focus: 'adjacency' },
            top: 20, bottom: 20, left: 60, right: 100,
        }]
    };
}

// Helper: build tree node from flat children
function buildTreeNode(rootName, children) {
    return {
        name: rootName,
        children: children.map(cat => ({
            name: cat.name,
            value: cat.value || (cat.children ? cat.children.reduce((s,c)=>s+(c.value||100),0) : 100),
        children: (cat.children || []).map(leaf => ({
                name: leaf.name,
                value: leaf.value || 100,
                tableId: leaf.tableId,
            })),
            itemStyle: cat.value > 700 ? { color: '#22c55e' } : cat.value > 400 ? { color: '#f59e0b' } : { color: '#94a3b8' },
        })),
        itemStyle: { color: '#1e3a5f' },
    };
}

// ═══════════════════════════════════════
// TABLE VISUALIZATION CONFIGS
// ═══════════════════════════════════════

export function heatmapConfig(rows, columns) {
    const paramKeys = columns.map(c => c.key);
    const paramTitles = columns.map(c => c.title.substring(0, 15));
    const objectNames = rows.map(r => r.name);
    
    const data = [];
    rows.forEach((row, i) => {
        paramKeys.forEach((key, j) => {
            data.push([j, i, row[key]?.grade || 0]);
        });
    });

    return {
        tooltip: { position: 'top', formatter: p => {
            const row = rows[p.value[1]];
            const col = columns[p.value[0]];
            return `<b>${row?.name || ''}</b><br/>${col?.title}: <b>${p.value[2]}</b>`;
        }},
        grid: { top: 60, bottom: 80, left: 120, right: 30 },
        xAxis: { type: 'category', data: paramTitles, splitArea: { show: true },
            axisLabel: { fontSize: 10, rotate: 30, interval: 0 } },
        yAxis: { type: 'category', data: objectNames, splitArea: { show: true },
            axisLabel: { fontSize: 11 } },
        visualMap: { min: 0, max: 10, calculable: true, orient: 'horizontal',
            left: 'center', bottom: 10,
            inRange: { color: ['#fee2e2', '#fef3c7', '#d1fae5', '#10b981'] } },
        series: [{
            type: 'heatmap', data: data,
            label: { show: true, fontSize: 12, fontWeight: 'bold' },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
        }]
    };
}

export function radarConfig(rows, columns) {
    const indicator = columns.map(c => ({ name: c.title.substring(0, 12), max: 10 }));
    const series = rows.slice(0, 8).map(r => ({
        value: columns.map(c => r[c.key]?.grade || 0),
        name: r.name,
    }));
    return {
        tooltip: { trigger: 'item' },
        legend: { type: 'scroll', bottom: 5, textStyle: { fontSize: 10 } },
        series: [{
            type: 'radar',
            data: series,
            areaStyle: { opacity: 0.1 },
            lineStyle: { width: 2 },
            symbolSize: 4,
            emphasis: { areaStyle: { opacity: 0.3 } },
        }],
        radar: {
            indicator: indicator,
            radius: '65%',
            axisName: { fontSize: 10, color: '#666' },
            splitArea: { areaStyle: { color: ['#f8fafc', '#e2e8f0'] } },
        }
    };
}

export function barHorizontalConfig(rows, columns) {
    const sorted = [...rows].sort((a, b) => {
        const ua = columns.reduce((s,c) => s + (a[c.key]?.grade||0) * c.weight / 100, 0);
        const ub = columns.reduce((s,c) => s + (b[c.key]?.grade||0) * c.weight / 100, 0);
        return ub - ua;
    });
    
    const stackData = {};
    columns.forEach(c => {
        stackData[c.title.substring(0,12)] = sorted.map(r => (r[c.key]?.grade || 0) * c.weight / 10);
    });

    return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { type: 'scroll', bottom: 5, textStyle: { fontSize: 9 } },
        grid: { left: 130, right: 30, top: 30, bottom: 60 },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: sorted.map(r => r.name),
            axisLabel: { fontSize: 11 } },
        series: Object.entries(stackData).map(([name, data], i) => ({
            type: 'bar',
            name: name,
            stack: 'total',
            data: data.map(v => Math.round(v * 10) / 10),
            itemStyle: { borderRadius: i === Object.keys(stackData).length - 1 ? [0, 4, 4, 0] : 0 },
            emphasis: { focus: 'series' },
        })),
    };
}

export function scatterConfig(rows, columns) {
    const data = rows.map(r => {
        const utility = columns.reduce((s,c) => s + (r[c.key]?.grade||0) * c.weight / 100, 0);
        return [r.price || 0, Math.round(utility * 100), r.name];
    }).filter(d => d[0] > 0);

    const noPrice = rows.map(r => {
        const utility = columns.reduce((s,c) => s + (r[c.key]?.grade||0) * c.weight / 100, 0);
        return [0, Math.round(utility * 100), r.name];
    }).filter(r => r[0] === 0);

    return {
        tooltip: { formatter: p => `<b>${p.data[2]}</b><br/>Цена: ${p.data[0]}<br/>Utility: ${p.data[1]}` },
        grid: { left: 60, right: 30, top: 30, bottom: 50 },
        xAxis: { type: 'value', name: 'Цена', nameLocation: 'middle', nameGap: 30 },
        yAxis: { type: 'value', name: 'Utility', nameLocation: 'middle', nameGap: 40 },
        series: [
            { type: 'scatter', data: data, symbolSize: d => Math.sqrt(d[1]) * 2,
              itemStyle: { color: '#3b82f6', opacity: 0.7 },
              label: { show: true, formatter: p => p.data[2], fontSize: 9, position: 'top' } },
            { type: 'scatter', data: noPrice, symbolSize: d => Math.sqrt(d[1]) * 2,
              itemStyle: { color: '#94a3b8', opacity: 0.5 },
              label: { show: true, formatter: p => p.data[2], fontSize: 9, position: 'top' } },
        ],
    };
}

export function treemapTableConfig(rows, columns) {
    const data = rows.map(r => {
        const utility = Math.round(columns.reduce((s,c) => s + (r[c.key]?.grade||0) * c.weight / 100, 0) * 100);
        return {
            name: r.name,
            value: Math.max(utility, 1),
            utility: utility,
            itemStyle: { color: utility > 800 ? '#22c55e' : utility > 500 ? '#f59e0b' : '#94a3b8' },
        };
    }).sort((a, b) => b.value - a.value);

    return {
        tooltip: { formatter: p => `<b>${p.name}</b><br/>utility: ${p.data.utility}` },
        series: [{
            type: 'treemap',
            data: data,
            roam: false,
            nodeClick: false,
            breadcrumb: { show: false },
            label: { show: true, fontSize: 12, formatter: '{b}\n{c}' },
            upperLabel: { show: false },
            itemStyle: { borderColor: '#fff', borderWidth: 3, gapWidth: 3 },
        }]
    };
}

export function sankeyTableConfig(rows, columns) {
    const nodes = [];
    const links = [];
    
    columns.slice(0, 6).forEach(c => nodes.push({ name: c.title.substring(0, 12) }));
    rows.slice(0, 10).forEach(r => nodes.push({ name: r.name }));
    
    rows.slice(0, 10).forEach(r => {
        columns.slice(0, 6).forEach(c => {
            const grade = r[c.key]?.grade || 0;
            if (grade > 0) {
                links.push({
                    source: c.title.substring(0, 12),
                    target: r.name,
                    value: grade * c.weight / 100,
                });
            }
        });
    });

    return {
        tooltip: { trigger: 'item' },
        series: [{
            type: 'sankey',
            data: nodes,
            links: links,
            orient: 'horizontal',
            label: { fontSize: 10 },
            lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.4 },
            emphasis: { focus: 'adjacency' },
            top: 20, bottom: 20, left: 80, right: 120,
        }]
    };
}

export function parallelConfig(rows, columns) {
    const dimensions = columns.map(c => ({
        name: c.title.substring(0, 10),
        max: 10,
    }));
    const data = rows.slice(0, 10).map(r => columns.map(c => r[c.key]?.grade || 0));

    return {
        tooltip: { trigger: 'item' },
        parallelAxis: dimensions.map((d, i) => ({ dim: i, name: d.name, max: d.max })),
        parallel: {
            left: 50, right: 30, top: 40, bottom: 40,
            axisExpandable: true,
            axisExpandCenter: 200,
            axisExpandCount: 4,
        },
        series: [{
            type: 'parallel',
            data: data,
            lineStyle: { width: 2, opacity: 0.5 },
            emphasis: { lineStyle: { width: 4, opacity: 1 } },
            inactiveOpacity: 0.05,
        }],
        legend: { data: rows.slice(0, 10).map(r => r.name), bottom: 5, textStyle: { fontSize: 9 } },
    };
}

export function sunburstTableConfig(rows, columns) {
    const data = [{
        name: 'Таблица',
        itemStyle: { color: '#1e3a5f' },
        children: columns.slice(0, 6).map(c => ({
            name: c.title.substring(0, 12),
            children: rows.slice(0, 6).map(r => ({
                name: r.name,
                value: (r[c.key]?.grade || 0) * c.weight,
            })),
        })),
    }];

    return {
        tooltip: { formatter: p => `${p.name}: ${p.value}` },
        series: [{
            type: 'sunburst',
            data: data,
            radius: [0, '95%'],
            label: { minAngle: 5, fontSize: 10 },
            itemStyle: { borderColor: '#fff', borderWidth: 1.5 },
            emphasis: { focus: 'ancestor' },
            levels: [
                {},
                { r0: '10%', r: '45%' },
                { r0: '45%', r: '95%' },
            ],
        }]
    };
}

export function gaugeConfig(rows, columns) {
    const scored = rows.map(r => {
        const u = columns.reduce((s,c) => s + (r[c.key]?.grade||0) * c.weight / 100, 0);
        return { name: r.name, value: Math.round(u * 100) };
    }).sort((a, b) => b.value - a.value).slice(0, 6);

    return {
        series: scored.map((item, i) => ({
            type: 'gauge',
            center: [[20, 25], [50, 25], [80, 25], [20, 75], [50, 75], [80, 75]][i] || [50, 50],
            radius: '22%',
            min: 0, max: 1000,
            startAngle: 200, endAngle: -20,
            title: { show: true, offsetCenter: [0, '40%'], fontSize: 10, color: '#333' },
            detail: { valueAnimation: true, fontSize: 16, offsetCenter: [0, '10%'],
                formatter: '{value}' },
            data: [{ value: item.value, name: item.name.substring(0, 14) }],
            axisLine: { lineStyle: { width: 10, color: [
                [0.4, '#ef4444'], [0.7, '#f59e0b'], [1, '#22c55e'] ] } },
            pointer: { width: 4 },
            progress: { show: true, width: 10 },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
        }))
    };
}

export function pieConfig(rows, columns) {
    const data = rows.map(r => {
        const u = Math.round(columns.reduce((s,c) => s + (r[c.key]?.grade||0) * c.weight / 100, 0) * 100);
        return { name: r.name, value: Math.max(u, 1) };
    }).sort((a, b) => b.value - a.value);

    return {
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { type: 'scroll', orient: 'vertical', right: 10, top: 20, bottom: 20,
            textStyle: { fontSize: 10 } },
        series: [{
            type: 'pie',
            radius: ['35%', '70%'],
            center: ['40%', '50%'],
            data: data,
            label: { fontSize: 10, formatter: '{b}\n{d}%' },
            itemStyle: { borderColor: '#fff', borderWidth: 2 },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
        }]
    };
}

export function funnelConfig(rows, columns) {
    const data = rows.map(r => {
        const u = Math.round(columns.reduce((s,c) => s + (r[c.key]?.grade||0) * c.weight / 100, 0) * 100);
        return { name: r.name, value: Math.max(u, 1) };
    }).sort((a, b) => b.value - a.value);

    return {
        tooltip: { trigger: 'item', formatter: '{b}: {c}' },
        series: [{
            type: 'funnel',
            data: data,
            sort: 'descending',
            label: { show: true, fontSize: 11, position: 'inside' },
            labelLine: { length: 10 },
            itemStyle: { borderColor: '#fff', borderWidth: 1 },
            emphasis: { label: { fontSize: 13 } },
            left: '10%', right: '10%', top: 30, bottom: 30,
        }]
    };
}

// ═══════════════════════════════════════
// DROPDOWN OPTIONS
// ═══════════════════════════════════════

export const TREE_VIZ_OPTIONS = [
    { value: 'tree-TB', label: '1. Дерево сверху-вниз (TB)', icon: '🌳' },
    { value: 'tree-LR', label: '2. Дерево слева-направо (LR)', icon: '🌲' },
    { value: 'tree-radial', label: '3. Дерево радиальное', icon: '☀️' },
    { value: 'treemap', label: '4. Treemap (площадь=utility)', icon: '🟦' },
    { value: 'sunburst', label: '5. Sunburst (кольца)', icon: '🎯' },
    { value: 'graph-force', label: '6. Граф (физика)', icon: '🕸️' },
    { value: 'sankey', label: '7. Sankey (потоки)', icon: '🌊' },
];

export const TABLE_VIZ_OPTIONS = [
    { value: 'heatmap', label: '1. Heatmap (матрица баллов)', icon: '🔥' },
    { value: 'radar', label: '2. Radar (профиль по параметрам)', icon: '📡' },
    { value: 'bar', label: '3. Bar (сортировка по utility)', icon: '📊' },
    { value: 'scatter', label: '4. Scatter (utility vs цена)', icon: '🔵' },
    { value: 'treemap', label: '5. Treemap (площадь=utility)', icon: '🟦' },
    { value: 'sankey', label: '6. Sankey (параметр→объект)', icon: '🌊' },
    { value: 'parallel', label: '7. Parallel (параллельные оси)', icon: '||' },
    { value: 'sunburst', label: '8. Sunburst (иерархия)', icon: '🎯' },
    { value: 'gauge', label: '9. Gauge (спидометры)', icon: '⏱️' },
    { value: 'pie', label: '10. Pie (доли utility)', icon: '🥧' },
    { value: 'funnel', label: '11. Funnel (воронка)', icon: '🔻' },
];
