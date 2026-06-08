import React from 'react'
import { S, Chart, Explain, KPI, b, b14 } from './shared.jsx'

export default function Section15({ d }) {
    return (
        <S id="s15" num={15} title="Что разрушительнее: ошибка в весах или в оценках?" isNew>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <KPI val={d.weightsVsGrades?.weightsNoisePct + '%'} lbl="Шум в весах (±20%)" color="#16a34a" />
                <KPI val={d.weightsVsGrades?.gradesNoisePct + '%'} lbl="Шум в оценках (±1 б.)" color="#ef4444" />
            </div>
            <Chart id="ch15" option={{...b,title:{text:'Шум весов vs шум оценок: что разрушительнее?',left:'center',textStyle:b14},
                legend:{bottom:0},
                xAxis:{type:'category',data:['Механизм ошибки']},
                yAxis:{type:'value',name:'% таблиц с ошибкой',max:20,axisLabel:{formatter:'{value}%'}},
                series:[
                    {name:'Шум весов ±20%',type:'bar',data:[d.weightsVsGrades?.weightsNoisePct||0],itemStyle:{color:'#16a34a'},barWidth:40,label:{show:true,position:'top',formatter:'{c}%',fontSize:14,fontWeight:'bold'}},
                    {name:'Шум оценок ±1 балл',type:'bar',data:[d.weightsVsGrades?.gradesNoisePct||0],itemStyle:{color:'#ef4444'},barWidth:40,label:{show:true,position:'top',formatter:'{c}%',fontSize:14,fontWeight:'bold'}}
                ]
            }} height={260} />
            <Explain>
                <b>📖 Как читать график:</b> Зелёный = ошибка в весах на ±20%. Красный = ошибка в оценке на ±1 балл.<br/>
                <b>📊 Результат:</b> Шум в весах ломает лишь {d.weightsVsGrades?.weightsNoisePct}% таблиц. Шум в оценках — {d.weightsVsGrades?.gradesNoisePct}%! Разница в {Math.round((d.weightsVsGrades?.gradesNoisePct||0)/(d.weightsVsGrades?.weightsNoisePct||1)*10)/10} раза.<br/>
                <b>💡 Практический вывод:</b> Качество AI-оценок — главное место для инвестиций в улучшение. Веса могут быть приблизительными.
            </Explain>
        </S>
    )
}
