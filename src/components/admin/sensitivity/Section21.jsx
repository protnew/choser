import React from 'react'
import { S, Chart, Explain, b, b14 } from './shared.jsx'

export default function Section21() {
    return (
        <S id="s21" num={21} title="Корреляции между параметрами: какие параметры дублируют друг друга" isNew>
            <Chart id="ch21" option={{...b, title:{text:'Распределение парных корреляций между параметрами',left:'center',textStyle:b14},
                legend:{bottom:0}, tooltip:{trigger:'item',formatter:'{b}: {c} пар ({d}%)'},
                series:[{type:'pie',radius:['30%','60%'],center:['50%','48%'],data:[
                    {value:1658,name:'Слабая корреляция (|r|<0.4)',itemStyle:{color:'#16a34a'}},
                    {value:803,name:'Средняя (0.4-0.7)',itemStyle:{color:'#f59e0b'}},
                    {value:1067,name:'Сильная (>0.7)',itemStyle:{color:'#ef4444'}}
                ],label:{formatter:'{b}\n{c} пар ({d}%)',fontSize:11}}]
            }} height={300} />
            <Explain>
                <b>📖 Как читать график:</b> Для каждой таблицы посчитали корреляцию между всеми парами параметров. Зелёный = уникальные пары, красный = дублирующиеся.<br/>
                <b>📊 Что видим:</b> 47% пар — слабо связаны (уникальны). 30% — сильная корреляция — два параметра оценивают почти одно и то же.<br/>
                <b>💡 Практический вывод:</b> 30% параметров действительно дублируются — их можно убрать без потерь. Но нужна точность: сначала корреляционный анализ, потом удаление.
            </Explain>
        </S>
    )
}
