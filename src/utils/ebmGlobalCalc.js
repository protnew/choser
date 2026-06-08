/**
 * EVSI Global — расчётные функции (Normal, Weibull, Empirical)
 */
import {
    normalPDF, normalCDF, weibullPDF, weibullCDF, betaPDF,
    estimateWeibullParams
} from './statistics';

// ═══ EVSI через Normal ═══

export function computeExpectedBenefitNormal(Z, k, stdDev) {
    if (Z > 5 || stdDev <= 0 || k < 1) return 0;
    const upper = Math.min(Z + 6, 8);
    const N = 200;
    const dz = (upper - Z) / N;
    let integral = 0;
    for (let i = 0; i <= N; i++) {
        const z = Z + i * dz;
        const phi_z = 0.3989422804014327 * Math.exp(-z * z / 2);
        const Phi_z = normalCDF(z);
        const pdf_max = k * phi_z * Math.pow(Math.max(Phi_z, 1e-15), k - 1);
        const w = (i === 0 || i === N) ? dz / 2 : dz;
        integral += (z - Z) * pdf_max * w;
    }
    return Math.max(0, stdDev * integral);
}

// ═══ EVSI через Weibull ═══

export function computeExpectedBenefitWeibull(xMax, shape, scale, k, stdDev) {
    if (shape <= 0 || scale <= 0 || k < 1) return 0;
    const upper = xMax + 6 * stdDev;
    const N = 200;
    const dx = (upper - xMax) / N;
    let integral = 0;
    for (let i = 0; i <= N; i++) {
        const x = xMax + i * dx;
        const f_x = weibullPDF(x, shape, scale);
        const F_x = weibullCDF(x, shape, scale);
        const pdf_max = k * f_x * Math.pow(Math.max(F_x, 1e-15), k - 1);
        const w = (i === 0 || i === N) ? dx / 2 : dx;
        integral += (x - xMax) * pdf_max * w;
    }
    return Math.max(0, integral);
}

// ═══ EVSI через Empirical (KDE) ═══

export function computeExpectedBenefitEmpirical(xMax, sortedScores, k) {
    if (!sortedScores || sortedScores.length < 3 || k < 1) return 0;
    const n = sortedScores.length;
    const h = 1.06 * (sortedScores[n - 1] - sortedScores[0]) / Math.pow(n, 0.2) || 0.01;

    let integral = 0;
    const range = sortedScores[n - 1] - sortedScores[0];
    const upper = xMax + range;
    const N = 200;
    const dx = (upper - xMax) / N;

    for (let i = 0; i <= N; i++) {
        const x = xMax + i * dx;
        let f_x = 0;
        for (let j = 0; j < n; j++) {
            const u = (x - sortedScores[j]) / h;
            f_x += Math.exp(-u * u / 2);
        }
        f_x /= (n * h * Math.sqrt(2 * Math.PI));

        let F_x = 0;
        for (let j = 0; j < n; j++) {
            const u = (x - sortedScores[j]) / h;
            F_x += normalCDF(u);
        }
        F_x /= n;

        const pdf_max = k * f_x * Math.pow(Math.max(F_x, 1e-15), k - 1);
        const w = (i === 0 || i === N) ? dx / 2 : dx;
        integral += (x - xMax) * pdf_max * w;
    }
    return Math.max(0, integral);
}

// ═══ Fit распределений ═══

export function fitDistributions(scores) {
    if (!scores || scores.length < 3) return null;

    const n = scores.length;
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
    const stdDev = Math.sqrt(Math.max(0.0001, variance));

    const normalParams = { mu: mean, sigma: stdDev };

    const wb = estimateWeibullParams(mean, stdDev);
    const weibullParams = { shape: wb.shape, scale: wb.scale };

    const range = Math.max(...scores) - Math.min(...scores) || 1;
    const scaledScores = scores.map(s => (s - Math.min(...scores)) / range);
    const scaledMean = scaledScores.reduce((a, b) => a + b, 0) / n;
    const scaledVar = scaledScores.reduce((a, b) => a + (b - scaledMean) ** 2, 0) / (n - 1);
    let betaAlpha = 2, betaBeta = 2;
    if (scaledVar > 0 && scaledVar < scaledMean * (1 - scaledMean)) {
        const common = scaledMean * (1 - scaledMean) / scaledVar - 1;
        betaAlpha = Math.max(0.5, scaledMean * common);
        betaBeta = Math.max(0.5, (1 - scaledMean) * common);
    }
    const betaParams = { alpha: betaAlpha, beta: betaBeta, offset: Math.min(...scores), scale: range };

    const bins = 20;
    const minS = Math.min(...scores);
    const maxS = Math.max(...scores);
    const binWidth = (maxS - minS) / bins || 0.01;
    const histCounts = new Array(bins).fill(0);
    scores.forEach(s => {
        let bin = Math.floor((s - minS) / binWidth);
        if (bin >= bins) bin = bins - 1;
        histCounts[bin]++;
    });

    const histDensity = histCounts.map(c => c / (n * binWidth));

    let sseNormal = 0, sseWeibull = 0, sseBeta = 0;
    for (let i = 0; i < bins; i++) {
        const x = minS + (i + 0.5) * binWidth;
        const observed = histDensity[i];
        sseNormal += (observed - normalPDF(x, mean, stdDev)) ** 2;
        sseWeibull += (observed - weibullPDF(x, weibullParams.shape, weibullParams.scale)) ** 2;
        const xScaled = (x - betaParams.offset) / betaParams.scale;
        const predBeta = betaPDF(Math.max(0.001, Math.min(0.999, xScaled)), betaParams.alpha, betaParams.beta) / betaParams.scale;
        sseBeta += (observed - predBeta) ** 2;
    }

    return {
        normalParams, weibullParams, betaParams,
        sseNormal, sseWeibull, sseBeta,
        mean, stdDev, n, minS, maxS,
        histCounts, histDensity,
        bestFit: sseWeibull <= sseNormal && sseWeibull <= sseBeta ? 'weibull'
            : sseNormal <= sseBeta ? 'normal' : 'beta'
    };
}
