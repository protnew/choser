import React, { useState, useEffect, useRef } from 'react';

/**
 * ResearchPanel — интерактивная панель для запуска и мониторинга Deep Research.
 * Поддерживает 3 фазы: Обзор → Углубление → Верификация
 */
export default function ResearchPanel({ isOpen, onClose, onTableCreated }) {
    const [topic, setTopic] = useState('');
    const [depth, setDepth] = useState(3);
    const [jobId, setJobId] = useState(null);
    const [status, setStatus] = useState(null);
    const [steps, setSteps] = useState([]);
    const [error, setError] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const pollRef = useRef(null);

    const phaseLabels = ['Обзор', 'Углубление', 'Верификация'];
    const phaseIcons = ['🔍', '🔬', '✅'];

    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const startResearch = async () => {
        if (!topic.trim()) return;
        setIsRunning(true);
        setError(null);
        setSteps([]);
        setStatus('pending');

        try {
            const res = await fetch('/api/research/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, depth })
            });
            const data = await res.json();

            if (data.error) {
                setError(data.error);
                setIsRunning(false);
                return;
            }

            setJobId(data.job_id);
            setStatus(data.status);
            setSteps(data.steps || []);

            if (data.status === 'completed') {
                setIsRunning(false);
                return;
            }

            // Start polling
            pollRef.current = setInterval(() => pollStatus(data.job_id), 3000);
        } catch (e) {
            setError(e.message);
            setIsRunning(false);
        }
    };

    const pollStatus = async (id) => {
        try {
            // Poll status — research runs asynchronously on server
            const res = await fetch(`/api/research/${id}/status`);
            const data = await res.json();

            setStatus(data.status);
            setSteps(data.steps || []);

            if (data.status === 'completed' || data.status === 'failed') {
                clearInterval(pollRef.current);
                setIsRunning(false);
                if (data.status === 'failed') {
                    setError(data.error || 'Исследование завершилось с ошибкой');
                }
            }
        } catch (e) {
            clearInterval(pollRef.current);
            setError(e.message);
            setIsRunning(false);
        }
    };

    const viewResult = async () => {
        if (!jobId) return;
        try {
            const res = await fetch(`/api/research/${jobId}/result`);
            const data = await res.json();
            if (data.table_id && onTableCreated) {
                onTableCreated(data.table_id);
            }
        } catch (e) {
            setError(e.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
            <div className="modal research-modal" onClick={(e) => e.stopPropagation()} style={{
                maxWidth: '600px',
                width: '90%'
            }}>
                <div className="modal-header" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 24px', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))'
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.3em' }}>🔬 Deep Research</h2>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', color: 'inherit',
                        fontSize: '1.5em', cursor: 'pointer', padding: '0 4px'
                    }}>×</button>
                </div>

                <div style={{ padding: '24px' }}>
                    {/* Input */}
                    <div style={{ marginBottom: '16px' }}>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Тема исследования... (напр. 'Лучшие SSD 2026')"
                            disabled={isRunning}
                            style={{
                                width: '100%', padding: '12px 16px', fontSize: '1em',
                                borderRadius: '8px', border: '1px solid var(--border-color, #444)',
                                background: '#ffffff', color: '#1e293b',
                                boxSizing: 'border-box'
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && !isRunning && startResearch()}
                        />
                    </div>

                    {/* Depth selector */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
                        <span style={{ opacity: 0.7, fontSize: '0.9em' }}>Глубина:</span>
                        {[1, 2, 3].map(d => (
                            <button
                                key={d}
                                onClick={() => setDepth(d)}
                                disabled={isRunning}
                                style={{
                                    padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
                                    border: depth === d ? '2px solid #7c3aed' : '1px solid #555',
                                    background: depth === d ? 'rgba(124,58,237,0.2)' : 'transparent',
                                    color: 'inherit', fontSize: '0.9em'
                                }}
                            >
                                {d} {d === 1 ? 'фаза' : d < 5 ? 'фазы' : 'фаз'}
                            </button>
                        ))}
                        <button
                            onClick={startResearch}
                            disabled={isRunning || !topic.trim()}
                            style={{
                                marginLeft: 'auto', padding: '8px 20px', borderRadius: '8px',
                                border: 'none', cursor: isRunning ? 'not-allowed' : 'pointer',
                                background: isRunning ? '#555' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                                color: '#fff', fontWeight: 'bold', fontSize: '0.95em'
                            }}
                        >
                            {isRunning ? '⏳ Исследую...' : '🚀 Исследовать'}
                        </button>
                    </div>

                    {/* Progress Steps */}
                    {(isRunning || steps.length > 0) && (
                        <div style={{
                            background: 'rgba(0,0,0,0.2)', borderRadius: '12px',
                            padding: '16px', marginBottom: '16px'
                        }}>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                                {phaseLabels.slice(0, depth).map((label, i) => {
                                    const isDone = i < steps.length;
                                    const isCurrent = i === steps.length && isRunning;
                                    return (
                                        <div key={i} style={{
                                            flex: 1, textAlign: 'center', padding: '12px 8px',
                                            borderRadius: '8px',
                                            background: isDone ? 'rgba(34,197,94,0.15)' :
                                                isCurrent ? 'rgba(124,58,237,0.2)' : 'transparent',
                                            border: isDone ? '1px solid rgba(34,197,94,0.3)' :
                                                isCurrent ? '1px solid rgba(124,58,237,0.4)' : '1px solid #333',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            <div style={{ fontSize: '1.5em', marginBottom: '4px' }}>
                                                {isDone ? '✅' : isCurrent ? (
                                                    <span style={{ animation: 'pulse 1.5s infinite' }}>
                                                        {phaseIcons[i]}
                                                    </span>
                                                ) : '⬜'}
                                            </div>
                                            <div style={{ fontSize: '0.85em', opacity: isDone ? 1 : 0.6 }}>
                                                {label}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{
                            padding: '12px 16px', background: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
                            color: '#fca5a5', marginBottom: '12px', fontSize: '0.9em'
                        }}>
                            ❌ {error}
                        </div>
                    )}

                    {/* Result */}
                    {status === 'completed' && (
                        <div style={{
                            padding: '16px', background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '1.2em', marginBottom: '8px' }}>
                                🎉 Исследование завершено!
                            </div>
                            <button
                                onClick={viewResult}
                                style={{
                                    padding: '10px 24px', borderRadius: '8px', border: 'none',
                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    color: '#fff', fontWeight: 'bold', cursor: 'pointer',
                                    fontSize: '1em'
                                }}
                            >
                                📊 Открыть таблицу
                            </button>
                        </div>
                    )}
                </div>

                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.4; }
                    }
                `}</style>
            </div>
        </div>
    );
}
