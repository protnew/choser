import React from 'react'
import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'

// ===== EChart wrapper =====
export const Chart = ({ id, option, height = 280 }) => {
    const ref = useRef(null)
    useEffect(() => {
        if (!ref.current || !option) return
        const chart = echarts.init(ref.current)
        chart.setOption(option)
        const onResize = () => chart.resize()
        window.addEventListener('resize', onResize)
        return () => { window.removeEventListener('resize', onResize); chart.dispose() }
    }, [option])
    return <div ref={ref} id={id} style={{ width: '100%', height }} />
}

export const hdr = typeof window !== 'undefined' && localStorage.getItem('choser_token') ? { Authorization: `Bearer ${localStorage.getItem('choser_token')}` } : {}
export const b = { textStyle: { fontFamily: 'Inter,system-ui,sans-serif', fontSize: 12, color: 'inherit' }, grid: { left: 50, right: 20, top: 30, bottom: 40 }, tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e2e8f0', textStyle: { color: '#1e293b', fontSize: 12 } } }
export const b14 = { fontSize: 14, color: '#1e293b' }
export const tl = { text: '', left: 'center', textStyle: b14 }

const tabs = [
    { to: '/admin/1-settings', label: '1 ⚙️ Настройки', id: 'settings', color: '#2563eb' },
    { to: '/admin/2-users', label: '2 👤 Польз.', id: 'users', color: '#2563eb' },
    { to: '/admin/3-trash', label: '3 🗑️ Корзина', id: 'trash', color: '#2563eb' },
    { to: '/admin/4-backup', label: '4 💾 Бэкап', id: 'backup', color: '#2563eb' },
    { to: '/admin/5-objects', label: '5 📦 Объекты', id: 'objects', color: '#22c55e' },
    { to: '/admin/6-params', label: '6 📐 Параметры', id: 'params', color: '#f59e0b' },
    { to: '/admin/7-analytics', label: '7 📊 Аналитика', id: 'analytics', color: '#8b5cf6' },
    { to: '/admin/8-decisions', label: '8 🎯 Решения', id: 'decisions', color: '#059669' },
    { to: '/admin/9-sensitivity', label: '9 📉 Чувств.', id: 'sensitivity', color: '#059669' },
    { to: '/admin/10-sensitivity-extended', label: '10 🔬 Полный (29)', id: 'sensitivity-extended', color: '#6366f1' },
    { to: '/admin/11-distributions', label: '11 📈 EBM', id: 'distributions', color: '#db2777' },
]

const AdminNavLink = ({ to, label, active, color }) => (
    <a href={to} style={{
        padding: '8px 12px', border: 'none', background: active ? color + '15' : 'transparent',
        color: active ? color : '#64748b', borderRadius: 6, fontWeight: active ? 'bold' : 'normal',
        cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block',
        borderBottom: active ? '3px solid ' + color : '3px solid transparent'
    }}>{label}</a>
)

export const AdminNav = ({ activePage }) => (
    <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
        {tabs.map(t => <AdminNavLink key={t.id} to={t.to} label={t.label} active={activePage === t.id} color={t.color} />)}
    </div>
)

// ===== Section wrapper =====
export const S = ({ id, num, title, children, isNew }) => (
    <div id={id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${isNew ? '#fde68a' : '#e2e8f0'}`, padding: 24, marginBottom: 16, scrollMarginTop: 80 }}>
        <h2 style={{ fontSize: 17, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
            <span style={{ background: isNew ? '#f59e0b' : '#6366f1', color: '#fff', borderRadius: '50%', width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{num}</span>
            {title}
        </h2>
        {children}
    </div>
)

// ===== KPI card =====
export const KPI = ({ val, lbl, color }) => (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: 10, flex: 1, minWidth: 110, textAlign: 'center', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: color || '#1e293b' }}>{val}</div>
        <div style={{ fontSize: 12, color: 'inherit', marginTop: 2 }}>{lbl}</div>
    </div>
)

// ===== Explain block =====
export const Explain = ({ children }) => (
    <div style={{ background: '#eff6ff', borderRadius: 8, padding: 14, marginTop: 12, fontSize: 13, color: '#1e40af', lineHeight: 1.6, borderLeft: '3px solid #3b82f6' }}>{children}</div>
)

// ===== Navigation sections config =====
export const navSections = [
    { id: 's1', t: '1. Калькулятор цены ошибки', isNew: false },
    { id: 's2', t: '2. ROI: цена ошибки', isNew: false },
    { id: 's3', t: '3. Разбор случаев', isNew: false },
    { id: 's4', t: '4. Запас прочности', isNew: true },
    { id: 's5', t: '5. Минимальная модель', isNew: false },
    { id: 's6', t: '6. Тепловая карта', isNew: false },
    { id: 's7', t: '7. Спорные таблицы', isNew: true },
    { id: 's8', t: '8. Монте-Карло', isNew: false },
    { id: 's9', t: '9. Кривая Лоренца', isNew: false },
    { id: 's10', t: '10. Pareto анализ', isNew: true },
    { id: 's11', t: '11. Отрывы #1 vs #2', isNew: true },
    { id: 's12', t: '12. Инверсия', isNew: true },
    { id: 's13', t: '13. Категории по тематике', isNew: true },
    { id: 's14', t: '14. Количество объектов', isNew: false },
    { id: 's15', t: '15. Веса vs оценки', isNew: true },
    { id: 's16', t: '16. Типы параметров', isNew: true },
    { id: 's17', t: '17. Перемещение лидера', isNew: true },
    { id: 's18', t: '18. Неравенство весов', isNew: false },
    { id: 's19', t: '19. Энтропия', isNew: true },
    { id: 's20', t: '20. Доминирование', isNew: true },
    { id: 's21', t: '21. Корреляции', isNew: true },
    { id: 's22', t: '22. Сложность vs точность', isNew: true },
    { id: 's23', t: '23. Концентрация весов', isNew: true },
    { id: 's24', t: '24. Мёртвые параметры', isNew: true },
    { id: 's25', t: '25. Идеальные объекты', isNew: true },
    { id: 's26', t: '26. Kendall τ', isNew: true },
    { id: 's27', t: '27. Outliers', isNew: true },
    { id: 's28', t: '28. Динамика по времени', isNew: false },
    { id: 's29', t: '29. Кластеры', isNew: true },
]
