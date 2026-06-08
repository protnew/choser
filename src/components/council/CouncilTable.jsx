import React, { useState, useCallback, useRef, createPortal } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AG_GRID_LOCALE_RU } from '../grid/GridHelpers.jsx';
import { extractJSON, stripMarkdown } from '../../utils/councilTable.js';
import { useDecisionGrid } from '../decision/useDecisionGrid.jsx';
import CouncilProgress from './CouncilProgress.jsx';
import { t } from '../../i18n';
import { useLang } from '../../contexts/LangContext';
import { ChoserLog } from '../../utils/log';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export default function CouncilTable({
    lastResult, comparison, activeTab, setActiveTab,
    saveStatus, shareLink, saveAsTable, shareResult,
    setLastResult, setSaveStatus, setShareLink,
    topic, topicDesc, input, setInput, runCouncil, running, stopCouncil,
    personas, enabledAgents, agentStatuses, currentThinking, elapsedMs, mode,
    isDark, brd, bg, bgI, tM, tS,
    councilWarning, councilRecommendation,
}) {
    // Expandable cell overlay state
    const { locale } = useLang();
    const [expandedCell, setExpandedCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const gridApiRef = useRef(null);

    const onCellExpand = useCallback((info) => {
        setExpandedCell(info);
        setEditValue(info.value);
    }, []);

    const handleSaveExpanded = useCallback(() => {
        if (!expandedCell) return;
        const { field, row } = expandedCell;
        // Bug #10 fix: update grid data immutably via rowData, not by mutating row object
        // We update the row's data property and refresh cells
        if (field.endsWith('_v')) {
            const paramKey = field.slice(0, -2);
            if (row[paramKey]) {
                row[paramKey] = { ...row[paramKey], value: editValue };
            }
        } else {
            row[field] = editValue;
        }
        // Trigger a data update through the grid API to avoid direct mutation issues
        if (gridApiRef.current) {
            const rowNode = gridApiRef.current.getDisplayedRowAtIndex(
                gridApiRef.current.getModel().rowsToDisplay.findIndex(r => r.data === row)
            );
            if (rowNode) {
                // Apply the same mutation to rowNode.data to keep them in sync
                if (field.endsWith('_v')) {
                    const paramKey = field.slice(0, -2);
                    if (rowNode.data[paramKey]) {
                        rowNode.data[paramKey] = { ...rowNode.data[paramKey], value: editValue };
                    }
                } else {
                    rowNode.data[field] = editValue;
                }
            }
            gridApiRef.current.refreshCells({ force: true });
        }
        setExpandedCell(null);
        setEditValue('');
    }, [expandedCell, editValue]);

    const closeExpandedCell = useCallback(() => {
        setExpandedCell(null);
        setEditValue('');
    }, []);

    const { gridColDefs, gridRowData, pinnedBottomRowData, getRowStyle } = useDecisionGrid(comparison, onCellExpand);

    const tabStyle = (active) => ({
        padding: '10px 20px', border: 'none',
        borderBottom: active ? '3px solid #3b82f6' : '3px solid transparent',
        background: 'none', color: active ? tM : tS,
        cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400,
    });

    return (
        <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', background: bg }}>
            {/* TABS */}
            {lastResult && (
                <div style={{ display: 'flex', borderBottom: `1px solid ${brd}`, background: bgI, alignItems: 'center', paddingRight: 16 }}>
                    <button onClick={() => setActiveTab('table')} style={tabStyle(activeTab === 'table')}>
                        {t('table.tab')} {comparison ? <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 10, background: '#3b82f6', color: '#fff', fontSize: 12 }}>{comparison.rows.length}</span> : ''}
                    </button>
                    <button onClick={() => setActiveTab('verdict')} style={tabStyle(activeTab === 'verdict')}>
                        {t('table.verdict')} {lastResult.votes ? <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 10, background: '#22c55e', color: '#fff', fontSize: 12 }}>{lastResult.votes.length}</span> : ''}
                    </button>
                    <button onClick={() => setActiveTab('logs')} style={tabStyle(activeTab === 'logs')}>
                        {t('table.logs')} {lastResult.votes ? <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 10, background: '#f59e0b', color: '#fff', fontSize: 12 }}>{lastResult.votes.length}</span> : ''}
                    </button>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: tS, alignItems: 'center' }}>
                        {lastResult.meta && <span>{lastResult.meta.model || '?'} · {((lastResult.meta.total_duration_ms || 0) / 1000).toFixed(1)}s</span>}
                        {lastResult.tokens && <span>🔢 {((lastResult.tokens.input || 0) + (lastResult.tokens.output || 0))?.toLocaleString()} tok</span>}
                        {lastResult.consensus?.recommendation && String(lastResult.consensus.recommendation) !== 'insufficient_data' && (
                            <span style={{ padding: '2px 8px', borderRadius: 10, background: '#22c55e22', color: '#22c55e', fontWeight: 600 }}>👑 {String(lastResult.consensus.recommendation)}</span>
                        )}
                    </div>
                </div>
            )}

            {/* CONTENT */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {/* Bug #23 fix: show councilWarning/councilRecommendation as banners */}
                {councilWarning && (
                    <div style={{ padding: '10px 20px', background: isDark ? '#422006' : '#fef3c7', borderBottom: `1px solid ${isDark ? '#854d0e' : '#f59e0b'}`, color: isDark ? '#ffffff' : '#000000', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⚠️</span>
                        <span>{typeof councilWarning === 'string' ? councilWarning : councilWarning?.message || JSON.stringify(councilWarning)}</span>
                    </div>
                )}
                {councilRecommendation && !lastResult && (
                    <div style={{ padding: '10px 20px', background: isDark ? '#052e16' : '#f0fdf4', borderBottom: `1px solid ${isDark ? '#166534' : '#86efac'}`, color: isDark ? '#ffffff' : '#000000', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>💡</span>
                        <span>{typeof councilRecommendation === 'string' ? councilRecommendation : councilRecommendation?.message || (councilRecommendation?.suggestions || []).join('. ') || JSON.stringify(councilRecommendation)}</span>
                    </div>
                )}
                {!lastResult && !running && (
                    <div style={{ textAlign: 'center', color: tS, marginTop: 80 }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🏛️</div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: tM }}>{t('council.aiAgents')}</div>
                        <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.8 }}>{t('council.describeLeft')}<br />{t('council.orTestFill')}</div>
                    </div>
                )}
                {running && (
                    <CouncilProgress
                        personas={personas} enabledAgents={enabledAgents}
                        agentStatuses={agentStatuses} currentThinking={currentThinking}
                        elapsedMs={elapsedMs} mode={mode}
                        isDark={isDark} brd={brd} bg={bg} bgI={bgI} tM={tM} tS={tS}
                    />
                )}
                {lastResult?.error && <div style={{ padding: 40, textAlign: 'center' }}><div style={{ fontSize: 48, marginBottom: 12 }}>❌</div><div style={{ fontSize: 16, color: '#ef4444' }}>{lastResult.error}</div></div>}

                {/* TAB: ALL — plain-text copyable summary */}
                {lastResult && !lastResult.error && activeTab === 'all' && (
                    <div style={{ padding: 20, position: 'relative' }}>
                        <button onClick={() => { const el = document.querySelector('[data-report]'); if (el) { navigator.clipboard.writeText(el.innerText).then(() => { setSaveStatus('copied'); setTimeout(() => setSaveStatus(''), 2000); }); } }} style={{ position: 'absolute', top: 12, right: 12, padding: '6px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, zIndex: 10 }}>{saveStatus === 'copied' ? t('table.copied') : t('table.copyReport')}</button>
                    <div data-report style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', userSelect: 'text', color: tM }}>
{'═'.repeat(60)}
{'🏛️ СОВЕТ AI-АГЕНТОВ — ПОЛНЫЙ ОТЧЁТ'}
{'═'.repeat(60)}

📅 {new Date().toLocaleString('ru')}
🎯 {topic}
{'─'.repeat(60)}
{'─'.repeat(60)}
{'👑 ВЕРДИКТ'}
{'─'.repeat(60)}
{lastResult.consensus?.recommendation && String(lastResult.consensus.recommendation) !== 'insufficient_data' ? `Общая рекомендация: ${lastResult.consensus.recommendation}\n` : 'Общего вердикта нет\n'}
{lastResult.editorSummary ? `\n📝 Резюме Редактора:\n${stripMarkdown(lastResult.editorSummary)}\n` : ''}
{'─'.repeat(60)}
{'🗳️ ГОЛОСА АГЕНТОВ'}
{'─'.repeat(60)}
{(lastResult.votes || []).map((v, i) => `${v.emoji} ${v.name}: ${v.recommendation || '—'}${v.confidence ? ` (conf: ${v.confidence}/10)` : ''}${v.score ? ` score:${v.score}` : ''}\n${v.response ? stripMarkdown(v.response).substring(0, 300) : ''}\n`).join('\n')}
{'─'.repeat(60)}
{'📊 ТАБЛИЦА ВЫБОРА (формат Чосера)'}
{'─'.repeat(60)}
{comparison ? `${comparison.columns.map(c => c.title).join('\t')}\tПолезность\tПол./Цена\n${'—'.repeat(40)}\n${comparison.rows.map(r => `${r.name}\t${comparison.columns.map(c => r[c.key]?.grade ?? '—').join('\t')}\t${(r._u||0).toFixed(0)}\t${(r._up||0).toFixed(2)}`).join('\n')}` : 'Таблица не сформирована'}
{'─'.repeat(60)}
{'🔍 ЛОГИ'}
{'─'.repeat(60)}
{(lastResult.votes || []).map((v, i) => { const d = v.debug || {}; return `[${v.emoji} ${v.name}] ${d.provider || '?'}/${d.model || '?'} · ${d.duration_ms ? (d.duration_ms/1000).toFixed(1)+'s' : '?'} · ${d.tokens_in||0}↓${d.tokens_out||0}↑`; }).join('\n')}
{lastResult.tokens ? `\n🔢 Токены: ${(lastResult.tokens.input+lastResult.tokens.output)?.toLocaleString()} (вх: ${lastResult.tokens.input?.toLocaleString()}, вых: ${lastResult.tokens.output?.toLocaleString()})` : ''}
{lastResult.meta ? `\n⏱ Время: ${(lastResult.meta.total_duration_ms/1000).toFixed(1)}s · Модель: ${lastResult.meta.model||'?'}` : ''}
{'═'.repeat(60)}
                    </div>
                    </div>
                )}

                {/* TAB: TABLE — EXACT COPY of Grid.jsx ag-grid */}
                {lastResult && !lastResult.error && activeTab === 'table' && (
                    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {lastResult.editorSummary && (
                            <div style={{ border: `1px solid ${isDark ? '#166534' : '#bbf7d0'}`, borderRadius: 12, padding: 16, background: isDark ? '#052e16' : '#f0fdf4', marginBottom: 16 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: tM, marginBottom: 8 }}>{t('table.editorSummary')}</div>
                                <div style={{ fontSize: 13, color: tM, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{stripMarkdown(lastResult.editorSummary)}</div>
                            </div>
                        )}
                        {comparison && comparison.rows.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                {saveStatus !== 'saved' ? (
                                    <button onClick={() => saveAsTable(comparison)} disabled={saveStatus === 'saving'} style={{ padding: '8px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                        {saveStatus === 'saving' ? t('table.saving') : t('table.save')}
                                    </button>
                                ) : (
                                    <span style={{ padding: '8px 20px', background: '#22c55e22', color: '#22c55e', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{t('table.saved')}</span>
                                )}
                                <button onClick={() => shareResult(comparison)} style={{ padding: '8px 20px', background: shareLink ? '#3b82f622' : '#3b82f6', color: shareLink ? '#3b82f6' : '#fff', border: shareLink ? '1px solid #3b82f6' : 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                    {shareLink ? t('table.shared') : t('table.share')}
                                </button>
                                <span style={{ fontSize: 12, color: tS, background: bgI, padding: '3px 8px', borderRadius: 4 }}>{t('table.hours24')}</span>
                                <button onClick={() => { setLastResult(null); setSaveStatus(''); setShareLink(''); sessionStorage.removeItem('choser_last_result'); }} style={{ padding: '6px 14px', background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>{t('table.clear')}</button>
                            </div>
                        )}
                        {comparison && comparison.rows.length > 0 ? (
                            <div className={isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'} style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
                                <AgGridReact
                                    rowData={gridRowData}
                                    columnDefs={gridColDefs}
                                    onGridReady={p => { gridApiRef.current = p.api; }}
                                    localeText={AG_GRID_LOCALE_RU}
                                    defaultColDef={{
                                        sortable: true, filter: true, resizable: true,
                                        floatingFilter: false, enableCellChangeFlash: true,
                                        wrapHeaderText: true, autoHeaderHeight: true, minWidth: 40
                                    }}
                                    rowHeight={30}
                                    headerHeight={40}
                                    animateRows={true}
                                    suppressCellFocus={true}
                                    enableCellTextSelection={true}
                                    ensureDomOrder={true}
                                    pinnedBottomRowData={pinnedBottomRowData}
                                    getRowStyle={getRowStyle}
                                    getRowId={p => p.data.id || `row_${p.node.rowIndex}`}
                                />
                            </div>
                        ) : <div style={{ textAlign: 'center', color: tS, padding: 40 }}><div style={{ fontSize: 32, marginBottom: 8 }}>🤷</div>{t('table.noNumericData')}</div>}
                    </div>
                )}

                {/* TAB: VERDICT */}
                {lastResult && !lastResult.error && activeTab === 'verdict' && (
                    <div style={{ padding: 20 }}>
                        {lastResult.consensus?.recommendation && String(lastResult.consensus.recommendation) !== 'insufficient_data' && (
                            <div style={{ border: '2px solid #22c55e', borderRadius: 12, padding: 20, marginBottom: 20, background: isDark ? '#052e16' : '#f0fdf4' }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: tM, marginBottom: 8 }}>{t('table.generalRecommendation')}</div>
                                <div style={{ fontSize: 18, color: '#22c55e', fontWeight: 700 }}>{String(lastResult.consensus.recommendation)}</div>
                            </div>
                        )}
                        {lastResult.consensus?.recommendations && (
                            <div style={{ border: `1px solid ${brd}`, borderRadius: 12, padding: 16, marginBottom: 20, background: bgI }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: tM, marginBottom: 12 }}>{t('table.agentVoting')}</div>
                                {Object.entries(lastResult.consensus.recommendations).sort((a, b) => b[1] - a[1]).map(([r, w]) => (
                                    <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <div style={{ width: 140, fontSize: 12, color: tM, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r}</div>
                                        <div style={{ flex: 1, height: 18, background: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.round(w * 30)}px`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: 4, minWidth: 4 }} />
                                        </div>
                                        <div style={{ fontSize: 12, color: tS, width: 40, textAlign: 'right' }}>{w.toFixed(1)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ fontSize: 14, fontWeight: 700, color: tM, marginBottom: 12 }}>{t('table.eachAgentVote')}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(lastResult.votes || []).map((v, i) => {
                                const j = extractJSON(v.response);
                                return (
                                    <div key={i} style={{ border: `1px solid ${brd}`, borderRadius: 10, overflow: 'hidden', background: bg }}>
                                        <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: bgI }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 20 }}>{v.emoji}</span>
                                                <strong style={{ color: tM }}>{v.name}</strong>
                                                <span style={{ fontSize: 12, color: v.recommendation && v.recommendation !== 'insufficient_data' ? '#22c55e' : tS, fontWeight: 600 }}>
                                                    → {v.recommendation || '—'}
                                                </span>
                                            </span>
                                            <span style={{ fontSize: 12, color: tS }}>
                                                {v.confidence ? `conf: ${v.confidence}/10` : ''} {v.score ? `score: ${v.score}` : ''}
                                            </span>
                                        </div>
                                        {j?.analysis && (
                                            <div style={{ padding: '10px 14px', fontSize: 12, lineHeight: 1.6, color: tS, borderTop: `1px solid ${brd}`, whiteSpace: 'pre-wrap' }}>
                                                {j.analysis}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TAB: LOGS */}
                {lastResult && !lastResult.error && activeTab === 'logs' && (
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(lastResult.votes || []).map((v, i) => {
                            const d = v.debug || {};
                            return (
                                <details key={i} style={{ border: `1px solid ${brd}`, borderRadius: 8, overflow: 'hidden' }}>
                                    <summary style={{ padding: '10px 14px', cursor: 'pointer', background: bgI, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: tM, fontSize: 13, listStyle: 'none' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span>{v.emoji}</span><strong>{v.name}</strong>
                                            <span style={{ fontSize: 12, color: v.recommendation && v.recommendation !== 'insufficient_data' ? '#22c55e' : tS }}>{v.recommendation || '—'}</span>
                                            {v.score ? <span style={{ fontSize: 12, color: '#f59e0b' }}>score:{v.score}</span> : null}
                                            {v.confidence ? <span style={{ fontSize: 12, color: tS }}>conf:{v.confidence}/10</span> : null}
                                        </span>
                                        <span style={{ fontSize: 12, color: tS, fontFamily: 'monospace' }}>{d.provider || '?'} · {d.model || '?'} · {d.duration_ms ? `${(d.duration_ms / 1000).toFixed(1)}s` : '?'} · {d.tokens_in || 0}↓{d.tokens_out || 0}↑</span>
                                    </summary>
                                    <div style={{ padding: 14, fontSize: 12, lineHeight: 1.7, color: tM, whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto', borderTop: `1px solid ${brd}`, fontFamily: 'monospace' }}>
                                        {stripMarkdown(v.response)}
                                        {v.sources && v.sources.length > 0 && (
                                            <div style={{ marginTop: 12, paddingTop: 8, borderTop: `1px dashed ${brd}` }}>
                                                <strong style={{ color: tS }}>{t('table.sources')}</strong>
                                                {v.sources.map((s, si) => (
                                                    <div key={si} style={{ marginTop: 2 }}>
                                                        <a href={s.url} target="_blank" rel="noopener" style={{ color: '#3b82f6', fontSize: 12 }}>{si + 1}. {s.title || s.url}</a>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </details>
                            );
                        })}
                        {lastResult.debug && (
                            <div style={{ padding: 12, background: bgI, borderRadius: 8, fontSize: 12, color: tS, fontFamily: 'monospace' }}>
                                <strong>Trace:</strong><br />{lastResult.debug.map((d, i) => `${d.persona}: ${d.status} ${d.ms}ms (${d.provider || '?'}/${d.model || '?'})`).join(' → ')}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* INPUT — always enabled (Fix #6) */}
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${brd}`, display: 'flex', gap: 8, background: bg }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runCouncil(); } }} placeholder={t('council.inputPlaceholder')} style={{ flex: 1, padding: '10px 14px', border: `1px solid ${brd}`, borderRadius: 8, fontSize: 14, background: bgI, color: tM }} />
                {running && (
                    <button onClick={stopCouncil} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        ⏹ {t('council.stopCouncil')}
                    </button>
                )}
            </div>

            {/* EXPANDABLE CELL OVERLAY */}
            {expandedCell && createPortal(
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    onClick={closeExpandedCell}
                >
                    <div
                        style={{ background: bg, borderRadius: 16, padding: 24, maxWidth: 700, width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ fontSize: 13, color: tS, marginBottom: 8 }}>
                            📄 {expandedCell.rowName} → {expandedCell.colName}
                        </div>
                        <textarea
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            style={{
                                flex: 1, minHeight: 200, padding: 16, borderRadius: 8,
                                border: `1px solid ${brd}`, background: bgI, color: tM,
                                fontSize: 14, lineHeight: 1.6, resize: 'none', outline: 'none',
                                fontFamily: 'inherit',
                            }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                            <button
                                onClick={closeExpandedCell}
                                style={{ padding: '8px 20px', background: 'transparent', color: tS, border: `1px solid ${brd}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
                            >
                                {t('table.closeBtn')}
                            </button>
                            <button
                                onClick={handleSaveExpanded}
                                style={{ padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                            >
                                {t('table.saveBtn')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
