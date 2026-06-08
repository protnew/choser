import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useApp } from '../../contexts/AppContext';

export default function ScatterAnalyticsChart({ tables, title, description, withPrices }) {
    const { theme } = useApp();
    const D = theme === 'dark';
    const tS = D ? '#94a3b8' : '#64748b';
    const gL = D ? '#374151' : '#e5e7eb';

    // If withPrices not specified, show all tables
    const validTables = (tables || []).filter(t => t.scores && t.scores.length > 0 && (withPrices === undefined || !!t.hasPrices === !!withPrices));
    if (!validTables.length) return null;

    const scatterData = [];
    const categories = [];

    validTables.sort((a,b) => b.scores.length - a.scores.length).forEach((t, index) => {
        categories.push(t.title.length > 25 ? t.title.substring(0, 25) + '...' : t.title);
        t.scores.forEach(score => {
            const jitter = (Math.random() - 0.5) * 0.6;
            scatterData.push([index + jitter, score]);
        });
    });

    const allScatterScores = scatterData.map(d => d[1]);
    const scatterMean = allScatterScores.reduce((a, b) => a + b, 0) / (allScatterScores.length || 1);
    const scatterVariance = allScatterScores.reduce((a, b) => a + Math.pow(b - scatterMean, 2), 0) / (allScatterScores.length || 1);
    const scatterStdDev = Math.sqrt(scatterVariance);

    const option = {
        grid: { top: 20, bottom: 90, left: 60, right: 80 },
        visualMap: {
            min: 0,
            max: 1,
            dimension: 1,
            orient: 'vertical',
            right: 0,
            top: 'center',
            text: ['1.0 (Макс)', '0.0 (Мин)'],
            calculable: true,
            inRange: {
                color: ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
            },
            textStyle: { color: tS, fontSize: 12 }
        },
        dataZoom: [
            { type: 'slider', show: true, bottom: 10, start: 0, end: Math.min(100, (20 / validTables.length) * 100) },
            { type: 'inside', start: 0, end: Math.min(100, (20 / validTables.length) * 100) }
        ],
        tooltip: {
            trigger: 'item',
            formatter: function (params) {
                const categoryIdx = Math.round(params.data[0]);
                if (!categories[categoryIdx]) return '';
                return `Таблица: ${categories[categoryIdx]}<br/>Оценка полезности: <b>${params.data[1].toFixed(2)}</b>`;
            }
        },
        xAxis: {
            type: 'value',
            min: -0.5,
            max: categories.length - 0.5,
            interval: 1,
            axisLabel: {
                formatter: function (value) {
                    return categories[Math.round(value)] || '';
                },
                rotate: 45,
                color: tS
            },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: 'Полезность (0-1)',
            nameTextStyle: { color: tS },
            axisLabel: { color: tS },
            splitLine: { lineStyle: { type: 'dashed', color: gL } }
        },
        series: [{
            name: 'Варианты',
            type: 'scatter',
            symbolSize: function(v) { return (v[1] < 0.1 || v[1] > 0.9) ? (Math.random()>0.5?7:5) : 4; },
            itemStyle: {
                opacity: 0.8,
                borderColor: 'rgba(255,255,255,0.2)',
                borderWidth: 0.5
            },
            data: scatterData,
            markLine: {
                data: [
                    { type: 'average', name: 'Среднее', lineStyle: { color: '#ef4444', width: 2, type: 'solid' }, label: { formatter: 'Среднее', position: 'end' } }
                ]
            },
            markArea: {
                itemStyle: { color: 'rgba(239, 68, 68, 0.08)' },
                data: [
                    [
                        { name: '±1σ (ДИ)', yAxis: scatterMean - scatterStdDev, label: { position: 'insideTop', color: '#ef4444', fontSize: 12 } },
                        { yAxis: scatterMean + scatterStdDev }
                    ]
                ]
            }
        }]
    };

    const isReliable = allScatterScores.length >= 30;
    const reliabilityText = isReliable ? "✅ Статистически значимая выборка" : "⚠️ Низкая достоверность прогноза (рекомендуется N ≥ 30)";

    return (
        <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-color)', fontSize: '18px' }}>{title}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>{description}</p>
            </div>
            <div style={{ height: '500px', position: 'relative' }}>
               <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
            </div>
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                Статистика: База расчета = {allScatterScores.length} вариантов. <strong>{reliabilityText}</strong>
            </div>
        </div>
    );
}
