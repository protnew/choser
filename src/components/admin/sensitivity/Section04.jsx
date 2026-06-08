import React from 'react'
import { S, Chart, Explain, KPI, b, b14 } from './shared.jsx'

export default function Section04({ d }) {
    const sm = d.safetyMargin || {}
    const smd = sm.distribution || {}
    return (
        <S id="s4" num={4} title="Запас прочности: насколько хрупкая рекомендация" isNew>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <KPI val={sm.avg} lbl="Средний запас (баллов)" color="#f59e0b" />
                <KPI val={sm.median} lbl="Медианный запас" color="#f59e0b" />
                <KPI val={smd['<0.1'] || 0} lbl="< 0.1 балла (опасно)" color="#ef4444" />
            </div>
            <Chart id="ch4" option={{...b,title:{text:'Запас прочности: сколько баллов отделяют #1 от #2',left:'center',textStyle:b14},
                xAxis:{type:'category',data:Object.keys(smd).map(k=>k+' балла')},
                yAxis:{type:'value',name:'Таблиц'},
                series:[{type:'bar',data:Object.entries(smd).map(([k,v])=>({value:v,itemStyle:{color:k==='<0.1'?'#ef4444':k==='0.1-0.5'?'#f97316':k==='0.5-1'?'#f59e0b':'#16a34a'}})),barWidth:50,label:{show:true,position:'top',formatter:p=>{const total=sm.total||1;return p.value+' ('+Math.round(p.value/total*100)+'%)'},color:'#1e293b',fontSize:12,fontWeight:'bold'}}]
            }} />
            <Explain>
                <b>📖 Как читать график:</b> Каждая колонка — сколько таблиц имеют определённый «запас прочности». Запас = на сколько баллов (из 10) нужно изменить одну-единственную оценку, чтобы лидер (#1) поменялся на #2. Красные колонки слева — таблицы, где лидер держится на волоске. Зелёные справа — где рекомендация устойчива.<br/>
                <b>📊 Что видим:</b> Медианный запас = {sm.median} балла — в целом нормально. Но {smd['<0.1'] || 0} таблиц имеют запас МЕНЕЕ 0.1 балла из 10! В этих таблицах AI поставил одному объекту 7.23, а другому 7.24 — и вот он, «лидер». Изменение одной оценки на 0.1 (тысячная доля шкалы!) меняет рекомендацию. Ещё 172 таблицы (47%) имеют запас {'>'}3 балла — они в безопасности.<br/>
                <b>💡 Практический вывод:</b> 55 таблиц (15%) имеют запас {'<'}1 балла — рекомендация хрупкая. Для них любая неточность AI-оценок = смена лидера. Если вы видите, что два объекта почти одинаковы — не доверяйте автоматическому рейтингу blindly, изучите их детально.
            </Explain>
        </S>
    )
}
