import React from 'react'
import { S, Chart, Explain, b, b14 } from './shared.jsx'

export default function Section16({ d }) {
    const pt = d.paramTypes || []
    return (
        <S id="s16" num={16} title="Типы параметров: какие критерии чувствительнее к упрощению" isNew>
            <Chart id="ch16" option={{...b,title:{text:'Чувствительность по типу параметров',left:'center',textStyle:b14},
                tooltip:{trigger:'axis',formatter:ps=>{const i=ps[0]?.dataIndex;const t=pt[i];return t?t.type+': '+t.errorPct+'% ('+t.tables+' таблиц)':''}},
                xAxis:{type:'category',data:pt.map(r=>r.type)},
                yAxis:{type:'value',name:'P(ошибка)',max:35,axisLabel:{formatter:'{value}%'}},
                series:[{type:'bar',data:pt.map(r=>({value:r.errorPct,itemStyle:{color:r.errorPct>25?'#ef4444':r.errorPct>20?'#f59e0b':'#16a34a'}})),barWidth:50,label:{show:true,position:'top',formatter:p=>p.value+'%',color:'#1e293b',fontSize:13,fontWeight:'bold'}}]
            }} />
            <Explain>
                <b>📖 Как читать график:</b> Каждый столбец = группа таблиц по типу параметров. Высота = вероятность ошибки при упрощении.<br/>
                <b>📊 Что видим:</b> Финансовые наименее чувствительны (20.7%). «Прочие» — самые уязвимые (29.7%).<br/>
                <b>💡 Практический вывод:</b> Чем больше субъективных параметров — тем опаснее упрощение. Объективные критерии (цена, ГГц) — относительно безопасно.
            </Explain>
        </S>
    )
}
