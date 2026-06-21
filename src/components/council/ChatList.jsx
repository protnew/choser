import React, { useState } from 'react';
import { t } from '../../i18n';
import { useLang } from '../../contexts/LangContext';
import { ChoserLog } from '../../utils/log';

/* ── Relative time ── */
function timeAgo(iso) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    const ago = t('council.ago');
    if (diff < 60) return `30s ${ago}`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${ago}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ${ago}`;
    return `${Math.floor(diff / 86400)}d ${ago}`;
}

/* ── Group history by time (ChatGPT-style) ── */
const GROUP_KEYS = ['today', 'yesterday', 'week', 'older'];
function groupByTime(items) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const week = new Date(today.getTime() - 7 * 86400000);
    const groups = [
        { key: 'today', label: t('council.today') || 'Today', items: [] },
        { key: 'yesterday', label: t('council.yesterday') || 'Yesterday', items: [] },
        { key: 'week', label: t('council.previous7') || 'Previous 7 days', items: [] },
        { key: 'older', label: t('council.older') || 'Older', items: [] },
    ];
    for (const item of items) {
        const d = new Date(item.timestamp);
        if (d >= today) groups[0].items.push(item);
        else if (d >= yesterday) groups[1].items.push(item);
        else if (d >= week) groups[2].items.push(item);
        else groups[3].items.push(item);
    }
    return groups.filter(g => g.items.length > 0);
}

/* ═══════════════ CHATLIST — LEFT PANEL ═══════════════ */
export default function ChatList({
    councilHistory, onSelectHistory, clearHistory,
    activeHistoryId, navigate, onNewChat,
    deletedHistory, onDeleteHistory, onRenameHistory,
    onRestoreHistory, onPermanentDeleteHistory, onEmptyTrash,
    onMoveHistory,
    isDark, brd, bg, bgI, tM, tS,
}) {
    const { locale } = useLang();
    const [hoveredId, setHoveredId] = useState(null);
    const [menuId, setMenuId] = useState(null);       // which chat's context menu is open
    const [renameId, setRenameId] = useState(null);   // which chat is being renamed
    const [renameVal, setRenameVal] = useState('');
    const [showDeleted, setShowDeleted] = useState(false);
    const [dragId, setDragId] = useState(null);       // id of item being dragged
    const [dropTarget, setDropTarget] = useState(null); // group key being hovered

    ChoserLog.debug('CHATLIST', 'render', { count: councilHistory?.length });

    const groups = councilHistory?.length ? groupByTime(councilHistory) : [];

    // Close context menu on outside click
    const handleBgClick = () => { setMenuId(null); };

    // Context menu actions
    const handleRename = (item) => {
        setRenameId(item.id);
        setRenameVal(item.topic);
        setMenuId(null);
    };
    const confirmRename = () => {
        if (renameVal.trim() && renameId) onRenameHistory(renameId, renameVal.trim());
        setRenameId(null);
    };
    const handleDelete = (id) => { onDeleteHistory(id); setMenuId(null); };
    const handleMoveTo = (id, groupKey) => { onMoveHistory(id, groupKey); setMenuId(null); };

    // Drag-and-drop handlers (Fix #9)
    const onDragStart = (e, id) => {
        setDragId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(id));
    };
    const onDragOver = (e, groupKey) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget(groupKey);
    };
    const onDragLeave = () => { setDropTarget(null); };
    const onDrop = (e, groupKey) => {
        e.preventDefault();
        if (dragId) onMoveHistory(dragId, groupKey);
        setDragId(null);
        setDropTarget(null);
    };
    const onDragEnd = () => { setDragId(null); setDropTarget(null); };

    return (
        <div style={{
            width: 260, minWidth: 260, maxWidth: 260,
            display: 'flex', flexDirection: 'column',
            background: isDark ? '#0f172a' : '#f8fafc',
            borderRight: `1px solid ${brd}`,
            flexShrink: 0, overflow: 'hidden',
        }} onClick={handleBgClick}>
            {/* ── HEADER ── */}
            <div style={{
                padding: '10px 12px', borderBottom: `1px solid ${brd}`,
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexShrink: 0,
            }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: tM }}>
                    💬 {t('council.sidebarTitle')}
                </span>
                <button onClick={() => navigate('/')}
                    style={{
                        border: 'none', background: 'none',
                        cursor: 'pointer', fontSize: 16, color: tS, padding: '2px 6px',
                    }}>
                    {t('council.close')}
                </button>
            </div>

            {/* ── NEW CHAT BUTTON ── */}
            <div style={{ padding: '8px 12px', flexShrink: 0 }}>
                <button onClick={onNewChat} style={{
                    width: '100%', padding: '10px 12px',
                    background: isDark ? '#1e293b' : '#f1f5f9',
                    border: `1px dashed ${brd}`, borderRadius: 8,
                    color: tM, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', textAlign: 'center',
                }}>
                    ➕ {t('council.newChat') || 'New chat'}
                </button>
            </div>

            {/* ── SCROLLABLE HISTORY ── */}
            <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px', minHeight: 0 }}>
                {groups.length === 0 ? (
                    <div style={{
                        fontSize: 12, color: tS, opacity: 0.6,
                        textAlign: 'center', padding: '20px 0',
                    }}>
                        {t('council.historyEmpty')}
                    </div>
                ) : (
                    groups.map(group => (
                        <div key={group.key}
                            onDragOver={e => onDragOver(e, group.key)}
                            onDragLeave={onDragLeave}
                            onDrop={e => onDrop(e, group.key)}
                            style={{
                                marginBottom: 8,
                                background: dropTarget === group.key
                                    ? (isDark ? '#1e3a5f22' : '#dbeafe44')
                                    : 'transparent',
                                borderRadius: 6,
                                transition: 'background 0.15s',
                                border: dropTarget === group.key ? '2px dashed #3b82f6' : '2px solid transparent',
                            }}>
                            <div style={{
                                fontSize: 12, fontWeight: 600, color: tS,
                                padding: '6px 8px 4px', textTransform: 'uppercase',
                                letterSpacing: 0.5, opacity: 0.7,
                            }}>
                                {group.label}
                            </div>
                            {group.items.map(item => {
                                const isActive = item.id === activeHistoryId;
                                const isHovered = hoveredId === item.id;
                                const isMenuOpen = menuId === item.id;
                                const isRenaming = renameId === item.id;
                                const isDragging = dragId === item.id;
                                return (
                                    <div key={item.id}
                                        draggable={!isRenaming}
                                        onDragStart={e => onDragStart(e, item.id)}
                                        onDragEnd={onDragEnd}
                                        onClick={() => !isRenaming && onSelectHistory(item)}
                                        onMouseEnter={() => setHoveredId(item.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        style={{
                                            padding: '8px 10px', marginBottom: 1,
                                            borderRadius: 6, cursor: isRenaming ? 'default' : 'pointer',
                                            background: isActive
                                                ? (isDark ? '#1e3a5f' : '#dbeafe')
                                                : isHovered
                                                    ? (isDark ? '#1e293b' : '#f1f5f9')
                                                    : 'transparent',
                                            borderLeft: isActive
                                                ? '3px solid #3b82f6'
                                                : '3px solid transparent',
                                            transition: 'background 0.15s',
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            opacity: isDragging ? 0.4 : 1,
                                            position: 'relative',
                                        }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {isRenaming ? (
                                                <input value={renameVal}
                                                    onChange={e => setRenameVal(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenameId(null); }}
                                                    onBlur={confirmRename}
                                                    onClick={e => e.stopPropagation()}
                                                    autoFocus
                                                    style={{
                                                        width: '100%', padding: '2px 6px', fontSize: 12,
                                                        border: `1px solid #3b82f6`, borderRadius: 4,
                                                        background: bgI, color: tM, boxSizing: 'border-box',
                                                    }} />
                                            ) : (
                                                <>
                                                    <div style={{
                                                        fontSize: 12, color: tM,
                                                        fontWeight: isActive ? 600 : 400,
                                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {item.topic || '—'}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: tS, marginTop: 2, opacity: 0.7 }}>
                                                        {timeAgo(item.timestamp)}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* ── Three-dot menu button (Fix #2) ── */}
                                        {!isRenaming && (isHovered || isMenuOpen) && (
                                            <button onClick={e => { e.stopPropagation(); setMenuId(isMenuOpen ? null : item.id); }}
                                                style={{
                                                    border: 'none', background: 'none',
                                                    cursor: 'pointer', fontSize: 14, color: tS,
                                                    padding: '2px 4px', borderRadius: 4,
                                                    flexShrink: 0,
                                                }}>⋮</button>
                                        )}

                                        {/* ── Context Menu dropdown (Fix #2) ── */}
                                        {isMenuOpen && (
                                            <div onClick={e => e.stopPropagation()} style={{
                                                position: 'absolute', right: 8, top: '100%', zIndex: 100,
                                                background: bg, border: `1px solid ${brd}`, borderRadius: 8,
                                                boxShadow: '0 4px 16px rgba(0,0,0,0.2)', minWidth: 160,
                                                padding: '4px 0', overflow: 'hidden',
                                            }}>
                                                <button onClick={() => handleRename(item)} style={menuItemStyle(bg, tM)}>
                                                    {t('council.rename')}
                                                </button>
                                                {/* Move to sub-items */}
                                                <div style={{ padding: '2px 12px', fontSize: 12, color: tS, fontWeight: 600 }}>
                                                    {t('council.moveTo')}
                                                </div>
                                                {GROUP_KEYS.map(gk => (
                                                    <button key={gk} onClick={() => handleMoveTo(item.id, gk)}
                                                        style={{ ...menuItemStyle(bg, tM), paddingLeft: 24, fontSize: 12 }}>
                                                        {t(`council.${gk === 'week' ? 'previous7' : gk}`)}
                                                    </button>
                                                ))}
                                                <div style={{ height: 1, background: brd, margin: '4px 0' }} />
                                                <button onClick={() => handleDelete(item.id)} style={{ ...menuItemStyle(bg, '#ef4444') }}>
                                                    {t('council.delete')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>

            {/* ── DELETED FOLDER (Fix #3) ── */}
            {deletedHistory?.length > 0 && (
                <div style={{ borderTop: `1px solid ${brd}`, flexShrink: 0 }}>
                    <button onClick={() => setShowDeleted(!showDeleted)} style={{
                        width: '100%', padding: '8px 12px',
                        border: 'none', background: 'none',
                        color: tS, fontSize: 12, cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span>🗑️ {t('council.deletedFolder')} ({deletedHistory.length})</span>
                        <span style={{ fontSize: 12 }}>{showDeleted ? '▲' : '▼'}</span>
                    </button>
                    {showDeleted && (
                        <div style={{ maxHeight: 150, overflow: 'auto', padding: '0 8px 4px' }}>
                            {deletedHistory.map(item => (
                                <div key={item.id} style={{
                                    padding: '6px 8px', marginBottom: 1, borderRadius: 6,
                                    background: isDark ? '#1a1a1a' : '#fef2f2',
                                    display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                                }}>
                                    <span style={{ flex: 1, color: tM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.topic || '—'}
                                    </span>
                                    <button onClick={() => onRestoreHistory(item.id)} title={t('council.restore')} style={{
                                        border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#22c55e', padding: '2px',
                                    }}>♻️</button>
                                    <button onClick={() => onPermanentDeleteHistory(item.id)} title={t('council.permanentDelete')} style={{
                                        border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#ef4444', padding: '2px',
                                    }}>❌</button>
                                </div>
                            ))}
                            <button onClick={onEmptyTrash} style={{
                                width: '100%', padding: '4px 8px', marginTop: 4,
                                border: 'none', background: 'none', cursor: 'pointer',
                                color: tS, fontSize: 12, opacity: 0.7,
                            }}>
                                🧹 {t('council.emptyTrash')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── CLEAR HISTORY ── */}
            {councilHistory?.length > 0 && (
                <div style={{
                    padding: '8px 12px', borderTop: `1px solid ${brd}`, flexShrink: 0,
                }}>
                    <button onClick={clearHistory} style={{
                        width: '100%', padding: '8px 10px',
                        border: 'none', background: 'none',
                        color: tS, fontSize: 12, cursor: 'pointer', opacity: 0.7,
                        borderRadius: 6, textAlign: 'center',
                    }}>
                        🗑️ {t('council.clearHistory')}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── Helper: context menu item style ── */
function menuItemStyle(bg, color) {
    return {
        display: 'block', width: '100%', padding: '6px 12px',
        border: 'none', background: 'none', color,
        cursor: 'pointer', fontSize: 13, textAlign: 'left',
    };
}
