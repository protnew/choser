import React from 'react'
import { S, Chart, Explain, b, b14 } from './shared.jsx'

export default function Section03() {
    return (
        <S id="s3" num={3} title="Разбор конкретных случаев: где упрощение ломает рекомендацию">
            <Chart id="ch3" option={{...b, title:{text:'Топ-5 таблиц по потере точности',left:'center',textStyle:b14},
                grid:{left:150,right:20,top:40,bottom:20},
                xAxis:{type:'value',name:'% потери',max:100,axisLabel:{formatter:'{value}%'}},
                yAxis:{type:'category',data:['Гранты в Китае','1С ERP','Кинопоиск','Альфа Страхование','Woomhost VPS']},
                series:[{type:'bar',data:[{value:50,itemStyle:{color:'#f59e0b'}},{value:55,itemStyle:{color:'#f97316'}},{value:60,itemStyle:{color:'#ef4444'}},{value:78,itemStyle:{color:'#ef4444'}},{value:80,itemStyle:{color:'#dc2626'}}],barWidth:20,label:{show:true,position:'right',formatter:'{c}%',color:'#1e293b',fontSize:12}}]
            }} height={250} />
            <Explain>
                <b>📖 Как читать график:</b> Каждая строка — реальная таблица сравнения, созданная пользователем на Choser. Длина столбца — насколько упала точность при упрощении модели. 80% = в 4 из 5 проверок рекомендация стала ошибочной.<br/>
                <b>📊 Конкретные примеры:</b> «Woomhost VPS» — в полной модели Woomhost был лучшим благодаря низкой цене. При упрощении оценка «цена» исказилась (500 вместо 5), и рекомендация сломалась — пользователь мог купить неоптимальный хостинг. «Альфа Страхование» — 78% ошибок: «лучший» страховщик менялся при каждом варианте упрощения.<br/>
                <b>💡 Практический вывод:</b> Абстрактные «25% ошибок» — это конкретные люди, получившие плохой совет по выбору страховой, ERP или хостинга. Каждая ошибка = реальные деньги и реальный риск для бизнеса. Именно поэтому полная модель важна.
            </Explain>
        </S>
    )
}
