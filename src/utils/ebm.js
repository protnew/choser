/**
 * Evidence-Based Management (EBM) — v4 (честные формулы)
 *
 * Главная метрика: EVSI = Expected Value of Search Information
 * = E[(max(X₁..X_k) - xMax)^+] - K
 *
 * Численное интегрирование плотности k-го порядка максимума.
 * σ популяции НЕ уменьшается с ростом выборки.
 */

function normalCDF(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const t2 = t * t; const t3 = t2 * t; const t4 = t3 * t; const t5 = t4 * t;
    const p = 0.3989422804014327 * Math.exp(-z * z / 2);
    let cdf = 1 - p * (0.319381530 * t - 0.356563782 * t2 + 1.781477937 * t3 - 1.821255978 * t4 + 1.330274429 * t5);
    return z < 0 ? 1 - cdf : cdf;
}

/**
 * E[(max(X₁..X_k) - xMax)^+] — ожидаемая выгода одного шага поиска (₽)
 *
 * Численное интегрирование: σ × ∫_Z^∞ (z-Z) × k × φ(z) × Φ(z)^{k-1} dz
 * где Z = (xMax - mean) / σ
 *
 * Это P(max > xMax) × E[max - xMax | max > xMax] в одном выражении.
 *
 * @param {number} Z — стандаризованное расстояние от mean до xMax
 * @param {number} k — кандидатов за шаг (candidatesPerStep)
 * @param {number} stdDev — σ популяции (рубли)
 * @returns {number} ожидаемая выгода в рублях (≥ 0)
 */
function computeExpectedBenefit(Z, k, stdDev) {
    if (Z > 5 || stdDev <= 0 || k < 1) return 0;
    const upper = Math.min(Z + 6, 8);
    const N = 500;
    const dz = (upper - Z) / N;
    let integral = 0;
    for (let i = 0; i <= N; i++) {
        const z = Z + i * dz;
        const phi_z = 0.3989422804014327 * Math.exp(-z * z / 2);
        const Phi_z = normalCDF(z);
        // Плотность k-го порядка максимума: f_{k}(z) = k × φ(z) × Φ(z)^{k-1}
        const pdf_max = k * phi_z * Math.pow(Math.max(Phi_z, 1e-15), k - 1);
        const w = (i === 0 || i === N) ? dz / 2 : dz;
        integral += (z - Z) * pdf_max * w;
    }
    return Math.max(0, stdDev * integral);
}

