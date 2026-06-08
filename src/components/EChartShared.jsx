import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { renderEVSI, renderRatioDist, renderAltDist, renderAltDecision, renderHist } from './chartRenderers.js';

/**
 * Universal EChart component for EBM visualizations.
 * Types: evsi, alt-dist, alt-decision, hist, ratio-dist
 */
export default function EChart({ divId, data, forecast, currentN, foundOptimal, type, D, tS, aL, gL, sK,
    xMax, mean, stdDev, n, k, benefit, cost, evsi, pStep, eSteps, utilityValues, priceValues }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || el.offsetWidth < 10) return;
        if (chartRef.current) { try { chartRef.current.dispose(); } catch (e) { } }
        const ec = echarts.init(el, D ? 'dark' : null);
        chartRef.current = ec;

        try {
            if (type === 'evsi') renderEVSI(ec, { data, forecast, currentN, foundOptimal, D, tS, aL, gL, sK });
            else if (type === 'ratio-dist') renderRatioDist(ec, { utilityValues, priceValues, xMax, mean, stdDev, n, D, tS, aL, gL });
            else if (type === 'alt-dist') renderAltDist(ec, { utilityValues, xMax, mean, stdDev, n, k, D, tS, aL, gL });
            else if (type === 'alt-decision') renderAltDecision(ec, { benefit, cost, evsi, pStep, eSteps, n, D, tS, aL, gL });
            else if (type === 'hist') renderHist(ec, { utilityValues, D, tS, aL, gL });
        } catch (err) {
            console.error(`EChart render error (${type}):`, err);
        }

        ec.resize();
        return () => { if (chartRef.current) { try { chartRef.current.dispose(); } catch (e) { } chartRef.current = null; } };
    }, [data, forecast, type, D, utilityValues, priceValues]);

    const heights = {
        'evsi': 'min(420px, 65vh)',
        'alt-dist': 'min(300px, 55vh)',
        'alt-decision': 'min(280px, 50vh)',
        'ratio-dist': 'min(280px, 50vh)',
        'hist': 'min(280px, 50vh)',
    };
    return <div id={divId} ref={containerRef} style={{ width: '100%', minHeight: 200, height: heights[type] || 'min(280px, 50vh)' }} />;
}
