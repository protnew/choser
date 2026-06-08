import React from 'react'
import { S, Chart, Explain, KPI } from './shared.jsx'

export default function Section07({ d }) {
    return (
        <S id="s7" num={7} title="Спорные таблицы: где лидер случаен" isNew>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <KPI val={d.borderline?.count || '?'} lbl="Спорных таблиц" color="#f59e0b" />
                <KPI val={d.borderline?.pct + '%'} lbl="% от всех" color="#f59e0b" />
                <KPI val={d.borderline?.errorShare + '%'} lbl="% всех ошибок от них" color="#ef4444" />
            </div>
            <Chart id="ch7" option={{textStyle:{fontFamily:'Inter,system-ui,sans-serif',fontSize:12,color:'#64748b'},title:{text:'Спорные таблицы: где #1 и #2 разделены десятыми долями балла',left:'center',textStyle:{fontSize:14,color:'#1e293b'}},
                tooltip:{trigger:'item',formatter:'{b}: {c} ({d}%)'},
                series:[{type:'pie',radius:['40%','70%'],center:['50%','48%'],data:[
                    {value:d.borderline?.count||0,name:'Спорные (gap<0.5)',itemStyle:{color:'#f59e0b'}},
                    {value:d.totalTables-(d.borderline?.count||0),name:'Устойчивые',itemStyle:{color:'#16a34a'}}
                ],label:{formatter:'{b}\n{c} ({d}%)',fontSize:12},emphasis:{itemStyle:{shadowBlur:10}}}],
                graphic:[{type:'text',left:'center',top:'44%',style:{text:(d.borderline?.errorShare||0)+'%\nошибок',textAlign:'center',fontSize:16,fontWeight:'bold',fill:'#ef4444'}}]
            }} />
            <Explain>
                <b>📖 Как читать график:</b> Кольцевая диаграмма: жёлтая часть = «спорные» таблицы, где #1 и #2 разделены менее 0.5 балла из 10. Зелёная = «устойчивые», где лидер очевиден. В центре — процент всех ошибок, которые приходятся на спорные таблицы.<br/>
                <b>📊 Что видим:</b> {d.borderline?.count || '?'} таблиц ({d.borderline?.pct}%) — спорные: два объекта практически одинаковы, лидер определяется сотыми долями балла. И именно эти спорные таблицы генерируют {d.borderline?.errorShare}% ВСЕХ ошибок!<br/>
                <b>💡 Практический вывод:</b> Спорные таблицы — не «плохие данные», а реальность выбора (объекты действительно похожи). Упрощение не «выявляет» ошибку в таких таблицах — оно создаёт её из ничего. Если у вас спорная таблица — НЕ упрощайте, а наоборот, добавьте ещё один параметр, чтобы создать устойчивый отрыв.
            </Explain>
        </S>
    )
}
