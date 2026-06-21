import React, { useMemo } from 'react';
import EChart from '../EChartShared';
import { calculateBayesianEVSI, calculateMCEVSI, calculateBayesianSteps, calculateMCSteps } from '../../utils/ebm-bayesian.js';

export function Box({ bg, brd, p, children }) { return <div style={{ background: bg, border: `1px solid ${brd}`, borderRadius: 10, padding: p }}>{children}</div>; }
export function Cd({ l, v, c, D, sub }) { return <div style={{ padding: 8, background: D ? '#1f2937' : '#f9fafb', borderRadius: 5, borderLeft: `3px solid ${c}` }}>
    <div style={{ fontSize: 12, color: 'inherit', textTransform: 'uppercase', fontWeight: 600 }}>{l}</div>
    <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1, color: D ? '#fff' : '#000' }}>{v}</div>
    {sub && <div style={{ fontSize: 12, color: 'inherit', marginTop: 1 }}>{sub}</div>}
</div>; }

export default function MethodView({ method, uv, pv, K, k, s, D, bg, bgI, brd, tM, tS, gL, aL, mono }) {
    const xSorted = useMemo(() => [...uv].map(Number).filter(v => v > 0).sort((a, b) => a - b), [uv]);

    const m = useMemo(() => {
        if (method === 'bayesian') {
            const bayes = calculateBayesianEVSI(xSorted, K, k, 2000);
            const steps = calculateBayesianSteps(xSorted, K, k, 500);
            const lastStep = steps[steps.length - 1];
            const forecastSteps = [];
            const targetSteps = Math.ceil(1 / Math.max(0.001, 1 - Math.pow(0.997, k)));
            const startEvsi = lastStep?.evsi || 0;
            for (let f = 1; f <= 30; f++) forecastSteps.push({ n: xSorted.length + f, evsi: startEvsi - (startEvsi / targetSteps) * f });
            return { ...bayes, steps, forecastSteps, evsiMean: bayes.evsiMean, benefitMean: bayes.benefitMean, pPositive: bayes.pPositive };
        } else {
            const mc = calculateMCEVSI(xSorted, K, k, 5000);
            const steps = calculateMCSteps(xSorted, K, k, 1000);
            const lastStep = steps[steps.length - 1];
            const forecastSteps = [];
            const startEvsi = lastStep?.evsi || 0;
            for (let f = 1; f <= 30; f++) forecastSteps.push({ n: xSorted.length + f, evsi: startEvsi * (1 - f / 30) });
            return { ...mc, steps, forecastSteps, evsiMean: mc.bootstrap.evsiMean, benefitMean: mc.bootstrap.benefitMean, pPositive: mc.bootstrap.pPositive };
        }
    }, [method, xSorted, K, k]);

    const isBayes = method === 'bayesian';
    const evsiVal = m.evsiMean;
    const benefitVal = m.benefitMean;
    const pPos = m.pPositive;

    return <>
        <Box bg={bg} brd={brd} p={18}>
            <h2 style={{ margin: 0, fontSize: 17, color: tM }}>{isBayes ? '🧪 Байесовский EVSI' : '🎲 Монте-Карло EVSI'}</h2>
            <div style={{ fontSize: 12, color: tS, marginTop: 6 }}>{m.methodDescription}</div>
        </Box>

        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>1. Результат</b>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6, marginTop: 8 }}>
                <Cd l="EVSI" v={`${evsiVal.toFixed(2)}₽`} c={evsiVal > 0 ? '#10b981' : '#ef4444'} D={D} sub={isBayes ? 'Байесовский' : 'Bootstrap'} />
                <Cd l="E[benefit]" v={`${benefitVal.toFixed(2)}₽`} c="#3b82f6" D={D} />
                <Cd l="K (шаг)" v={`${K.toFixed(0)}₽`} c="#ef4444" D={D} sub="Стоимость" />
                <Cd l="P(EVSI>0)" v={`${(pPos * 100).toFixed(1)}%`} c={pPos > 0.5 ? '#10b981' : '#ef4444'} D={D} sub="Уверенность" />
                <Cd l="Частотный" v={`${m.freqEVSI.toFixed(2)}₽`} c="#f59e0b" D={D} sub="Для сравнения" />
                <Cd l="Вердикт" v={evsiVal > 0 ? 'ИСКАТЬ' : 'СТОП'} c={evsiVal > 0 ? '#10b981' : '#ef4444'} D={D} />
            </div>
        </Box>

        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>2. EVSI по шагам поиска</b>
            <div style={{ fontSize: 12, color: tS, marginTop: 6, marginBottom: 10 }}>
                {isBayes ? 'Байесовский EVSI на каждом шаге (500 posterior сэмплов). Зелёный = оптимум.' : 'MC EVSI на каждом шаге (1000 bootstrap симуляций).'}
            </div>
            <EChart divId={`echart-${method}-evsi`} data={m.steps} forecast={m.forecastSteps} currentN={xSorted.length}
                type="evsi" D={D} tS={tS} aL={aL} gL={gL} sK={K} />
        </Box>

        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>3. Распределение полезность/стоимость</b>
            <div style={{ fontSize: 12, color: tS, marginTop: 6, marginBottom: 10 }}>Сколько полезности приходится на каждый рубль стоимости.</div>
            <EChart divId={`echart-${method}-ratio`} type="ratio-dist" D={D} tS={tS} aL={aL} gL={gL}
                xMax={parseFloat(s.xMax)} mean={parseFloat(s.mean)} stdDev={parseFloat(s.stdDev)} n={xSorted.length}
                utilityValues={uv} priceValues={pv} />
        </Box>

        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>4. Наглядный вид: распределение и решение</b>
            <div style={{ fontSize: 12, color: tS, marginTop: 6, marginBottom: 10 }}>Левый: гистограмма + Normal + хвост. Правый: стоит ли ещё шаг.</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: '2 1 400px', minWidth: 320 }}>
                    <EChart divId={`echart-${method}-dist`} type="alt-dist" D={D} tS={tS} aL={aL} gL={gL}
                        xMax={parseFloat(s.xMax)} mean={parseFloat(s.mean)} stdDev={parseFloat(s.stdDev)} n={xSorted.length} k={k}
                        utilityValues={uv} />
                </div>
                <div style={{ flex: '1 1 280px', minWidth: 260 }}>
                    <EChart divId={`echart-${method}-decision`} type="alt-decision" D={D} tS={tS} aL={aL} gL={gL}
                        benefit={benefitVal} cost={K} evsi={evsiVal} pStep={pPos * 100} eSteps={'—'} n={xSorted.length} />
                </div>
            </div>
        </Box>

        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>5. Простым языком: стоит ли продолжать поиск?</b>
            <div style={{ fontSize: 12, color: tS, marginTop: 6, marginBottom: 14 }}>Без графиков и формул — только суть.</div>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '18px 24px', borderRadius: 10,
                background: evsiVal > 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))' : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
                border: '2px solid ' + (evsiVal > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'), marginBottom: 16
            }}>
                <span style={{ fontSize: 36 }}>{evsiVal > 0 ? '🟢' : '🔴'}</span>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: evsiVal > 0 ? '#10b981' : '#ef4444', lineHeight: 1.2 }}>{evsiVal > 0 ? 'ПРОДОЛЖАЙТЕ ПОИСК' : 'ОСТАНОВИТЕСЬ'}</div>
                    <div style={{ fontSize: 13, color: tS, marginTop: 2 }}>{evsiVal > 0 ? `Каждый шаг приносит в среднем +${evsiVal.toFixed(0)}₽ чистой выгоды` : `Каждый шаг убыточен на ${Math.abs(evsiVal).toFixed(0)}₽`}</div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
                <div style={{ background: D ? '#1f2937' : '#f9fafb', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'inherit', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>P(EVSI{'>'}0)</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: pPos > 0.5 ? '#10b981' : '#ef4444' }}>{(pPos * 100).toFixed(1)}%</div>
                    <div style={{ fontSize: 12, color: 'inherit', marginTop: 4 }}>Уверенность</div>
                </div>
                <div style={{ background: D ? '#1f2937' : '#f9fafb', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'inherit', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Стоимость шага</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#ef4444' }}>{K.toFixed(0)}₽</div>
                    <div style={{ fontSize: 12, color: 'inherit', marginTop: 4 }}>K</div>
                </div>
                <div style={{ background: D ? '#1f2937' : '#f9fafb', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'inherit', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>E[benefit]</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#10b981' }}>{benefitVal.toFixed(0)}₽</div>
                    <div style={{ fontSize: 12, color: 'inherit', marginTop: 4 }}>за 1 шаг</div>
                </div>
                <div style={{ background: D ? '#1f2937' : '#f9fafb', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'inherit', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Частотный</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#f59e0b' }}>{m.freqEVSI.toFixed(1)}₽</div>
                    <div style={{ fontSize: 12, color: 'inherit', marginTop: 4 }}>для сравнения</div>
                </div>
            </div>
            <div style={{ fontSize: 12, color: tS, lineHeight: 1.7, padding: '10px 14px', background: D ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)', borderRadius: 8, borderLeft: '4px solid #8b5cf6' }}>
                {isBayes
                    ? <>Байесовский EVSI = <b>{evsiVal.toFixed(2)}₽</b> vs частотный = <b>{m.freqEVSI.toFixed(2)}₽</b>. P(EVSI{'>'}0) = <b>{(pPos * 100).toFixed(1)}%</b>. Разница: <b>{(evsiVal - m.freqEVSI).toFixed(2)}₽</b>. Байесовский учитывает неопределённость в μ и σ.</>
                    : <>MC bootstrap EVSI = <b>{evsiVal.toFixed(2)}₽</b> vs частотный = <b>{m.freqEVSI.toFixed(2)}₽</b>. Parametric MC = <b>{m.parametric.evsiMean.toFixed(2)}₽</b>. Bootstrap НЕ предполагает нормальность.</>}
            </div>
        </Box>

        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>6. Таблица расчётных значений</b>
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ borderBottom: `1px solid ${aL}` }}>
                        {['N', 'xMax', 'μ', 'σ', 'Z', 'P(шаг)', 'E[benefit]', 'EVSI'].map(h => <th key={h} style={{ padding: '4px 8px', textAlign: 'right', color: tS }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {m.steps.map(st => <tr key={st.n} style={{ borderBottom: `1px solid ${aL}33` }}>
                            <td style={{ padding: '3px 8px', textAlign: 'right' }}>{st.n}</td>
                            <td style={{ padding: '3px 8px', textAlign: 'right' }}>{st.x.toFixed(0)}</td>
                            <td style={{ padding: '3px 8px', textAlign: 'right' }}>{st.mean.toFixed(0)}</td>
                            <td style={{ padding: '3px 8px', textAlign: 'right' }}>{st.stdDev.toFixed(0)}</td>
                            <td style={{ padding: '3px 8px', textAlign: 'right' }}>{((st.x - st.mean) / Math.max(st.stdDev, 0.1)).toFixed(2)}</td>
                            <td style={{ padding: '3px 8px', textAlign: 'right' }}>—</td>
                            <td style={{ padding: '3px 8px', textAlign: 'right' }}>—</td>
                            <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700, color: st.evsi > 0 ? '#10b981' : '#ef4444' }}>{st.evsi.toFixed(1)}</td>
                        </tr>)}
                    </tbody>
                </table>
            </div>
        </Box>

        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>7. Ранжир объектов</b>
            <EChart divId={`echart-${method}-hist`} type="hist" D={D} tS={tS} aL={aL} gL={gL} utilityValues={uv} />
        </Box>

        <Box bg={bg} brd={brd} p={14}>
            <b style={{ color: tM, fontSize: 16 }}>8. Сравнение методов</b>
            <div style={{ marginTop: 8, fontSize: 12, color: tS, ...mono }}>{`
                        Частотный    ${isBayes ? 'Байесовский' : 'MC bootstrap'}  ${isBayes ? '' : 'MC parametric'}
EVSI:               ${m.freqEVSI.toFixed(2).padStart(8)}₽   ${evsiVal.toFixed(2).padStart(8)}₽   ${isBayes ? '' : m.parametric.evsiMean.toFixed(2).padStart(8)}₽
Предполагает:        Normal       ${isBayes ? 'Normal+prior' : 'Ничего'}       ${isBayes ? '' : 'Normal'}
P(EVSI>0):          —            ${(pPos * 100).toFixed(1).padStart(5)}%         ${isBayes ? '' : (m.parametric.pPositive * 100).toFixed(1).padStart(5)}%`}</div>
        </Box>
    </>;
}
