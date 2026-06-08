import React from 'react';

export default function TableReliabilitySummary({ tables }) {
    if (!tables || !tables.length) return null;
    
    let rPrice = 0, urPrice = 0;
    let rNoPrice = 0, urNoPrice = 0;
    
    let tScorePrice = 0, tScoreNoPrice = 0;
    let tCountPrice = 0, tCountNoPrice = 0;

    let reliablePrices = [];
    let unreliablePrices = [];
    let reliableNoPrices = [];
    let unreliableNoPrices = [];

    let evsiMetPrice = 0;
    let evsiMetNoPrice = 0;

    tables.forEach(t => {
        const count = t.scores ? t.scores.length : 0;
        const isR = count >= 30;

        let meetsEvsi = false;
        if (count >= 3) {
            let ev1 = 0, ev2 = 0;
            const sorted = [...t.scores].sort((a,b)=>a-b);
            for(let i=0; i<count; i++) {
                ev1 += sorted[i] * (((i+1)/count) - (i/count));
                ev2 += sorted[i] * (Math.pow((i+1)/count, 2) - Math.pow(i/count, 2));
            }
            if ((ev2 - ev1) * 10000 < 250) meetsEvsi = true;
        }

        if (t.hasPrices) {
            if (isR) { rPrice++; reliablePrices.push({ title: t.title, count }); }
            else { urPrice++; unreliablePrices.push({ title: t.title, count }); }
            if (meetsEvsi) evsiMetPrice++;
            tCountPrice++;
            tScorePrice += count;
        } else {
            if (isR) { rNoPrice++; reliableNoPrices.push({ title: t.title, count }); }
            else { urNoPrice++; unreliableNoPrices.push({ title: t.title, count }); }
            if (meetsEvsi) evsiMetNoPrice++;
            tCountNoPrice++;
            tScoreNoPrice += count;
        }
    });

    const sortByCount = (a, b) => b.count - a.count;
    reliablePrices.sort(sortByCount);
    unreliablePrices.sort(sortByCount);
    reliableNoPrices.sort(sortByCount);
    unreliableNoPrices.sort(sortByCount);

    const renderTop3 = (list, color) => (
        list.slice(0, 3).map((item, idx) => (
            <div key={idx} style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)', marginBottom: '4px' }} title={item.title}>
                <span style={{ color, marginRight: '4px' }}>■</span>
                {item.title} (N={item.count})
            </div>
        ))
    );

    const totPrice = rPrice + urPrice;
    const totNoPrice = rNoPrice + urNoPrice;
    
    const avgElemsPrice = totPrice ? Math.round(tScorePrice / totPrice) : 0;
    const avgElemsNoPrice = totNoPrice ? Math.round(tScoreNoPrice / totNoPrice) : 0;

    return (
        <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '80px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-color)', fontSize: '18px' }}>9. Аналитика достоверности данных таблиц</h3>
            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                
                <div style={{ flex: '1', minWidth: '350px', background: 'var(--bg-card-alt, rgba(0,0,0,0.02))', padding: '20px', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-color)', fontSize: '15px' }}>С ценами (Всего: {totPrice} таблиц)</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <span style={{color: '#059669', fontWeight: 'bold'}}>Достоверно (N≥30): {rPrice}</span>
                        <span style={{color: '#f87171'}}>Мало данных: {urPrice}</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: '#e5e7eb', borderRadius: '5px', marginTop: '10px', overflow: 'hidden', display: 'flex', marginBottom: '16px' }}>
                        <div style={{ width: `${totPrice ? (rPrice/totPrice)*100 : 0}%`, height: '100%', background: '#10b981' }}></div>
                        <div style={{ width: `${totPrice ? (urPrice/totPrice)*100 : 0}%`, height: '100%', background: '#f87171' }}></div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>Объектов: <strong>{tScorePrice.toLocaleString()}</strong></div>
                        <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>Сред. размер: <strong>~{avgElemsPrice}</strong></div>
                        <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', gridColumn: 'span 2' }}>
                            <span style={{color: '#3b82f6'}}>ℹ️ {rPrice} из {totPrice} таблиц ({totPrice ? Math.round((rPrice/totPrice)*100) : 0}%) имеют N≥30 — пригодны для ML. Остальные {urPrice} слишком малы.</span>
                        </div>
                        <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', gridColumn: 'span 2' }}>
                            <span style={{color: '#8b5cf6'}}>💡 EVSI: <strong>{evsiMetPrice} из {totPrice}</strong> достигли оптимума. <strong>{totPrice - evsiMetPrice}</strong> — доращивать выборку рентабельно.</span>
                        </div>
                    </div>
                    
                    <div style={{ marginTop: '16px', display: 'flex', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#059669', marginBottom: '8px' }}>Топ 3 достоверных</div>
                            {reliablePrices.length ? renderTop3(reliablePrices, '#10b981') : <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Нет данных</div>}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#f87171', marginBottom: '8px' }}>Топ 3 недостоверных</div>
                            {unreliablePrices.length ? renderTop3(unreliablePrices, '#f87171') : <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Нет данных</div>}
                        </div>
                    </div>
                </div>

                <div style={{ flex: '1', minWidth: '350px', background: 'var(--bg-card-alt, rgba(0,0,0,0.02))', padding: '20px', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-color)', fontSize: '15px' }}>Без цен (Всего: {totNoPrice} таблиц)</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <span style={{color: '#059669', fontWeight: 'bold'}}>Достоверно (N≥30): {rNoPrice}</span>
                        <span style={{color: '#f87171'}}>Мало данных: {urNoPrice}</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: '#e5e7eb', borderRadius: '5px', marginTop: '10px', overflow: 'hidden', display: 'flex', marginBottom: '16px' }}>
                        <div style={{ width: `${totNoPrice ? (rNoPrice/totNoPrice)*100 : 0}%`, height: '100%', background: '#10b981' }}></div>
                        <div style={{ width: `${totNoPrice ? (urNoPrice/totNoPrice)*100 : 0}%`, height: '100%', background: '#f87171' }}></div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>Объектов: <strong>{tScoreNoPrice.toLocaleString()}</strong></div>
                        <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>Сред. размер: <strong>~{avgElemsNoPrice}</strong></div>
                        <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', gridColumn: 'span 2' }}>
                            <span style={{color: '#3b82f6'}}>ℹ️ {rNoPrice} из {totNoPrice} таблиц ({totNoPrice ? Math.round((rNoPrice/totNoPrice)*100) : 0}%) имеют N≥30 — пригодны для ML. Остальные {urNoPrice} слишком малы.</span>
                        </div>
                        <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', gridColumn: 'span 2' }}>
                            <span style={{color: '#8b5cf6'}}>💡 EVSI: <strong>{evsiMetNoPrice} из {totNoPrice}</strong> достигли оптимума. <strong>{totNoPrice - evsiMetNoPrice}</strong> — доращивать выборку рентабельно.</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#059669', marginBottom: '8px' }}>Топ 3 достоверных</div>
                            {reliableNoPrices.length ? renderTop3(reliableNoPrices, '#10b981') : <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Нет данных</div>}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#f87171', marginBottom: '8px' }}>Топ 3 недостоверных</div>
                            {unreliableNoPrices.length ? renderTop3(unreliableNoPrices, '#f87171') : <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Нет данных</div>}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
