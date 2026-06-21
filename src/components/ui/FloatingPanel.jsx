import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChoserLog } from '../../utils/log';

/**
 * FloatingPanel — draggable & resizable floating panel
 * B1: drag/resize for ChatList, Settings, Table panels
 *
 * Props:
 *   title, icon, children, isDark, brd, bg, bgI, tM, tS
 *   initialPos: { x, y, w, h }
 *   minW, minH
 *   style (overrides)
 *   onTop (called when panel is focused)
 *   zIndex
 */
export default function FloatingPanel({
    title = 'Panel',
    icon = '📦',
    children,
    isDark, brd, bg, bgI, tM, tS,
    initialPos = { x: 20, y: 20, w: 400, h: 500 },
    minW = 200,
    minH = 150,
    style,
    onTop,
    zIndex = 10,
    headerExtra,
}) {
    const [pos, setPos] = useState(initialPos);
    const [size, setSize] = useState({ w: initialPos.w, h: initialPos.h });
    const [collapsed, setCollapsed] = useState(false);
    const dragRef = useRef(null);
    const resizeRef = useRef(null);
    const panelRef = useRef(null);

    /* ── Drag ── */
    const onDragStart = useCallback((e) => {
        if (e.target.closest('[data-nodrag]')) return;
        e.preventDefault();
        const startX = e.clientX - pos.x;
        const startY = e.clientY - pos.y;
        const onMove = (ev) => {
            const nx = Math.max(0, Math.min(ev.clientX - startX, window.innerWidth - 100));
            const ny = Math.max(0, Math.min(ev.clientY - startY, window.innerHeight - 40));
            setPos({ x: nx, y: ny });
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        if (onTop) onTop();
    }, [pos.x, pos.y, onTop]);

    /* ── Resize ── */
    const onResizeStart = useCallback((e, dir) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = size.w;
        const startH = size.h;
        const startPosX = pos.x;
        const startPosY = pos.y;
        const onMove = (ev) => {
            let dx = ev.clientX - startX;
            let dy = ev.clientY - startY;
            let nw = startW, nh = startH, nx = startPosX, ny = startPosY;
            if (dir.includes('e')) nw = Math.max(minW, startW + dx);
            if (dir.includes('s')) nh = Math.max(minH, startH + dy);
            if (dir.includes('w')) { nw = Math.max(minW, startW - dx); nx = startPosX + (startW - nw); }
            if (dir.includes('n')) { nh = Math.max(minH, startH - dy); ny = startPosY + (startH - nh); }
            setSize({ w: nw, h: nh });
            setPos({ x: nx, y: ny });
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        if (onTop) onTop();
    }, [size.w, size.h, pos.x, pos.y, minW, minH, onTop]);

    /* ── Focus on click ── */
    const handleFocus = useCallback(() => {
        if (onTop) onTop();
    }, [onTop]);

    return (
        <div
            ref={panelRef}
            onMouseDown={handleFocus}
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: size.w,
                height: collapsed ? 'auto' : size.h,
                background: bg,
                border: `1px solid ${brd}`,
                borderRadius: 12,
                boxShadow: isDark
                    ? '0 8px 32px rgba(0,0,0,0.5)'
                    : '0 4px 16px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex,
                transition: 'box-shadow 0.15s',
                ...style,
            }}
        >
            {/* ── Title Bar (draggable) ── */}
            <div
                onMouseDown={onDragStart}
                style={{
                    padding: '8px 12px',
                    background: isDark ? '#1e293b' : '#f1f5f9',
                    borderBottom: `1px solid ${brd}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'grab',
                    userSelect: 'none',
                    flexShrink: 0,
                }}
            >
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: tM, flex: 1 }}>{title}</span>
                {headerExtra}
                <button
                    data-nodrag="true"
                    onClick={() => setCollapsed(c => !c)}
                    style={{
                        border: 'none', background: 'none', cursor: 'pointer',
                        fontSize: 14, color: tS, padding: '2px 6px', borderRadius: 4,
                    }}
                >
                    {collapsed ? '▼' : '▲'}
                </button>
            </div>

            {/* ── Content ── */}
            {!collapsed && (
                <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                    {children}
                </div>
            )}

            {/* ── Resize Handles ── */}
            {!collapsed && <>
                {/* Right */}
                <div onMouseDown={e => onResizeStart(e, 'e')} style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: 6,
                    cursor: 'e-resize', zIndex: 5,
                }} />
                {/* Bottom */}
                <div onMouseDown={e => onResizeStart(e, 's')} style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, height: 6,
                    cursor: 's-resize', zIndex: 5,
                }} />
                {/* Corner SE */}
                <div onMouseDown={e => onResizeStart(e, 'se')} style={{
                    position: 'absolute', right: 0, bottom: 0, width: 14, height: 14,
                    cursor: 'se-resize', zIndex: 6,
                    background: isDark ? '#334155' : '#e2e8f0',
                    borderRadius: '0 0 12px 0',
                    opacity: 0.6,
                }} />
                {/* Left */}
                <div onMouseDown={e => onResizeStart(e, 'w')} style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
                    cursor: 'w-resize', zIndex: 5,
                }} />
                {/* Top */}
                <div onMouseDown={e => onResizeStart(e, 'n')} style={{
                    position: 'absolute', left: 0, right: 0, top: 0, height: 6,
                    cursor: 'n-resize', zIndex: 5,
                }} />
            </>}
        </div>
    );
}
