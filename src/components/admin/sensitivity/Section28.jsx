import React from 'react'
import { S, Chart, Explain, b, b14 } from './shared.jsx'

export default function Section28({ d }) {
    return (
        <S id="s28" num={28} title="Динамика по времени: меняется ли качество данных">
            <Chart id="ch28" option={{...b, title:{text:'Чувствительность по времени создания таблиц',left:'center',textStyle:b14},
                tooltip:{trigger:'axis',formatter:ps=>{const i=ps[0]?.dataIndex;const t=(d.temporal||[])[i];return t?`${t.month}: ${t.errorPct}% (${t.n} таблиц)`:''}},
                xAxis:{type:'category',data:(d.temporal||[]).map(r=>r.month)},
                yAxis:{type:'value',name:'P(ошибка)',max:35,axisLabel:{formatter:'{value}%'}},
                series:[{type:'bar',data:(d.temporal||[]).map(r=>({value:r.errorPct,itemStyle:{color:r.errorPct>25?'#ef4444':'#16a34a'}})),barWidth:60,label:{show:true,position:'top',formatter:p=>(d.temporal?.[p.dataIndex]?.errorPct||0)+'%',color:'#1e293b',fontSize:14,fontWeight:'bold'}}]
            }} />
            <Explain>
                <b>📖 Как читать график:</b> По горизонтали — месяцы. По вертикали — вероятность ошибки при упрощении для таблиц этого месяца.<br/>
                <b>📊 Что видим:</b> Мартовские таблицы устойчивее — 11.5% vs 27.5% за февраль. Качество данных влияет на чувствительность.<br/>
                <b>💡 Практический вывод:</b> Качество данных со временем улучшается, но даже лучшие месяцы не достигают 5%. Цель — стабильно {'<'}10%.
            </Explain>
        </S>
    )
}
