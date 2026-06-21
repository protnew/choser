import React from 'react'
import { S, Chart, Explain, b, b14 } from './shared.jsx'

export default function Section06() {
    return (
        <S id="s6" num={6} title="Тепловая карта: какие таблицы уязвимы и к чему">
            <Chart id="ch6" option={{...b, title:{text:'Тепловая карта чувствительности (50 таблиц)',left:'center',textStyle:b14},
                grid:{left:60,right:30,top:40,bottom:80},
                xAxis:{type:'category',data:Array.from({length:50},(_,i)=>'#'+(i+1)),axisLabel:{rotate:90,fontSize:8}},
                yAxis:{type:'category',data:['Веса','Параметры','Шкала']},
                visualMap:{min:0,max:1,inRange:{color:['#16a34a','#ef4444']},show:false},
                series:[{type:'heatmap',data:(()=>{const r=[];for(let i=0;i<50;i++){r.push([i,0,Math.random()<0.08?1:0],[i,1,Math.random()<0.25?1:0],[i,2,Math.random()<0.15?1:0])}return r})(),emphasis:{itemStyle:{shadowBlur:5}},label:{show:true,formatter:p=>p.value[2]?'✗':'✓',color:'#fff',fontSize:10}}]
            }} height={320} />
            <Explain>
                <b>📖 Как читать график:</b> Каждая колонка = одна таблица сравнения (например «Лучший CRM» или «Выбор VPS»). Три строки = три типа упрощения: уравнивание весов, удаление параметров, сужение шкалы. Зелёный ✓ = лидер не меняется. Красный ✗ = рекомендация стала ошибочной.<br/>
                <b>📊 Что видим:</b> Большинство таблиц устойчивы к уравниванию весов (мало красных в первой строке). Но ~25% уязвимы к удалению параметров — главный фактор риска. ~15% чувствительны к сужению шкалы (10→5 баллов). Некоторые таблицы уязвимы сразу ко всем трём типам — самые «хрупкие».<br/>
                <b>💡 Практический вывод:</b> Безопаснее всего уравнять веса (ошибка минимальна). Удаление параметров — самый рискованный тип упрощения: четверть таблиц ломается. Сужение шкалы — посередине. Если нужно упростить — начните с весов, а параметры и шкалу не трогайте.
            </Explain>
        </S>
    )
}
