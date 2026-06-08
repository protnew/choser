import React from 'react'
import { S, Chart, Explain, b, b14 } from './shared.jsx'

export default function Section19({ d }) {
    const ent = d.entropy || []
    return (
        <S id="s19" num={19} title="Информационная энтропия Шеннона" isNew>
            <Chart id="ch19" option={{...b,title:{text:'Энтропия Шеннона vs чувствительность',left:'center',textStyle:b14},
                tooltip:{trigger:'axis',formatter:ps=>{const i=ps[0]?.dataIndex;const t=ent[i];return t?t.group+': '+t.errorPct+'% ('+t.tables+' таблиц)':''}},
                xAxis:{type:'category',data:ent.map(r=>r.group)},
                yAxis:{type:'value',name:'P(ошибка)',max:35,axisLabel:{formatter:'{value}%'}},
                series:[{type:'bar',data:ent.map(r=>({value:r.errorPct,itemStyle:{color:r.errorPct>25?'#ef4444':r.errorPct>15?'#f59e0b':'#16a34a'}})),barWidth:50,label:{show:true,position:'top',formatter:p=>(ent[p.dataIndex]?.errorPct||0)+'%\n('+(ent[p.dataIndex]?.tables||0)+' табл.)',color:'#1e293b',fontSize:12,fontWeight:'bold'}}]
            }} />
            <Explain>
                <b>📖 Как читать график:</b> Энтропия = мера «разбросанности» оценок. Низкая = все одинаковые. Высокая = сильно разбросаны.<br/>
                <b>📊 Парадокс:</b> Самая опасная — СРЕДНЯЯ энтропия (30.4% ошибок)! При низкой — лидер «случаен», но не меняется. При высокой — лидер устойчив. Средняя = самая опасная зона.<br/>
                <b>💡 Практический вывод:</b> 135 таблиц со средней энтропией — главная группа риска. Именно они требуют полной модели без упрощений.
            </Explain>
        </S>
    )
}
