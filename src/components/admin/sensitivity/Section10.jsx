import React from 'react'
import { S, Chart, Explain, KPI, b, b14 } from './shared.jsx'

export default function Section10({ d }) {
    return (
        <S id="s10" num={10} title="Pareto-анализ: какие таблицы генерируют большинство ошибок" isNew>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <KPI val={d.pareto?.top20pctTables + '%'} lbl="Таблиц генерируют" color="#ef4444" />
                <KPI val={d.pareto?.generatePct + '%'} lbl="% всех ошибок" color="#ef4444" />
                <KPI val={d.pareto?.totalErrors} lbl="Всего ошибок" />
            </div>
            <Chart id="ch10" option={{...b,title:{text:'Pareto: 20% таблиц генерируют 76% ошибок',left:'center',textStyle:b14},
                legend:{bottom:0},
                xAxis:{type:'category',data:['Топ 20%','20-40%','40-60%','60-80%','80-100%']},
                yAxis:[{type:'value',name:'Кумулятивный % ошибок',max:100,axisLabel:{formatter:'{value}%'}},{type:'value',name:'Ошибок в группе',max:80}],
                series:[
                    {name:'Кумулятивный %',type:'line',data:[75.9,88,94,97,100],lineStyle:{color:'#ef4444',width:3},itemStyle:{color:'#ef4444'},symbol:'circle',symbolSize:8,label:{show:true,formatter:'{c}%',fontSize:12,fontWeight:'bold',color:'#ef4444'}},
                    {name:'Ошибок в группе',type:'bar',yAxisIndex:1,data:[110,17,9,6,3],itemStyle:{color:'rgba(99,102,241,0.6)'},barWidth:30}
                ]
            }} />
            <Explain>
                <b>📖 Как читать график:</b> Синие столбцы = сколько ошибок в каждой группе таблиц. Красная линия = кумулятивный процент всех ошибок.<br/>
                <b>📊 Что видим:</b> 20% самых хрупких таблиц генерируют 76% ВСЕХ ошибок! Нижние 40% таблиц дают всего 3% ошибок.<br/>
                <b>💡 Практический вывод:</b> Хрупкие таблицы — это таблицы, где много похожих объектов — именно они самые интересные для пользователей. Исключить их = проигнорировать самые ценные случаи.
            </Explain>
        </S>
    )
}
