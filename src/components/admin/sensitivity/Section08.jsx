import React from 'react'
import { S, Chart, Explain, KPI, b, b14 } from './shared.jsx'

export default function Section08() {
    return (
        <S id="s8" num={8} title="Монте-Карло: сколько шума выдерживают оценки">
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <KPI val="9%" lbl="Шум ±0.5 балла" color="#16a34a" />
                <KPI val="12.8%" lbl="Шум ±1 балл" color="#f59e0b" />
                <KPI val="19.9%" lbl="Шум ±2 балла" color="#ef4444" />
            </div>
            <Chart id="ch8" option={{...b, title:{text:'Монте-Карло: влияние случайного шума в оценках на рекомендацию',left:'center',textStyle:b14},
                xAxis:{type:'category',data:['±0.5 балла','±1 балл','±2 балла']},
                yAxis:{type:'value',name:'% таблиц с ошибкой',max:25,axisLabel:{formatter:'{value}%'}},
                series:[{type:'bar',data:[{value:9,itemStyle:{color:'#16a34a'}},{value:12.8,itemStyle:{color:'#f59e0b'}},{value:19.9,itemStyle:{color:'#ef4444'}}],barWidth:60,label:{show:true,position:'top',formatter:'{c}%',color:'#1e293b',fontSize:14,fontWeight:'bold'},markLine:{data:[{yAxis:10,name:'10% порог',lineStyle:{color:'#ef4444',type:'dashed'}}]}}]
            }} />
            <Explain>
                <b>📖 Как читать график:</b> По горизонтали — величина случайной ошибки в оценках (±0.5, ±1, ±2 балла из 10). По вертикали — какой процент таблиц меняют лидера из-за этого шума. Красная пунктирная линия = порог 10%.<br/>
                <b>📊 Что видим:</b> Ошибка в полбалла (±0.5) — всего 9% таблиц ломаются, это допустимо. Но ошибка в 1 балл → 12.8% — уже выше порога. А ошибка в 2 балла → каждый пятый (19.9%)!<br/>
                <b>💡 Практический вывод:</b> 10-балльная шкала даёт запас прочности: шум в 1 балл «стоит» 12.8% ошибок. При 5-балльной шкале эта же ошибка «стоит» ~20%. Чем больше градаций — тем меньше цена отдельной неточности.
            </Explain>
        </S>
    )
}
