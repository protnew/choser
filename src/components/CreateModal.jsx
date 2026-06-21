import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../utils/api';

export default function CreateModal({ isOpen, onClose }) {
    const [step, setStep] = useState(1);
    const [topic, setTopic] = useState('');
    const [raw, setRaw] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [timer, setTimer] = useState(0);
    const [matches, setMatches] = useState([]);
    const [debugInfo, setDebugInfo] = useState(null);

    const timerRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setTopic('');
            setRaw('');
            setLoading(false);
            setMatches([]);
            setDebugInfo(null);
        }
    }, [isOpen]);

    const handleSearch = async () => {
        if (!topic.trim()) return;
        setStep(2);

        try {
            // Client-side search for now
            const all = await API.get('/api/tables'); // TODO: Optimize to endpoint
            if (all && Array.isArray(all)) {
                const found = all.filter(t => t.title.toLowerCase().includes(topic.toLowerCase()));
                setMatches(found);
            }
        } catch (e) {
            console.error('Search error', e);
        }
    };

    const handleGenerate = async () => {
        const finalPrompt = raw ? `${topic}. Details: ${raw}` : topic;
        setLoading(true);
        setLoadingMsg('Спрашиваю AI...');
        setTimer(0);

        const msgs = [
            'Спрашиваю AI (GLM-5.1)...',
            'Структурирую данные...',
            'Форматирую таблицу...'
        ];

        let msgIdx = 0;
        const msgInterval = setInterval(() => {
            msgIdx = (msgIdx + 1) % msgs.length;
            setLoadingMsg(msgs[msgIdx]);
        }, 4000);

        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            setTimer((Date.now() - startTime) / 1000);
        }, 100);

        try {
            const data = await API.post('/api/generate', { prompt: finalPrompt });

            clearInterval(msgInterval);
            clearInterval(timerRef.current);

            if (data.error) {
                alert('Ошибка генерации: ' + data.error);
                setLoading(false);
                return;
            }

            // Save Table
            const id = 'ai-' + Date.now();
            let desc = data.description || '';
            const debug = data._debug || [];

            // Append debug info to description (legacy behavior)
            if (debug.length > 0) {
                desc += '\n\n--- AI Generation Report ---';
                debug.forEach(d => {
                    const icon = d.status.includes('OK') ? '✅' : d.status.includes('SKIP') ? '⏭️' : '❌';
                    desc += `\n${icon} ${d.provider} ${d.model || ''}: ${d.status}${d.ms ? ' (' + d.ms + 'ms)' : ''}`;
                    if (d.error) desc += ` | Err: ${d.error.substring(0, 100)}`;
                });
            }

            const payload = {
                id,
                title: data.title,
                description: desc,
                columns: data.columns,
                data: data.rows,
                quality_score: data._quality_score ?? null,
                quality_details: data._quality_details || null,
                state: 'открытая'
            };

            const saved = await API.post('/api/table', payload);
            if (saved.error) throw new Error(saved.error);

            // Redirect using react-router
            onClose();
            navigate(`/?table=${id}`);

        } catch (e) {
            clearInterval(msgInterval);
            clearInterval(timerRef.current);
            console.error(e);
            alert('Ошибка: ' + e.message);
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="modal" style={{ width: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2>Новая таблица</h2>
                    {!loading && <span onClick={onClose} style={{ cursor: 'pointer', fontSize: '20px' }}>×</span>}
                </div>

                {!loading ? (
                    <>
                        {step === 1 && (
                            <div>
                                <div className="form-group">
                                    <label>О чем создать таблицу?</label>
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={e => setTopic(e.target.value)}
                                        placeholder="Например: Сравнение iPhone 15 и Samsung S24"
                                        autoFocus
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                                <button onClick={handleSearch} className="btn-primary" disabled={!topic}>Далее</button>
                            </div>
                        )}

                        {step === 2 && (
                            <div>
                                {matches.length > 0 && (
                                    <div style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Найдено похожих: {matches.length}</div>
                                        <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                                            {matches.map(m => (
                                                <div key={m.id} style={{ padding: '2px 0' }}>
                                                    <a href={`/?table=${m.id}`} target="_blank" style={{ color: '#2563eb', fontSize: '13px' }}>{m.title}</a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Уточнить запрос (опционально)</label>
                                    <input
                                        type="text"
                                        value={raw}
                                        onChange={e => setRaw(e.target.value)}
                                        placeholder="Добавь колонку 'AnTuTu'"
                                    />
                                </div>

                                <button onClick={handleGenerate} className="btn-primary btn-ai btn-ai-glow">✨ Генерировать</button>
                                <div className="link-text" onClick={() => setStep(1)}>Назад</div>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ fontSize: '24px', marginBottom: '10px' }}>🤖</div>
                        <h3 style={{ marginBottom: '5px' }}>{loadingMsg}</h3>
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>Это может занять до 30 секунд</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '14px', color: '#2563eb' }}>{timer.toFixed(1)}s</div>
                    </div>
                )}
            </div>
        </div>
    );
}
