// Grid style constants
export const PRETEXT_FONT = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

export const gridThemeVars = (isDark) => ({
    '--ag-background-color': isDark ? '#0f172a' : '#ffffff',
    '--ag-header-background-color': isDark ? '#1e293b' : '#f1f5f9',
    '--ag-odd-row-background-color': isDark ? '#1e293b' : '#f8fafc',
    '--ag-row-hover-color': isDark ? '#334155' : '#e2e8f0',
    '--ag-range-selection-border-color': '#3b82f6',
    '--ag-selected-row-background-color': isDark ? '#1e3a5f' : '#bfdbfe',
    '--ag-row-border-color': isDark ? '#334155' : '#e2e8f0',
    '--ag-header-foreground-color': isDark ? '#e2e8f0' : '#334155',
    '--ag-foreground-color': isDark ? '#f1f5f9' : '#0f172a',
    '--ag-font-size': '13px',
    '--ag-font-family': PRETEXT_FONT,
    '--ag-grid-size': '6',
    '--ag-cell-horizontal-padding': '8',
});

export const cellClasses = {
    rowIdCell: { display: 'flex', alignItems: 'center', gap: 4 },
    linkBtn: { fontSize: 12, padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', background: '#3b82f6', color: '#fff' },
};
