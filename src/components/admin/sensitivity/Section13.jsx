import React from 'react'
import { S, Chart, Explain, b, b14 } from './shared.jsx'

export default function Section13() {
    return (
        <S id="s13" num={13} title="Чувствительность по категориям: какие темы самые уязвимые" isNew>
            <Chart id="ch13" option={{...b, title:{text:'Вероятность ошибки по тематике таблицы',left:'center',textStyle:b14},
                grid:{left:140,right:20,top:40,bottom:20},
                xAxis:{type:'value',name:'P(ошибка)',max:55,axisLabel:{formatter:'{value}%'}},
                yAxis:{type:'category',data:['Прочее','IT инфраструктура','Бизнес-софт','Гаджеты','Финансы','Обучение','Безопасность','Путешествия']},
                series:[{type:'bar',data:[25.6,34.6,23.8,17.6,50,9.1,0,0].map(v=>({value:v,itemStyle:{color:v>30?'#ef4444':v>20?'#f59e0b':'#16a34a'}})),barWidth:20,label:{show:true,position:'right',formatter:p=>p.value+'%',color:'#1e293b',fontSize:12,fontWeight:'bold'}}]
            }} height={300} />
            <Explain>
                <b>📖 Как читать график:</b> Каждая строка = тематика таблицы. Длина столбца = вероятность ошибки при упрощении.<br/>
                <b>📊 Что видим:</b> Финансы — самые уязвимые (50% ошибок!). IT-инфраструктура — 34.6%. Безопасность и путешествия — 0%.<br/>
                <b>💡 Практический вывод:</b> Финансовые и IT-решения требуют полной модели без упрощений. Гаджеты, путешествия — можно упростить без потерь.
            </Explain>
        </S>
    )
}
