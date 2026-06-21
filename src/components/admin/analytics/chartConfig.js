/**
 * Analytics chart configuration helpers
 */
import { linReg, trendLine, confBand } from '../chartHelpers.jsx';

export function makeTheme(dk) {
    const tx = dk ? '#cbd5e1' : '#334155';
    const sb = dk ? '#64748b' : '#94a3b8';
    const card = {
        background: dk ? '#1e293b' : '#fff',
        border: `1px solid ${dk ? '#334155' : '#e2e8f0'}`,
        borderRadius: '12px', padding: '16px', marginBottom: '16px', userSelect: 'text'
    };
    const kf = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v;
    return { dk, tx, sb, card, kf };
}

export function barChart(data, color, title, desc, dk, tx, sb, kf) {
    return {
        tooltip: { trigger: 'axis', textStyle: { fontSize: 12 } },
        grid: { left: 50, right: 16, top: desc ? 48 : 28, bottom: 30 },
        title: [
            { text: title, left: 'center', top: 0, textStyle: { fontSize: 12, fontWeight: 600, color: tx } },
            ...(desc ? [{ text: desc, left: 'center', top: 16, textStyle: { fontSize: 12, color: sb, fontWeight: 400 } }] : [])
        ],
        xAxis: { type: 'category', data: data.map(d => d.range || d.tag || d.state), axisLabel: { color: sb, fontSize: 12 } },
        yAxis: { type: 'value', axisLabel: { color: sb, fontSize: 12 }, splitLine: { lineStyle: { color: dk ? '#1e293b' : '#f1f5f9' } } },
        series: [{
            type: 'bar', data: data.map(d => d.count || d.y), barWidth: '55%',
            itemStyle: { borderRadius: [4, 4, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color[0] }, { offset: 1, color: color[1] }] } },
            label: { show: true, position: 'top', fontSize: 12, color: sb }
        }]
    };
}

export function makeScatter(rawData, xN, yN, title, desc, dk, tx, sb, kf) {
    const pts = rawData.map(d => [d.x ?? d.cost, d.y ?? d.utility]);
    const reg = linReg(pts);
    const trend = trendLine(pts, reg);
    const { u, l } = confBand(pts, reg);
    const isUp = reg && reg.slope > 0;
    const trendColor = isUp ? (dk ? '#22c55e' : '#16a34a') : (dk ? '#ef4444' : '#dc2626');
    const ciFill = isUp ? (dk ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)') : (dk ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)');
    const series = [
        { name: 'Данные (факт)', type: 'scatter', data: rawData.map(d => [d.x ?? d.cost, d.y ?? d.utility, d.title || d.table || '']), symbolSize: 6, itemStyle: { color: dk ? '#94a3b8' : '#cbd5e1', opacity: 0.35 }, emphasis: { itemStyle: { shadowBlur: 8, opacity: 1 } }, z: 2 }
    ];
    if (reg) series.push({ name: 'Тренд', type: 'line', data: trend, lineStyle: { color: trendColor, width: 3 }, symbol: 'none', z: 4 });
    if (u.length && l.length) series.push({
        name: '95% CI', type: 'custom', data: [0], z: 1,
        renderItem: function (params, api) {
            if (params.context.rendered) return; params.context.rendered = true;
            let points = []; for (let i = 0; i < u.length; i++) points.push(api.coord(u[i]));
            for (let i = l.length - 1; i >= 0; i--) points.push(api.coord(l[i]));
            return { type: 'polygon', shape: { points }, style: api.style({ fill: ciFill, stroke: 'none' }) };
        }
    });
    const SmartBAN = reg ? [{ text: `Тренд: ${reg.slope > 0 ? '▲ Рост' : '▼ Спад'} | R²=${reg.r2.toFixed(2)}`, left: 'center', top: desc ? 35 : 18, textStyle: { fontSize: 12, color: trendColor, fontWeight: 700 } }] : [];
    return {
        opt: {
            tooltip: { trigger: 'item', formatter: p => { if (p.seriesType === 'scatter') return `<b>${p.data[2] || '—'}</b><br/>${xN}: ${kf(p.data[0])}<br/>${yN}: ${kf(p.data[1])}`; return p.seriesName; } },
            legend: { bottom: 0, textStyle: { color: sb, fontSize: 12 } },
            grid: { left: 65, right: 20, top: desc ? 65 : 45, bottom: 55 },
            title: [{ text: title, left: 'center', top: 0, textStyle: { fontSize: 13, fontWeight: 600, color: tx } }, ...(desc ? [{ text: desc, left: 'center', top: 16, textStyle: { fontSize: 12, color: sb } }] : []), ...SmartBAN],
            xAxis: { name: xN, nameLocation: 'center', nameGap: 22, nameTextStyle: { color: tx }, axisLabel: { color: sb, fontSize: 12, formatter: kf }, splitLine: { lineStyle: { color: dk ? '#1e293b' : '#f1f5f9' } } },
            yAxis: { name: yN, nameLocation: 'center', nameGap: 40, nameTextStyle: { color: tx }, axisLabel: { color: sb, fontSize: 12, formatter: kf }, splitLine: { lineStyle: { color: dk ? '#1e293b' : '#f1f5f9' } } },
            series
        }, reg, rawData
    };
}

