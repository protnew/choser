/**
 * Decision Tree data model — Matrix of Matrix
 * B13: Tree node model, serialization, branch management
 */
const TREE_KEY = 'choser_decision_tree';

export const NODE_STATUS = { OPEN: 'OPEN', DONE: 'DONE', TABLE: 'TABLE' };

/**
 * Create a new tree node
 */
export function createNode({ id, title, status = NODE_STATUS.OPEN, children = [], tableRef = null, parentChoice = null, priority = 5 }) {
    return { id: id || `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, title, status, children, tableRef, parentChoice, priority, locked: false, confidence: null };
}

/**
 * Save tree to localStorage
 */
export function saveTree(tree) {
    try { localStorage.setItem(TREE_KEY, JSON.stringify(tree)); } catch {}
}

/**
 * Load tree from localStorage
 */
export function loadTree() {
    try {
        const raw = localStorage.getItem(TREE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

/**
 * Find a node by id in the tree
 */
export function findNode(tree, nodeId) {
    if (!tree) return null;
    if (tree.id === nodeId) return tree;
    for (const child of (tree.children || [])) {
        const found = findNode(child, nodeId);
        if (found) return found;
    }
    return null;
}

/**
 * Find parent of a node
 */
export function findParent(tree, nodeId, parent = null) {
    if (!tree) return null;
    if (tree.id === nodeId) return parent;
    for (const child of (tree.children || [])) {
        const found = findParent(child, nodeId, tree);
        if (found) return found;
    }
    return null;
}

/**
 * Add a child node to a parent
 */
export function addChild(tree, parentId, childNode) {
    const parent = findNode(tree, parentId);
    if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(childNode);
    }
    return tree;
}

/**
 * Remove a node from the tree
 */
export function removeNode(tree, nodeId) {
    if (!tree) return tree;
    if (tree.children) {
        tree.children = tree.children.filter(c => c.id !== nodeId);
        tree.children.forEach(c => removeNode(c, nodeId));
    }
    return tree;
}

/**
 * Update a node's properties
 */
export function updateNode(tree, nodeId, updates) {
    const node = findNode(tree, nodeId);
    if (node) Object.assign(node, updates);
    return tree;
}

/**
 * Get active branches (nodes whose parentChoice matches the selected option)
 */
export function getActiveBranches(tree, selections = {}) {
    const active = [];
    function walk(node) {
        active.push(node);
        if (selections[node.id] && node.children) {
            const selectedChoice = selections[node.id];
            const activeChild = node.children.find(c => c.parentChoice === selectedChoice);
            if (activeChild) walk(activeChild);
        } else if (node.children) {
            // No selection — all children are potentially active
            node.children.forEach(c => walk(c));
        }
    }
    if (tree) walk(tree);
    return active;
}

/**
 * Resolve path from root to a node
 */
export function resolvePath(tree, nodeId) {
    const path = [];
    function walk(node) {
        path.push(node);
        if (node.id === nodeId) return true;
        for (const child of (node.children || [])) {
            if (walk(child)) return true;
        }
        path.pop();
        return false;
    }
    if (tree) walk(tree);
    return path;
}

/**
 * Toggle branch selection — activates one branch, deactivates others
 */
export function toggleBranch(tree, nodeId, choice) {
    // This is used with selections state externally
    return { nodeId, choice };
}

/**
 * Calculate tree progress (% of nodes resolved)
 */
export function treeProgress(tree) {
    let total = 0, resolved = 0;
    function walk(node) {
        total++;
        if (node.status === NODE_STATUS.DONE || node.status === NODE_STATUS.TABLE) resolved++;
        (node.children || []).forEach(walk);
    }
    if (tree) walk(tree);
    return total > 0 ? Math.round(resolved / total * 100) : 0;
}

/**
 * Detect circular dependencies
 */
export function detectCircular(tree, visited = new Set()) {
    if (!tree) return false;
    if (visited.has(tree.id)) return true;
    visited.add(tree.id);
    for (const child of (tree.children || [])) {
        if (detectCircular(child, new Set(visited))) return true;
    }
    return false;
}

/**
 * Auto-fill tree with AI estimates (stub — actual LLM call done in component)
 */
export function prepareAutoFillPrompt(tree, selections) {
    const lines = ['Заполни дерево решений оценками. Для каждого открытого узла укажи priority (1-10) и confidence (1-10).', '', 'Формат ответа:', '```json', '{', '  "nodes": {', '    "node_id": { "priority": 7, "confidence": 8, "suggestion": "краткая рекомендация" }', '  }', '}', '```', '', 'Дерево:'];
    function walk(node, depth = 0) {
        const indent = '  '.repeat(depth);
        const status = node.status === NODE_STATUS.DONE ? '✅' : node.status === NODE_STATUS.TABLE ? '📊' : '⬜';
        lines.push(`${indent}${status} ${node.title} [${node.id}] (priority: ${node.priority || '?'})`);
        (node.children || []).forEach(c => walk(c, depth + 1));
    }
    if (tree) walk(tree);
    return lines.join('\n');
}
