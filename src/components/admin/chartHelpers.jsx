/**
 * Chart helpers — regression, confidence band, EChart wrapper
 */
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export function EChart({ option, style }) {
    const ref = useRef(null);
    const chartRef = useRef(null);
    useEffect(() => {
        if (!ref.current || !echarts) return;
        if (!chartRef.current) chartRef.current = echarts.init(ref.current);
        chartRef.current.setOption(option, true);
        const onResize = () => chartRef.current?.resize();
        window.addEventListener('resize', onResize);
        return () => { window.removeEventListener('resize', onResize); };
    }, [option]);
    useEffect(() => () => chartRef.current?.dispose(), []);
    return <div ref={ref} style={style || { width: '100%', height: '280px' }} />;
}

export function linReg(pts) {
    if (pts.length < 2) return null;
    const n = pts.length;
    let sx=0,sy=0,sxy=0,sxx=0;
    for (const [x,y] of pts) { sx+=x; sy+=y; sxy+=x*y; sxx+=x*x; }
    const den = n*sxx - sx*sx;
    if (den === 0) return null;
    const slope = (n*sxy - sx*sy)/den, intercept = (sy - slope*sx)/n;
    const yM = sy/n;
    const ssTot = pts.reduce((s,[,y])=>s+(y-yM)**2,0);
    const ssRes = pts.reduce((s,[x,y])=>s+(y-(slope*x+intercept))**2,0);
    const r2 = ssTot===0?0:1-ssRes/ssTot;
    const se = Math.sqrt(ssRes/Math.max(n-2,1));
    const r = Math.sqrt(Math.abs(r2))*(slope>=0?1:-1);
    return { slope, intercept, r2, r, se, n };
}

export function trendLine(pts, reg) {
    if (!reg) return [];
    const xs = pts.map(p=>p[0]).sort((a,b)=>a-b);
    return [[xs[0], reg.slope*xs[0]+reg.intercept], [xs[xs.length-1], reg.slope*xs[xs.length-1]+reg.intercept]];
}

export function confBand(pts, reg, mult=1.96) {
    if (!reg||pts.length<3) return {u:[],l:[]};
    const xM=pts.reduce((s,p)=>s+p[0],0)/pts.length;
    const sxx=pts.reduce((s,p)=>s+(p[0]-xM)**2,0);
    const xs=pts.map(p=>p[0]).sort((a,b)=>a-b);
    const step=Math.max(1,Math.floor(xs.length/30));
    const u=[],l=[];
    for (let i=0;i<xs.length;i+=step) {
        const x=xs[i], yH=reg.slope*x+reg.intercept;
        const m=mult*reg.se*Math.sqrt(1/reg.n+(x-xM)**2/sxx);
        u.push([x,yH+m]); l.push([x,yH-m]);
    }
    return {u,l};
}

export function trust(r2, n) {
    if (n<5) return {t:'⚪ Недостаточно данных (N<5)',c:'#94a3b8'};
    if (r2>=0.8) return {t:'🟢 Высокое доверие',c:'#22c55e'};
    if (r2>=0.5) return {t:'🟡 Среднее доверие',c:'#f59e0b'};
    if (r2>=0.2) return {t:'🟠 Низкое доверие',c:'#f97316'};
    return {t:'🔴 Слабая связь',c:'#ef4444'};
}
