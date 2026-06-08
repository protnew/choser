import React from 'react';
import ReactECharts from 'echarts-for-react';
import { generateHistogram, normalPDF, betaPDF, weibullPDF, estimateWeibullParams } from '../../utils/statistics';
import { useApp } from '../../contexts/AppContext';

export default function HistogramChart({ title, description, scores, sourceTables, colorPrimary, colorHighlight }) {
    const { theme } = useApp();
    const D = theme === 'dark';
    const tM = D ? '#ffffff' : '#000000';
    const tS = D ? '#94a3b8' : '#64748b';
    const gL = D ? '#374151' : '#e5e7eb';
    const aL = D ? '#374151' : '#e5e7eb';
    const bgCard = D ? '#1e293b' : '#ffffff';
    const brd = D ? '#374151' : '#e5e7eb';
    if (!scores || scores.length === 0) return null;
    
    const bins = 20;
    const histogram = generateHistogram(scores, bins);
    
    let mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const safeMean = mean === 0 ? 0.01 : mean;
    const variance = scores.reduce((a, b) => a + Math.pow(b - safeMean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(Math.max(0, variance)) || 0.1;
    const scale = safeMean / 0.886;

    const xData = histogram.map(h => `${h.binStart.toFixed(2)}-${h.binEnd.toFixed(2)}`);
    const barData = histogram.map(h => h.percentage.toFixed(1));
    
    let alpha = 0, betaParam = 0;
    if (variance > 0 && safeMean > 0 && safeMean < 1) {
        const factor = (safeMean * (1 - safeMean)) / variance - 1;
        if (factor > 0) {
            alpha = safeMean * factor;
            betaParam = (1 - safeMean) * factor;
        }
    }

    const betaLineData = histogram.map(h => {
        const x = h.binStart + (1/(bins*2));
        const pdfVal = (alpha > 0 && betaParam > 0) ? betaPDF(x, alpha, betaParam) : 0;
        return (pdfVal * 100 / bins).toFixed(1);
    });

    const normalLineData = histogram.map(h => {
        const x = h.binStart + (1/(bins*2));
        const pdfVal = normalPDF(x, safeMean, stdDev) || 0;
        return (pdfVal * 100 / bins).toFixed(1);
    });
    
    const weibullLineData = histogram.map(h => {
        const x = h.binStart + (1/(bins*2));
        const { shape, scale: wScale } = estimateWeibullParams(safeMean, stdDev);
        const pdfVal = wScale > 0 ? weibullPDF(x, shape, wScale) : 0;
        return (pdfVal * 100 / bins).toFixed(1);
    });

    const ciStartVal = safeMean - stdDev;
    const ciEndVal = safeMean + stdDev;
    let ciStartIndex = 0;
    let ciEndIndex = bins - 1;
    histogram.forEach((h, i) => {
        if (ciStartVal >= h.binStart && ciStartVal <= h.binEnd) ciStartIndex = i;
        if (ciEndVal >= h.binStart && ciEndVal <= h.binEnd) ciEndIndex = i;
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            valueFormatter: value => value + '%'
        },
        legend: {
            data: [
                { name: 'Доля', icon: 'roundRect', itemStyle: { color: colorPrimary || '#94a3b8' } },
                { name: 'Нормальное', icon: 'roundRect', itemStyle: { color: '#ef4444' } },
                { name: 'Бета (U-образ.)', icon: 'roundRect', itemStyle: { color: '#8b5cf6' } },
                { name: 'Вейбулл', icon: 'roundRect', itemStyle: { color: '#3b82f6' } },
            ],
            bottom: 0,
            itemWidth: 20, itemHeight: 3, itemGap: 12,
            textStyle: { fontSize: 12, color: tS }
        },
        grid: { top: 20, bottom: 45, left: 45, right: 20 },
        xAxis: { 
            type: 'category', 
            data: xData, 
            axisLabel: { 
                formatter: (value) => value.split('-')[0],
                color: tS,
                fontSize: 12
            },
            axisTick: { alignWithLabel: true }
        },
        yAxis: { 
            type: 'value', 
            name: '%', 
            nameTextStyle: { color: tS, fontSize: 12 },
            axisLabel: { color: tS, fontSize: 12 },
            splitLine: { lineStyle: { type: 'dashed', color: gL } } 
        },
        series: [
            {
                name: 'Доля',
                type: 'bar',
                data: barData,
                itemStyle: { 
                    color: {
                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: colorPrimary || '#94a3b8' }, 
                            { offset: 1, color: colorPrimary ? (colorPrimary + '80') : '#e2e8f0' }
                        ]
                    },
                    borderRadius: [4, 4, 0, 0]
                }
            },
            {
                name: 'Нормальное',
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: normalLineData,
                itemStyle: { color: '#ef4444' },
                lineStyle: { type: 'dashed', width: 2, color: '#ef4444' },
                markArea: {
                    itemStyle: { color: 'rgba(239,68,68,0.08)' },
                    data: [[
                        { name: '±1σ (68%)', xAxis: ciStartIndex, label: { position: 'insideTop', color: '#b91c1c', fontSize: 12, fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.85)', padding: [3, 6], borderRadius: 4 } },
                        { xAxis: ciEndIndex }
                    ]]
                }
            },
            {
                name: 'Бета (U-образ.)',
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: betaLineData,
                itemStyle: { color: '#8b5cf6' },
                lineStyle: { type: 'solid', width: 2, color: '#8b5cf6' }
            },
            {
                name: 'Вейбулл',
                type: 'line',
                smooth: true,
                showSymbol: false,
                itemStyle: { color: '#3b82f6' },
                areaStyle: { 
                    color: {
                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.3)' }, { offset: 1, color: 'rgba(59,130,246,0)' }]
                    }
                },
                data: weibullLineData,
                lineStyle: { width: 3, color: '#3b82f6', shadowColor: 'rgba(59,130,246,0.4)', shadowBlur: 10 }
            }
        ]
    };

    let sseNormal = 0;
    let sseWeibull = 0;
    let sseBeta = 0;
    
    histogram.forEach((h, i) => {
        const actual = h.percentage;
        const norm = parseFloat(normalLineData[i]);
        const weib = parseFloat(weibullLineData[i]);
        const beta = parseFloat(betaLineData[i]);
        sseNormal += Math.pow(actual - norm, 2);
        sseWeibull += Math.pow(actual - weib, 2);
        sseBeta += Math.pow(actual - beta, 2);
    });

    const edgeDensity = histogram[0]?.percentage + histogram[bins-1]?.percentage;
    
    let bestFitShape = "";
    if (scores.length < 10) {
        bestFitShape = "Недостаточно данных";
    } else if (sseBeta < sseNormal && sseBeta < sseWeibull && sseBeta < 300) {
        bestFitShape = edgeDensity > 18 ? "Поляризованное U-образное (Бета-распредел.)" : "Смещенное Бета-распределение";
    } else if (edgeDensity > 18) {
        bestFitShape = "Поляризованное (U-образное)";
    } else if (sseNormal < sseWeibull && sseNormal < 300) {
        bestFitShape = "Ближе к Нормальному";
    } else if (sseWeibull < sseNormal && sseWeibull < 300) {
        bestFitShape = "Ближе к Вейбуллу (Асимметричное)";
    } else {
        bestFitShape = "Сложное/Смешанное распределение";
    }

    const isReliable = scores.length >= 30;
    const reliabilityText = isReliable ? "✅ Статистически значимая выборка" : "⚠️ Низкая достоверность (рекомендуется N ≥ 30)";

    return (
        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-color)', fontSize: '14px' }}>{title}</h4>
                {description && <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{description}</p>}
            </div>
            <div style={{ height: '400px' }}>
                <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
            </div>
            
            {sourceTables && sourceTables.length > 0 && (
                <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', textAlign: 'left', zIndex: 10, position: 'relative' }}>
                    <details>
                        <summary style={{ cursor: 'pointer', outline: 'none', color: '#3b82f6', fontWeight: 'bold' }}>
                            Источник: {sourceTables.length} таблиц (Развернуть список)
                        </summary>
                        <div style={{ marginTop: '6px', maxHeight: '100px', overflowY: 'auto', background: 'var(--bg-card-alt, rgba(0,0,0,0.02))', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            {sourceTables.map((t, i) => (
                                <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }} title={t.title}>
                                    <span style={{color: 'var(--text-muted)', marginRight: '4px'}}>■</span> {t.title}
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}

            <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                Форма: <strong>{bestFitShape}</strong> | μ={(safeMean||0).toFixed(2)} | σ={(stdDev||0).toFixed(2)}<br /> <strong style={{marginTop: '4px', display: 'inline-block'}}>{reliabilityText} (N={scores.length})</strong>
            </div>
        </div>
    );
}