export function calculateTableEBM(rows, paramCount = 10, configOrPrice = 0.50) {
    const cfg = typeof configOrPrice === 'number' ? { cloudTokenPrice: configOrPrice } : configOrPrice;
    const {
        cloudTokenPrice = 0.50, localTokenPrice = 0.15,
        candidatesPerStep = 5, subagentCount = 1, mcpCallCount = 1,
        hourlyRate = 600, humanValidationSec = 10,
        errorProbability = 0, errorDamage = 0,
        categoryMedianPrice = null, categorySavedHours = 40, categoryRiskDamage = 0,
    } = cfg;

    // ═══════════════════════════════════════════
    // СТОИМОСТЬ ШАГА K (4 компонента)
    // ═══════════════════════════════════════════
    const cloudTokens = 8000 + paramCount * 150;
    const localTokens = 3000 + paramCount * 50;
    const totalTokens = cloudTokens + localTokens;
    const directTokenCost = (cloudTokens / 1000) * cloudTokenPrice + (localTokens / 1000) * localTokenPrice;
    const subagentMarkup = directTokenCost * 0.20 * subagentCount;
    const mcpCost = mcpCallCount * 0.05;
    const orchestrationCost = subagentMarkup + mcpCost;
    const orchestrationRatio = directTokenCost > 0 ? orchestrationCost / (directTokenCost + orchestrationCost) : 0;
    const totalHumanSec = humanValidationSec * candidatesPerStep;
    const timeCost = (totalHumanSec / 3600) * hourlyRate;
    const riskCost = errorProbability * errorDamage;
    const K = directTokenCost + orchestrationCost + timeCost + riskCost;

    const costBreakdown = {
        directTokenCost: directTokenCost.toFixed(2),
        cloudTokens, localTokens, totalTokens,
        orchestrationCost: orchestrationCost.toFixed(2),
        subagentMarkup: subagentMarkup.toFixed(2), mcpCost: mcpCost.toFixed(2),
        orchestrationRatio: (orchestrationRatio * 100).toFixed(0),
        orchestrationWarning: orchestrationRatio > 0.50,
        timeCost: timeCost.toFixed(2), totalHumanSec,
        riskCost: riskCost.toFixed(2),
        K: K.toFixed(2),
    };

    if (!rows || rows.length < 3) {
        return { status: 'NEED_DATA', icon: '🟢', title: 'Сбор стартовой выборки',
            description: 'Минимум 3 объекта с оценками.',
            costBreakdown, report: null, stats: null,
            style: { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' } };
    }

    // ═══════════════════════════════════════════
    // ПОЛЕЗНОСТЬ В РУБЛЯХ
    // ═══════════════════════════════════════════
    const hasPrices = rows.filter(r => parseFloat(r.price) > 0).length > rows.length / 2;
    let utilitySource, utilityRubValues, utilityComment, proxyDetails = null;
    let priceMultiplier = 1;
    let priceScaleLabel = '₽';

    if (hasPrices) {
        // Авто-детекция единиц цены:
        // Если все цены < 1000 и > 3 строк → вероятно тысячи рублей → ×1000
        const priceValues = rows.map(r => parseFloat(r.price) || 0).filter(p => p > 0);
        const maxPrice = Math.max(...priceValues);
        const minPrice = Math.min(...priceValues);
        if (maxPrice < 1000 && priceValues.length > 3) {
            priceMultiplier = 1000;
            priceScaleLabel = 'тыс.₽→₽';
        }

        const maxU = Math.max(...rows.map(r => parseFloat(r._u || 0)), 1);
        utilityRubValues = rows.map(r => {
            const u = parseFloat(r._u || 0);
            const p = parseFloat(r.price || 0) * priceMultiplier;
            return p > 0 ? p * (u / maxU) : 0;
        });
        utilitySource = 'ПРЯМАЯ';
        utilityComment = `Цена (${priceScaleLabel}) × (_u / ${maxU.toFixed(0)})`;
    } else {
        const proxyCategory = (categoryMedianPrice || 30000) * 0.7;
        const proxyTime = categorySavedHours * hourlyRate;
        const proxyRisk = categoryRiskDamage;
        const baseProxy = Math.max(proxyCategory, proxyTime, proxyRisk);
        const maxU = Math.max(...rows.map(r => parseFloat(r._u || 0)), 1);
        utilityRubValues = rows.map(r => baseProxy * (parseFloat(r._u || 0) / maxU));
        proxyDetails = { proxyCategory, proxyTime, proxyRisk, chosen: baseProxy };

        if (baseProxy === proxyRisk && proxyRisk > 0) {
            utilitySource = 'ПРОКСИ_РИСК'; utilityComment = `Снижение риска × ущерб = ${proxyRisk.toFixed(0)}₽`;
        } else if (baseProxy === proxyTime) {
            utilitySource = 'ПРОКСИ_ВРЕМЯ'; utilityComment = `${categorySavedHours}ч × ${hourlyRate}₽/ч = ${proxyTime.toFixed(0)}₽`;
        } else {
            utilitySource = 'ПРОКСИ_КАТЕГОРИЯ'; utilityComment = `Медиана ${(categoryMedianPrice || 30000).toFixed(0)}₽ × 0.7 = ${proxyCategory.toFixed(0)}₽`;
        }
    }

    const validEntries = [];
    for (let i = 0; i < rows.length; i++) {
        const v = parseFloat(utilityRubValues[i]);
        if (v > 0) validEntries.push({ utility: v, row: rows[i] });
    }
    const n = validEntries.length;

    if (n < 3) {
        return { status: 'NEED_DATA', icon: '🟢', title: 'Сбор выборки',
            description: `Нужно 3+. Сейчас: ${n}. Источник: ${utilitySource}`,
            costBreakdown, report: null, stats: null,
            style: { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' } };
    }

    const xValuesRaw = validEntries.map(e => e.utility); // исходный порядок (из БД)
    const xValues = [...xValuesRaw].sort((a, b) => a - b);  // сортированный для статистики
    const mean = xValues.reduce((a, b) => a + b, 0) / n;
    const variance = xValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(Math.max(0, variance));
    const cv = mean > 0 ? stdDev / mean : 0;
    const xMax = xValues[n - 1];
    const xMin = xValues[0];

    // ═══════════════════════════════════════════
    // ВЕРОЯТНОСТЬ УЛУЧШЕНИЯ (порядковая статистика)
    // ═══════════════════════════════════════════
    const Z = stdDev > 0 ? (xMax - mean) / stdDev : 10;
    const pSingle = Math.max(0, 1 - normalCDF(Z));  // P(X_new > xMax)
    const pStep = 1 - Math.pow(1 - pSingle, candidatesPerStep);  // P(max>k > xMax)
    const expectedSteps = pStep > 0.0001 ? 1 / pStep : 9999;

    // ═══════════════════════════════════════════
    // EVSI — Expected Value of Search Information
    // ═══════════════════════════════════════════
    const expectedBenefitRub = computeExpectedBenefit(Z, candidatesPerStep, stdDev);
    const evsi = expectedBenefitRub - K;

    // ═══════════════════════════════════════════
    // ПОШАГОВЫЙ РАСЧЁТ (для графика)
    // ═══════════════════════════════════════════
    const steps = [];
    for (let i = 2; i <= n; i++) {
        const sample = xValuesRaw.slice(0, i);  // ИСХОДНЫЙ порядок (реальный порядок исследования)
        const sN = sample.length;
        const sMean = sample.reduce((a, b) => a + b, 0) / sN;
        const sVar = sN > 1 ? sample.reduce((a, b) => a + Math.pow(b - sMean, 2), 0) / (sN - 1) : 0.001;
        const sStdDev = Math.sqrt(Math.max(0, sVar));
        const sMax = Math.max(...sample);  // текущий лучший (из всех найденных)
        const sZ = sStdDev > 0 ? (sMax - sMean) / sStdDev : 10;

        const sBenefit = computeExpectedBenefit(sZ, candidatesPerStep, sStdDev);
        const sEvsi = sBenefit - K;
        const stepsDone = Math.ceil(sN / candidatesPerStep);

        // xCur = utility последнего изученного объекта (для графика распределения)
        const xCur = sample[sN - 1];
        steps.push({
            n: sN, x: sMax, xCur, mean: sMean, variance: sVar, stdDev: sStdDev,
            evsi: sEvsi,
            accCostRub: stepsDone * K, accTokens: stepsDone * totalTokens,
            extractedBenefit: sMax - sMean,
            shouldStop: sEvsi <= 0,
        });
    }

    const last = steps[steps.length - 1];
    const stepsDone = Math.ceil(n / candidatesPerStep);
    const accCostRub = stepsDone * K;
    const accTokens = stepsDone * totalTokens;
    const extractedBenefit = xMax - mean;

    // ═══════════════════════════════════════════
    // КРИТЕРИЙ ОСТАНОВКИ
    // ═══════════════════════════════════════════
    const stopEVSI = evsi <= 0;
    const stopProb = pStep < 0.005;
    const shouldStop = stopEVSI || stopProb;

    // Прогноз шагов до P < 0.5%
    let remainingSteps = 0;
    if (!shouldStop) {
        // P не меняется (σ фиксирован) → если уже > 0.5%, не станет < 0.5%
        // Но при нахождении лучшего объекта Z растёт, P падает
        // Используем expectedSteps как оценку
        remainingSteps = Math.min(100, Math.max(1, Math.ceil(expectedSteps)));
    }

    // ═══════════════════════════════════════════
    // ДОСТАТОЧНОСТЬ ВЫБОРКИ
    // ═══════════════════════════════════════════
    const zAlpha = 1.96;
    const currentSEM = n > 1 ? stdDev / Math.sqrt(n) : stdDev;
    const currentCI = zAlpha * currentSEM;
    const currentPrecision = mean !== 0 ? (currentCI / Math.abs(mean) * 100) : 100;
    const ciLower = mean - currentCI;
    const ciUpper = mean + currentCI;
    const marginError5 = Math.abs(mean) * 0.05;
    const nMin = stdDev > 0 && marginError5 > 0
        ? Math.ceil(Math.pow(zAlpha * stdDev / marginError5, 2))
        : 3;
    const sufficiencyRatio = nMin > 0 ? n / nMin : 1;
    const suffLevel = sufficiencyRatio >= 1.0 ? 'green' : sufficiencyRatio >= 0.5 ? 'yellow' : 'red';
    const suffLabel = sufficiencyRatio >= 1.0 ? 'ДОСТАТОЧНО' : sufficiencyRatio >= 0.5 ? 'НЕДОСТАТОЧНО' : 'КРИТИЧНО МАЛО';
    const suffIcon = suffLevel === 'green' ? '🟢' : suffLevel === 'yellow' ? '🟡' : '🔴';

    // ═══════════════════════════════════════════
    // ПРОГНОЗ ДЛЯ ГРАФИКА
    // ═══════════════════════════════════════════
    // σ популяции ПОСТОЯНЕН → EVSI не уменьшается с ростом n
    // ═══════════════════════════════════════════
    // ПРОГНОЗ EVSI (убывающая модель)
    // ═══════════════════════════════════════════
    // Более реалистичная модель: с ростом n, лучший найденный xMax
    // растёт (или не уменьшается), поэтому Z = (xMax−μ)/σ растёт,
    // а EVSI = E[benefit] − K убывает.
    // Модель: каждый шаг xMax_max растёт на δ = σ/k_correction,
    // где k_correction учитывает что среднее улучшение максимума
    // по k кандидатам = σ × E[max_order_stat].
    const forecastSteps = [];
    const maxForecastSteps = Math.min(
        100,
        Math.max(
            10,
            expectedSteps < 9999 ? Math.ceil(expectedSteps * 1.5) : 30
        )
    );

    // Модель прогноза: EVSI плавно убывает от текущего до 0
    // за E[шагов]. Стартуем от ФАКТИЧЕСКОГО EVSI (не сглаженного).
    const startEvsi = evsi;  // текущий EVSI = E[benefit] - K
    const targetSteps = expectedSteps < 9999 ? Math.ceil(expectedSteps) : 50;
    const evsiDecay = startEvsi > 0 ? startEvsi / targetSteps : 0;

    for (let f = 1; f <= maxForecastSteps; f++) {
        forecastSteps.push({
            n: n + f,
            evsi: startEvsi - evsiDecay * f,
        });
    }
    const foundOptimal = evsi <= 0;

    // ═══════════════════════════════════════════
    // СТАТИСТИКА
    // ═══════════════════════════════════════════
    const leaderPercentile = n > 1 ? ((n - 1) / n * 100).toFixed(0) : 100;
    const cvLabel = cv < 0.1 ? 'низкий' : cv < 0.3 ? 'средний' : 'высокий';
    const isProxy = utilitySource !== 'ПРЯМАЯ';
    const netPosition = extractedBenefit - accCostRub;

    const stats = {
        n, metric: 'Полезность (₽)',
        mean: mean.toFixed(0), stdDev: stdDev.toFixed(0), cv: cv.toFixed(3), cvLabel,
        xMax: xMax.toFixed(0), xMin: xMin.toFixed(0),
        utilityValues: xValues,  // сортированные utility каждого объекта
        priceValues: validEntries.map(e => parseFloat(e.row.price || 0) * priceMultiplier).filter(p => p > 0), // цены объектов
        leaderPercentile,
        K: K.toFixed(2), tokensPerStep: totalTokens, candidatesPerStep,
        Z: Z.toFixed(3),
        pSingle: (pSingle * 100).toFixed(2),
        pStep: (pStep * 100).toFixed(2),
        expectedSteps: expectedSteps >= 9999 ? '∞' : expectedSteps.toFixed(1),
        expectedBenefitRub: expectedBenefitRub.toFixed(0),
        evsi: evsi.toFixed(2),
        stepsDone, accCostRub: accCostRub.toFixed(0), accTokens,
        extractedBenefit: extractedBenefit.toFixed(0), netPosition: netPosition.toFixed(0),
        remainingSteps,
        budgetRub: (remainingSteps * K).toFixed(0),
        forecastCost10: (10 * K).toFixed(0),
        forecastBenefit10: (10 * expectedBenefitRub).toFixed(0),
        // Достаточность
        nMin, sufficiencyRatio: sufficiencyRatio.toFixed(2), suffLevel, suffLabel, suffIcon,
        currentCI: currentCI.toFixed(1), currentPrecision: currentPrecision.toFixed(1),
        ciLower: ciLower.toFixed(0), ciUpper: ciUpper.toFixed(0),
        currentSEM: currentSEM.toFixed(2),
        // Прогноз
        forecastSteps, foundOptimal,
        utilitySource, utilityComment, isProxy, proxyDetails,
        stopEVSI, stopProb,
        steps, costBreakdown,
        // Масштаб цен
        priceMultiplier, priceScaleLabel,
    };

    // ═══════════════════════════════════════════
    // ОТЧЁТ
    // ═══════════════════════════════════════════
    const evsiExplain = shouldStop
        ? `EVSI = ${evsi.toFixed(0)}₽. Ожидаемый выигрыш за шаг (${expectedBenefitRub.toFixed(0)}₽) не покрывает стоимость (${K.toFixed(0)}₽). Поиск убыточен.`
        : `EVSI = +${evsi.toFixed(0)}₽. Ожидаемый выигрыш (${expectedBenefitRub.toFixed(0)}₽) > стоимость (${K.toFixed(0)}₽). Поиск выгоден.`;

    const recommendation = shouldStop
        ? `⏹️ СТОП. ${stopEVSI ? `EVSI = ${evsi.toFixed(0)}₽ ≤ 0 (выгода ${expectedBenefitRub.toFixed(0)}₽ < стоимость ${K.toFixed(0)}₽).` : ''}${stopProb ? ` P(улучшить) < 0.5%.` : ''}`
        : `▶️ ПРОДОЛЖИТЬ. EVSI = +${evsi.toFixed(0)}₽. Ожидаемая выгода ${expectedBenefitRub.toFixed(0)}₽/шаг > стоимость ${K.toFixed(0)}₽/шаг. P(улучшить за шаг) = ${(pStep * 100).toFixed(1)}%.`;

    // Оптимизация
    const optimizationTips = [];
    if (orchestrationRatio > 0.50) {
        optimizationTips.push(`Оркестрация = ${(orchestrationRatio * 100).toFixed(0)}% стоимости шага. Уменьши субагентов с ${subagentCount} до 0 — сэкономит ~${subagentMarkup.toFixed(0)}₽/шаг.`);
    }
    if (timeCost > directTokenCost) {
        optimizationTips.push(`Время валидации (${timeCost.toFixed(0)}₽) > токены (${directTokenCost.toFixed(0)}₽). Кэширование может сократить шаг.`);
    }

    // Допущения (натяжки — честно подписаны)
    const assumptions = [
        `Облачная модель: ${cloudTokenPrice}₽/1K tok (${cloudTokens} tok)`,
        `Локальная Qwen: ${localTokenPrice}₽/1K tok (${localTokens} tok)`,
        `Время: ${humanValidationSec}с × ${candidatesPerStep} объектов × ${hourlyRate}₽/час`,
        `Субагентов: ${subagentCount}, MCP: ${mcpCallCount}`,
        `Полезность: ${utilitySource} — ${utilityComment}`,
        `Кандидатов/шаг: ${candidatesPerStep}, P(шаг): ${(pStep * 100).toFixed(1)}%`,
    ];
    const limitations = [
        `Нормальность: EVSI предполагает N(μ,σ²). При n=${n} и CV=${cv.toFixed(2)} нормальность не проверена. Оценки 1–10 дискретны, не непрерывны.`,
        `PROXY utility: max(категория×0.7, время×ставка, риск×ущерб) — оптимистичный выбор прокси, завышает полезность.`,
        `Выборка из прошлого: предполагаем, что новые объекты из того же распределения, что уже изученные.`,
        `Независимость: предполагаем, что оценки объектов независимы (на практике могут коррелировать по бренду/категории).`,
        `Стоимость K — оценка, не факт. Реальное время валидации может отличаться от ${humanValidationSec}с.`,
    ];

    const report = {
        recommendation,
        evsiExplain,
        optimizationTips,
        costBreakdown,
        utility: { value: `${xMax.toFixed(0)}₽`, source: utilitySource, comment: utilityComment, isProxy, proxyDetails },
        search: { leader: xMax.toFixed(0), mean: mean.toFixed(0), stdDev: stdDev.toFixed(0),
            candidatesPerStep, pSingle: (pSingle * 100).toFixed(2) + '%',
            pStep: (pStep * 100).toFixed(2) + '%', expectedSteps: expectedSteps >= 9999 ? '∞' : expectedSteps.toFixed(1),
            leaderPercentile, cvLabel },
        accumulated: { stepsDone, costRub: accCostRub.toFixed(0) + '₽', tokens: accTokens.toLocaleString(),
            benefitRub: extractedBenefit.toFixed(0) + '₽', netPosition: (netPosition > 0 ? '+' : '') + netPosition.toFixed(0) + '₽' },
        forecast: { cost10: (10 * K).toFixed(0), benefit10: (10 * expectedBenefitRub).toFixed(0),
            net10: (10 * (expectedBenefitRub - K)).toFixed(0),
            costToSuccess: (expectedSteps * K).toFixed(0), expectedGain: expectedBenefitRub.toFixed(0) },
        assumptions,
        limitations,
    };

    if (!shouldStop) {
        return { status: 'SEARCH', icon: '🟡', title: `▶️ Искать (~${remainingSteps} шагов)`,
            description: recommendation, stats, report, costBreakdown,
            style: { background: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' } };
    } else {
        return { status: 'STOP', icon: '🔴', title: '⏹️ Оптимум',
            description: recommendation, stats, report, costBreakdown,
            style: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' } };
    }
}

export function buildChartData(stats) { return stats?.steps?.map(s => ({ step: s.n, ...s })) || null; }
export { calculateTableEBM as findOptimalN };
