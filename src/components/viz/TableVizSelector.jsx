import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
    heatmapConfig, radarConfig, barHorizontalConfig, scatterConfig,
    treemapTableConfig, sankeyTableConfig, parallelConfig,
    sunburstTableConfig, gaugeConfig, pieConfig, funnelConfig,
    TABLE_VIZ_OPTIONS,
} from '../../utils/echartsConfigs';

/**
 * TableVizSelector — dropdown со всеми вариантами визуализации таблицы выбора.
 * Данные берутся из comparison (rows + columns)Council Stream.
 */
export default function TableVizSelector({ comparison }) {
    const [vizType, setVizType] = useState('heatmap');

    const rows = comparison?.rows || [];
    const columns = comparison?.columns || [];

    const option = useMemo(() => {
        if (!rows.length || !columns.length) return {};

        switch (vizType) {
            case 'heatmap': return heatmapConfig(rows, columns);
            case 'radar': return radarConfig(rows, columns);
            case 'bar': return barHorizontalConfig(rows, columns);
            case 'scatter': return scatterConfig(rows, columns);
            case 'treemap': return treemapTableConfig(rows, columns);
            case 'sankey': return sankeyTableConfig(rows, columns);
            case 'parallel': return parallelConfig(rows, columns);
            case 'sunburst': return sunburstTableConfig(rows, columns);
            case 'gauge': return gaugeConfig(rows, columns);
            case 'pie': return pieConfig(rows, columns);
            case 'funnel': return funnelConfig(rows, columns);
            default: return heatmapConfig(rows, columns);
        }
    }, [vizType, rows, columns]);

    const selectStyle = {
        padding: '8px 12px', borderRadius: 6, fontSize: 13,
        border: '1px solid #475569', background: '#1e293b', color: '#fff',
        cursor: 'pointer', minWidth: 280, fontWeight: 500,
    };

    const labelStyle = {
        fontSize: 13, color: '#cbd5e1', marginBottom: 2,
    };

    if (!rows.length) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                Нет данных для визуализации. Запустите Council.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* DROPDOWN */}
            <div style={{
                padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
            }}>
                <span style={labelStyle}>Визуализация:</span>
                <select
                    value={vizType}
                    onChange={e => setVizType(e.target.value)}
                    style={selectStyle}
                >
                    {TABLE_VIZ_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                        </option>
                    ))}
                </select>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {rows.length} объектов · {columns.length} параметров
                </span>
            </div>

            {/* CHART */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <ReactECharts
                    option={option}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                    notMerge={true}
                />
            </div>
        </div>
    );
}
