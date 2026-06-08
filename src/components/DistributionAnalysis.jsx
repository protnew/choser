import React, { useState, useEffect } from 'react';
import { API } from '../utils/api';
import { calculateTableStatistics } from '../utils/statistics';
import HistogramChart from './distribution/HistogramChart';
import EVSICalculator from './distribution/EVSICalculator';
import ScatterAnalyticsChart from './distribution/ScatterChart';
import TableReliabilitySummary from './distribution/ReliabilitySummary';
import { AdminNav } from './admin/sensitivity/shared.jsx';

export default function DistributionAnalysis() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        API.get('/api/admin/backup-data')
            .then(res => {
                if (!res.tables || !res.rows || !res.columns) {
                    throw new Error("Неверный формат бэкапа данных.");
                }

                const tablesWithStats = [];
                let gUtilNoPrice = [];
                let gUtilPrice = [];
                let gCostPrice = [];
                let gScorePrice = [];

                res.tables.forEach(t => {
                    const tableColsRow = res.columns.find(c => c.table_id === t.id);
                    if (!tableColsRow) return;
                    
                    let colDefs = [];
                    try { colDefs = typeof tableColsRow.definition === 'string' ? JSON.parse(tableColsRow.definition) : tableColsRow.definition; } catch(e) {}
                    if (!Array.isArray(colDefs)) return;

                    const tableRows = res.rows.filter(r => r.table_id === t.id);
                    
                    let itemsForTable = tableRows.map(r => {
                        let rowData = {};
                        try { rowData = typeof r.data === 'string' ? JSON.parse(r.data) : r.data; } catch(e) {}
                        
                        const parameters = colDefs.map(col => {
                            let valComponent = rowData[col.key];
                            let val = typeof valComponent === 'object' && valComponent !== null ? (valComponent.grade || 0) : (parseFloat(valComponent) || 0);
                            
                            if (col.key === 'price' || col.title?.toLowerCase().includes('цен') || col.title?.toLowerCase().includes('стоим')) {
                                val = parseFloat(rowData.price ?? (typeof valComponent === 'object' && valComponent !== null ? valComponent.value : valComponent)) || 0;
                            }
                            return { name: col.title || col.key, value: val, weight: parseFloat(col.weight) || 1 };
                        });
                        return { id: r.id, parameters };
                    });

                    if (itemsForTable.length > 2) {
                        const stats = calculateTableStatistics(itemsForTable);
                        if (stats && stats.scores.length > 0) {
                            tablesWithStats.push({ title: t.title, ...stats });
                            if (stats.hasPrices) {
                                gUtilPrice.push(...stats.utilityScores);
                                gCostPrice.push(...stats.costScores);
                                gScorePrice.push(...stats.scores);
                            } else {
                                gUtilNoPrice.push(...stats.utilityScores);
                            }
                        }
                    }
                });

                setData({ tables: tablesWithStats, gUtilNoPrice, gUtilPrice, gCostPrice, gScorePrice });
                setLoading(false);
            })
            .catch(e => {
                console.error("Distribution Error:", e);
                setError(e.message);
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-color)' }}>
            <h3>Агрегируем статистику...</h3>
            <p style={{ color: 'var(--text-muted)' }}>Вычисляем EBM параметры распределений.</p>
        </div>
    );

    if (error) return <div style={{ padding: '20px', color: 'red' }}>Ошибка: {error}</div>;

    const tablesWithPrice = data.tables.filter(t => t.hasPrices);
    const tablesNoPrice = data.tables.filter(t => !t.hasPrices);

    return (
        <div style={{ padding: '20px', maxWidth: '100%', margin: '0 auto', color: 'var(--text-color)', height: '100%', overflowY: 'auto' }}>
            <AdminNav activePage="distributions" />
            <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
                📊 Анализ распределений (EBM)
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
                {data.tables.length} таблиц, {data.tables.reduce((a,t) => a + (t.scores?.length || 0), 0).toLocaleString()} вариантов (строк).
                N в подписях = количество вариантов, не таблиц. Зелёная заливка = аппроксимация Вейбулла, красная = нормальное, фиолетовая = бета (U-образное).
            </p>

            <HistogramChart 
                title="1. Глобальная Полезность — таблицы без цен" 
                description={`${tablesNoPrice.length} таблиц без цен: ${data.gUtilNoPrice.length} вариантов. Распределение чистой полезности.`}
                scores={data.gUtilNoPrice} 
                sourceTables={tablesNoPrice}
                colorPrimary="#f59e0b" 
            />
            <HistogramChart 
                title="2. Глобальная Полезность — таблицы с ценой" 
                description={`${tablesWithPrice.length} таблиц с ценами: ${data.gUtilPrice.length} вариантов. Полезность оценённых объектов.`}
                scores={data.gUtilPrice} 
                sourceTables={tablesWithPrice}
                colorPrimary="#3b82f6" 
            />
            <HistogramChart 
                title="3. Глобальная Стоимость (нормированные цены)" 
                description={`${tablesWithPrice.length} таблиц: ${data.gCostPrice.length} цен. Нормированные цены (0–1) для сопоставимости.`}
                scores={data.gCostPrice} 
                sourceTables={tablesWithPrice}
                colorPrimary="#ef4444" 
            />
            <HistogramChart 
                title="4. Глобальная Ценность (Польза / Цена)" 
                description={`${tablesWithPrice.length} таблиц: ${data.gScorePrice.length} вариантов. Value-for-Money = полезность × цена. U-образное = много дешёвых и дорогих, мало средних.`}
                scores={data.gScorePrice} 
                sourceTables={tablesWithPrice}
                colorPrimary="#22c55e" 
            />

            <EVSICalculator tables={data.tables} />
            
            <ScatterAnalyticsChart 
                tables={data.tables} 
                title="6. Рассеяние — таблицы с ценами (удельная ценность)" 
                description={`Только таблицы с заполненной колонкой «Цена». ${tablesWithPrice.length} таблиц, рассеяние оценок Value-for-Money. Красная линия = среднее.`}
                withPrices={true}
            />
            
            <ScatterAnalyticsChart 
                tables={data.tables} 
                title="7. Рассеяние — таблицы без цен (чистая полезность)" 
                description={`Только таблицы БЕЗ цен. ${tablesNoPrice.length} таблиц, рассеяние абстрактной полезности. Красная линия = среднее.`}
                withPrices={false}
            />

            <h3 style={{ marginTop: '40px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                8. Топ 10 изолированных таблиц
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', paddingBottom: '40px' }}>
                {data.tables.filter(t => t.scores && t.scores.length > 5).sort((a,b) => b.scores.length - a.scores.length).slice(0, 10).map((t, idx) => (
                    <HistogramChart 
                        key={idx} 
                        title={`8.${idx + 1}. [${t.hasPrices ? 'С ценой' : 'Без цены'}] ${t.title}`} 
                        description={`Специфичное распределение оценок для таблицы "${t.title}".`}
                        scores={t.scores} 
                    />
                ))}
            </div>
            
            <TableReliabilitySummary tables={data.tables} />
        </div>
    );
}
