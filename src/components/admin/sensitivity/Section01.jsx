import React from 'react'
import { S, Explain } from './shared.jsx'

export default function Section01({ recalc }) {
    return (
        <S id="s1" num={1} title="Калькулятор цены ошибки">
            <div style={{ background: '#fff', borderRadius: 8, padding: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div><label style={{ display: 'block', color: 'inherit', fontSize: 12, marginBottom: 3 }}>Отрасль</label>
                        <select id="cS" onChange={recalc} style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 4, background: '#f8fafc' }}>
                            <option value="5">ERP (5 млн ₽)</option><option value="3">BI (3 млн ₽)</option><option value="1.5" selected>CRM (1.5 млн)</option><option value="0.8">Мессенджер (800K)</option><option value="0.5">VPS (500K)</option>
                        </select></div>
                    <div><label style={{ display: 'block', color: 'inherit', fontSize: 12, marginBottom: 3 }}>Решений в год</label>
                        <input type="number" id="cY" defaultValue="5" min="1" onChange={recalc} style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 4, background: '#f8fafc' }} /></div>
                    <div><label style={{ display: 'block', color: 'inherit', fontSize: 12, marginBottom: 3 }}>Упрощение</label>
                        <select id="cL" onChange={recalc} style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 4, background: '#f8fafc' }}>
                            <option value="0">Без (0%)</option><option value="8">Лёгкое (25%)</option><option value="28" selected>Среднее (50%)</option><option value="51">Радикальное (100%)</option>
                        </select></div>
                </div>
                <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ color: 'inherit', fontSize: 12, marginBottom: 4 }}>Ожидаемые потери</div>
                    <div id="cR" style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>—</div>
                    <div id="cD" style={{ color: 'inherit', fontSize: 12, marginTop: 4 }}></div>
                </div>
            </div>
            <Explain>
                <b>📖 Как пользоваться:</b> Выберите отрасль (стоимость неправильного решения), количество решений в год и уровень упрощения модели. Калькулятор покажет ожидаемые финансовые потери от ошибочных рекомендаций. Формула: Потери = Стоимость решения × Вероятность ошибки × Количество решений.<br/>
                <b>📊 Что показывают цифры:</b> Например, при выборе CRM за 1.5 млн ₽, 5 решений в год и среднем упрощении (50%) — ожидаемые потери составят 2.1 млн ₽/год. Это не теоретическая цифра: 28% таблиц при 50% упрощении дают ошибочную рекомендацию, и каждое ошибочное решение стоит полной стоимости.<br/>
                <b>💡 Практический вывод:</b> Попробуйте разные комбинации. Увеличьте упрощение до «радикального» — увидите как потери растут экспоненциально. Уменьшите до «лёгкого» — потери падают, но не исчезают. Единственный способ обнулить потери — не упрощать модель (0%).
            </Explain>
        </S>
    )
}
