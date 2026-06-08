import React from 'react'
import { S, Chart, Explain, b, b14 } from './shared.jsx'

export default function Section14({ d }) {
    const oc = d.objectCount || []
    return (
        <S id="s14" num={14} title="Эффект количества объектов: сколько альтернатив — столько проблем">
            <Chart id="ch14" option={{...b, title:{text:'Чувствительность по количеству объектов',left:'center',textStyle:b14},
                tooltip:{trigger:'axis',formatter:ps=>{const i=ps[0]?.dataIndex;const t=oc[i];return t?`${t.group}: ${t.errorPct}% (${t.tables} таблиц)`:''}},
                xAxis:{type:'category',data:oc.map(r=>r.group)},
                yAxis:{type:'value',name:'P(ошибка)',max:35,axisLabel:{formatter:'{value}%'}},
                series:[{type:'bar',data:oc.map(r=>({value:r.errorPct,itemStyle:{color:r.errorPct>28?'#ef4444':r.errorPct>20?'#f59e0b':'#16a34a'}})),barWidth:50,label:{show:true,position:'top',formatter:p=>p.value+'%',color:'#1e293b',fontSize:13,fontWeight:'bold'}}]
            }} />
            <Explain>
                <b>📖 Как читать график:</b> Каждая группа = таблицы с определённым числом альтернатив. Высота = вероятность ошибки при упрощении.<br/>
                <b>📊 Что видим:</b> 11-20 объектов — самые уязвимые (30.2%). 3 объекта — тоже риск (23.5%). Оптимально — 4-10 объектов.<br/>
                <b>💡 Практический вывод:</b> Чем больше альтернатив — тем точнее нужна модель. Если у вас много объектов — не удаляйте параметры и не уменьшайте шкалу.
            </Explain>
        </S>
    )
}
