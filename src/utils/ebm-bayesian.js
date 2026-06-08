/**
 * Bayesian EVSI — расчёт через Normal-Inverse-Gamma posterior
 * 
 * Подход: вместо точечных μ,σ — интегрируем EVSI по posterior P(μ,σ|data)
 * Prior: Normal-Inverse-Gamma (conjugate для Normal с неизвестными μ,σ)
 * Posterior: обновляется по данным → сэмплируем (μ,σ) → считаем EVSI для каждого
 */

function normalCDF(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const t2 = t * t, t3 = t2 * t, t4 = t3 * t, t5 = t4 * t;
    const p = 0.3989422804014327 * Math.exp(-z * z / 2);
    let cdf = 1 - p * (0.319381530 * t - 0.356563782 * t2 + 1.781477937 * t3 - 1.821255978 * t4 + 1.330274429 * t5);
    return z < 0 ? 1 - cdf : cdf;
}
function phi(z) { return 0.3989422804014327 * Math.exp(-z * z / 2); }

function computeBenefit(Z, k, sigma) {
    if (Z > 5 || sigma <= 0) return 0;
    const upper = Math.min(Z + 6, 8), N = 500, dz = (upper - Z) / N;
    let integral = 0;
    for (let i = 0; i <= N; i++) {
        const z = Z + i * dz;
        const w = (i === 0 || i === N) ? dz / 2 : dz;
        integral += (z - Z) * k * phi(z) * Math.pow(Math.max(normalCDF(z), 1e-15), k - 1) * w;
    }
    return sigma * integral;
}

// Gamma distribution sampler (Marsaglia & Tsang)
function sampleGamma(alpha) {
    if (alpha < 1) {
        return sampleGamma(alpha + 1) * Math.pow(Math.random(), 1 / alpha);
    }
    const d = alpha - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
        let x, v;
        do {
            const u1 = Math.random(), u2 = Math.random();
            x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            v = 1 + c * x;
        } while (v <= 0);
        v = v * v * v;
        const u = Math.random();
        if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
}

