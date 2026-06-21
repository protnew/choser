import React from 'react'
import { S, Chart, Explain, KPI } from './shared.jsx'

export default function Section17({ d }) {
    const disp = d.displacement || {}
    return (
        <S id="s17" num={17} title="Куда падает лидер при упрощении" isNew>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <KPI val={disp['1→2'] || '?'} lbl="#1 упал на #2" color="#f59e0b" />
                <KPI val={disp['1→3'] || '?'} lbl="#1 упал на #3" color="#f97316" />
                <KPI val={disp['1→4+'] || '?'} lbl="#1 вылетел из топ-3" color="#ef4444" />
                <KPI val={disp['стабилен'] || '?'} lbl="Стабилен" color="#16a34a" />
            </div>
            <Chart id="ch17" option={{textStyle:{fontFamily:'Inter,system-ui,sans-serif',fontSize:12,color:'#64748b'},title:{text:'Куда падает лидер (#1) при 50% упрощении',left:'center',textStyle:{fontSize:14,color:'#1e293b'}},
                legend:{bottom:0,textStyle:{fontSize:11}},tooltip:{trigger:'item',formatter:'{b}: {c} ({d}%)'},
                series:[{type:'pie',radius:['35%','65%'],center:['50%','48%'],data:[
                    {value:disp['стабилен']||0,name:'Стабилен',itemStyle:{color:'#16a34a'}},
                    {value:disp['1→2']||0,name:'#1 → #2',itemStyle:{color:'#f59e0b'}},
                    {value:disp['1→3']||0,name:'#1 → #3',itemStyle:{color:'#f97316'}},
                    {value:disp['1→4+']||0,name:'#1 → #4+',itemStyle:{color:'#ef4444'}}
                ],label:{formatter:'{b}\n{c} табл.',fontSize:11},emphasis:{itemStyle:{shadowBlur:10}}}]
            }} />
            <Explain>
                <b>📖 Как читать график:</b> Круговая диаграмма: что происходит с лидером (#1) при 50% упрощении.<br/>
                <b>📊 Что видим:</b> {disp['стабилен'] || '?'} таблиц (75%) — лидер стабилен. Но из {disp['1→2'] || '?'} с ошибкой: 70% — лидер упал на #2, 22% — полностью вылетел из топ-3.<br/>
                <b>💡 Практический вывод:</b> «Вылетел из топ-3» = неправильный сервис даже не попадёт в финальный список. Это не «немного неточно», это «полностью неправильно».
            </Explain>
        </S>
    )
}
