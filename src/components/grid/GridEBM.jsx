import React from 'react';
import EbmMathTab from '../EbmMathTab';
import EbmGlobalTab from '../EbmGlobalTab';
import EbmBayesianTab from '../EbmBayesianTab';

export default function GridEBM({ showEbmTab, ebmMode, ebmData, baseEbmCost, setBaseEbmCost, paramCount }) {
    if (!showEbmTab) return null;

    if (ebmMode === 'global') {
        return (
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <EbmGlobalTab ebmData={ebmData} baseCost={baseEbmCost} setBaseCost={setBaseEbmCost} paramCount={paramCount} />
            </div>
        );
    }

    if (ebmMode === 'bayesian') {
        return (
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <EbmBayesianTab ebmData={ebmData} baseCost={baseEbmCost} setBaseCost={setBaseEbmCost} paramCount={paramCount} />
            </div>
        );
    }

    if (ebmMode === 'table') {
        return (
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <EbmMathTab ebmData={ebmData} baseCost={baseEbmCost} setBaseCost={setBaseEbmCost} paramCount={paramCount} />
            </div>
        );
    }

    return null;
}
