import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { API } from '../utils/api';
import { calc } from '../utils/calc';
import { calculateTableEBM } from '../utils/ebm';
import EbmBayesianTab from './EbmBayesianTab';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import GridEBM from './grid/GridEBM';
import CouncilPanel from './CouncilPanel';
import GridCards from './grid/GridCards';
import { BarCell, AG_GRID_LOCALE_RU, CustomLoadingOverlay, CustomNoRowsOverlay, AutocompleteCellEditor, ParamHdr, GradeHdr } from './grid/GridHelpers.jsx';
import GridToolbar from './grid/GridToolbar';
import GridHistoryModal from './grid/GridHistoryModal';
import { prepare, layout } from '@chenglou/pretext';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

const PRETEXT_FONT = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

export default function Grid({ isEmbed }) {
    const navigate = useNavigate();
    const { id: tableId } = useParams();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { displayMode, theme } = useApp();

    const [gridApi, setGridApi] = useState(null);
    const [rowData, setRowData] = useState([]);
    const [cols, setCols] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(false);
    const [autoHeight, setAutoHeight] = useState(false);
    const [textWrapped, setTextWrapped] = useState(false);
    const [isWidthOptimized, setIsWidthOptimized] = useState(false);
    const [isOptimalActive, setIsOptimalActive] = useState(false);
    const [initialColumnState, setInitialColumnState] = useState(null);
    const [showEbmTab, setShowEbmTab] = useState(false);
    const [showCouncil, setShowCouncil] = useState(false);
    const [ebmMode, setEbmMode] = useState(null);
    const [baseEbmCost, setBaseEbmCost] = useState(0.50);
    const [ebmCandidatesPerStep, setEbmCandidatesPerStep] = useState(5);
    const [ebmHourlyRate, setEbmHourlyRate] = useState(600);
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [versions, setVersions] = useState([]);
    const [loadingVersions, setLoadingVersions] = useState(false);
    const [tableSearch, setTableSearch] = useState('');
    const [exportingPNG, setExportingPNG] = useState(false);

    const isHome = !tableId;
    const filter = searchParams.get('filter');
    const searchQuery = searchParams.get('q');
    const paramCount = cols ? cols.length : 4;

    // --- EBM Data ---
    const ebmData = useMemo(() => {
        if (isHome || !rowData || rowData.length === 0) return null;
        return calculateTableEBM(rowData, paramCount, {
            cloudTokenPrice: baseEbmCost, candidatesPerStep: ebmCandidatesPerStep, hourlyRate: ebmHourlyRate,
        });
    }, [rowData, isHome, paramCount, baseEbmCost, ebmCandidatesPerStep, ebmHourlyRate]);

    // --- Row Height ---
    const getRowHeight = useCallback((params) => {
        if (isHome) return 30;
        if (!textWrapped) return 30;
        if (params.node.rowPinned) return 30;
        let maxHeight = 30;
        const columns = params.api.getColumns();
        if (!columns) return 30;
        for (const col of columns) {
            const colDef = col.getColDef();
            if (colDef.wrapText) {
                const field = colDef.field;
                let text = '';
                if (field) {
                    if (field.endsWith('_v')) {
                        const key = field.replace('_v', '');
                        text = params.data?.[key]?.value || '';
                    } else if (['name', 'description', 'notes', 'tags', 'link'].includes(field)) {
                        text = String(params.data?.[field] || '');
                    }
                }
                if (text && text.length > 15) {
                    const innerWidth = Math.max(col.getActualWidth() - 24, 20);
                    const prepared = prepare(text, PRETEXT_FONT, { whiteSpace: 'pre-wrap' });
                    const { height } = layout(prepared, innerWidth, 18);
                    if (height + 16 > maxHeight) maxHeight = height + 16;
                }
            }
        }
        return Math.min(Math.max(maxHeight, 30), 500);
    }, [textWrapped, isHome]);

    // --- Load Data ---
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                if (tableId) {
                    const data = await API.get(`/api/table/${tableId}`);
                    if (data.error) { alert(data.error); navigate('/'); return; }
                    setMeta(data.meta);
                    const sortedCols = (data.columns || []).sort((a, b) => (b.weight || 0) - (a.weight || 0));
                    setCols(sortedCols);
                    const rows = (data.data || []).map(r => { const c = calc(r, sortedCols); return { ...r, _u: c.s, _up: c.up }; });
                    setRowData(rows);
                } else {
                    let endpoint = '/api/tables';
                    if (searchQuery) endpoint += `?search=${encodeURIComponent(searchQuery)}`;
                    let data = await API.get(endpoint);
                    if (filter === 'my' && user) data = data.filter(t => t.author_id === user.id);
                    data = data.map(t => ({ ...t, utility: (t.param_count || 0) * (t.object_count || 0) * (parseInt(t.views) || 1) }));
                    setRowData(data); setMeta(null); setCols([]);
                }
            } catch (e) { console.error(e); alert('Error loading data'); }
            finally { setLoading(false); }
        };
        loadData();
    }, [tableId, filter, navigate, user, searchQuery]);

    useEffect(() => { setShowEbmTab(false); setEbmMode(null); }, [tableId]);

    useEffect(() => {
        const content = document.querySelector('.content');
        if (content) {
            content.style.overflowY = autoHeight ? 'auto' : 'hidden';
            content.style.height = autoHeight ? 'auto' : '100%';
            content.style.position = autoHeight ? 'relative' : '';
        }
    }, [autoHeight]);

    // --- Column Definitions ---
    const columnDefs = useMemo(() => {
        if (isHome) {
            const maxGlobalUtility = Math.max(...rowData.map(r => r.utility || 0)) || 5000;
            return [
                { headerName: 'Название', field: 'title', width: 350,
                    cellRenderer: p => {
                        const val = p.value || 'Без названия';
                        if (p.data.state === 'deleted') return <span style={{ opacity: 0.6 }}>{val}</span>;
                        return <Link to={`/table/${p.data.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>{val}</Link>;
                    }
                },
                { field: 'tags', headerName: 'Теги', width: 240, cellStyle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                { field: 'description', headerName: 'Описание', flex: 1, cellStyle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                { field: 'utility', headerName: 'Полезность', width: 120, sort: 'desc',
                    cellRenderer: p => <BarCell value={p.value} max={maxGlobalUtility} colorStart='#22c55e' colorEnd='#86efac' label={(p.value || 0).toLocaleString()} /> },
                { field: 'param_count', headerName: 'Парам.', width: 70 },
                { field: 'object_count', headerName: 'Объект.', width: 70 },
                { field: 'views', headerName: 'Просм.', width: 80 },
                { field: 'author', headerName: 'Автор', width: 80 },
                { field: 'created_at', headerName: 'Создано', width: 90, valueFormatter: p => new Date(p.value).toLocaleDateString() },
                { field: 'updated_at', headerName: 'Изменено', width: 90, valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '—' },
            ];
        }
        const edit = true;
        const maxPrice = Math.max(...rowData.map(r => parseFloat(r.price) || 0)) || 5000;
        const maxU = Math.max(...rowData.map(r => parseFloat(r._u) || 0)) || 1000;
        const maxUP = Math.max(...rowData.map(r => parseFloat(r._up) || 0)) || 15;
        const baseCols = [
            { headerName: 'Действия', width: 90, pinned: 'left', suppressMenu: true, floatingFilter: false, sortable: false, filter: false,
                cellRenderer: (p) => {
                    if (p.node.rowPinned) return null;
                    return <button className={`tbtn ${p.data._updating ? 'tbtn-warning' : 'btn-ai btn-ai-glow'}`} style={{ padding: '2px 6px', fontSize: '12px' }}
                        onClick={() => onAutoUpdateRow(p.node)} disabled={p.data._updating} title="AI Search">{p.data._updating ? '⏳' : '🪄 AI'}</button>;
                }
            },
            { headerName: '#', width: 40, pinned: 'left', rowDrag: edit, suppressMenu: true, floatingFilter: false, sortable: false, filter: false,
                valueGetter: (p) => p.node.rowPinned ? '' : (p.node.rowIndex + 1), cellStyle: { fontWeight: 'bold', color: '#888', textAlign: 'center' } },
            { field: 'name', headerName: 'Название', pinned: 'left', width: 220, editable: edit, checkboxSelection: edit, headerCheckboxSelection: edit,
                cellStyle: { fontWeight: 500 }, cellEditor: AutocompleteCellEditor },
            { field: '_up', headerName: 'Полезность/Цена', width: 130, sort: 'desc', editable: false,
                cellRenderer: p => <BarCell value={p.value} max={maxUP} colorStart='#22c55e' colorEnd='#86efac' label={(p.value || 0).toFixed(2)} />,
                comparator: (vA, vB, nA, nB) => {
                    const pA = parseFloat(nA.data.price) || 0; const pB = parseFloat(nB.data.price) || 0;
                    if (pA === 0 && pB === 0) return (nA.data._u || 0) - (nB.data._u || 0);
                    if (pA === 0) return -1; if (pB === 0) return 1;
                    return (vA || 0) - (vB || 0);
                }
            },
            { field: '_u', headerName: 'Полезность', width: 100, sort: 'desc', editable: false,
                cellRenderer: p => <BarCell value={p.value} max={maxU} colorStart='#3b82f6' colorEnd='#93c5fd' label={(p.value || 0).toFixed(0)} /> },
            { field: 'price', headerName: 'Стоимость', width: 90, sort: 'asc', editable: edit,
                cellRenderer: p => <BarCell value={p.value} max={maxPrice} colorStart='#f59e0b' colorEnd='#fcd34d' label={(p.value || 0).toLocaleString()} /> },
            { field: 'link', headerName: 'Ссылка', width: 100, editable: edit,
                cellRenderer: p => p.value ? <a href={p.value} target="_blank" rel="noopener noreferrer" className="table-link">🔗 Перейти</a> : '' },
            { field: 'notes', headerName: 'Прим.', width: 80, editable: edit }
        ];
        const paramCols = cols.map((c, idx) => ({
            headerName: c.title,
            children: [
                { headerName: '%', field: `${c.key}_g`, width: 60, editable: edit,
                    headerComponent: GradeHdr, headerComponentParams: { setCols, cols },
                    valueGetter: p => p.data[c.key]?.grade || 0,
                    valueSetter: p => { let val = Number(p.newValue); if (isNaN(val)) return false; val = Math.max(0, Math.min(10, val)); if (!p.data[c.key]) p.data[c.key] = { value: '', grade: 0 }; p.data[c.key].grade = val; return true; },
                    cellRenderer: p => <BarCell value={p.value} max={10} colorStart='#a5b4fc' colorEnd='#c7d2fe' label={p.value} />,
                    cellStyle: { textAlign: 'center' } },
                { headerName: `${idx + 1}.`, field: `${c.key}_v`, width: 100, editable: edit,
                    headerComponent: ParamHdr, headerComponentParams: { setCols },
                    valueGetter: p => p.data[c.key]?.value || '',
                    valueSetter: p => { if (!p.data[c.key]) p.data[c.key] = { value: '', grade: 0 }; p.data[c.key].value = p.newValue; return true; } }
            ]
        }));
        return [...baseCols, ...paramCols];
    }, [tableId, rowData, cols, navigate, isHome]);

    const pinnedBottomRowData = useMemo(() => {
        if (!rowData.length || isHome) return [];
        const validRows = rowData.filter(r => r._u > 0);
        if (!validRows.length) return [];
        const avgU = validRows.reduce((s, r) => s + (r._u || 0), 0) / validRows.length;
        const avgUP = validRows.reduce((s, r) => s + (r._up || 0), 0) / validRows.length;
        const pricesAvg = validRows.map(r => parseFloat(r.price) || 0).filter(p => p > 0);
        const avgPrice = pricesAvg.length ? pricesAvg.reduce((a, b) => a + b, 0) / pricesAvg.length : 0;
        return [{ name: `📊 Среднее (N=${validRows.length})`, _u: avgU, _up: avgUP, price: avgPrice > 0 ? avgPrice.toFixed(0) : '', id: '__pinned_avg__' }];
    }, [rowData, isHome]);

    const getRowStyle = useCallback((params) => {
        if (isHome || params.node.rowPinned) return null;
        if (params.node.rowIndex < 3) return { background: 'rgba(16, 185, 129, 0.07)' };
        return null;
    }, [isHome]);

    const onColumnStateChanged = useCallback((e) => {
        if (!gridApi || !tableId) return;
        try { localStorage.setItem(`choser_colstate_${tableId}`, JSON.stringify(gridApi.getColumnState())); } catch(e) {}
        if (textWrapped && e?.type === 'columnResized' && e.finished) gridApi.resetRowHeights();
    }, [gridApi, tableId, textWrapped]);

    // --- Actions ---
    const onCellValueChanged = useCallback((event) => {
        setIsDirty(true);
        if (event.colDef.field?.endsWith('_g') || event.colDef.field === 'price') {
            const r = calc(event.data, cols);
            event.api.applyTransaction({ update: [{ ...event.data, _u: r.s, _up: r.up }] });
        }
    }, [cols]);

    const onSave = useCallback(async () => {
        if (!tableId) return;
        setSaving(true);
        try {
            const dataToSave = { id: tableId, title: meta.title, description: meta.description, columns: cols,
                data: rowData.map(r => { const { _u, _up, ...clean } = r; return clean; }),
                state: meta.state || 'открытая', link: meta.link };
            const res = await API.post('/api/table', dataToSave);
            if (res.error) throw new Error(res.error);
            setIsDirty(false);
        } catch (e) { alert('Save failed: ' + e.message); }
        finally { setSaving(false); }
    }, [tableId, meta, cols, rowData]);

    const onDeleteSelected = useCallback(() => {
        if (!gridApi) return;
        const selected = gridApi.getSelectedRows();
        if (!selected.length) return;
        if (!confirm(`Удалить ${selected.length} строк?`)) return;
        setRowData(prev => prev.filter(r => !selected.find(s => s.id === r.id)));
        gridApi.applyTransaction({ remove: selected });
        setIsDirty(true);
    }, [gridApi]);

    const onDeleteTable = useCallback(async (tableIdToDelete) => {
        if (!confirm(`Удалить таблицу?`)) return;
        try {
            const token = localStorage.getItem('choser_token');
            await fetch(`/api/tables/${tableIdToDelete}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
            setRowData(prev => prev.filter(r => r.id !== tableIdToDelete));
        } catch (e) { alert('Ошибка: ' + e.message); }
    }, []);

    const onAutoUpdateRow = useCallback(async (node) => {
        const rd = node.data;
        if (!rd.name || rd.name === 'Новая строка') { alert('Укажите название!'); return; }
        node.setDataValue('_updating', true);
        try {
            const res = await API.post('/api/auto-update-row', { rowData: rd, columns: cols, topic: meta?.title || 'Объекты' });
            if (res.data) {
                delete res.data._updating;
                const c = calc(res.data, cols);
                gridApi?.applyTransaction({ update: [{ ...res.data, _u: c.s, _up: c.up }] });
                setIsDirty(true);
            } else { alert('Ошибка: ' + (res.error || 'Пустой ответ')); }
        } catch (e) { console.error(e); alert('Сбой обновления.'); }
        finally { node?.setDataValue('_updating', false); }
    }, [cols, meta, gridApi]);

    const onAddRow = useCallback(() => {
        const newRow = { id: 'new_' + Math.random().toString(36).substr(2, 9) };
        setRowData(prev => [newRow, ...prev]);
        setTimeout(() => gridApi?.applyTransaction({ add: [newRow], addIndex: 0 }), 0);
        setIsDirty(true);
    }, [gridApi]);

    const onAddCol = useCallback(() => {
        const name = prompt('Название новой колонки:');
        if (name) { setCols(prev => [...prev, { key: 'p_' + Math.random().toString(36).substr(2, 5), title: name, weight: 0 }]); setIsDirty(true); }
    }, []);

    const loadVersions = useCallback(async () => {
        if (!tableId) return;
        setLoadingVersions(true);
        try { const data = await API.get(`/api/table/${tableId}/versions`); setVersions(data || []); }
        catch (e) { console.error(e); }
        finally { setLoadingVersions(false); }
    }, [tableId]);

    const onLoadVersion = useCallback(async (vid) => {
        if (!tableId || !confirm('Восстановить версию?')) return;
        setSaving(true);
        try {
            const vData = await API.get(`/api/table/${tableId}/version/${vid}`);
            if (vData.error) throw new Error(vData.error);
            setMeta(prev => ({ ...prev, title: vData.title, description: vData.description }));
            const restoredCols = (vData.columns || []).sort((a, b) => (b.weight || 0) - (a.weight || 0));
            setCols(restoredCols);
            setRowData((vData.rows || []).map(r => { const c = calc(r, restoredCols); return { ...r, _u: c.s, _up: c.up }; }));
            setIsDirty(true); setShowHistory(false);
        } catch (e) { alert('Ошибка: ' + e.message); }
        finally { setSaving(false); }
    }, [tableId]);

    // --- Effects ---
    const onCellKeyDown = useCallback((e) => { if (e.event.key === 'Delete' && e.event.ctrlKey) onDeleteSelected(); }, [onDeleteSelected]);

    useEffect(() => {
        const handler = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    useEffect(() => {
        const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (tableId && isDirty) onSave(); } };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [tableId, isDirty, onSave]);

    useEffect(() => {
        if (!isDirty || !tableId || !user) return;
        const timer = setTimeout(() => { console.log('[Autosave]'); onSave(); }, 30000);
        return () => clearTimeout(timer);
    }, [isDirty, rowData, tableId, user, onSave]);

    // --- Column Sizing ---
    const autoSizeCols = useCallback((forceRestore) => {
        if (!gridApi) return;
        if (isWidthOptimized || forceRestore === true) {
            if (initialColumnState) gridApi.applyColumnState({ state: initialColumnState, applyOrder: true });
            setIsWidthOptimized(false);
        } else {
            if (!initialColumnState) setInitialColumnState(gridApi.getColumnState());
            const allCols = gridApi.getColumns();
            const colsWithData = allCols.filter(c => {
                const field = c.getColDef().field;
                if (!field || ['name', 'price', '_u', '_up', 'link'].includes(field)) return true;
                let hasData = false;
                gridApi.forEachNode(n => {
                    const val = n.data[field];
                    if (val !== undefined && val !== null && val !== '') hasData = true;
                    const key = field ? field.replace(/_[gv]$/, '') : null;
                    if (key && n.data[key]) { const p = n.data[key]; if (p.value || p.grade) hasData = true; }
                });
                return hasData;
            });
            const idsWithData = colsWithData.map(c => c.getId());
            const idsWithoutData = allCols.filter(c => !idsWithData.includes(c.getId())).map(c => c.getId());
            if (textWrapped) {
                const nameColId = allCols.find(c => c.getColDef().field === 'name')?.getId();
                const pCols = idsWithData.filter(id => id !== nameColId);
                if (nameColId) gridApi.autoSizeColumns([nameColId], false, false);
                gridApi.autoSizeColumns(pCols, false, true);
            } else {
                gridApi.autoSizeColumns(idsWithData, false, false);
            }
            gridApi.autoSizeColumns(idsWithoutData, false, true);
            setIsWidthOptimized(true);
        }
    }, [gridApi, isWidthOptimized, initialColumnState, textWrapped]);

    const toggleTextWrap = useCallback((forceValue) => {
        if (!gridApi || isHome) return;
        const newWrap = forceValue !== undefined ? forceValue : !textWrapped;
        setTextWrapped(newWrap);
        const updateCols = (arr) => arr.map(c => {
            const nc = { ...c };
            if (nc.field) { nc.wrapText = newWrap; nc.wrapHeaderText = newWrap; }
            if (nc.headerComponent || nc.children) nc.wrapHeaderText = newWrap;
            if (nc.children) nc.children = updateCols(nc.children);
            return nc;
        });
        gridApi.setGridOption('columnDefs', updateCols(gridApi.getGridOption('columnDefs')));
        setTimeout(() => gridApi.resetRowHeights(), 50);
    }, [gridApi, isHome, textWrapped]);

    const optimizeView = useCallback(() => {
        if (isOptimalActive) { toggleTextWrap(false); autoSizeCols(true); setIsOptimalActive(false); }
        else { if (!textWrapped) toggleTextWrap(true); setTimeout(() => { if (!isWidthOptimized) autoSizeCols(); }, 100); setIsOptimalActive(true); }
    }, [isOptimalActive, textWrapped, isWidthOptimized, toggleTextWrap, autoSizeCols]);

    const onExportToPNG = useCallback(async () => {
        if (exportingPNG) return;
        setExportingPNG(true);
        try {
            const gridEl = document.querySelector('.ag-theme-quartz') || document.querySelector('.ag-theme-quartz-dark');
            if (!gridEl) throw new Error("Таблица не найдена");
            const wm = document.createElement('div');
            wm.className = 'watermark-export'; wm.innerHTML = '⚡ Powered by Choser.ru';
            gridEl.appendChild(wm);
            await new Promise(r => setTimeout(r, 50));
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(gridEl, { useCORS: true, scale: 2, backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff' });
            if (gridEl.contains(wm)) gridEl.removeChild(wm);
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a'); a.href = url; a.download = `Choser_${meta?.title || 'Table'}.png`; a.click();
        } catch (e) { console.error(e); alert('Ошибка: ' + e.message);
            const gridEl = document.querySelector('.ag-theme-quartz') || document.querySelector('.ag-theme-quartz-dark');
            const wm = Array.from(gridEl?.children || []).find(c => c.innerHTML === '⚡ Powered by Choser.ru');
            if (wm && gridEl?.contains(wm)) gridEl.removeChild(wm);
        } finally { setExportingPNG(false); }
    }, [exportingPNG, theme, meta]);

    if (loading) return <div style={{ padding: '20px' }}>Загрузка...</div>;

    const toolbarProps = {
        meta, theme, ebmData, showEbmTab, ebmMode, isHome, isDirty, saving, exportingPNG,
        tableSearch, setTableSearch, textWrapped, isWidthOptimized, isOptimalActive, autoHeight,
        setEbmMode, setShowEbmTab, onAddRow, onAddCol, onSave, onDeleteSelected, onDeleteTable,
        onExportToPNG, toggleTextWrap, autoSizeCols, optimizeView, setAutoHeight,
        setShowHistory, showHistory, gridApi, tableId, setShowCouncil, isEmbed
    };

    return (
        <>
        <div className={theme === 'dark' ? "ag-theme-quartz-dark" : "ag-theme-quartz"} style={{
            height: autoHeight ? 'auto' : '100%', width: '100%', position: 'relative', flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column'
        }}>
            <GridToolbar {...toolbarProps} />

            {!isHome && showEbmTab ? (
                <GridEBM showEbmTab={showEbmTab} ebmMode={ebmMode} ebmData={ebmData} baseEbmCost={baseEbmCost} setBaseEbmCost={setBaseEbmCost} paramCount={paramCount} />
            ) : displayMode === 'card' ? (
                <GridCards data={rowData} cols={tableId ? cols : [{ key: 'title', title: 'Название' }, { key: 'description', title: 'Описание' }, { key: 'author', title: 'Автор' }, { key: 'utility', title: 'Полезность' }]} tableId={tableId} onCardClick={(id) => navigate(`/table/${id}`)} />
            ) : (
                <AgGridReact
                    key={tableId || 'home'} rowData={rowData} columnDefs={columnDefs}
                    rowSelection="multiple" autoHeaderHeight={true} singleClickEdit={true}
                    defaultColDef={{ sortable: true, filter: true, resizable: true, floatingFilter: !isHome, enableCellChangeFlash: true, tooltipValueGetter: (p) => p.value, wrapHeaderText: true, autoHeaderHeight: true, minWidth: 40 }}
                    pagination={!autoHeight} paginationPageSize={100} paginationPageSizeSelector={[25, 50, 100, 500]}
                    onGridReady={(p) => {
                        setGridApi(p.api);
                        if (tableId) { try { const saved = localStorage.getItem(`choser_colstate_${tableId}`); if (saved) p.api.applyColumnState({ state: JSON.parse(saved), applyOrder: true }); } catch(e) {} }
                    }}
                    onCellValueChanged={onCellValueChanged} onColumnResized={onColumnStateChanged} onColumnMoved={onColumnStateChanged}
                    onSortChanged={onColumnStateChanged} onCellKeyDown={onCellKeyDown}
                    onRowClicked={(e) => { if (isHome && e.data && e.data.state !== 'deleted') navigate(`/table/${e.data.id}`); }}
                    getContextMenuItems={(params) => {
                        if (isHome && params.node?.data) return [{ name: '📂 Открыть', action: () => navigate(`/table/${params.node.data.id}`) }, 'separator', { name: '🗑️ Удалить', action: () => onDeleteTable(params.node.data.id) }];
                        return ['copy', 'copyWithHeaders', 'paste', 'separator', { name: '🗑️ Удалить строку', action: () => { const row = params.node?.data; if (row && confirm('Удалить?')) { setRowData(prev => prev.filter(r => r.id !== row.id)); if (gridApi) gridApi.applyTransaction({ remove: [row] }); setIsDirty(true); } }, disabled: !params.node?.data }];
                    }}
                    getRowId={p => p.data.id || String(Math.random())} getRowStyle={getRowStyle}
                    enableUndoRedo={true} undoRedoCellEditing={true} undoRedoCellEditingLimit={20}
                    getRowHeight={getRowHeight} domLayout={autoHeight ? 'autoHeight' : 'normal'}
                    animateRows={true} enableCellTextSelection={true} ensureDomOrder={true}
                    tooltipShowDelay={300} tooltipInteraction={true}
                    rowDragManaged={!isHome} pinnedTopRowData={[]} pinnedBottomRowData={pinnedBottomRowData}
                    localeText={AG_GRID_LOCALE_RU} loadingOverlayComponent={CustomLoadingOverlay}
                    noRowsOverlayComponent={CustomNoRowsOverlay}
                    enterNavigatesVertically={true} enterNavigatesVerticallyAfterEdit={true}
                    quickFilterText={isHome ? searchQuery : tableSearch} accentedSort={true} multiSortKey={'ctrl'}
                    columnHoverHighlight={true} suppressDragLeaveHidesColumns={true} suppressRowClickSelection={!isHome}
                    rowBuffer={20} debounceVerticalScrollbar={true} suppressColumnVirtualisation={true}
                    popupParent={typeof document !== 'undefined' ? document.body : undefined}
                    defaultCsvExportParams={{
                        fileName: `Choser_${meta?.title || 'Table'}_${new Date().toLocaleDateString('ru-RU')}`, columnSeparator: ';', prependContent: '\uFEFF',
                        processCellCallback: (params) => {
                            if (params.column.getColId() === '_u' || params.column.getColId() === '_up') return parseFloat(params.value)?.toFixed(2) || '0';
                            const key = params.column.getColId()?.replace(/_[gv]$/, '');
                            if (key && params.node?.data?.[key]) { const field = params.column.getColId(); if (field.endsWith('_g')) return params.node.data[key]?.grade || 0; if (field.endsWith('_v')) return params.node.data[key]?.value || ''; }
                            return params.value;
                        }
                    }}
                    processCellForClipboard={(params) => typeof params.value === 'number' ? params.value.toFixed(2) : params.value}
                    onFirstDataRendered={(params) => { if (!tableId) params.api.autoSizeAllColumns(false); }}
                    isRowSelectable={(node) => !node.rowPinned}
                />
            )}

            {showHistory && tableId && (
                <GridHistoryModal versions={versions} loadingVersions={loadingVersions} onLoadVersion={onLoadVersion} onClose={() => setShowHistory(false)} theme={theme} />
            )}
        </div>
            {showCouncil && <CouncilPanel tableId={tableId} onClose={() => setShowCouncil(false)} />}
        </>
    );
}
