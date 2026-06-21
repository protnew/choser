// Fallback data used when API call fails
export const fallbackData = {
    totalTables: 400,
    displacement: { avgPct: 18.5, topMoved: ['Средства дис...','Система ком...','Микрофон'], 'стабилен': 275, '1→2': 57, '1→3': 22, '1→4+': 13 },
    objectCount: [
        { count: 2, errorRate: 28, tables: 45, group: '2', errorPct: 28 },
        { count: 3, errorRate: 22, tables: 89, group: '3', errorPct: 22 },
        { count: 4, errorRate: 18, tables: 112, group: '4', errorPct: 18 },
        { count: 5, errorRate: 14, tables: 78, group: '5-6', errorPct: 14 },
        { count: 6, errorRate: 11, tables: 42, group: '7-10', errorPct: 11 },
        { count: 7, errorRate: 8, tables: 21, group: '11-20', errorPct: 8 },
        { count: 8, errorRate: 6, tables: 8, group: '21+', errorPct: 6 },
        { count: 9, errorRate: 4, tables: 5, group: '9+', errorPct: 4 }
    ],
    weightInequality: [
        { ginii: 0.1, errorRate: 5, count: 20, group: 'Gini <0.2', errorPct: 0, tables: 20 },
        { ginii: 0.2, errorRate: 10, count: 45, group: 'Gini 0.2-0.3', errorPct: 3, tables: 45 },
        { ginii: 0.3, errorRate: 18, count: 80, group: 'Gini 0.3-0.4', errorPct: 5, tables: 80 },
        { ginii: 0.4, errorRate: 25, count: 95, group: 'Gini 0.4-0.5', errorPct: 8, tables: 95 },
        { ginii: 0.5, errorRate: 35, count: 70, group: 'Gini 0.5-0.6', errorPct: 8, tables: 70 },
        { ginii: 0.6, errorRate: 42, count: 50, group: 'Gini 0.6-0.7', errorPct: 8, tables: 50 },
        { ginii: 0.7, errorRate: 50, count: 30, group: 'Gini >0.7', errorPct: 8, tables: 30 },
        { ginii: 0.8, errorRate: 58, count: 10, group: 'Gini >0.8', errorPct: 8, tables: 10 }
    ],
    entropy: [
        { bins: '0-0.5', errorRate: 45, count: 15, group: '0-0.5', errorPct: 45, tables: 15 },
        { bins: '0.5-1.0', errorRate: 35, count: 30, group: '0.5-1.0', errorPct: 35, tables: 30 },
        { bins: '1.0-1.5', errorRate: 25, count: 55, group: '1.0-1.5', errorPct: 25, tables: 55 },
        { bins: '1.5-2.0', errorRate: 18, count: 80, group: '1.5-2.0', errorPct: 18, tables: 80 },
        { bins: '2.0-2.5', errorRate: 12, count: 90, group: '2.0-2.5', errorPct: 12, tables: 90 },
        { bins: '2.5-3.0', errorRate: 8, count: 70, group: '2.5-3.0', errorPct: 8, tables: 70 },
        { bins: '3.0+', errorRate: 5, count: 60, group: '3.0+', errorPct: 5, tables: 60 }
    ],
    paramTypes: [
        { type: 'Числовые', errorRate: 12, count: 180, errorPct: 20.7, tables: 180 },
        { type: 'Категории', errorRate: 22, count: 120, errorPct: 25.3, tables: 120 },
        { type: 'Булевы', errorRate: 30, count: 60, errorPct: 26.1, tables: 60 },
        { type: 'Шкала', errorRate: 16, count: 40, errorPct: 29.7, tables: 40 }
    ],
    safetyMargin: {
        distribution: { fragile: 45, moderate: 120, robust: 235, '<0.1': 55, '0.1-0.5': 80, '0.5-1': 60, '1-3': 90, '>3': 172 },
        avgMargin: 0.82, fragilePct: 11.3, avg: 1.8, median: 1.2, total: 400
    },
    borderline: { count: 87, pct: 21.8, errorShare: 68 },
    lorenz: { totalParams: 2800 },
    pareto: { top20pctTables: 18, generatePct: 52, totalErrors: 156 },
    weightsVsGrades: { weightsNoisePct: 8, gradesNoisePct: 22, combinedPct: 28 },
    monteCarlo: { avgShift: 1.4, topShiftPct: 35, confidence: 0.72 },
    roi: { avgRoi: 3.2, medianRoi: 2.1, breakevenPct: 78 },
    cases: [
        { table: 'Выбор CRM', before: 'AmoCRM', after: 'Bitrix24', margin: 0.12, reason: 'Вес «цена» был 25% → удалён' },
        { table: 'Хостинг', before: 'Reg.ru', after: 'Timeweb', margin: 0.08, reason: 'Шкала 10→3 балла' },
        { table: 'Ноутбук', before: 'MacBook', after: 'ThinkPad', margin: 0.15, reason: 'Равные веса вместо оригинальных' }
    ],
    minimalModel: { avgParams: 6.2, minParams: 3.1, qualityRetention: 85 },
    gaps: { avgGap: 1.8, noGapPct: 35 },
    inversions: { count: 42, pct: 10.5 },
    correlation: { avgCorr: 0.35, highCorrPct: 12 },
    outliers: { count: 23, pct: 5.8, outlierTables: 45, withOutliersPct: 28, withoutOutliersPct: 18 },
    deadParams: { count: 45, pct: 1.6 },
    idealObjects: { count: 8, pct: 2 },
    kendall: { avgTau: 0.72, lowTauPct: 15 },
    dominance: { fullDominancePct: 8, partialPct: 22 },
    complexity: { avgParams: 6.2, errorByParams: [{ p: 3, e: 8 }, { p: 5, e: 14 }, { p: 7, e: 20 }, { p: 10, e: 28 }] },
    clusters: { count: 5, sizes: [120, 95, 80, 65, 40] },
    timeDynamics: { trend: 'stable', monthOverMonth: -2 },
    temporal: [
        { month: 'Янв', errorPct: 25, n: 30 },
        { month: 'Фев', errorPct: 27.5, n: 45 },
        { month: 'Мар', errorPct: 11.5, n: 80 },
        { month: 'Апр', errorPct: 15, n: 60 }
    ],
    categories: [
        { name: 'Финансы', errorRate: 50 },
        { name: 'IT инфраструктура', errorRate: 34.6 },
        { name: 'Бизнес-софт', errorRate: 23.8 },
        { name: 'Гаджеты', errorRate: 17.6 },
        { name: 'Обучение', errorRate: 9.1 },
        { name: 'Безопасность', errorRate: 0 },
        { name: 'Путешествия', errorRate: 0 }
    ],
    concentration: { oneDominant: 19, twoDominant: 49, threePlus: 299 }
}
