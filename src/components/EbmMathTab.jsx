import React from 'react';
import { useApp } from '../contexts/AppContext';
import EbmMathHeader from './ebm/EbmMathHeader';
import EbmMathCalc from './ebm/EbmMathCalc';

export default function EbmMathTab({ ebmData, baseCost, setBaseCost, paramCount }) {
    const { theme } = useApp();
    const D = theme === 'dark';
    const bg = D ? '#1e293b' : 'white';
    const bgI = D ? '#1f2937' : '#f9fafb';
    const brd = D ? '#374151' : '#e5e7eb';
    const tM = D ? '#ffffff' : '#000000';
    const tS = D ? '#94a3b8' : '#64748b';
    const gL = D ? '#374151' : '#e5e7eb';
    const aL = D ? '#374151' : '#e5e7eb';

    if (!ebmData || !ebmData.stats) {
        return <div style={{ padding: 40, textAlign: 'center', color: tS }}>
            <div style={{ fontSize: 40 }}>🟢</div>
            <h3>Сбор стартовой выборки</h3>
            <p>Добавьте хотя бы 3 объекта с оценками.</p>
        </div>;
    }

    const shared = { ebmData, baseCost, setBaseCost, D, bg, bgI, brd, tM, tS, gL, aL };

    return (
        <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
            <EbmMathHeader {...shared} />
            <EbmMathCalc {...shared} />
        </div>
    );
}
