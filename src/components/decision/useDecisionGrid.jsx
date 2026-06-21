/**
 * useDecisionGrid — AG-Grid column defs, row data, pinned row, row style
 * for the DecisionPage council results table.
 * Extracted from DecisionPage.jsx (~77 lines)
 */
import { useMemo, useCallback } from 'react';
import { BarCell } from '../grid/GridHelpers.jsx';

export function useDecisionGrid(comparison, onCellExpand) {
    const gridColDefs = useMemo(() => {
        if (!comparison) return [];
        const rowData = comparison.rows;
        const cols = comparison.columns;
        const maxPrice = Math.max(...rowData.map(r => parseFloat(r.price) || 0)) || 5000;
        const maxU = Math.max(...rowData.map(r => parseFloat(r._u) || 0)) || 1000;
        const maxUP = Math.max(...rowData.map(r => parseFloat(r._up) || 0)) || 15;

        // Expandable text cell renderer — truncates text + ↗ indicator + click to expand
        const expandableCell = (p) => {
            const text = p.value || '';
            if (!text) return null;
            const truncated = text.length > 60 ? text.substring(0, 60) + '...' : text;
            return (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        onCellExpand({
                            field: p.colDef.field,
                            value: text,
                            row: p.data,
                            colName: p.colDef.headerName,
                            rowName: p.data.name,
                        });
                    }}
                    style={{
                        cursor: 'pointer',
                        position: 'relative',
                        fontSize: 12,
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        paddingRight: 14,
                    }}
                >
                    {truncated}
                    <span style={{ position: 'absolute', bottom: 0, right: 0, fontSize: 12, color: '#6366f1', opacity: 0.7 }}>↗</span>
                </div>
            );
        };

        const baseCols = [
            { headerName: '#', width: 40, pinned: 'left', suppressMenu: true, floatingFilter: false, sortable: false, filter: false,
                valueGetter: (p) => p.node.rowPinned ? '' : (p.node.rowIndex + 1),
                cellStyle: { fontWeight: 'bold', color: '#888', textAlign: 'center' } },
            { field: 'name', headerName: 'Название', pinned: 'left', width: 220, editable: false,
                cellStyle: { fontWeight: 500 } },
            { field: '_up', headerName: 'Полезность/Цена', width: 130, sort: 'desc', editable: false,
                cellRenderer: p => <BarCell value={p.value} max={maxUP} colorStart='#22c55e' colorEnd='#86efac' label={(p.value || 0).toFixed(2)} />,
                comparator: (vA, vB, nA, nB) => {
                    const pA = parseFloat(nA.data.price) || 0; const pB = parseFloat(nB.data.price) || 0;
                    if (pA === 0 && pB === 0) return (nA.data._u || 0) - (nB.data._u || 0);
                    if (pA === 0) return -1; if (pB === 0) return 1;
                    return (vA || 0) - (vB || 0);
                } },
            { field: '_u', headerName: 'Полезность', width: 100, sort: 'desc', editable: false,
                cellRenderer: p => <BarCell value={p.value} max={maxU} colorStart='#3b82f6' colorEnd='#93c5fd' label={(p.value || 0).toFixed(0)} /> },
            { field: 'price', headerName: 'Стоимость', width: 90, sort: 'asc', editable: false,
                cellRenderer: p => <BarCell value={p.value} max={maxPrice} colorStart='#f59e0b' colorEnd='#fcd34d' label={p.data?._priceLabel || (p.value || 0).toLocaleString()} /> },
            { field: 'link', headerName: 'Ссылка', width: 100, editable: false,
                cellRenderer: expandableCell },
            { field: 'notes', headerName: 'Прим.', width: 80, editable: false,
                cellRenderer: expandableCell }
        ];

        const paramCols = cols.map((c) => ({
            headerName: `${c.title} (${c.weight}%)`,
            children: [
                { headerName: 'Балл', field: `${c.key}_g`, width: 70, editable: false,
                    valueGetter: p => p.data[c.key]?.grade || 0,
                    cellRenderer: p => <BarCell value={p.value} max={10} colorStart='#a5b4fc' colorEnd='#c7d2fe' label={p.value} />,
                    cellStyle: { textAlign: 'center' } },
                { headerName: 'Обоснование', field: `${c.key}_v`, width: 200, editable: false,
                    valueGetter: p => p.data[c.key]?.value || '',
                    cellRenderer: expandableCell
                }
            ]
        }));

        return [...baseCols, ...paramCols];
    }, [comparison, onCellExpand]);

    const gridRowData = useMemo(() => comparison?.rows || [], [comparison]);

    const pinnedBottomRowData = useMemo(() => {
        if (!comparison || !comparison.rows.length) return [];
        const validRows = comparison.rows.filter(r => r._u > 0);
        if (!validRows.length) return [];
        const avgU = validRows.reduce((s, r) => s + (r._u || 0), 0) / validRows.length;
        const avgUP = validRows.reduce((s, r) => s + (r._up || 0), 0) / validRows.length;
        const pricesAvg = validRows.map(r => parseFloat(r.price) || 0).filter(p => p > 0);
        const avgPrice = pricesAvg.length ? pricesAvg.reduce((a, b) => a + b, 0) / pricesAvg.length : 0;
        return [{ name: `📊 Среднее (N=${validRows.length})`, _u: avgU, _up: avgUP, price: avgPrice > 0 ? avgPrice.toFixed(0) : '', id: '__pinned_avg__' }];
    }, [comparison]);

    const getRowStyle = useCallback((params) => {
        if (params.node.rowPinned) return null;
        if (params.node.rowIndex < 3) return { background: 'rgba(16, 185, 129, 0.07)' };
        return null;
    }, []);

    return { gridColDefs, gridRowData, pinnedBottomRowData, getRowStyle };
}
