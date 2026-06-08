// CAVEAT: min→0, max→1 всегда. Искусственно растягивает распределение,
// теряя реальный «разрыв» между объектами. EVSI работает на «сплюснутых» данных.
// TODO: Рассмотреть raw-distance нормализацию для EVSI.
export function normalizeValues(values) {
  if (!values || values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 1);
  return values.map(v => (v - min) / (max - min));
}

export function calculateTableStatistics(items) {
  if (!items || items.length === 0) return null;

  // Extract raw utilities and costs
  let rawUtilities = [];
  let rawCosts = [];
  let hasPrices = false;

  items.forEach(item => {
    let rawU = 0;
    let cost = null;

    if (item.parameters) {
      item.parameters.forEach(p => {
        const val = parseFloat(p.value) || 0;
        const weight = parseFloat(p.weight) || 1;
        const nameLower = (p.name || '').toLowerCase();
        if (nameLower === 'price' || nameLower.includes('цена') || nameLower.includes('стоим')) {
          cost = val;
          if (val > 0) hasPrices = true;
        } else {
          rawU += val * weight;
        }
      });
    }

    rawUtilities.push(rawU);
    rawCosts.push(cost !== null ? cost : 1);
  });

  // Normalize utility
  const normUtilities = normalizeValues(rawUtilities);

  // Normalize costs (inverse: lower cost is better, so max - v / max - min)
  let normCosts = rawCosts;
  if (hasPrices) {
    const minC = Math.min(...rawCosts);
    const maxC = Math.max(...rawCosts);
    normCosts = rawCosts.map(c => {
      if (maxC === minC) return 1;
      return (maxC - c) / (maxC - minC); // 1 = best (cheapest), 0 = worst (most expensive)
    });
  }

  // Calculate final ratio (Utility / Cost) or just Utility if no price
  let finalScores = [];
  for (let i = 0; i < normUtilities.length; i++) {
    let u = normUtilities[i] || 0.01; // Avoid zero
    let c = normCosts[i] || 0.01;
    // Cobb-Douglas utility function: score = U^α × C^β (α=β=1)
    // Это мультипликативная модель — штрафует объекты, которые хороши
    // только по одному измерению. Альтернатива: аддитивная α×U + (1-α)×C
    let score = hasPrices ? (u * c) : u;
    finalScores.push(score);
  }

  // Final scale to 0-1
  finalScores = normalizeValues(finalScores);

  return {
    hasPrices,
    count: finalScores.length,
    utilityScores: normUtilities,
    costScores: normCosts,
    scores: finalScores,
    mean: finalScores.reduce((a, b) => a + b, 0) / finalScores.length
  };
}

export function generateHistogram(scores, bins = 10) {
  const counts = new Array(bins).fill(0);
  scores.forEach(s => {
    // s is 0 to 1
    let bin = Math.floor(s * bins);
    if (bin === bins) bin = bins - 1; // handle edge case 1.0
    counts[bin]++;
  });

  const maxCount = Math.max(...counts) || 1;
  return counts.map((count, index) => ({
    binStart: index / bins,
    binEnd: (index + 1) / bins,
    count,
    normalizedCount: count / maxCount,
    percentage: (count / scores.length) * 100
  }));
}

// Weibull Density Function (PDF)
export function weibullPDF(x, shape, scale) {
  if (x <= 0 || scale <= 0 || shape <= 0) return 0;
  return (shape / scale) * Math.pow(x / scale, shape - 1) * Math.exp(-Math.pow(x / scale, shape));
}

/**
 * Оценка параметров Weibull через Method of Moments.
 * CV = σ/μ однозначно определяет shape (k), затем scale (λ) через среднее.
 * Аппроксимация: k ≈ (1.2785 / CV)^1.0385 (Justus & Mikhail, 1976)
 * @returns {{ shape: number, scale: number }}
 */
export function estimateWeibullParams(mean, stdDev) {
  if (mean <= 0 || stdDev <= 0) return { shape: 2.5, scale: mean / 0.886 }; // fallback
  const cv = stdDev / mean;
  // Justus & Mikhail approximation (accurate for cv ∈ [0.05, 1.5])
  const k = Math.pow(1.2785 / cv, 1.0385);
  // Γ(1 + 1/k) через Stirling approximation для scale
  const g = gammaApprox(1 + 1 / k);
  const lambda = mean / g;
  return { shape: Math.max(0.5, Math.min(k, 20)), scale: lambda };
}

// Gamma function approximation (Stirling + Lanczos for small x)
function gammaApprox(x) {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaApprox(1 - x)); // reflection
  return Math.exp(lgamma(x));
}