export function makeScatterTimeline(rawData, xN, yN, title, desc, dk, tx, sb, kf) {
    if (!rawData || rawData.length === 0) return { opt: {}, reg: null, rawData: [] };
    const pts = rawData.map((d, i) => [i + 1, d.y]);
    const reg = linReg(pts);
    let trend = [], u = [], l = [];
    if (reg) { trend = trendLine(pts, reg); const r = confBand(pts, reg); u = r.u; l = r.l; }
    const isUp = reg && reg.slope > 0;
    const trendColor = isUp ? (dk ? '#22c55e' : '#16a34a') : (dk ? '#ef4444' : '#dc2626');
    const ciFill = isUp ? (dk ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)') : (dk ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)');
    const series = [
        { name: 'Факт', type: 'scatter', data: rawData.map((d, i) => [i + 1, d.y, d.label]), symbolSize: 8, itemStyle: { color: dk ? '#94a3b8' : '#cbd5e1', opacity: 0.6 }, emphasis: { itemStyle: { shadowBlur: 8, opacity: 1 } }, z: 2 }
    ];
    if (reg) series.push({ name: 'Тренд', type: 'line', data: trend, lineStyle: { color: trendColor, width: 3 }, symbol: 'none', z: 4 });
    if (u.length && l.length) series.push({
        name: '95% CI', type: 'custom', data: [0], z: 1,
        renderItem: function (params, api) {
            if (params.context.rendered) return; params.context.rendered = true;
            let points = []; for (let i = 0; i < u.length; i++) points.push(api.coord(u[i]));
            for (let i = l.length - 1; i >= 0; i--) points.push(api.coord(l[i]));
            return { type: 'polygon', shape: { points }, style: api.style({ fill: ciFill, stroke: 'none' }) };
        }
    });
    const SmartBAN = reg ? [{ text: `Тренд: ${reg.slope > 0 ? '▲' : '▼'} | R²=${reg.r2.toFixed(2)}`, left: 'center', top: desc ? 35 : 18, textStyle: { fontSize: 12, color: trendColor, fontWeight: 700 } }] : [];
    const xLabels = rawData.map(d => d.label);
    return {
        opt: {
            tooltip: { trigger: 'item', formatter: p => { if (p.seriesType === 'scatter') return `<b>${p.data[2] || '—'}</b><br/>${yN}: ${kf(p.data[1])}`; return p.seriesName; } },
            legend: { bottom: 0, textStyle: { color: sb, fontSize: 12 } },
            grid: { left: 50, right: 20, top: desc ? 65 : 45, bottom: 60 },
            title: [{ text: title, left: 'center', top: 0, textStyle: { fontSize: 13, fontWeight: 600, color: tx } }, ...(desc ? [{ text: desc, left: 'center', top: 16, textStyle: { fontSize: 12, color: sb } }] : []), ...SmartBAN],
            xAxis: { type: 'value', name: xN, nameLocation: 'center', nameGap: 30, nameTextStyle: { color: tx }, axisLabel: { color: sb, fontSize: 12, formatter: val => xLabels[val - 1] || val, rotate: 45 }, splitLine: { lineStyle: { color: dk ? '#1e293b' : '#f1f5f9' } }, min: 0, max: rawData.length + 1, interval: 1 },
            yAxis: { name: yN, nameLocation: 'center', nameGap: 35, nameTextStyle: { color: tx }, axisLabel: { color: sb, fontSize: 12, formatter: kf }, splitLine: { lineStyle: { color: dk ? '#1e293b' : '#f1f5f9' } } },
            series
        }, reg, rawData: pts.map(p => ({ x: p[0], y: p[1] }))
    };
}
