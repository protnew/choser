import React from 'react'
import { S, Chart, Explain, KPI, b, b14 } from './shared.jsx'

export default function Section27({ d }) {
    return (
        <S id="s27" num={27} title="Влияние аномальных оценок (outliers)" isNew>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <KPI val={d.outliers?.outlierTables} lbl="Таблиц с outliers" color="#ef4444" />
                <KPI val={d.outliers?.withOutliersPct + '%'} lbl="P(ошибка) с ними" color="#f59e0b" />
                <KPI val={d.outliers?.withoutOutliersPct + '%'} lbl="P(ошибка) без них" color="#16a34a" />
            </div>
            <Chart id="ch27" option={{...b,title:{text:'Влияние аномальных оценок на чувствительность',left:'center',textStyle:b14},
                legend:{bottom:0},
                xAxis:{type:'category',data:['С outliers','Без outliers']},
                yAxis:{type:'value',name:'P(ошибка)',max:30,axisLabel:{formatter:'{value}%'}},
                series:[{type:'bar',data:[
                    {value:d.outliers?.withOutliersPct||0,itemStyle:{color:'#ef4444'},name:'С outliers'},
                    {value:d.outliers?.withoutOutliersPct||0,itemStyle:{color:'#16a34a'},name:'Без outliers'}
                ],barWidth:60,label:{show:true,position:'top',formatter:'{c}%',color:'#1e293b',fontSize:14,fontWeight:'bold'}}]
            }} height={260} />
            <Explain>
                <b>📖 Что нашли:</b> {d.outliers?.outlierTables || 0} таблиц содержат аномальные оценки — значения {'>'}10 при шкале 1-10. Это «грязные» данные.<br/>
                <b>📊 Результат:</b> С outliers = {d.outliers?.withOutliersPct}%, без = {d.outliers?.withoutOutliersPct}%. Разница {((d.outliers?.withOutliersPct||0)-(d.outliers?.withoutOutliersPct||0)).toFixed(1)} п.п.<br/>
                <b>💡 Практический вывод:</b> Очистка данных — такая же важная задача, как правильная модель. Проверка на outliers должна быть автоматической.
            </Explain>
        </S>
    )
}
