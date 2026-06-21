import React from 'react'
import { S, Chart, Explain } from './shared.jsx'

export default function Section23() {
    return (
        <S id="s23" num={23} title="Концентрация весов: сколько параметров реально решают исход" isNew>
            <Chart id="ch23" option={{textStyle:{fontFamily:'Inter,system-ui,sans-serif',fontSize:12,color:'#64748b'},title:{text:'Сколько параметров несут более 50% суммарного веса',left:'center',textStyle:{fontSize:14,color:'#1e293b'}},
                tooltip:{trigger:'item',formatter:'{b}: {c} таблиц ({d}%)'},
                series:[{type:'pie',radius:['30%','60%'],center:['50%','48%'],data:[
                    {value:19,name:'1 параметр доминирует (>50% веса)',itemStyle:{color:'#ef4444'}},
                    {value:49,name:'2 параметра (>60% веса)',itemStyle:{color:'#f59e0b'}},
                    {value:299,name:'3+ параметра',itemStyle:{color:'#16a34a'}}
                ],label:{formatter:'{b}\n{c} табл.',fontSize:11}}]
            }} height={300} />
            <Explain>
                <b>📖 Как читать график:</b> Для каждой таблицы посчитали, сколько параметров несят львиную долю (50%+) суммарного веса.<br/>
                <b>📊 Что видим:</b> 82% таблиц (299) — нужно минимум 3 параметра, иначе теряется значимая часть критериев.<br/>
                <b>💡 Практический вывод:</b> В 82% таблиц нужно учитывать минимум 3 параметра. Удаление любого из двух ключевых = потеря большей части информации.
            </Explain>
        </S>
    )
}
