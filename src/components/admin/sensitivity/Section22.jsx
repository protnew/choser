import React from 'react'
import { S, Chart, Explain, b, b14 } from './shared.jsx'

export default function Section22() {
    return (
        <S id="s22" num={22} title="Точность vs сложность: сколько параметров и баллов реально нужно" isNew>
            <Chart id="ch22" option={{...b, title:{text:'Точность (%) в зависимости от числа параметров и шкалы',left:'center',textStyle:b14},
                legend:{bottom:0,textStyle:{fontSize:11}},
                grid:{left:60,right:20,top:40,bottom:50},
                xAxis:{type:'category',data:['3 параметра','5 параметров','7 параметров','10 параметров']},
                yAxis:{type:'value',name:'P(ошибка)',max:40,axisLabel:{formatter:'{value}%'}},
                series:[
                    {name:'Шкала 2',type:'bar',data:[33.8,25.6,23.7,23.2],itemStyle:{color:'#ef4444'}},
                    {name:'Шкала 5',type:'bar',data:[32.2,22.9,19.3,15.5],itemStyle:{color:'#f59e0b'}},
                    {name:'Шкала 10',type:'bar',data:[27.5,12.8,11.7,7.1],itemStyle:{color:'#16a34a'}}
                ]
            }} height={320} />
            <Explain>
                <b>📖 Как читать график:</b> По горизонтали — сколько параметров оставляем. Каждая группа = разная шкала (2, 5, 10 баллов).<br/>
                <b>📊 Что видим:</b> 3 параметра + шкала 2 = 33.8% ошибок. 10 параметров + шкала 10 = всего 7.1%. Самый большой скачок даёт шкала: переход от 2 к 10 снижает ошибки на 16-20 п.п.<br/>
                <b>💡 Практический вывод:</b> Вкладывайте в шкалу (10 баллов), а не в количество параметров. 5 параметров × 10 баллов лучше, чем 10 параметров × 2 балла.
            </Explain>
        </S>
    )
}
