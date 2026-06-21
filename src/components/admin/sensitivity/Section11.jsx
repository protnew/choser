import React from 'react'
import { S, Chart, Explain, b, b14 } from './shared.jsx'

export default function Section11() {
    return (
        <S id="s11" num={11} title="Отрывы между #1 и #2: насколько плотная конкуренция" isNew>
            <Chart id="ch11" option={{...b, title:{text:'Распределение отрыва между #1 и #2 (баллы из 10)',left:'center',textStyle:b14},
                xAxis:{type:'category',data:['<0.1','0.1-0.5','0.5-1','1-2','2-5','>5']},
                yAxis:{type:'value',name:'Таблиц'},
                series:[{type:'bar',data:[38,98,104,74,32,18].map((v,i)=>({value:v,itemStyle:{color:i===0?'#ef4444':i<3?'#f59e0b':'#16a34a'}})),barWidth:50,label:{show:true,position:'top',formatter:p=>p.value+' табл.',color:'#1e293b',fontSize:12}}]
            }} />
            <Explain>
                <b>📖 Как читать график:</b> Каждый столбец = сколько таблиц имеют определённый отрыв между #1 и #2 (в баллах из 10). Красные = отрыв минимальный. Зелёные = лидер с большим отрывом.<br/>
                <b>📊 Что видим:</b> 38 таблиц — отрыв менее 0.1 балла! Ещё 98 — 0.1-0.5 балла. Итого 136 таблиц (37%) — лидер определяется десятыми долями балла.<br/>
                <b>💡 Практический вывод:</b> В трети таблиц конкуренция настолько плотная, что лидер определяется десятыми долями балла. Любая неточность меняет результат.
            </Explain>
        </S>
    )
}
