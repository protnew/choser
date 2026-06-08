/**
 * Sensitivity chart configurations
 */
export function buildCharts(curves, xLabels) {
    if (!curves) return { tripleChart: null, pairWP: null, pairWS: null, pairPS: null }

    const tripleChart = {
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', textStyle: { fontSize: 12 },
            formatter: (params) => {
                let html = `<b>Упрощение: ${params[0].axisValue}%</b><br/>`
                for (const p of params) html += `${p.marker} ${p.seriesName}: <b>${p.value}%</b><br/>`
                return html
            }
        },
        legend: { top: 0, textStyle: { fontSize: 12 } },
        grid: { left: 55, right: 20, top: 55, bottom: 45 },
        xAxis: { type: 'category', name: 'Степень упрощения', nameLocation: 'middle', nameGap: 28,
            data: curves.weightsCurve.map((_, i) => {
                const pct = i * 5
                if (pct === 0) return '0%'; if (pct === 25) return '25%'; if (pct === 50) return '50%'; if (pct === 75) return '75%'; if (pct === 100) return '100%'; return ''
            }), axisLabel: { fontSize: 12 } },
        yAxis: { type: 'value', min: 0, max: 100, name: 'Совпадение 1-го места %', splitLine: { lineStyle: { type: 'dashed', color: 'inherit' } } },
        series: [
            { name: '⚖️ Веса → равны', type: 'line', smooth: true, data: curves.weightsCurve.map(d => d.firstMatchPct), lineStyle: { width: 3, color: '#6366f1' }, itemStyle: { color: '#6366f1' }, symbol: 'none' },
            { name: '📐 Параметры → меньше', type: 'line', smooth: true, data: curves.paramsCurve.map(d => d.firstMatchPct), lineStyle: { width: 3, color: '#f59e0b' }, itemStyle: { color: '#f59e0b' }, symbol: 'none' },
            { name: '🎯 Шкала 10→1 балл', type: 'line', smooth: true, data: curves.scaleDegradation.map(d => d.firstMatchPct), lineStyle: { width: 3, color: '#06b6d4' }, itemStyle: { color: '#06b6d4' }, symbol: 'none' },
            { name: '🎢 Комбинированное', type: 'line', smooth: true, data: curves.combinedCurve.map(d => d.firstMatchPct), lineStyle: { width: 3, color: '#ef4444', type: 'dashed' }, itemStyle: { color: '#ef4444' }, symbol: 'none' },
        ]
    }

    const mkPair = (name1, data1, color1, name2, data2, color2) => ({
        tooltip: { trigger: 'axis' }, legend: { top: 0, textStyle: { fontSize: 12 } },
        grid: { left: 45, right: 15, top: 40, bottom: 35 },
        xAxis: { type: 'category', data: xLabels, axisLabel: { fontSize: 12 } },
        yAxis: { type: 'value', min: 0, max: 100 },
        series: [
            { name: name1, type: 'line', smooth: true, data: curves[data1].map(d => d.firstMatchPct), lineStyle: { width: 2, color: color1 }, itemStyle: { color: color1 }, symbol: 'none' },
            { name: name2, type: 'line', smooth: true, data: curves[data2].map(d => d.firstMatchPct), lineStyle: { width: 2, color: color2 }, itemStyle: { color: color2 }, symbol: 'none' }
        ]
    })

    return {
        tripleChart,
        pairWP: mkPair('⚖️ Веса', 'weightsCurve', '#6366f1', '📐 Параметры', 'paramsCurve', '#f59e0b'),
        pairWS: mkPair('⚖️ Веса', 'weightsCurve', '#6366f1', '🎯 Шкала', 'scaleDegradation', '#06b6d4'),
        pairPS: mkPair('📐 Параметры', 'paramsCurve', '#f59e0b', '🎯 Шкала', 'scaleDegradation', '#06b6d4'),
    }
}
