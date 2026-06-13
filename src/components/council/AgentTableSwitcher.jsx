import React, { useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AG_GRID_LOCALE_RU } from '../grid/GridHelpers.jsx';
import { extractJSON } from '../../utils/councilTable.js';
import { ChoserLog } from '../../utils/log';

import { useDecisionGrid } from '../decision/useDecisionGrid.jsx';
import { t } from '../../i18n';

/**
 * B4: Individual agent tables + averaged (default)
 * Shows: Averaged table (default) → toggle to each agent's individual table
 */
export default function AgentTableSwitcher({ lastResult, comparison, isDark, brd, bg, bgI, tM, tS }) {
    const { locale } = useState({});
    const [selectedAgent, setSelectedAgent] = useState('avg'); // 'avg' = averaged
    const gridApiRef = { current: null };

    // Build individual agent comparisons
    const agentComparisons = useMemo(() => {
        if (!lastResult?.votes || !comparison) return {};
        const result = {};
        for (const vote of lastResult.votes) {
            const j = extractJSON(vote.response);
            const scores = vote.scores || j?.scores;
            if (!scores || typeof scores !== 'object') continue;

            // Build comparison structure from agent scores
            const columns = [];
            const rows = [];
            const objects = Object.keys(scores);

            // Collect all parameter names
            const paramSet = new Set();
            for (const obj of objects) {
                if (typeof scores[obj] === 'object') {
                    for (const p of Object.keys(scores[obj])) paramSet.add(p);
                }
            }
            const params = [...paramSet];

            for (const obj of objects) {
                const row = { id: obj, name: obj };
                for (const param of params) {
                    const val = typeof scores[obj] === 'object' ? scores[obj][param] : undefined;
                    const grade = typeof val === 'object' ? val.grade : (typeof val === 'number' ? val : null);
                    const value = typeof val === 'object' ? val.value : (typeof val === 'string' ? val : '');
                    row[param] = { grade, value };
                    row[param + '_v'] = value;
                }
                // Calculate average score across all params
                let totalGrade = 0, paramCount = 0;
                for (const param of params) {
                    if (row[param]?.grade != null) { totalGrade += row[param].grade; paramCount++; }
                }
                row._u = paramCount > 0 ? (totalGrade / paramCount) * 100 : 0;
                rows.push(row);
            }

            for (const param of params) {
                columns.push({ key: param, title: param });
            }

            result[vote.persona_id || vote.name] = {
                vote,
                comparison: { columns, rows, weights: comparison.weights || {} },
            };
        }
        return result;
    }, [lastResult, comparison]);

    // Current display comparison
    const currentComparison = selectedAgent === 'avg'
        ? comparison
        : agentComparisons[selectedAgent]?.comparison;

    const currentVote = selectedAgent !== 'avg' ? agentComparisons[selectedAgent]?.vote : null;

    const { gridColDefs, gridRowData, pinnedBottomRowData, getRowStyle } = useDecisionGrid(currentComparison, () => {});

    const btnStyle = (active) => ({
        padding: '4px 10px', border: active ? '2px solid #3b82f6' : `1px solid ${brd}`,
        borderRadius: 6, background: active ? '#3b82f622' : bg,
        color: active ? '#3b82f6' : tS, cursor: 'pointer', fontSize: 12,
        fontWeight: active ? 700 : 400, whiteSpace: 'nowrap', transition: 'all 0.15s',
    });

    if (!comparison) return null;

    return (
        <div>
            {/* Switcher bar */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                <button onClick={() => setSelectedAgent('avg')} style={btnStyle(selectedAgent === 'avg')}>
                    📊 {t('table.averaged') || 'Усреднённая'}
                </button>
                {lastResult.votes && lastResult.votes.map((v, i) => {
                    const aid = v.persona_id || v.name;
                    if (!agentComparisons[aid]) return null;
                    return (
                        <button key={i} onClick={() => setSelectedAgent(aid)} style={btnStyle(selectedAgent === aid)}>
                            {v.emoji} {v.name}
                        </button>
                    );
                })}
            </div>

            {/* Agent recommendation badge */}
            {currentVote && (
                <div style={{
                    padding: '6px 12px', marginBottom: 8, borderRadius: 6,
                    background: isDark ? '#052e16' : '#f0fdf4',
                    border: `1px solid ${isDark ? '#166534' : '#86efac'}`,
                    fontSize: 13, color: tM,
                }}>
                    {currentVote.emoji} <strong>{currentVote.name}</strong>
                    {currentVote.recommendation && currentVote.recommendation !== 'insufficient_data'
                        ? ` → ${currentVote.recommendation}` : ''}
                    {currentVote.confidence ? ` (conf: ${currentVote.confidence}/10)` : ''}
                </div>
            )}

            {/* Grid */}
            {currentComparison && currentComparison.rows && currentComparison.rows.length > 0 ? (
                <div className={isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'} style={{ height: 400, borderRadius: 8, overflow: 'hidden' }}>
                    <AgGridReact
                        rowData={gridRowData}
                        columnDefs={gridColDefs}
                        onGridReady={p => { gridApiRef.current = p.api; }}
                        localeText={AG_GRID_LOCALE_RU}
                        defaultColDef={{
                            sortable: true, filter: true, resizable: true,
                            wrapHeaderText: true, autoHeaderHeight: true, minWidth: 40,
                        }}
                        rowHeight={30}
                        headerHeight={40}
                        animateRows={true}
                        suppressCellFocus={true}
                        enableCellTextSelection={true}
                        pinnedBottomRowData={pinnedBottomRowData}
                        getRowStyle={getRowStyle}
                        getRowId={p => p.data.id || `row_${p.node.rowIndex}`}
                    />
                </div>
            ) : (
                <div style={{ textAlign: 'center', color: tS, padding: 30, fontSize: 13 }}>
                    🤷 {t('table.noNumericData')}
                </div>
            )}
        </div>
    );
}
