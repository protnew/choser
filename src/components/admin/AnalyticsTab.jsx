import React from 'react';
import { EChart } from './chartHelpers.jsx';
import { makeTheme, barChart, makeScatter, makeScatterTimeline } from './analytics/chartConfig.js';
import ChartPassport from './analytics/ChartPassport.jsx';

export default function AnalyticsTab({ stats, theme }) {
    const isDark = theme === 'dark';
    const dk = isDark;
    const tx = isDark ? '#f8fafc' : '#0f172a';
    const sb = isDark ? '#94a3b8' : '#64748b';
    const kf = n => n >= 1000 ? (n/1000).toFixed(1)+'k' : n;

    const card = {
        background: isDark ? '#1e293b' : '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
    };

    const sectionTitle = { fontSize: 18, fontWeight: 700, color: tx, marginBottom: 4 };
    const sectionDesc = { fontSize: 13, color: sb, marginBottom: 14, fontWeight: 500 };
    const statValue = { fontSize: 22, fontWeight: 700 };
    const statLabel = { fontSize: 12, color: sb, fontWeight: 500 };

    const bc = (data, color, title, desc) => barChart(data, color, title, desc, dk, tx, sb, kf);
    const ms = (raw, xN, yN, title, desc) => makeScatter(raw, xN, yN, title, desc, dk, tx, sb, kf);
    const mst = (raw, xN, yN, title, desc) => makeScatterTimeline(raw, xN, yN, title, desc, dk, tx, sb, kf);

    const us = stats.utilityStats || {};
    const authors = [...(stats.userActivity?.topAuthors || [])].reverse();
    const ptScatter = ms(stats.perTableScatter || [], 'Ср. стоимость', 'Ср. полезность', 'Стоимость vs Полезность', 'Каждая точка = одна таблица');
    const opScatter = ms(stats.objParamScatter || [], 'Объектов', 'Параметров', 'Объекты vs Параметры', 'Связь между количеством объектов и параметров');
    const bubData = (stats.tableAnalytics || []).filter(t => t.objects > 0);
    const maxU = Math.max(1, ...bubData.map(t => t.avgUtility || 1));
    const minU = Math.min(0, ...bubData.map(t => t.avgUtility || 0));
    const bubOpt = {
        tooltip: { trigger: 'item', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#f8fafc', fontSize: 13 }, formatter: p => `<b>${p.data[4]}</b><br/>Просмотры: ${p.data[0]}<br/>Объектов: ${p.data[1]}<br/>Параметров: ${p.data[2]}<br/>Полезность: ${p.data[3]}<br/>Автор: ${p.data[5] || '—'}` },
        grid: { left: 70, right: 100, top: 60, bottom: 50 },
        title: { text: 'Карта таблиц', subtext: 'Размер = Сложность. Цвет = Полезность.', left: 'center', textStyle: { fontSize: 15, fontWeight: 700, color: tx }, subtextStyle: { fontSize: 13, color: sb } },
        xAxis: { name: 'Просмотры', nameLocation: 'center', nameGap: 28, nameTextStyle: { color: tx, fontSize: 13 }, axisLabel: { color: sb, fontSize: 12 }, splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#f1f5f9' } } },
        yAxis: { name: 'Объектов', nameLocation: 'center', nameGap: 50, nameTextStyle: { color: tx, fontSize: 13 }, axisLabel: { color: sb, fontSize: 12, formatter: kf }, splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#f1f5f9' } } },
        visualMap: { show: true, dimension: 3, min: minU, max: maxU, text: ['Высокая', 'Низкая'], textStyle: { color: sb, fontSize: 12 }, inRange: { color: ['#ef4444', '#f59e0b', '#22c55e'] }, right: 0, top: 'center', orient: 'vertical' },
        series: [{ type: 'scatter', data: bubData.map(t => [t.views || 0, t.objects, t.params, t.avgUtility || 0, t.title, t.author]), symbolSize: d => Math.max(12, Math.min(50, Math.sqrt(d[2] * 40))), itemStyle: { opacity: 0.85 }, emphasis: { itemStyle: { shadowBlur: 10, opacity: 1, borderColor: '#fff', borderWidth: 2 } } }]
    };
    const timelineData = (stats.timeline || []).slice(-24).map(t => ({ label: t.month?.slice(2) || '?', y: t.created || 0 }));
    const tlScatter = mst(timelineData, 'Месяц', 'Создано таблиц', 'Динамика создания', 'Каждая точка = новые таблицы за месяц');

    const StatCard = ({ icon, label, value, color }) => (
        <div style={{ ...card, borderLeft: `4px solid ${color}`, padding: '16px 18px', marginBottom: 0 }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
            <div style={{ ...statValue, color }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
            <div style={statLabel}>{label}</div>
        </div>
    );

    const S = ({ l, v, c }) => (
        <div style={{ padding: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: sb, fontSize: 12, fontWeight: 500 }}>{l}</span>
            <b style={{ color: c || tx, fontSize: 13 }}>{typeof v === 'number' ? v.toLocaleString() : v}</b>
        </div>
    );

    return (
        <div style={{ overflow: 'auto', padding: 20, userSelect: 'text', maxWidth: 1200, margin: '0 auto' }}>
            <h2 style={{ ...sectionTitle, fontSize: 22, marginBottom: 16 }}>Аналитика базы данных</h2>

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
                <StatCard icon="📋" label="Таблиц" value={stats.overview.totalTables} color="#3b82f6" />
                <StatCard icon="📦" label="Объектов" value={stats.overview.totalRows} color="#22c55e" />
                <StatCard icon="👥" label="Пользователей" value={stats.overview.totalUsers} color="#f59e0b" />
                <StatCard icon="📏" label="Ср. объектов/табл." value={stats.overview.avgObjectsPerTable} color="#8b5cf6" />
                <StatCard icon="📐" label="Ср. параметров/табл." value={stats.overview.avgParamsPerTable} color="#ec4899" />
                <StatCard icon="🔢" label="Объектов min-max" value={`${stats.overview.minObjects}—${stats.overview.maxObjects}`} color="#06b6d4" />
                <StatCard icon="🎚️" label="Параметров min-max" value={`${stats.overview.minParams}—${stats.overview.maxParams}`} color="#d946ef" />
            </div>

            {/* Distributions */}
            <div style={card}>
                <div style={sectionTitle}>Распределения</div>
                <div style={sectionDesc}>Количество объектов, параметров и просмотров по таблицам</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
                    <div><div style={{ ...statLabel, marginBottom: 8, textAlign: 'center', fontWeight: 600 }}>Объекты</div><EChart option={bc(stats.distributions.objectCounts || [], ['#3b82f6', '#60a5fa'], 'Объекты', 'Кол-во таблиц')} style={{ width: '100%', height: '220px' }} /></div>
                    <div><div style={{ ...statLabel, marginBottom: 8, textAlign: 'center', fontWeight: 600 }}>Параметры</div><EChart option={bc(stats.distributions.paramCounts || [], ['#f59e0b', '#fbbf24'], 'Параметры', 'Кол-во таблиц')} style={{ width: '100%', height: '220px' }} /></div>
                    <div><div style={{ ...statLabel, marginBottom: 8, textAlign: 'center', fontWeight: 600 }}>Просмотры</div><EChart option={bc(stats.distributions.viewsCounts || [], ['#ec4899', '#f472b6'], 'Просмотры', 'Кол-во таблиц')} style={{ width: '100%', height: '220px' }} /></div>
                </div>
            </div>

            {/* Cost & Utility */}
            <div style={card}>
                <div style={sectionTitle}>Cost и Utility</div>
                <div style={sectionDesc}>Статистика полезности и стоимости решений</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
                    <div style={{ background: isDark ? '#0f172a' : '#f8fafc', borderRadius: 10, padding: 16 }}>
                        <div style={{ fontWeight: 700, color: tx, fontSize: 14, marginBottom: 10 }}>Полезность</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                            <div><S l="Среднее" v={us.avgUtility} c="#22c55e" /><S l="Медиана" v={us.medianUtility} c="#22c55e" /><S l="Отклонение" v={us.stdUtility} /><S l="Кол-во значений" v={us.totalUtilityValues} /><S l="Таблиц" v={us.tablesWithUtility} /></div>
                            <div><S l="P10" v={us.p10Utility} /><S l="P25" v={us.p25Utility} /><S l="P75" v={us.p75Utility} /><S l="P90" v={us.p90Utility} /><S l="min / max" v={`${us.minUtility}/${us.maxUtility}`} /></div>
                        </div>
                        <EChart option={bc(stats.histograms?.utility || [], ['#22c55e', '#4ade80'], 'Utility', '12 бинов')} style={{ width: '100%', height: '180px' }} />
                    </div>
                    <div style={{ background: isDark ? '#0f172a' : '#f8fafc', borderRadius: 10, padding: 16 }}>
                        <div style={{ fontWeight: 700, color: tx, fontSize: 14, marginBottom: 10 }}>Стоимость</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                            <div><S l="Среднее" v={us.avgCost} c="#ef4444" /><S l="Медиана" v={us.medianCost} c="#ef4444" /><S l="Отклонение" v={us.stdCost} /><S l="Кол-во значений" v={us.totalCostValues} /><S l="Таблиц" v={us.tablesWithCost} /></div>
                            <div><S l="P10" v={us.p10Cost} /><S l="P25" v={us.p25Cost} /><S l="P75" v={us.p75Cost} /><S l="P90" v={us.p90Cost} /><S l="min / max" v={`${us.minCost}/${us.maxCost}`} /></div>
                        </div>
                        <EChart option={bc(stats.histograms?.cost || [], ['#ef4444', '#fca5a5'], 'Cost', '12 бинов')} style={{ width: '100%', height: '180px' }} />
                    </div>
                </div>
            </div>

            {/* Scatter plots */}
            <div style={card}>
                <EChart option={ptScatter.opt} style={{ width: '100%', height: '400px' }} />
                <ChartPassport reg={ptScatter.reg} rawData={ptScatter.rawData} dk={dk} tx={tx} sb={sb} />
            </div>
            <div style={card}>
                <EChart option={opScatter.opt} style={{ width: '100%', height: '400px' }} />
                <ChartPassport reg={opScatter.reg} rawData={opScatter.rawData} dk={dk} tx={tx} sb={sb} />
            </div>

            {/* Timeline */}
            <div style={card}>
                <div style={sectionTitle}>Динамика создания таблиц</div>
                <div style={sectionDesc}>Помесячная активность</div>
                {tlScatter.reg ? (
                    <><EChart option={tlScatter.opt} style={{ width: '100%', height: '400px' }} />
                    <ChartPassport reg={tlScatter.reg} rawData={tlScatter.rawData} dk={dk} tx={tx} sb={sb} /></>
                ) : (
                    <div style={{ padding: 40, textAlign: 'center', color: sb, fontSize: 14 }}>Недостаточно данных</div>
                )}
            </div>

            {/* Tags treemap */}
            <div style={card}>
                <div style={sectionTitle}>Теги</div>
                <div style={sectionDesc}>Распределение таблиц по тегам</div>
                <EChart option={{
                    tooltip: { trigger: 'item', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#f8fafc', fontSize: 13 }, formatter: p => `<b>${p.name}</b>: ${p.value}` },
                    series: [{
                        type: 'treemap', width: '100%', height: '90%',
                        data: (stats.tagStats || []).map(t => ({ name: t.tag, value: t.count })),
                        roam: false, nodeClick: false,
                        label: { show: true, fontSize: 13, color: '#fff', fontWeight: 600, formatter: '{b}\n{c}' },
                        breadcrumb: { show: false },
                        levels: [{ itemStyle: { borderColor: isDark ? '#0f172a' : '#fff', borderWidth: 3, gapWidth: 2 }, upperLabel: { show: false } }],
                        itemStyle: { borderRadius: 4 }
                    }]
                }} style={{ width: '100%', height: '300px' }} />
            </div>

            {/* Authors + States */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(350px,1fr))', gap: 16, marginBottom: 16 }}>
                <div style={card}>
                    <div style={sectionTitle}>Авторы ({stats.userActivity?.totalAuthors})</div>
                    <div style={sectionDesc}>Активность по созданию таблиц</div>
                    <EChart option={{
                        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#f8fafc', fontSize: 13 } },
                        legend: { bottom: 0, textStyle: { color: sb, fontSize: 12 } },
                        grid: { left: 110, right: 30, top: 8, bottom: 32 },
                        xAxis: { type: 'value', axisLabel: { color: sb, fontSize: 12 }, splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#f1f5f9' } } },
                        yAxis: { type: 'category', data: authors.map(a => (a.name || '—').slice(0, 18)), axisLabel: { color: tx, fontSize: 12 } },
                        series: [
                            { name: 'Таблиц', type: 'bar', data: authors.map(a => a.tables), itemStyle: { borderRadius: [0, 4, 4, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#8b5cf6' }, { offset: 1, color: '#a78bfa' }] } } },
                            { name: 'Ср. объектов', type: 'bar', data: authors.map(a => a.avg_objects || 0), itemStyle: { borderRadius: [0, 4, 4, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#60a5fa' }] } } },
                            { name: 'Всего', type: 'bar', data: authors.map(a => a.total_objects || 0), itemStyle: { borderRadius: [0, 4, 4, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#22c55e' }, { offset: 1, color: '#4ade80' }] } } }
                        ]
                    }} style={{ width: '100%', height: Math.max(200, authors.length * 30) + 'px' }} />
                </div>
                <div style={card}>
                    <div style={sectionTitle}>Состояния</div>
                    <div style={sectionDesc}>Распределение таблиц по статусам</div>
                    <EChart option={{
                        tooltip: { trigger: 'item', backgroundColor: '#0f172a', borderColor: '#334155', textStyle: { color: '#f8fafc', fontSize: 13 }, formatter: '{b}: {c} ({d}%)' },
                        series: [{
                            type: 'pie', radius: ['38%', '68%'], center: ['50%', '55%'],
                            data: (stats.stateBreakdown || []).map(d => ({ name: d.state || '—', value: d.count })),
                            label: { color: tx, fontSize: 13, fontWeight: 600 },
                            itemStyle: { borderRadius: 4, borderColor: isDark ? '#1e293b' : '#fff', borderWidth: 2 }
                        }]
                    }} style={{ width: '100%', height: '280px' }} />
                </div>
            </div>

            {/* Bubble map */}
            <div style={card}>
                <EChart option={bubOpt} style={{ width: '100%', height: '520px' }} />
                <p style={{ fontSize: 12, color: sb, marginTop: 8, fontWeight: 500 }}>Ось X = Популярность. Ось Y = Масштаб. Размер = Детализация. Цвет = Полезность.</p>
            </div>
        </div>
    );
}