// Normal sampler (Box-Muller)
function sampleNormal() {
    const u1 = Math.random(), u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Bayesian EVSI calculation
 * @param {number[]} xValues - utility values (sorted)
 * @param {number} K - cost per step
 * @param {number} k - candidates per step
 * @param {number} nSamples - MC samples from posterior (default 1000)
 * @returns {object} Bayesian EVSI results with same structure as calculateTableEBM
 */
export function calculateBayesianEVSI(xValues, K, k, nSamples = 1000) {
    const n = xValues.length;
    const mean = xValues.reduce((a, b) => a + b, 0) / n;
    const variance = xValues.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
    const sigma = Math.sqrt(variance);
    const xMax = xValues[n - 1];

    // Normal-Inverse-Gamma posterior parameters
    // Prior: weakly informative (μ₀=mean, κ₀=1, α₀=1, β₀=variance)
    // Posterior: 
    //   κ_n = κ₀ + n
    //   μ_n = (κ₀*μ₀ + n*x̄) / κ_n
    //   α_n = α₀ + n/2
    //   β_n = β₀ + 0.5*Σ(xᵢ-x̄)² + 0.5*κ₀*n*(x̄-μ₀)²/κ_n
    const mu0 = mean, kappa0 = 1, alpha0 = 1;
    const beta0 = variance * 0.5; // weak prior

    const kappaN = kappa0 + n;
    const muN = (kappa0 * mu0 + n * mean) / kappaN;
    const alphaN = alpha0 + n / 2;
    const ss = xValues.reduce((s, x) => s + (x - mean) ** 2, 0);
    const betaN = beta0 + 0.5 * ss + 0.5 * kappa0 * n * (mean - mu0) ** 2 / kappaN;

    // Monte Carlo over posterior
    let evsiSum = 0, benefitSum = 0;
    const evsiSamples = [];
    const muSamples = [];
    const sigmaSamples = [];

    for (let s = 0; s < nSamples; s++) {
        // Sample σ² ~ InverseGamma(α_n, β_n) = 1/Gamma(α_n, 1/β_n)
        const sigma2 = 1 / (sampleGamma(alphaN) / betaN);
        const sigmaS = Math.sqrt(Math.max(sigma2, 1));

        // Sample μ ~ Normal(μ_n, σ²/κ_n)
        const muS = muN + sigmaS * sampleNormal() / Math.sqrt(kappaN);

        // Compute EVSI for this (mu, sigma) sample
        const Z = sigmaS > 0 ? (xMax - muS) / sigmaS : 10;
        const benefit = computeBenefit(Z, k, sigmaS);
        const evsi = benefit - K;

        evsiSum += evsi;
        benefitSum += benefit;
        evsiSamples.push(evsi);
        muSamples.push(muS);
        sigmaSamples.push(sigmaS);
    }

    const evsiMean = evsiSum / nSamples;
    const benefitMean = benefitSum / nSamples;
    const evsiStd = Math.sqrt(evsiSamples.reduce((s, e) => s + (e - evsiMean) ** 2, 0) / (nSamples - 1));

    // Posterior summary
    const muMean = muSamples.reduce((a, b) => a + b, 0) / nSamples;
    const sigmaMean = sigmaSamples.reduce((a, b) => a + b, 0) / nSamples;
    const sigmaStd = Math.sqrt(sigmaSamples.reduce((s, v) => s + (v - sigmaMean) ** 2, 0) / (nSamples - 1));

    // CI for EVSI
    const evsiSorted = [...evsiSamples].sort((a, b) => a - b);
    const evsiCI_lo = evsiSorted[Math.floor(nSamples * 0.025)];
    const evsiCI_hi = evsiSorted[Math.floor(nSamples * 0.975)];
    const pPositive = evsiSamples.filter(e => e > 0).length / nSamples;

    // Priors info
    const priorInfo = {
        type: 'Normal-Inverse-Gamma (conjugate)',
        params: `μ₀=${mu0.toFixed(0)}, κ₀=${kappa0}, α₀=${alpha0}, β₀=${beta0.toFixed(0)}`,
        posterior: `μ_n=${muN.toFixed(0)}, κ_n=${kappaN}, α_n=${alphaN.toFixed(1)}, β_n=${betaN.toFixed(0)}`,
    };

    return {
        method: 'Bayesian',
        methodDescription: 'EVSI усреднён по posterior P(μ,σ|data) через Normal-Inverse-Gamma conjugate prior',
        n, k, K,
        // Posterior estimates
        muPosterior: { mean: muMean, std: sigmaMean / Math.sqrt(kappaN) },
        sigmaPosterior: { mean: sigmaMean, std: sigmaStd },
        // EVSI
        evsiMean: evsiMean,
        evsiStd: evsiStd,
        evsiCI: { lo: evsiCI_lo, hi: evsiCI_hi },
        pPositive: pPositive,
        benefitMean: benefitMean,
        // Raw samples for charts
        evsiSamples,
        muSamples,
        sigmaSamples,
        // Prior info
        priorInfo,
        // Frequentist comparison
        freqEVSI: computeBenefit((xMax - mean) / sigma, k, sigma) - K,
        // Verdict
        verdict: evsiMean > 0 ? 'ИСКАТЬ' : 'СТОП',
        verdictConfidence: pPositive,
        // xValues for charts
        xValues,
        mean, sigma, xMax,
    };
}

/**
 * Monte Carlo EVSI — прямая симуляция процесса поиска
 * Не предполагает нормальность — сэмплирует из эмпирического распределения (bootstrap)
 */
export function calculateMCEVSI(xValues, K, k, nSimulations = 5000) {
    const n = xValues.length;
    const mean = xValues.reduce((a, b) => a + b, 0) / n;
    const sigma = Math.sqrt(xValues.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
    const xMax = xValues[n - 1];

    // Method 1: Empirical bootstrap — resample from actual data
    let benefitSumBootstrap = 0;
    const evsiBootstrap = [];

    for (let sim = 0; sim < nSimulations; sim++) {
        // Draw k samples WITH replacement from data (= bootstrap)
        let maxVal = -Infinity;
        for (let j = 0; j < k; j++) {
            const idx = Math.floor(Math.random() * n);
            if (xValues[idx] > maxVal) maxVal = xValues[idx];
        }
        const improvement = Math.max(0, maxVal - xMax);
        benefitSumBootstrap += improvement;
        evsiBootstrap.push(improvement - K);
    }

    const benefitBootstrap = benefitSumBootstrap / nSimulations;
    const evsiBootstrapMean = evsiBootstrap.reduce((a, b) => a + b, 0) / nSimulations;

    // Method 2: Parametric MC — sample from N(μ,σ)
    let benefitSumParametric = 0;
    const evsiParametric = [];

    for (let sim = 0; sim < nSimulations; sim++) {
        let maxVal = -Infinity;
        for (let j = 0; j < k; j++) {
            const val = mean + sigma * sampleNormal();
            if (val > maxVal) maxVal = val;
        }
        const improvement = Math.max(0, maxVal - xMax);
        benefitSumParametric += improvement;
        evsiParametric.push(improvement - K);
    }

    const benefitParametric = benefitSumParametric / nSimulations;
    const evsiParametricMean = evsiParametric.reduce((a, b) => a + b, 0) / nSimulations;

    // CI for bootstrap EVSI
    const evsiBSsorted = [...evsiBootstrap].sort((a, b) => a - b);
    const evsiPAsorted = [...evsiParametric].sort((a, b) => a - b);

    return {
        method: 'Monte Carlo',
        methodDescription: 'Прямая симуляция: 5000× сэмплируем k кандидатов, измеряем max−xMax',
        n, k, K, mean, sigma, xMax,

        // Bootstrap (non-parametric)
        bootstrap: {
            benefitMean: benefitBootstrap,
            evsiMean: evsiBootstrapMean,
            evsiCI: { lo: evsiBSsorted[Math.floor(nSimulations * 0.025)], hi: evsiBSsorted[Math.floor(nSimulations * 0.975)] },
            pPositive: evsiBootstrap.filter(e => e > 0).length / nSimulations,
            samples: evsiBootstrap,
        },

        // Parametric (Normal assumption)
        parametric: {
            benefitMean: benefitParametric,
            evsiMean: evsiParametricMean,
            evsiCI: { lo: evsiPAsorted[Math.floor(nSimulations * 0.025)], hi: evsiPAsorted[Math.floor(nSimulations * 0.975)] },
            pPositive: evsiParametric.filter(e => e > 0).length / nSimulations,
            samples: evsiParametric,
        },

        // Frequentist comparison
        freqEVSI: computeBenefit((xMax - mean) / sigma, k, sigma) - K,

        verdict: evsiBootstrapMean > 0 ? 'ИСКАТЬ' : 'СТОП',
        verdictBootstrap: evsiBootstrapMean,
        verdictParametric: evsiParametricMean,

        xValues,
    };
}

export { normalCDF, computeBenefit };

/**
 * Step-by-step Bayesian EVSI (for chart)
 */
export function calculateBayesianSteps(xValuesRaw, K, k, nSamples = 500) {
    const steps = [];
    for (let i = 2; i <= xValuesRaw.length; i++) {
        const sample = xValuesRaw.slice(0, i);
        const sN = sample.length;
        const sMean = sample.reduce((a, b) => a + b, 0) / sN;
        const sVar = sN > 1 ? sample.reduce((a, b) => a + (b - sMean) ** 2, 0) / (sN - 1) : 1;
        const sSigma = Math.sqrt(sVar);
        const sMax = Math.max(...sample);

        // Quick Bayesian EVSI for this step
        const mu0 = sMean, kappa0 = 1, alpha0 = 1, beta0 = sVar * 0.5;
        const kappaN = kappa0 + sN;
        const muN = sMean;
        const alphaN = alpha0 + sN / 2;
        const ss = sample.reduce((s, x) => s + (x - sMean) ** 2, 0);
        const betaN = beta0 + 0.5 * ss;

        let evsiSum = 0;
        for (let s = 0; s < nSamples; s++) {
            const sigma2 = 1 / (sampleGamma(alphaN) / betaN);
            const sigmaS = Math.sqrt(Math.max(sigma2, 1));
            const muS = muN + sigmaS * sampleNormal() / Math.sqrt(kappaN);
            const Z = sigmaS > 0 ? (sMax - muS) / sigmaS : 10;
            evsiSum += computeBenefit(Z, k, sigmaS) - K;
        }
        steps.push({ n: sN, x: sMax, mean: sMean, stdDev: sSigma, evsi: evsiSum / nSamples });
    }
    return steps;
}

/**
 * Step-by-step MC (bootstrap) EVSI (for chart)
 */
export function calculateMCSteps(xValuesRaw, K, k, nSims = 1000) {
    const steps = [];
    for (let i = 2; i <= xValuesRaw.length; i++) {
        const sample = xValuesRaw.slice(0, i);
        const sN = sample.length;
        const sMean = sample.reduce((a, b) => a + b, 0) / sN;
        const sVar = sN > 1 ? sample.reduce((a, b) => a + (b - sMean) ** 2, 0) / (sN - 1) : 1;
        const sSigma = Math.sqrt(sVar);
        const sMax = Math.max(...sample);

        let evsiSum = 0;
        for (let sim = 0; sim < nSims; sim++) {
            let maxVal = -Infinity;
            for (let j = 0; j < k; j++) {
                const idx = Math.floor(Math.random() * sN);
                if (sample[idx] > maxVal) maxVal = sample[idx];
            }
            evsiSum += Math.max(0, maxVal - sMax) - K;
        }
        steps.push({ n: sN, x: sMax, mean: sMean, stdDev: sSigma, evsi: evsiSum / nSims });
    }
    return steps;
}