// Weibull Cumulative Distribution Function (CDF)
export function weibullCDF(x, shape, scale) {
  if (x <= 0 || scale <= 0 || shape <= 0) return 0;
  return 1 - Math.exp(-Math.pow(x / scale, shape));
}

// Basic Normal Density Function (PDF)
export function normalPDF(x, mean, stdDev) {
  const coeff = 1 / (stdDev * Math.sqrt(2 * Math.PI));
  const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
  return coeff * Math.exp(exponent);
}

// Approximation of Log-Gamma function (Lanczos approximation)
export function lgamma(x) {
    const c = [
        76.18009172947146,
        -86.50532032941677,
        24.01409824083091,
        -1.231739572450155,
        0.1208650973866179e-2,
        -0.5395239384953e-5
    ];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let i = 0; i < c.length; i++) {
        y += 1;
        ser += c[i] / y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
}

// Beta Density Function (PDF)
export function betaPDF(x, alpha, beta) {
    if (x <= 0) x = 0.001; // Avoid infinity at boundaries
    if (x >= 1) x = 0.999;
    
    const logBetaFunc = lgamma(alpha) + lgamma(beta) - lgamma(alpha + beta);
    const logPdf = (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logBetaFunc;
    
    // Cap absurdly high spikes near the boundaries for clean rendering
    return Math.min(Math.exp(logPdf), 20);
}

// Normal Cumulative Distribution Function (CDF) approximation
export function normalCDF(x, mean, stdDev) {
  const z = (x - mean) / stdDev;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

/**
 * Calculates EVSI Net Gain for +1 research step.
 * Для utility — ищем max (правый хвост Normal).
 * Для cost — применяем log-transform (т.к. стоимости обычно log-normal),
 *   затем ищем min в log-пространстве.
 * 
 * @param {number[]} values - массив значений (utility или cost)
 * @param {number} researchCost - стоимость одного шага поиска
 * @param {boolean} isUtility - true=максимизируем, false=минимизируем (cost)
 */
export function calculateEVSIStep(values, researchCost, isUtility) {
  if (!values || values.length < 2) return 0;
  
  if (isUtility) {
    // Максимизация полезности — Normal model
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[i];
    const mu = sum / values.length;
    
    let sqSum = 0;
    for (let i = 0; i < values.length; i++) sqSum += (values[i] - mu) ** 2;
    const sigma = Math.sqrt(sqSum / (values.length - 1)) || 0.0001;
    
    const maxVal = Math.max(...values);
    const probHigher = 1 - normalCDF(maxVal, mu, sigma);
    if (probHigher <= 0.000001) return 0;

    const zScore = (maxVal - mu) / sigma;
    const standardNormPDF = Math.exp(-zScore * zScore / 2) / Math.sqrt(2 * Math.PI);
    const expectedNewMax = mu + sigma * (standardNormPDF / probHigher);

    const expectedGain = probHigher * (expectedNewMax - maxVal);
    const netGain = expectedGain - researchCost;
    return netGain > 0 ? netGain : 0;

  } else {
    // Минимизация стоимости — Log-Normal model
    // Log-transform: стоимости обычно имеют log-normal распределение
    const positiveValues = values.filter(v => v > 0);
    if (positiveValues.length < 2) return 0;

    const logValues = positiveValues.map(v => Math.log(v));
    let logSum = 0;
    for (let i = 0; i < logValues.length; i++) logSum += logValues[i];
    const logMu = logSum / logValues.length;
    
    let logSqSum = 0;
    for (let i = 0; i < logValues.length; i++) logSqSum += (logValues[i] - logMu) ** 2;
    const logSigma = Math.sqrt(logSqSum / (logValues.length - 1)) || 0.0001;

    const minVal = Math.min(...positiveValues);
    const logMinVal = Math.log(minVal);
    const probLower = normalCDF(logMinVal, logMu, logSigma);
    if (probLower <= 0.000001) return 0;

    // E[X | X < minVal] для X ~ LogNormal(logMu, logSigma²)
    const logA = Math.log(minVal);
    const sigma2 = logSigma * logSigma;
    const numerator_term = normalCDF(logA, logMu + sigma2, logSigma);
    const denominator_term = probLower > 1e-15 ? probLower : 1e-15;
    const expectedNewMin = Math.exp(logMu + sigma2 / 2) * (numerator_term / denominator_term);

    const expectedSavings = probLower * (minVal - expectedNewMin);
    const netGain = expectedSavings - researchCost;
    return netGain > 0 ? netGain : 0;
  }
}
