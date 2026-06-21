/**
 * Decision Tree visualization component
 * B14: Vertical tree layout, collapsible, node states, zoom/pan
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useLang } from '../../contexts/LangContext';
import { ChoserLog } from '../../utils/log';
import { t } from '../../i18n';
import {
    NODE_STATUS, findNode, addChild, removeNode, updateNode,
    resolvePath, treeProgress, createNode, saveTree, loadTree,
    prepareAutoFillPrompt,
} from '../../utils/decisionTree';

const DEFAULT_TREE = createNode({ id: 'root', title: 'Decision Root', status: NODE_STATUS.OPEN });

export default function DecisionTree({ isDark, brd, bg, bgI, tM, tS, onSelectNode, onAutoFill }) {
    const { locale } = useLang();
    const [tree, setTree] = useState(() => loadTree() || DEFAULT_TREE);
    const [selectedId, setSelectedId] = useState(null);
    const [selections, setSelections] = useState({}); // { nodeId: choice }
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    ChoserLog.debug('TREE', 'render', { selectedId, progress: treeProgress(tree) });

    const progress = useMemo(() => treeProgress(tree), [tree]);
    const activePath = useMemo(() => selectedId ? resolvePath(tree, selectedId) : [], [tree, selectedId]);
    const activePathIds = new Set(activePath.map(n => n.id));

    const update = (newTree) => { setTree(newTree); saveTree(newTree); };

    const handleSelectNode = useCallback((nodeId) => {
        setSelectedId(nodeId);
        if (onSelectNode) onSelectNode(findNode(tree, nodeId));
    }, [tree, onSelectNode]);

    const handleAddChild = useCallback((parentId) => {
        const child = createNode({ title: 'New branch', parentChoice: `choice_${Date.now()}` });
        const newTree = addChild(structuredClone(tree), parentId, child);
        update(newTree);
    }, [tree]);

    const handleRemove = useCallback((nodeId) => {
        if (nodeId === 'root') return;
        const newTree = removeNode(structuredClone(tree), nodeId);
        update(newTree);
        if (selectedId === nodeId) setSelectedId(null);
    }, [tree, selectedId]);

    const handleStatusCycle = useCallback((nodeId) => {
        const node = findNode(tree, nodeId);
        if (!node) return;
        const order = [NODE_STATUS.OPEN, NODE_STATUS.TABLE, NODE_STATUS.DONE];
        const nextIdx = (order.indexOf(node.status) + 1) % order.length;
        const newTree = updateNode(structuredClone(tree), nodeId, { status: order[nextIdx] });
        update(newTree);
    }, [tree]);

    const handleStartEdit = useCallback((nodeId) => {
        const node = findNode(tree, nodeId);
        if (node) { setEditingId(nodeId); setEditTitle(node.title); }
    }, [tree]);

    const handleConfirmEdit = useCallback(() => {
        if (editingId && editTitle.trim()) {
            const newTree = updateNode(structuredClone(tree), editingId, { title: editTitle.trim() });
            update(newTree);
        }
        setEditingId(null);
    }, [tree, editingId, editTitle]);

    const handlePriorityChange = useCallback((nodeId, priority) => {
        const newTree = updateNode(structuredClone(tree), nodeId, { priority: Math.max(1, Math.min(10, priority)) });
        update(newTree);
    }, [tree]);

    const handleSelectChoice = useCallback((nodeId, childChoice) => {
        setSelections(prev => ({ ...prev, [nodeId]: childChoice }));
    }, []);

    // Node rendering
    const renderNode = (node, depth = 0) => {
        const isSelected = node.id === selectedId;
        const isActivePath = activePathIds.has(node.id);
        const statusIcon = node.status === NODE_STATUS.DONE ? '✅' : node.status === NODE_STATUS.TABLE ? '📊' : '⬜';
        const statusColor = node.status === NODE_STATUS.DONE ? '#22c55e' : node.status === NODE_STATUS.TABLE ? '#3b82f6' : '#9ca3af';
        const isEditing = editingId === node.id;
        const childChoice = selections[node.id];

        return (
            <div key={node.id} style={{ marginLeft: depth * 24, marginBottom: 4 }}>
                <div
                    onClick={() => handleSelectNode(node.id)}
                    onDoubleClick={() => handleStartEdit(node.id)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 10px', borderRadius: 8,
                        background: isSelected ? (isDark ? '#1e3a5f' : '#dbeafe')
                            : isActivePath ? (isDark ? '#1e293b' : '#f1f5f9') : 'transparent',
                        border: isSelected ? '2px solid #3b82f6' : `1px solid ${brd}`,
                        cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    <span style={{ fontSize: 14 }}>{statusIcon}</span>
                    {isEditing ? (
                        <input value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleConfirmEdit(); if (e.key === 'Escape') setEditingId(null); }}
                            onBlur={handleConfirmEdit}
                            autoFocus
                            style={{ flex: 1, padding: '2px 6px', fontSize: 12, border: '1px solid #3b82f6', borderRadius: 4, background: bgI, color: tM }} />
                    ) : (
                        <span style={{ fontSize: 12, color: tM, fontWeight: isSelected ? 600 : 400, flex: 1 }}>{node.title}</span>
                    )}
                    {/* Priority badge */}
                    <span style={{
                        fontSize: 12, padding: '1px 6px', borderRadius: 10,
                        background: (node.priority || 5) >= 7 ? '#ef444422' : (node.priority || 5) >= 4 ? '#f59e0b22' : '#22c55e22',
                        color: (node.priority || 5) >= 7 ? '#ef4444' : (node.priority || 5) >= 4 ? '#f59e0b' : '#22c55e',
                        fontWeight: 600, minWidth: 20, textAlign: 'center',
                    }}>{node.priority || 5}</span>
                    {/* Actions */}
                    <button onClick={(e) => { e.stopPropagation(); handleStatusCycle(node.id); }} title="Cycle status" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: statusColor }}>↻</button>
                    <button onClick={(e) => { e.stopPropagation(); handleAddChild(node.id); }} title="Add child" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: tS }}>+</button>
                    {node.id !== 'root' && (
                        <button onClick={(e) => { e.stopPropagation(); handleRemove(node.id); }} title="Remove" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#ef4444' }}>×</button>
                    )}
                </div>
                {/* Children with branch selection */}
                {node.children && node.children.length > 0 && (
                    <div style={{ marginTop: 2 }}>
                        {node.children.length > 1 && (
                            <div style={{ display: 'flex', gap: 3, marginLeft: 12, marginBottom: 2 }}>
                                {node.children.map(c => (
                                    <button key={c.id}
                                        onClick={() => handleSelectChoice(node.id, c.parentChoice)}
                                        style={{
                                            padding: '1px 8px', fontSize: 12, borderRadius: 4,
                                            border: childChoice === c.parentChoice ? '2px solid #3b82f6' : `1px solid ${brd}`,
                                            background: childChoice === c.parentChoice ? '#3b82f622' : bg,
                                            color: childChoice === c.parentChoice ? '#3b82f6' : tS,
                                            cursor: 'pointer',
                                        }}>
                                        {c.parentChoice || c.title}
                                    </button>
                                ))}
                            </div>
                        )}
                        {node.children.map(child => {
                            // Only show children matching selection, or all if no selection
                            if (node.children.length > 1 && childChoice && childChoice !== child.parentChoice) return null;
                            return renderNode(child, depth + 1);
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: bg }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderBottom: `1px solid ${brd}`, background: bgI, flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: tM }}>🌳 Decision Tree</span>
                <div style={{ flex: 1, height: 6, background: isDark ? '#1e293b' : '#e5e7eb', borderRadius: 3, maxWidth: 200, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 12, color: tS }}>{progress}%</span>
                <button onClick={() => handleAddChild('root')} style={{ padding: '4px 10px', fontSize: 12, border: `1px solid ${brd}`, borderRadius: 4, background: bg, color: tM, cursor: 'pointer' }}>+ Branch</button>
                <button onClick={() => { if (onAutoFill) onAutoFill(prepareAutoFillPrompt(tree, selections)); }} style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #3b82f6', borderRadius: 4, background: '#3b82f622', color: '#3b82f6', cursor: 'pointer' }}>🤖 Auto-fill</button>
                <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} style={{ border: `1px solid ${brd}`, borderRadius: 3, background: bg, color: tS, cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}>+</button>
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} style={{ border: `1px solid ${brd}`, borderRadius: 3, background: bg, color: tS, cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}>−</button>
                </div>
            </div>

            {/* Tree content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                {renderNode(tree)}
            </div>

            {/* Selected node detail */}
            {selectedId && (() => {
                const node = findNode(tree, selectedId);
                if (!node) return null;
                return (
                    <div style={{ padding: '8px 16px', borderTop: `1px solid ${brd}`, background: bgI, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: tM }}>{node.title}</span>
                            <span style={{ fontSize: 12, color: tS }}>Priority:</span>
                            <input type="number" min="1" max="10" value={node.priority || 5}
                                onChange={e => handlePriorityChange(node.id, parseInt(e.target.value) || 5)}
                                style={{ width: 40, padding: '2px 4px', fontSize: 12, border: `1px solid ${brd}`, borderRadius: 4, background: bg, color: tM, textAlign: 'center' }} />
                            {node.confidence && <span style={{ fontSize: 12, color: tS }}>Conf: {node.confidence}/10</span>}
                            {node.tableRef && <span style={{ fontSize: 12, color: '#3b82f6', cursor: 'pointer' }} onClick={() => onSelectNode && onSelectNode(node)}>📊 Open table</span>}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
