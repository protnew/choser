import React from 'react'
import { S, Chart, Explain, b, b14 } from './shared.jsx'

export default function Section18({ d }) {
    const wi = d.weightInequality || []
    return (
        <S id="s18" num={18} title="Что будет, если сделать все параметры одинаково важными">
            <Chart id="ch18" option={{...b, title:{text:'Неравенство весов → чувствительность к уравниванию',left:'center',textStyle:b14},
                grid:{left:140,right:30,top:40,bottom:20},
                xAxis:{type:'value',name:'P(ошибка)',max:10,axisLabel:{formatter:'{value}%'}},
                yAxis:{type:'category',data:wi.map(r=>r.group)},
                series:[{type:'bar',data:wi.map(r=>({value:r.errorPct,itemStyle:{color:r.errorPct>5?'#ef4444':'#16a34a'}})),barWidth:24,label:{show:true,position:'right',formatter:p=>p.value+'% ('+(wi[p.dataIndex]?.tables||0)+' табл.)',color:'#1e293b',fontSize:11}}]
            }} height={200} />
            <Explain>
                <b>📖 Как читать график:</b> Каждая строка = группа таблиц с разным уровнем неравенства весов (коэффициент Джини).<br/>
                <b>📊 Результат:</b> 98% таблиц имеют Джини {'>'} 0.3 — и у них 8.1% ошибок при уравнивании. Чем выше Джини — тем опаснее уравнивать веса.<br/>
                <b>💡 Практический вывод:</b> Уравнять веса = сказать «всё одинаково важно». Это не так. Уравнивание весов — это не упрощение, а искажение.
            </Explain>
        </S>
    )
}
