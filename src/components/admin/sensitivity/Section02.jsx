import React from 'react'
import { S, Chart, Explain, b, b14 } from './shared.jsx'

export default function Section02() {
    return (
        <S id="s2" num={2} title="ROI: цена ошибки упрощения в деньгах">
            <Chart id="ch2" option={{...b, title:{text:'ROI: цена ошибки упрощения (млн ₽/год при 28%)',left:'center',textStyle:b14},
                legend:{bottom:0,textStyle:{fontSize:11}},
                xAxis:{type:'category',data:['ERP','BI','CRM','VPS']},
                yAxis:{type:'value',name:'млн ₽'},
                series:[
                    {name:'Сохраняется',type:'bar',stack:'a',data:[3.6,2.16,1.08,0.36],itemStyle:{color:'#16a34a'}},
                    {name:'Теряется',type:'bar',stack:'a',data:[1.4,0.84,0.42,0.14],itemStyle:{color:'#ef4444'},label:{show:true,position:'top',formatter:'-{c} млн',color:'#ef4444',fontSize:11}}
                ]}} height={280} />
            <Explain>
                <b>📖 Как читать график:</b> Каждый столбец = тип корпоративного решения (ERP, BI, CRM, VPS). Зелёная часть — ценность правильного выбора. Красная — сколько теряется из-за ошибочной рекомендации при 28% вероятности ошибки (уровень «среднего упрощения»).<br/>
                <b>📊 Что видим:</b> ERP-решение за 5 млн ₽ — при ошибке компания теряет 1.4 млн ₽/год. BI за 3 млн — потеря 0.84 млн. Даже «дешёвый» VPS за 500K приносит убыток 140K. Цифры основаны на реальной вероятности ошибки 28% (из 367 тестовых таблиц).<br/>
                <b>💡 Практический вывод:</b> «28% ошибок» звучит абстрактно. «1.4 миллиона в год на ERP» — конкретно. Полная модель Choser окупается на первом же правильном решении. Для компании с 5+ решениями в год — это десятки миллионов сохранённых средств.
            </Explain>
        </S>
    )
}
