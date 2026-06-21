/**
 * Utility calculation functions for Choser tables.
 */

/**
 * Render an HTML progress bar.
 * @param {number} value - Current value
 * @param {number} max - Maximum value for 100% width
 * @param {string} colorStart - Gradient start color (CSS)
 * @param {string} colorEnd - Gradient end color (CSS)
 * @param {string} label - Text label to display on the bar
 * @returns {string} HTML string
 */
export function renderProgressBar(value, max, colorStart, colorEnd, label) {
    const percent = Math.min(100, Math.max(5, (value / max) * 100));
    return `<div class="bar"><div class="bar-bg" style="width:${percent}%;background:linear-gradient(90deg,${colorStart},${colorEnd})"></div><span class="bar-val">${label}</span></div>`;
}

/**
 * Calculate weighted utility score for a row.
 * Нормализует на сумму весов (totalWeight), чтобы score ∈ [0, 1000]
 * независимо от того, суммируются ли веса до 100%.
 * 
 * Формула: score = Σ(grade_i × weight_i) / Σ(weight_i) × 100
 * utilityPerPrice = score / price
 * 
 * @param {object} row - Table row data (with parameter keys like p1, p2...)
 * @param {Array<{key: string, weight: number}>} columns - Column definitions
 * @returns {{ score: number, utilityPerPrice: number }}
 */
export function calculateUtility(row, columns) {
    let rawScore = 0;
    let totalWeight = 0;
    columns.forEach(col => {
        rawScore += (row[col.key]?.grade || 0) * (col.weight || 0);
        totalWeight += (col.weight || 0);
    });
    // Нормализация: score ∈ [0, 1000] при grade ∈ [0,10] и любой сумме весов
    const score = totalWeight > 0 ? (rawScore / totalWeight) * 100 : rawScore;
    const price = parseFloat(row.price) || 0;
    return {
        score,
        utilityPerPrice: price > 0 ? score / price : 0,
    };
}

// Legacy aliases for backward compatibility
export const bar = renderProgressBar;
export const calc = (row, columns) => {
    const { score, utilityPerPrice } = calculateUtility(row, columns);
    return { s: score, up: utilityPerPrice };
};
