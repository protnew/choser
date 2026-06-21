import React, { useState, useEffect } from 'react'
import { AdminNav, navSections, hdr } from './sensitivity/shared.jsx'
import { fallbackData } from './sensitivity/fallbackData'
import Section01 from './sensitivity/Section01'
import Section02 from './sensitivity/Section02'
import Section03 from './sensitivity/Section03'
import Section04 from './sensitivity/Section04'
import Section05 from './sensitivity/Section05'
import Section06 from './sensitivity/Section06'
import Section07 from './sensitivity/Section07'
import Section08 from './sensitivity/Section08'
import Section09 from './sensitivity/Section09'
import Section10 from './sensitivity/Section10'
import Section11 from './sensitivity/Section11'
import Section12 from './sensitivity/Section12'
import Section13 from './sensitivity/Section13'
import Section14 from './sensitivity/Section14'
import Section15 from './sensitivity/Section15'
import Section16 from './sensitivity/Section16'
import Section17 from './sensitivity/Section17'
import Section18 from './sensitivity/Section18'
import Section19 from './sensitivity/Section19'
import Section20 from './sensitivity/Section20'
import Section21 from './sensitivity/Section21'
import Section22 from './sensitivity/Section22'
import Section23 from './sensitivity/Section23'
import Section24 from './sensitivity/Section24'
import Section25 from './sensitivity/Section25'
import Section26 from './sensitivity/Section26'
import Section27 from './sensitivity/Section27'
import Section28 from './sensitivity/Section28'
import Section29 from './sensitivity/Section29'

const recalc = () => {
    const cost = parseFloat(document.getElementById('cS')?.value || 1.5)
    const yr = parseInt(document.getElementById('cY')?.value || 5)
    const lv = parseFloat(document.getElementById('cL')?.value || 28)
    const loss = cost * lv / 100 * yr
    const el = document.getElementById('cR')
    if (el) { el.textContent = loss >= 1 ? loss.toFixed(2) + ' млн ₽/год' : (loss * 1000).toFixed(0) + 'K ₽/год'; el.style.color = loss > 1 ? '#ef4444' : loss > 0.3 ? '#f59e0b' : '#16a34a' }
    const dt = document.getElementById('cD')
    if (dt) dt.textContent = `P(ошибка) = ${lv}% × ${yr} решений × ${cost} млн ₽`
}

export default function SensitivityExtended() {
    const [d, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeNav, setActiveNav] = useState('s1')

    useEffect(() => {
        fetch('/api/admin/decision/sensitivity-full', { method: 'POST', headers: hdr })
            .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
            .then(data => { setData(data); setLoading(false) })
            .catch(() => { setData(fallbackData); setLoading(false) })
        setTimeout(() => {
            const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActiveNav(e.target.id) }), { rootMargin: '-80px 0px -70% 0px' })
            navSections.forEach(n => { const el = document.getElementById(n.id); if (el) obs.observe(el) })
        }, 500)
    }, [])

    const originalNav = navSections.filter(n => !n.isNew)
    const newNav = navSections.filter(n => n.isNew)

    if (loading) return <div style={{ padding: 20, background: '#f8fafc', minHeight: '100vh' }}><AdminNav activePage="sensitivity-extended" /><div style={{ textAlign: 'center', padding: 40, color: 'inherit' }}>⏳ Загрузка данных ({d?.totalTables || '400'} таблиц, расчёт 29 разделов)...</div></div>
    if (!d) return <div style={{ padding: 20 }}><AdminNav activePage="sensitivity-extended" /><div style={{ color: '#ef4444' }}>Ошибка загрузки</div></div>

    return (
        <div style={{ display: 'flex', height: '100%', background: '#f8fafc' }}>
            <div style={{ position: 'sticky', top: 0, width: 200, flexShrink: 0, padding: '10px 6px', overflowY: 'auto', borderRight: '1px solid #e2e8f0', background: '#fff', height: '100vh' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b', marginBottom: 2 }}>🔬 Полный анализ</div>
                <div style={{ fontSize: 12, color: 'inherit', marginBottom: 8 }}>29 разделов • {d.totalTables} таблиц</div>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#6366f1', marginBottom: 3 }}>Основные</div>
                {originalNav.map(n => (
                    <a key={n.id} href={`#${n.id}`} onClick={() => setActiveNav(n.id)} style={{ display: 'block', padding: '4px 6px', borderRadius: 3, fontSize: 12, textDecoration: 'none', color: activeNav === n.id ? '#1e293b' : '#64748b', background: activeNav === n.id ? '#e0e7ff' : 'transparent', marginBottom: 1, fontWeight: activeNav === n.id ? 600 : 400 }}>{n.t}</a>
                ))}
                <div style={{ fontWeight: 600, fontSize: 12, color: '#f59e0b', marginBottom: 3, marginTop: 8 }}>Углублённые</div>
                {newNav.map(n => (
                    <a key={n.id} href={`#${n.id}`} onClick={() => setActiveNav(n.id)} style={{ display: 'block', padding: '4px 6px', borderRadius: 3, fontSize: 12, textDecoration: 'none', color: activeNav === n.id ? '#1e293b' : '#64748b', background: activeNav === n.id ? '#fef3c7' : 'transparent', marginBottom: 1, fontWeight: activeNav === n.id ? 600 : 400 }}>{n.t}</a>
                ))}
            </div>
            <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
                <AdminNav activePage="sensitivity-extended" />
                <h1 style={{ marginBottom: 4, color: '#1e293b', fontSize: 22 }}>🔬 Полный анализ чувствительности</h1>
                <p style={{ color: 'inherit', fontSize: 13, marginBottom: 20 }}>29 исследований на {d.totalTables} таблицах • Отсортировано по полезности • Данные из API в реальном времени</p>

                <Section01 recalc={recalc} />
                <Section02 />
                <Section03 />
                <Section04 d={d} />
                <Section05 />
                <Section06 />
                <Section07 d={d} />
                <Section08 />
                <Section09 d={d} />
                <Section10 d={d} />

                <div style={{ textAlign: 'center', padding: '12px 0 4px', color: '#8b5cf6', fontSize: 13, fontWeight: 700, borderTop: '2px solid #c4b5fd', marginTop: 16 }}>⬇️ Углублённый анализ: от отрывов до кластеров ⬇️</div>

                <Section11 />
                <Section12 />
                <Section13 />
                <Section14 d={d} />
                <Section15 d={d} />
                <Section16 d={d} />
                <Section17 d={d} />
                <Section18 d={d} />
                <Section19 d={d} />
                <Section20 />
                <Section21 />
                <Section22 />
                <Section23 />
                <Section24 />
                <Section25 />
                <Section26 />
                <Section27 d={d} />
                <Section28 d={d} />
                <Section29 />

                <div style={{ textAlign: 'center', padding: 16, color: 'inherit', fontSize: 12, borderTop: '1px solid #e2e8f0', marginTop: 12 }}>
                    {d.totalTables} таблиц • <a href="https://choser.org" style={{ color: '#6366f1' }}>choser.org</a> • API: /api/admin/decision/sensitivity-full
                </div>
            </div>
        </div>
    )
}
