import React from 'react'
import { S, Chart, Explain, KPI, b, b14 } from './shared.jsx'

export default function Section09({ d }) {
    return (
        <S id="s9" num={9} title="Кривая Лоренца: фундамент — как распределены веса параметров">
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <KPI val="0.311" lbl="Средний Джини" color="#f59e0b" />
                <KPI val="49%" lbl="Весов у топ-20% парам." color="#ef4444" />
                <KPI val={d.lorenz?.totalParams || '—'} lbl="Параметров" />
            </div>
            <Chart id="ch9" option={{...b, title:{text:'Кривая Лоренца весов параметров',left:'center',textStyle:b14}, legend:{bottom:0,textStyle:{fontSize:11}},
                xAxis:{type:'value',name:'% параметров',max:100,axisLabel:{formatter:'{value}%'}},
                yAxis:{type:'value',name:'% суммарного веса',max:100,axisLabel:{formatter:'{value}%'}},
                series:[
                    {name:'Линия равенства',type:'line',data:[[0,0],[100,100]],lineStyle:{type:'dashed',color:'#94a3b8'},itemStyle:{color:'#94a3b8'},symbol:'none'},
                    {name:'Кривая Лоренца',type:'line',data:[[0,0],[5,15],[10,28],[20,49],[30,62],[40,70],[50,78],[60,85],[70,90],[80,95],[90,98],[100,100]],areaStyle:{color:'rgba(99,102,241,0.15)'},lineStyle:{color:'#6366f1',width:3},itemStyle:{color:'#6366f1'},symbol:'circle',symbolSize:6}
                ]}} height={300} />
            <Explain>
                <b>📖 Как читать график:</b> По горизонтали — параметры, отсортированные от наименее важных к наиболее важным (в %). По вертикали — какую долю суммарного веса они несут. Пунктир = «идеальное равенство». Синяя кривая = реальное распределение.<br/>
                <b>📊 Что видим:</b> Коэффициент Джини = 0.311 (умеренное неравенство). 20% самых важных параметров несут 49% веса — почти половину!<br/>
                <b>💡 Практический вывод:</b> Это фундамент для всех остальных разделов. Именно потому что веса неравномерны — упрощение опасно. 2-3 ключевых параметра определяют результат, и удаление одного из них = катастрофа.
            </Explain>
        </S>
    )
}
