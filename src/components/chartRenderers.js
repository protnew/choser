/**
 * EChart render functions for EBM visualizations.
 * Types: evsi, alt-dist, alt-decision, hist, ratio-dist
 */

export function normalCDF(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const t2 = t * t, t3 = t2 * t, t4 = t3 * t, t5 = t4 * t;
    const p = 0.3989422804014327 * Math.exp(-z * z / 2);
    let cdf = 1 - p * (0.319381530 * t - 0.356563782 * t2 + 1.781477937 * t3 - 1.821255978 * t4 + 1.330274429 * t5);
    return z < 0 ? 1 - cdf : cdf;
}
export function phi(z) { return 0.3989422804014327 * Math.exp(-z * z / 2); }

export function renderEVSI(ec, { data, forecast, currentN, foundOptimal, D, tS, aL, gL, sK }) {
    if (!data || data.length === 0) return;
    const evsiD = data.map(s => +parseFloat(s.evsi).toFixed(2));
    const xData = data.map(s => s.n);
    const forecastXData = [];
    const forecastEvsi = [];
    if (forecast && forecast.length > 0) {
        forecast.forEach(f => { forecastXData.push(f.n); forecastEvsi.push(+parseFloat(f.evsi).toFixed(2)); });
    }
    const allX = [...xData, ...forecastXData];
    const allEvsi = [...evsiD, ...forecastEvsi];
    const nPts = xData.length;

    const sumX = xData.reduce((a, b) => a + b, 0);
    const sumY = evsiD.reduce((a, b) => a + b, 0);
    const sumXY = xData.reduce((a, x, i) => a + x * evsiD[i], 0);
    const sumXX = xData.reduce((a, x) => a + x * x, 0);
    const linSlope = nPts > 1 ? (nPts * sumXY - sumX * sumY) / (nPts * sumXX - sumX * sumX) : 0;
    const linIntercept = (sumY - linSlope * sumX) / nPts;
    const linTrend = xData.map(x => +(linIntercept + linSlope * x).toFixed(2));
    const linForecastTrend = forecastXData.map(x => null);

    const posEvsi = evsiD.filter(y => y > 0);
    let expTrend = xData.map(() => null);
    let expForecastTrend = forecastXData.map(() => null);
    let expTrendN0 = null;
    if (posEvsi.length >= 3) {
        const logY = evsiD.map(y => y > 0 ? Math.log(y) : null);
        const validPts = xData.map((x, i) => ({ x, ly: logY[i] })).filter(p => p.ly !== null);
        if (validPts.length >= 3) {
            const vN = validPts.length;
            const vSumX = validPts.reduce((a, p) => a + p.x, 0);
            const vSumLY = validPts.reduce((a, p) => a + p.ly, 0);
            const vSumXLY = validPts.reduce((a, p) => a + p.x * p.ly, 0);
            const vSumXX = validPts.reduce((a, p) => a + p.x * p.x, 0);
            const expB = (vN * vSumXLY - vSumX * vSumLY) / (vN * vSumXX - vSumX * vSumX);
            const lnA = (vSumLY - expB * vSumX) / vN;
            const expA = Math.exp(lnA);
            expTrend = xData.map(x => Math.max(0, +(expA * Math.exp(expB * x)).toFixed(2)));
            expForecastTrend = forecastXData.map(x => Math.max(0, +(expA * Math.exp(expB * x)).toFixed(2)));
            if (expB < 0) { const threshold = parseFloat(sK) / 2 || 1; expTrendN0 = Math.round((Math.log(threshold / expA)) / expB); }
        }
    }

    let polyTrend = xData.map(() => null);
    let polyForecastTrend = forecastXData.map(() => null);
    let polyTrendN0 = null;
    if (nPts >= 4) {
        let s1=0, s2=0, s3=0, s4=0, sy=0, sxy=0, sx2y=0;
        for (let i = 0; i < nPts; i++) { const xi = xData[i], yi = evsiD[i]; s1 += 1; s2 += xi; s3 += xi*xi; s4 += xi*xi*xi; sy += yi; sxy += xi*yi; sx2y += xi*xi*yi; }
        const s5 = xData.reduce((a,x) => a + x*x*x*x, 0);
        const M = [[s5,s4,s3],[s4,s3,s2],[s3,s2,s1]];
        const V = [sx2y, sxy, sy];
        function det3(m) { return m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]); }
        const D = det3(M);
        if (Math.abs(D) > 1e-10) {
            const Ma = [[V[0],M[0][1],M[0][2]],[V[1],M[1][1],M[1][2]],[V[2],M[2][1],M[2][2]]];
            const Mb = [[M[0][0],V[0],M[0][2]],[M[1][0],V[1],M[1][2]],[M[2][0],V[2],M[2][2]]];
            const Mc = [[M[0][0],M[0][1],V[0]],[M[1][0],M[1][1],V[1]],[M[2][0],M[2][1],V[2]]];
            const pa = det3(Ma)/D, pb = det3(Mb)/D, pc = det3(Mc)/D;
            polyTrend = xData.map(x => +((pa*x*x + pb*x + pc)).toFixed(2));
            polyForecastTrend = forecastXData.map(x => +((pa*x*x + pb*x + pc)).toFixed(2));
            const disc = pb*pb - 4*pa*pc;
            if (disc >= 0 && Math.abs(pa) > 1e-10) {
                const n1 = (-pb + Math.sqrt(disc)) / (2*pa);
                const n2 = (-pb - Math.sqrt(disc)) / (2*pa);
                const candidates = [n1, n2].filter(v => v > xData[xData.length-1]);
                if (candidates.length > 0) polyTrendN0 = Math.round(Math.min(...candidates));
            }
        }
    }

    const residuals = evsiD.map((y, i) => y - (linIntercept + linSlope * xData[i]));
    const se = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, nPts - 2));
    const tCrit = 2.086;
    const ciBase = linTrend.map((y, i) => +(y - tCrit * se).toFixed(2));
    const ciWidth = linTrend.map((y, i) => +(2 * tCrit * se).toFixed(2));

    let optN = null;
    for (let i = 1; i < allEvsi.length; i++) {
        if (allEvsi[i - 1] > 0 && allEvsi[i] <= 0) {
            const frac = allEvsi[i - 1] / (allEvsi[i - 1] - allEvsi[i]);
            optN = Math.round(allX[i - 1] + frac * (allX[i] - allX[i - 1]));
            break;
        }
    }

    const series = [
        { name: 'EVSI', type: 'line', data: evsiD, smooth: false, symbol: 'circle', symbolSize: 5, lineStyle: { width: 2, color: '#8b5cf6' }, itemStyle: { color: '#8b5cf6' }, z: 3 },
        { name: 'Прогноз', type: 'line', data: [...evsiD.map(() => null), ...forecastEvsi], smooth: false, symbol: 'none', lineStyle: { width: 2, color: '#8b5cf6', type: 'dashed' }, z: 2 },
    ];
    if (linTrend.length > 2) {
        series.push({ name: 'Линейный тренд', type: 'line', data: [...linTrend, ...linForecastTrend], smooth: false, symbol: 'none', lineStyle: { width: 1.5, color: '#f59e0b', type: 'dotted' }, z: 1 });
        series.push({ name: '_ciBase', type: 'line', data: ciBase, stack: 'ci', smooth: false, symbol: 'none', lineStyle: { width: 0 }, areaStyle: { opacity: 0 }, z: 0, silent: true });
        series.push({ name: '95% ДИ тренда EVSI', type: 'line', data: ciWidth, stack: 'ci', smooth: false, symbol: 'none', lineStyle: { width: 1, color: 'rgba(245,158,11,0.4)', type: 'dotted' }, areaStyle: { color: 'rgba(245,158,11,0.08)' }, z: 0, silent: true });
    }
    if (expTrend.some(v => v !== null)) {
        series.push({ name: 'Экспон. тренд', type: 'line', data: [...expTrend, ...expForecastTrend], smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#06b6d4', type: 'dashed' }, z: 1 });
    }
    if (polyTrend.some(v => v !== null)) {
        series.push({ name: 'Квадр. тренд', type: 'line', data: [...polyTrend, ...polyForecastTrend], smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#f472b6', type: 'dashdot' }, z: 1 });
    }
    const markLines = [
        { yAxis: 0, lineStyle: { color: '#ef4444', width: 2, type: 'dashed' }, label: { formatter: 'EVSI=0', color: '#ef4444', fontSize: 12, position: 'insideEndTop' } },
    ];
    if (optN) markLines.push({ xAxis: optN, lineStyle: { color: '#10b981', width: 2.5 }, label: { formatter: '★ Лучший N=' + optN + ' (EVSI→0)', color: '#10b981', fontSize: 13, fontWeight: 'bold', position: 'insideStartTop' } });
    if (currentN) markLines.push({ xAxis: currentN, lineStyle: { color: 'inherit', width: 1.5, type: 'dashed' }, label: { formatter: 'Вы здесь N=' + currentN, color: 'inherit', fontSize: 12, position: 'insideEndTop' } });
    series[0].markLine = { silent: true, symbol: 'none', data: markLines };

    ec.setOption({
        backgroundColor: 'transparent',
        legend: { bottom: 0, itemWidth: 18, itemHeight: 4, textStyle: { color: tS, fontSize: 12 },
            data: ['EVSI', 'Прогноз', 'Линейный тренд', '95% ДИ тренда EVSI', 'Экспон. тренд', 'Квадр. тренд'].filter(n => !n.startsWith('_')) },
        grid: { left: 55, right: 20, bottom: 50, top: 20, containLabel: false },
        tooltip: { trigger: 'axis', confine: true },
        xAxis: { type: 'category', data: allX, name: 'N (шаги)', nameLocation: 'center', nameGap: 28, axisLine: { lineStyle: { color: aL } }, axisLabel: { fontSize: 12 } },
        yAxis: { type: 'value', name: 'EVSI (₽)', splitLine: { lineStyle: { color: gL, type: 'dashed' } }, axisLabel: { fontSize: 12 } },
        series
    });
}

export function renderRatioDist(ec, { utilityValues, priceValues, xMax, mean, stdDev, n, D, tS, aL, gL }) {
    const uv = utilityValues;
    const pv = priceValues;
    if (!uv || uv.length === 0) return;
    const uvArr = uv.map(Number);
    const pvArr = pv ? pv.map(Number) : [];
    let ratios;
    let isRatio = false;
    if (pvArr.length === uvArr.length && pvArr.length > 0) {
        ratios = [];
        for (let i = 0; i < uvArr.length; i++) { if (uvArr[i] > 0 && pvArr[i] > 0) ratios.push(uvArr[i] / pvArr[i]); }
        isRatio = true;
    } else {
        ratios = uvArr.filter(v => v > 0);
    }
    if (ratios.length === 0) return;
    ratios.sort((a, b) => a - b);
    const rN = ratios.length;
    const rMin = ratios[0];
    const rMax = ratios[rN - 1];
    const rMean = ratios.reduce((a, b) => a + b, 0) / rN;
    const rStd = Math.sqrt(ratios.reduce((s, v) => s + (v - rMean) ** 2, 0) / Math.max(1, rN - 1));
    const nRBins = Math.max(5, Math.min(12, Math.ceil(Math.sqrt(rN))));
    const rBinW = (rMax - rMin) / nRBins || 1;
    const rBins = new Array(nRBins).fill(0);
    ratios.forEach(v => { let b = Math.floor((v - rMin) / rBinW); if (b >= nRBins) b = nRBins - 1; rBins[b]++; });
    const rBarData = [];
    for (let i = 0; i < nRBins; i++) rBarData.push([+(rMin + i * rBinW + rBinW / 2).toFixed(isRatio ? 3 : 0), rBins[i]]);
    const rPdfScale = rN * rBinW;
    const rPad = (rMax - rMin) * 0.15;
    const rPts = [];
    for (let i = 0; i <= 60; i++) {
        const x = (rMin - rPad) + (rMax + rPad - rMin + 2 * rPad) * i / 60;
        const z = (x - rMean) / Math.max(rStd, 0.001);
        rPts.push([+x.toFixed(isRatio ? 3 : 0), +(0.3989422804014327 * Math.exp(-z * z / 2) * rPdfScale).toFixed(2)]);
    }
    const scatterData = ratios.map(v => {
        const z = (v - rMean) / Math.max(rStd, 0.001);
        return [+v.toFixed(isRatio ? 3 : 0), +(0.3989422804014327 * Math.exp(-z * z / 2) * rPdfScale).toFixed(2)];
    });
    ec.setOption({
        backgroundColor: 'transparent',
        title: { text: isRatio ? `Полезность/стоимость (N=${rN})` : `Полезность объектов (N=${rN})`, left: 'center', textStyle: { fontSize: 14, fontWeight: 700, color: tS } },
        tooltip: { trigger: 'axis', confine: true },
        legend: { bottom: 0, itemWidth: 18, itemHeight: 4, textStyle: { color: tS, fontSize: 12 }, data: ['Объекты', 'Normal N(μ,σ²)', 'Точки'] },
        grid: { left: 55, right: 20, bottom: 55, top: 45, containLabel: false },
        xAxis: { type: 'value', name: isRatio ? 'utility / price' : 'Полезность (₽)', nameLocation: 'center', nameGap: 28, nameTextStyle: { color: tS, fontSize: 12 }, axisLine: { lineStyle: { color: aL } }, axisLabel: { fontSize: 12 } },
        yAxis: { type: 'value', name: 'Кол-во', splitLine: { lineStyle: { color: gL, type: 'dashed' } }, axisLabel: { fontSize: 12 }, minInterval: 1 },
        series: [
            { name: 'Объекты', type: 'bar', data: rBarData, barWidth: rBinW * 0.8, itemStyle: { color: 'rgba(16,185,129,0.45)', borderRadius: [3, 3, 0, 0] }, z: 1,
                markLine: { silent: true, symbol: 'none', data: [
                    { xAxis: rMean, lineStyle: { color: '#3b82f6', width: 2, type: 'dashed' }, label: { formatter: 'μ=' + rMean.toFixed(isRatio ? 3 : 0), color: '#3b82f6', fontSize: 12, position: 'insideStartTop' } },
                    { xAxis: rMax, lineStyle: { color: '#10b981', width: 3 }, label: { formatter: '★ ' + rMax.toFixed(isRatio ? 3 : 0), color: '#10b981', fontSize: 12, fontWeight: 'bold', position: 'insideEndTop' } },
                ] }
            },
            { name: 'Normal N(μ,σ²)', type: 'line', data: rPts, smooth: true, symbol: 'none', z: 2, lineStyle: { width: 2, color: '#3b82f6' } },
            { name: 'Точки', type: 'scatter', data: scatterData, symbolSize: 7, itemStyle: { color: '#10b981', borderColor: '#fff', borderWidth: 1.5 }, z: 4 },
        ]
    });
}

export function renderAltDist(ec, { utilityValues, xMax, mean, stdDev, n, k, D, tS, aL, gL }) {
    const uv = utilityValues;
    if (!uv || uv.length === 0) return;
    const values = uv.map(Number).filter(v => v > 0).sort((a, b) => a - b);
    if (values.length === 0) return;
    const nVal = values.length;
    const mn = values[0];
    const mx = values[nVal - 1];
    const distMean = mean || values.reduce((a, b) => a + b, 0) / nVal;
    const distStd = stdDev || Math.sqrt(values.reduce((s, v) => s + (v - distMean) ** 2, 0) / (nVal - 1));
    const maxX = xMax || mx;
    const nBins = Math.max(5, Math.min(12, Math.ceil(Math.sqrt(nVal))));
    const binW = (mx - mn) / nBins || 1;
    const bins = new Array(nBins).fill(0);
    values.forEach(v => { let b = Math.floor((v - mn) / binW); if (b >= nBins) b = nBins - 1; bins[b]++; });
    const barData = [];
    for (let i = 0; i < nBins; i++) barData.push([(mn + i * binW + binW / 2).toFixed(0), bins[i]]);
    const pdfScale = nVal * binW;
    const pad = (mx - mn) * 0.15;
    const pdfPoints = [];
    for (let i = 0; i <= 50; i++) {
        const x = (mn - pad) + (mx + pad - mn + 2 * pad) * i / 50;
        const z = (x - distMean) / Math.max(distStd, 0.001);
        pdfPoints.push([+x.toFixed(0), +(0.3989422804014327 * Math.exp(-z * z / 2) * pdfScale).toFixed(2)]);
    }
    const scatterData = values.map(v => {
        const z = (v - distMean) / Math.max(distStd, 0.001);
        return [v, +(0.3989422804014327 * Math.exp(-z * z / 2) * pdfScale).toFixed(2)];
    });
    ec.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', confine: true },
        legend: { bottom: 0, itemWidth: 18, itemHeight: 4, textStyle: { color: tS, fontSize: 12 }, data: ['Объекты', 'Normal N(μ,σ²)', 'Точки данных', 'Неизученная область'] },
        grid: { left: 55, right: 20, bottom: 50, top: 20 },
        xAxis: { type: 'value', name: 'Полезность (₽)', nameLocation: 'center', nameGap: 28, axisLine: { lineStyle: { color: aL } }, axisLabel: { fontSize: 12 } },
        yAxis: { type: 'value', name: 'Кол-во', splitLine: { lineStyle: { color: gL, type: 'dashed' } }, axisLabel: { fontSize: 12 }, minInterval: 1 },
        series: [
            { name: 'Объекты', type: 'bar', data: barData, barWidth: binW * 0.8, itemStyle: { color: 'rgba(139,92,246,0.45)', borderRadius: [3, 3, 0, 0] }, z: 1,
                markLine: { silent: true, symbol: 'none', data: [
                    { xAxis: distMean, lineStyle: { color: '#3b82f6', width: 2, type: 'dashed' }, label: { formatter: 'μ=' + distMean.toFixed(0) + '₽', color: '#3b82f6', fontSize: 12, position: 'insideStartTop' } },
                    { xAxis: maxX, lineStyle: { color: '#10b981', width: 3 }, label: { formatter: '★ ' + maxX.toFixed(0) + '₽', color: '#10b981', fontSize: 12, fontWeight: 'bold', position: 'insideEndTop' } },
                ] }
            },
            { name: 'Normal N(μ,σ²)', type: 'line', data: pdfPoints, smooth: true, symbol: 'none', z: 2, lineStyle: { width: 2.5, color: '#3b82f6' } },
            { name: 'Точки данных', type: 'scatter', data: scatterData, symbolSize: 6, itemStyle: { color: '#8b5cf6', borderColor: '#fff', borderWidth: 1.5 }, z: 4 },
            { name: 'Неизученная область', type: 'line', data: [], markArea: { silent: true, data: [[{ xAxis: maxX, itemStyle: { color: 'rgba(245,158,11,0.1)' } }, { xAxis: mx + pad }]] } },
        ]
    });
}

export function renderAltDecision(ec, { benefit, cost, evsi, pStep, eSteps, n, D, tS, aL, gL }) {
    ec.setOption({
        backgroundColor: 'transparent',
        grid: { left: 10, right: 10, bottom: 35, top: 30, containLabel: true },
        xAxis: { type: 'category', data: ['E[выгода]', 'Стоимость K', 'EVSI'], axisLine: { lineStyle: { color: aL } }, axisLabel: { fontSize: 12 } },
        yAxis: { type: 'value', name: '₽', splitLine: { lineStyle: { color: gL, type: 'dashed' } }, axisLabel: { fontSize: 12 } },
        series: [{
            type: 'bar', barMaxWidth: 60,
            data: [
                { value: +benefit.toFixed(1), itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] }, label: { show: true, formatter: benefit.toFixed(1) + '₽', position: 'top', fontSize: 13, fontWeight: 'bold', color: '#10b981' } },
                { value: +cost.toFixed(1), itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] }, label: { show: true, formatter: cost.toFixed(1) + '₽', position: 'top', fontSize: 13, fontWeight: 'bold', color: '#ef4444' } },
                { value: +evsi.toFixed(1), itemStyle: { color: evsi > 0 ? '#8b5cf6' : '#ef4444', borderRadius: [4, 4, 0, 0] }, label: { show: true, formatter: (evsi > 0 ? '+' : '') + evsi.toFixed(1) + '₽', position: 'top', fontSize: 14, fontWeight: 'bold', color: evsi > 0 ? '#8b5cf6' : '#ef4444' } },
            ],
            markLine: { silent: true, symbol: 'none', data: [{ yAxis: 0, lineStyle: { color: '#ef4444', width: 1.5, type: 'dashed' } }] }
        }]
    });
}

