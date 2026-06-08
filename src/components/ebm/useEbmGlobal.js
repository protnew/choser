/**
 * Custom hook for EbmGlobalTab — data loading + calculations
 */
import { useEffect, useState, useMemo } from 'react';
import { API } from '../../utils/api';
import { calc } from '../../utils/calc';
import { fitDistributions, computeExpectedBenefitNormal, computeExpectedBenefitWeibull, computeExpectedBenefitEmpirical } from '../../utils/ebmGlobalCalc';

export function useEbmGlobal(ebmData) {
    const [globalScores, setGlobalScores] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const backup = await API.get('/api/admin/backup-data');
                if (!backup || backup.error) throw new Error(backup?.error || 'Не удалось загрузить backup');

                const allScores = [];
                let tablesWithPrices = 0, totalObjects = 0;

                const rowsByTable = {}, colsByTable = {};
                (backup.rows || []).forEach(r => { (rowsByTable[r.table_id] = rowsByTable[r.table_id] || []).push(r); });
                (backup.columns || []).forEach(c => { (colsByTable[c.table_id] = colsByTable[c.table_id] || []).push(c); });

                for (const table of (backup.tables || [])) {
                    const rows = rowsByTable[table.id] || [];
                    const tableCols = (colsByTable[table.id] || []).sort((a, b) => (b.weight || 0) - (a.weight || 0));
                    if (rows.length < 1) continue;
                    totalObjects += rows.length;

                    const parsedRows = rows.map(r => {
                        const d = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
                        return { ...d, id: r.id, table_id: r.table_id };
                    });
                    const hasPrice = parsedRows.some(r => parseFloat(r.price) > 0);
                    if (hasPrice) tablesWithPrices++;

                    const calculatedRows = parsedRows.map(r => ({ ...r, _u: calc(r, tableCols).s }));
                    if (hasPrice) calculatedRows.forEach(r => { if (r._u > 0) allScores.push(r._u); });
                }
                if (!cancelled) setGlobalScores({ scores: allScores, tablesWithPrices, totalObjects, tablesTotal: (backup.tables || []).length });
            } catch (e) {
                if (!cancelled) setError(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const fitResult = useMemo(() => {
        if (!globalScores || globalScores.scores.length < 3) return null;
        return fitDistributions(globalScores.scores);
    }, [globalScores]);

    const evsiComparison = useMemo(() => {
        if (!fitResult || !ebmData || !ebmData.stats) return null;
        const s = ebmData.stats;
        const k = s.candidatesPerStep || 5;
        const K = parseFloat(s.K) || 0;
        const xMax = parseFloat(s.xMax) || 0;
        const mean = parseFloat(s.mean) || 0;
        const stdDev = parseFloat(s.stdDev) || 1;
        const Z = stdDev > 0 ? (xMax - mean) / stdDev : 10;

        const benefitNormal = computeExpectedBenefitNormal(Z, k, stdDev);
        const evsiNormal = benefitNormal - K;

        const scaleRatio = stdDev / (fitResult.stdDev || 1);
        const benefitWeibull = computeExpectedBenefitWeibull(xMax, fitResult.weibullParams.shape, fitResult.weibullParams.scale * scaleRatio, k, stdDev);
        const evsiWeibull = benefitWeibull - K;

        const scaleToRub = mean / (fitResult.mean || 1);
        const sortedRub = [...globalScores.scores].sort((a, b) => a - b).map(sc => sc * scaleToRub);
        const benefitEmpirical = computeExpectedBenefitEmpirical(xMax, sortedRub, k);
        const evsiEmpirical = benefitEmpirical - K;

        return { evsiNormal, evsiWeibull, evsiEmpirical, benefitNormal, benefitWeibull, benefitEmpirical, K, k, Z, xMax, mean, stdDev };
    }, [fitResult, ebmData, globalScores]);

    const evsiSteps = useMemo(() => {
        if (!fitResult || !ebmData || !ebmData.stats || !globalScores) return [];
        const s = ebmData.stats;
        const k = s.candidatesPerStep || 5;
        const K = parseFloat(s.K) || 0;
        const mean = parseFloat(s.mean) || 0;
        const stdDev = parseFloat(s.stdDev) || 1;
        const wbShape = fitResult.weibullParams.shape;
        const wbScale = fitResult.weibullParams.scale;
        const scaleRatio = stdDev / (fitResult.stdDev || 1);
        const scaleToRub = mean / (fitResult.mean || 1);
        const sortedGlobal = [...globalScores.scores].sort((a, b) => a - b);

        return (s.steps || []).map(st => {
            const sZ = st.stdDev > 0 ? (st.x - st.mean) / st.stdDev : 10;
            const bn = computeExpectedBenefitNormal(sZ, k, st.stdDev);
            const bw = computeExpectedBenefitWeibull(st.x, wbShape, wbScale * scaleRatio, k, st.stdDev);
            const sortedRub = sortedGlobal.map(sc => sc * scaleToRub);
            const be = computeExpectedBenefitEmpirical(st.x, sortedRub, k);
            return { n: st.n, evsiNormal: bn - K, evsiWeibull: bw - K, evsiEmpirical: be - K };
        });
    }, [fitResult, ebmData, globalScores]);

    return { globalScores, loading, error, fitResult, evsiComparison, evsiSteps };
}
