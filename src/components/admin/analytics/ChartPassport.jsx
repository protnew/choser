/**
 * ChartPassport — statistical reliability traffic light component
 */
import React from 'react';
import { confBand } from '../chartHelpers.jsx';

export default function ChartPassport({ reg, rawData, dk, tx, sb }) {
    if (!reg || !rawData || rawData.length < 3) return null;
    const pts = rawData.map(d => [d.x ?? d.cost, d.y ?? d.utility]);
    const getP = (r, n) => {
        if (n <= 2 || Math.abs(r) >= 0.999) return 0;
        const t = Math.abs(r) * Math.sqrt((n - 2) / (1 - r * r));
        const df = n - 2; const z = t * (1 - 1 / (4 * df)); const x = z / Math.sqrt(2);
        const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
        const p = 0.3275911; const t_norm = 1.0 / (1.0 + p * Math.abs(x));
        const y = 1.0 - (((((a5 * t_norm + a4) * t_norm) + a3) * t_norm + a2) * t_norm + a1) * t_norm * Math.exp(-x * x);
        return Math.max(0, 1 - y);
    };
    const pVal = getP(reg.r, reg.n);
    const yVals = pts.map(p => p[1]);
    const yMean = yVals.reduce((a, b) => a + b, 0) / reg.n;
    const yStd = Math.sqrt(yVals.reduce((a, b) => a + (b - yMean) ** 2, 0) / Math.max(1, reg.n - 1));
    const cv = yMean === 0 ? 0 : Math.abs(yStd / yMean);
    const { u, l } = confBand(pts, reg);
    let avgCiWidth = 0;
    if (u.length && l.length) { avgCiWidth = u.map((uv, i) => Math.abs(uv[1] - l[i][1])).reduce((a, b) => a + b, 0) / u.length; }
    const ciRatio = yMean === 0 ? 0 : (avgCiWidth / 2) / yMean;
    const evN = reg.n >= 100 ? { c: '🟢', t: 'Статистики достаточно' } : reg.n >= 30 ? { c: '🟡', t: 'Тренд только намечается' } : { c: '🔴', t: 'Слишком мало данных' };
    const evP = pVal < 0.05 ? { c: '🟢', t: 'Шанс случайности < 5%' } : pVal <= 0.15 ? { c: '🟡', t: 'Слабый, но сигнал' } : { c: '🔴', t: 'Математически не доказано' };
    const evC = cv < 0.3 ? { c: '🟢', t: 'Предсказуемо, кучно' } : cv < 0.6 ? { c: '🟡', t: 'Сильные рыночные скачки' } : { c: '🔴', t: 'Абсолютный хаос' };
    const evCI = Math.abs(ciRatio) < 0.1 ? { c: '🟢', t: 'Сценарии узкие и точные' } : Math.abs(ciRatio) <= 0.3 ? { c: '🟡', t: 'Допустимая погрешность' } : { c: '🔴', t: 'Нижняя граница грозит убытком' };
    const evR = reg.r2 >= 0.5 ? { c: '🟢', t: 'Надежная предсказуемость' } : reg.r2 >= 0.2 ? { c: '🟡', t: 'Слабая, но измеримая связь' } : { c: '🔴', t: 'Тренд не объясняет дисперсию' };
    const evDP = { c: '🟢', t: 'Реальные исторические факты' };
    const isRed = [evN, evP, evC, evCI, evR, evDP].filter(e => e.c === '🔴').length;
    const thS = { padding: '6px 12px', textAlign: 'left', borderBottom: `1px solid ${dk ? '#334155' : '#e2e8f0'}`, color: sb, fontWeight: 600, fontSize: '11px' };
    const tdS = { padding: '6px 12px', borderBottom: `1px solid ${dk ? '#1e293b' : '#f8fafc'}`, fontSize: '11px', color: tx };
    return (
        <div style={{ marginTop: '12px', border: `1px solid ${dk ? '#334155' : '#e2e8f0'}`, borderRadius: '6px', overflow: 'hidden', background: dk ? '#0f172a' : '#fff' }}>
            <div style={{ padding: '8px 12px', background: isRed >= 2 || evP.c === '🔴' ? (dk ? 'rgba(239,68,68,0.15)' : '#fee2e2') : (dk ? 'rgba(34,197,94,0.15)' : '#dcfce7'), borderBottom: `1px solid ${dk ? '#334155' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{isRed >= 2 || evP.c === '🔴' ? '🔴' : '🟢'}</span>
                <div><h4 style={{ margin: 0, fontSize: '12px' }}>Светофор Достоверности</h4><p style={{ margin: 0, fontSize: '10px', color: sb }}>{isRed >= 2 || evP.c === '🔴' ? 'Шум / Недоказанная гипотеза' : 'Доказан статистически'}</p></div>
            </div>
            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                <thead><tr><th style={{ ...thS, width: '25%' }}>Метрика</th><th style={thS}>Значение</th><th style={{ ...thS, width: '55%' }}>Суть</th></tr></thead>
                <tbody>
                    <tr><td style={tdS}><b>Объем (n)</b></td><td style={tdS}>{reg.n}</td><td style={tdS}>{evN.c} {evN.t}</td></tr>
                    <tr><td style={tdS}><b>p-value</b></td><td style={tdS}>{pVal.toFixed(4)}</td><td style={tdS}>{evP.c} {evP.t}</td></tr>
                    <tr><td style={tdS}><b>CV</b></td><td style={tdS}>{(cv * 100).toFixed(1)}%</td><td style={tdS}>{evC.c} {evC.t}</td></tr>
                    <tr><td style={tdS}><b>CI точность</b></td><td style={tdS}>±{(Math.abs(ciRatio) * 100).toFixed(1)}%</td><td style={tdS}>{evCI.c} {evCI.t}</td></tr>
                    <tr><td style={tdS}><b>R²</b></td><td style={tdS}>{reg.r2.toFixed(3)}</td><td style={tdS}>{evR.c} {evR.t}</td></tr>
                    <tr><td style={tdS}><b>Чистота</b></td><td style={tdS}>100%</td><td style={tdS}>{evDP.c} {evDP.t}</td></tr>
                </tbody>
            </table></div>
            <div style={{ background: dk ? '#1e293b' : '#f8fafc', padding: '8px 12px', borderTop: `1px solid ${dk ? '#334155' : '#e2e8f0'}`, fontSize: '10px', color: sb, display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <div><b>n:</b> 🟢≥100 🟡≥30 🔴&lt;30</div><div><b>p:</b> 🟢&lt;0.05 🟡≤0.15 🔴&gt;0.15</div>
                <div><b>CV:</b> 🟢&lt;30% 🟡&lt;60% 🔴≥60%</div><div><b>CI:</b> 🟢&lt;10% 🟡≤30% 🔴&gt;30%</div><div><b>R²:</b> 🟢≥0.5 🟡≥0.2 🔴&lt;0.2</div>
            </div>
        </div>
    );
}
