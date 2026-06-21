import React from 'react'
import { S, Chart, Explain } from './shared.jsx'

export default function Section20() {
    return (
        <S id="s20" num={20} title="Доминирование: 74% объектов НИКОГДА не бывают #1" isNew>
            <Chart id="ch20" option={{textStyle:{fontFamily:'Inter,system-ui,sans-serif',fontSize:12,color:'#64748b'},title:{text:'Доля объектов, которые никогда не становятся #1',left:'center',textStyle:{fontSize:14,color:'#1e293b'}},
                tooltip:{trigger:'item',formatter:'{b}: {c} ({d}%)'},
                series:[{type:'pie',radius:['35%','65%'],center:['50%','48%'],data:[
                    {value:2102,name:'Никогда не #1',itemStyle:{color:'#94a3b8'}},
                    {value:2826-2102,name:'Бывает #1',itemStyle:{color:'#6366f1'}}
                ],label:{formatter:'{b}\n{c} ({d}%)',fontSize:12}}]
            }} height={300} />
            <Explain>
                <b>📖 Что посчитали:</b> Перебрали все комбинации упрощений. Для каждого объекта проверили — бывает ли он #1 хотя бы при одной комбинации.<br/>
                <b>📊 Результат:</b> 2102 объекта из 2826 (74.4%) НИКОГДА не бывают #1. Только 26% «спорят» за первое место.<br/>
                <b>💡 Практический вывод:</b> В таблице из 10 объектов — 2-3 спорят за топ, остальные не имеют шансов. Чувствительность модели — про конкуренцию между этими 2-3.
            </Explain>
        </S>
    )
}