export function renderHist(ec, { utilityValues, D, tS, aL, gL }) {
    if (!utilityValues || utilityValues.length === 0) return;
    const uv = utilityValues.map(Number).filter(v => v > 0).sort((a, b) => b - a);
    if (uv.length === 0) return;
    const maxVal = uv[0];
    const avgVal = uv.reduce((a, b) => a + b, 0) / uv.length;
    const colors = uv.map((v, i) => {
        if (i === 0) return '#10b981';
        if (i === uv.length - 1) return '#ef4444';
        return `rgba(139,92,246,${0.3 + (v / maxVal) * 0.5})`;
    });
    ec.setOption({
        backgroundColor: 'transparent',
        grid: { left: 55, right: 15, bottom: 35, top: 40 },
        title: { text: 'Полезность объектов (от лучшего к худшему)', left: 'center', textStyle: { fontSize: 12, color: tS } },
        tooltip: { trigger: 'axis', confine: true },
        xAxis: { type: 'category', data: uv.map((_, i) => '#' + (i + 1)), axisLine: { lineStyle: { color: aL } }, axisLabel: { fontSize: 12 } },
        yAxis: { type: 'value', name: '₽', splitLine: { lineStyle: { color: gL, type: 'dashed' } }, axisLabel: { fontSize: 12 } },
        series: [{
            type: 'bar', barMaxWidth: 40,
            data: uv.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [3, 3, 0, 0] } })),
            markLine: { silent: true, symbol: 'none', data: [
                { yAxis: avgVal, lineStyle: { color: '#f59e0b', width: 1.5, type: 'dashed' }, label: { formatter: 'μ=' + Math.round(avgVal) + '₽', color: '#f59e0b', fontSize: 12 } }
            ] }
        }]
    });
}
