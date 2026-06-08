import React from 'react';
import { EChart } from './chartHelpers.jsx';
import { makeTheme, barChart, makeScatter, makeScatterTimeline } from './analytics/chartConfig.js';
import ChartPassport from './analytics/ChartPassport.jsx';

export default function AnalyticsTab({ stats, theme }) {
    const { dk, tx, sb, card, kf } = makeTheme(theme === 'dark');

    const H = ({ n, icon, title, desc }) => (
        <div style={{ marginBottom: '8px', userSelect: 'text' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: tx }}><span style={{ color: sb, fontWeight: 400, fontSize: '12px' }}>§{n} </span>{icon} {title}</h3>
            {desc && <p style={{ margin: '2px 0 0', fontSize: '10px', color: sb }}>{desc}</p>}
        </div>
    );

    const S = ({ l, v, c, t }) => (
        <div style={{ padding: '2px 0', display: 'flex', justifyContent: 'space-between' }} title={t}>
            <span style={{ color: sb, fontSize: '11px' }}>{l}</span>
            <b style={{ color: c || tx, fontSize: '11px' }}>{typeof v === 'number' ? v.toLocaleString() : v}</b>
        </div>
    );

    const bc = (data, color, title, desc) => barChart(data, color, title, desc, dk, tx, sb, kf);
    const ms = (raw, xN, yN, title, desc) => makeScatter(raw, xN, yN, title, desc, dk, tx, sb, kf);
    const mst = (raw, xN, yN, title, desc) => makeScatterTimeline(raw, xN, yN, title, desc, dk, tx, sb, kf);

    const us = stats.utilityStats || {};
    const authors = [...(stats.userActivity?.topAuthors || [])].reverse();
    const ptScatter = ms(stats.perTableScatter || [], 'Ср. стоимость', 'Ср. полезность', '§4 💎 Стоимость vs Полезность', 'Каждая точка = одна таблица');
    const opScatter = ms(stats.objParamScatter || [], 'Объектов', 'Параметров', '§5 📐 Объекты vs Параметры', 'Связь между количеством объектов и параметров');
    const bubData = (stats.tableAnalytics || []).filter(t => t.objects > 0);
    const maxU = Math.max(1, ...bubData.map(t => t.avgUtility || 1));
    const minU = Math.min(0, ...bubData.map(t => t.avgUtility || 0));
    const bubOpt = {
        tooltip: { trigger: 'item', formatter: p => `<b>${p.data[4]}</b><br/>Просмотры: ${p.data[0]}<br/>Объектов: ${p.data[1]}<br/>Параметров: ${p.data[2]}<br/>Полезность: ${p.data[3]}<br/>Автор: ${p.data[5] || '—'}` },
        grid: { left: 60, right: 80, top: 50, bottom: 40 },
        title: { text: '§8 🔬 Карта таблиц', subtext: 'Размер=Сложность. Цвет=Полезность.', left: 'center', textStyle: { fontSize: 13, fontWeight: 600, color: tx }, subtextStyle: { fontSize: 12, color: sb } },
        xAxis: { name: 'Просмотры', nameLocation: 'center', nameGap: 22, nameTextStyle: { color: tx }, axisLabel: { color: sb, fontSize: 12 }, splitLine: { lineStyle: { color: dk ? '#1e293b' : '#f1f5f9' } } },
        yAxis: { name: 'Объектов', nameLocation: 'center', nameGap: 40, nameTextStyle: { color: tx }, axisLabel: { color: sb, fontSize: 12, formatter: kf }, splitLine: { lineStyle: { color: dk ? '#1e293b' : '#f1f5f9' } } },
        visualMap: { show: true, dimension: 3, min: minU, max: maxU, text: ['Высокая', 'Низкая'], textStyle: { color: sb, fontSize: 12 }, inRange: { color: ['#ef4444', '#f59e0b', '#22c55e'] }, right: 0, top: 'center', orient: 'vertical' },
        series: [{ type: 'scatter', data: bubData.map(t => [t.views || 0, t.objects, t.params, t.avgUtility || 0, t.title, t.author]), symbolSize: d => Math.max(10, Math.min(50, Math.sqrt(d[2] * 40))), itemStyle: { opacity: 0.85 }, emphasis: { itemStyle: { shadowBlur: 10, opacity: 1, borderColor: '#fff', borderWidth: 2 } } }]
    };
    const timelineData = (stats.timeline || []).slice(-24).map(t => ({ label: t.month?.slice(2) || '?', y: t.created || 0 }));
    const tlScatter = mst(timelineData, 'Месяц', 'Создано таблиц', '§6 📅 Динамика создания', 'Каждая точка = новые таблицы за месяц');

    return (
        <div style={{ overflow: 'auto', userSelect: 'text' }}>
            <H n={1} icon="📋" title="Обзор базы данных" desc="Ключевые показатели" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', marginBottom: '16px' }}>
                {[{ icon: '📋', l: 'Таблиц', v: stats.overview.totalTables, c: '#3b82f6' }, { icon: '📦', l: 'Объектов', v: stats.overview.totalRows, c: '#22c55e' }, { icon: '👥', l: 'Пользователей', v: stats.overview.totalUsers, c: '#f59e0b' }, { icon: '📏', l: 'Ср. объект./табл.', v: stats.overview.avgObjectsPerTable, c: '#8b5cf6' }, { icon: '📐', l: 'Ср. парам./табл.', v: stats.overview.avgParamsPerTable, c: '#ec4899' }, { icon: '🔢', l: 'Объект. min–max', v: `${stats.overview.minObjects}–${stats.overview.maxObjects}`, c: '#06b6d4' }, { icon: '🎚️', l: 'Парам. min–max', v: `${stats.overview.minParams}–${stats.overview.maxParams}`, c: '#d946ef' }].map((k, i) => (
                    <div key={i} style={{ ...card, borderLeft: `3px solid ${k.color}`, padding: '10px 12px', marginBottom: 0 }}>
                        <div style={{ fontSize: '18px' }}>{k.icon}</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: k.color }}>{typeof k.v === 'number' ? k.v.toLocaleString() : k.v}</div>
                        <div style={{ fontSize: '11px', color: sb }}>{k.l}</div>
                    </div>
                ))}
            </div>
            <H n={2} icon="📊" title="Распределения" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={card}><EChart option={bc(stats.distributions.objectCounts || [], ['#3b82f6', '#60a5fa'], 'Объекты', 'Кол-во таблиц')} style={{ width: '100%', height: '200px' }} /></div>
                <div style={card}><EChart option={bc(stats.distributions.paramCounts || [], ['#f59e0b', '#fbbf24'], 'Параметры', 'Кол-во таблиц')} style={{ width: '100%', height: '200px' }} /></div>
                <div style={card}><EChart option={bc(stats.distributions.viewsCounts || [], ['#ec4899', '#f472b6'], 'Просмотры', 'Кол-во таблиц')} style={{ width: '100%', height: '200px' }} /></div>
            </div>
            <H n={3} icon="📊" title="Cost и Utility" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={card}><div style={{ fontWeight: 600, color: '#22c55e', fontSize: '13px', marginBottom: '6px' }}>Полезность</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', marginBottom: '6px' }}><div><S l="μ" v={us.avgUtility} c="#22c55e" /><S l="Медиана" v={us.medianUtility} c="#22c55e" /><S l="σ" v={us.stdUtility} /><S l="N" v={us.totalUtilityValues} /><S l="Таблиц" v={us.tablesWithUtility} /></div><div><S l="P10" v={us.p10Utility} /><S l="P25" v={us.p25Utility} /><S l="P75" v={us.p75Utility} /><S l="P90" v={us.p90Utility} /><S l="min/max" v={`${us.minUtility}/${us.maxUtility}`} /></div></div><EChart option={bc(stats.histograms?.utility || [], ['#22c55e', '#4ade80'], 'Utility', '12 бинов')} style={{ width: '100%', height: '160px' }} /></div>
                <div style={card}><div style={{ fontWeight: 600, color: '#ef4444', fontSize: '13px', marginBottom: '6px' }}>Стоимость</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', marginBottom: '6px' }}><div><S l="μ" v={us.avgCost} c="#ef4444" /><S l="Медиана" v={us.medianCost} c="#ef4444" /><S l="σ" v={us.stdCost} /><S l="N" v={us.totalCostValues} /><S l="Таблиц" v={us.tablesWithCost} /></div><div><S l="P10" v={us.p10Cost} /><S l="P25" v={us.p25Cost} /><S l="P75" v={us.p75Cost} /><S l="P90" v={us.p90Cost} /><S l="min/max" v={`${us.minCost}/${us.maxCost}`} /></div></div><EChart option={bc(stats.histograms?.cost || [], ['#ef4444', '#fca5a5'], 'Cost', '12 бинов')} style={{ width: '100%', height: '160px' }} /></div>
            </div>
            <div style={card}><EChart option={ptScatter.opt} style={{ width: '100%', height: '380px' }} /><ChartPassport reg={ptScatter.reg} rawData={ptScatter.rawData} dk={dk} tx={tx} sb={sb} /></div>
            <div style={card}><EChart option={opScatter.opt} style={{ width: '100%', height: '380px' }} /><ChartPassport reg={opScatter.reg} rawData={opScatter.rawData} dk={dk} tx={tx} sb={sb} /></div>
            <div style={card}><H n={6} icon="📅" title="Динамика (по месяцам)" />{tlScatter.reg ? <><EChart option={tlScatter.opt} style={{ width: '100%', height: '380px' }} /><ChartPassport reg={tlScatter.reg} rawData={tlScatter.rawData} dk={dk} tx={tx} sb={sb} /></> : <div style={{ padding: 20, textAlign: 'center', color: sb }}>Недостаточно данных</div>}</div>
            <div style={card}><H n={7} icon="🏷️" title="Теги" /><EChart option={{ tooltip: { trigger: 'item', formatter: p => `<b>${p.name}</b>: ${p.value}` }, series: [{ type: 'treemap', width: '100%', height: '90%', data: (stats.tagStats || []).map(t => ({ name: t.tag, value: t.count })), roam: false, nodeClick: false, label: { show: true, fontSize: 12, color: '#fff', formatter: '{b}\n{c}' }, breadcrumb: { show: false }, levels: [{ itemStyle: { borderColor: dk ? '#0f172a' : '#fff', borderWidth: 3, gapWidth: 2 }, upperLabel: { show: false } }], itemStyle: { borderRadius: 4 } }] }} style={{ width: '100%', height: '280px' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={card}><H n="7b" icon="👥" title={`Авторы (${stats.userActivity?.totalAuthors})`} /><EChart option={{ tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { bottom: 0, textStyle: { color: sb, fontSize: 12 } }, grid: { left: 105, right: 30, top: 8, bottom: 28 }, xAxis: { type: 'value', axisLabel: { color: sb, fontSize: 12 } }, yAxis: { type: 'category', data: authors.map(a => (a.name || '—').slice(0, 16)) }, series: [{ name: 'Таблиц', type: 'bar', data: authors.map(a => a.tables), itemStyle: { borderRadius: [0, 4, 4, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#8b5cf6' }, { offset: 1, color: '#a78bfa' }] } } }, { name: 'Ср. объект.', type: 'bar', data: authors.map(a => a.avg_objects || 0), itemStyle: { borderRadius: [0, 4, 4, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#60a5fa' }] } } }, { name: 'Всего', type: 'bar', data: authors.map(a => a.total_objects || 0), itemStyle: { borderRadius: [0, 4, 4, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#22c55e' }, { offset: 1, color: '#4ade80' }] } } }] }} style={{ width: '100%', height: Math.max(200, authors.length * 28) + 'px' }} /></div>
                <div style={card}><H n="7c" icon="📋" title="Состояния" /><EChart option={{ tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' }, series: [{ type: 'pie', radius: ['35%', '65%'], center: ['50%', '55%'], data: (stats.stateBreakdown || []).map(d => ({ name: d.state || '—', value: d.count })), label: { color: tx, fontSize: 12 }, itemStyle: { borderRadius: 4, borderColor: dk ? '#1e293b' : '#fff', borderWidth: 2 } }] }} style={{ width: '100%', height: '260px' }} /></div>
            </div>
            <div style={card}><EChart option={bubOpt} style={{ width: '100%', height: '500px' }} /><p style={{ fontSize: '10px', color: sb, marginTop: '6px' }}>💡 X=Популярность. Y=Масштаб. Размер=Детализация. Цвет=Полезность.</p></div>
        </div>
    );
}
