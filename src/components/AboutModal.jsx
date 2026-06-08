import React from 'react';

function AboutModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
            <div className="modal" style={{ width: '600px', lineHeight: '1.6', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <h2 style={{ marginBottom: '20px', color: '#0056b3' }}>О проекте Choser</h2>
                <div style={{ fontSize: '14px', color: '#333' }}>
                    <p><b>Choser</b> — это инструмент для осознанного выбора на основе данных, а не интуиции или "галлюцинаций" ИИ.</p>
                    <p>В отличие от обычных чат-ботов, которые могут выдумывать факты и давать субъективные советы, Choser использует математическую модель взвешенных параметров.</p>
                    <ul style={{ margin: '15px 0', paddingLeft: '20px' }}>
                        <li><b>Объективность:</b> Вы сами задаете критерии и их веса (важность).</li>
                        <li><b>Прозрачность:</b> Система рассчитывает "Полезность" каждого варианта по формуле, а не "на глаз".</li>
                        <li><b>Экономия времени:</b> ИИ помогает быстро собрать данные, но решение остается за математикой и вашими приоритетами.</li>
                    </ul>
                    <p>Это позволяет избежать когнитивных искажений и получать проверяемый, логически обоснованный результат при выборе чего угодно: от кофеварки до стратегии развития бизнеса.</p>
                </div>
                <div style={{ marginTop: '25px', textAlign: 'center' }}>
                    <button onClick={onClose} className="btn-primary" style={{ width: 'auto', padding: '8px 30px' }}>Понятно</button>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        color: '#888'
                    }}
                >
                    &times;
                </button>
            </div>
        </div>
    );
}

export default AboutModal;
