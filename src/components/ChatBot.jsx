import React, { useState, useRef, useEffect } from 'react';

/**
 * ChatBot — плавающий AI-советник в стиле Intercom.
 * Контекстно привязан к текущей открытой таблице.
 */
export default function ChatBot({ contextTableId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMsg = { role: 'user', text, time: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    context_table_id: contextTableId || null
                })
            });
            const data = await res.json();

            if (data.error) {
                setMessages(prev => [...prev, { role: 'error', text: data.error, time: new Date() }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant', text: data.reply,
                    model: data.model, time: new Date()
                }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'error', text: e.message, time: new Date() }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Стили
    const s = {
        fab: {
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
            width: '56px', height: '56px', borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            color: '#fff', fontSize: '1.5em', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        },
        panel: {
            position: 'fixed', bottom: '90px', right: '24px', zIndex: 9999,
            width: '380px', maxHeight: '520px', borderRadius: '16px',
            background: 'var(--card-bg, #1a1a2e)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'chatSlideUp 0.25s ease-out'
        },
        header: {
            padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.15))',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        },
        messages: {
            flex: 1, overflowY: 'auto', padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '10px',
            maxHeight: '340px', minHeight: '200px'
        },
        inputArea: {
            padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', gap: '8px'
        },
        bubble: (role) => ({
            maxWidth: '85%', padding: '10px 14px', borderRadius: '12px',
            fontSize: '0.9em', lineHeight: '1.5', whiteSpace: 'pre-wrap',
            alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
            background: role === 'user' ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' :
                role === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
            color: role === 'error' ? '#fca5a5' : 'inherit',
            border: role === 'error' ? '1px solid rgba(239,68,68,0.2)' : 'none'
        })
    };

    return (
        <>
            {/* FAB Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={s.fab}
                onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 6px 28px rgba(124,58,237,0.6)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)';
                }}
                title="AI Советник"
            >
                {isOpen ? '✕' : '💬'}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div style={s.panel}>
                    <div style={s.header}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.05em' }}>🤖 AI Советник</div>
                            <div style={{ fontSize: '0.75em', opacity: 0.6, marginTop: '2px' }}>
                                {contextTableId ? `Контекст: ${contextTableId}` : 'Общий режим'}
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{
                            background: 'none', border: 'none', color: 'inherit',
                            fontSize: '1.2em', cursor: 'pointer', opacity: 0.6
                        }}>✕</button>
                    </div>

                    <div style={s.messages}>
                        {messages.length === 0 && (
                            <div style={{
                                textAlign: 'center', opacity: 0.4, padding: '40px 20px',
                                fontSize: '0.9em'
                            }}>
                                Задайте вопрос о данных таблицы, попросите совет или анализ
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} style={s.bubble(msg.role)}>
                                {msg.text}
                            </div>
                        ))}

                        {isLoading && (
                            <div style={{
                                ...s.bubble('assistant'),
                                animation: 'pulse 1.5s infinite'
                            }}>
                                ⏳ Думаю...
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div style={s.inputArea}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Спросите что-нибудь..."
                            disabled={isLoading}
                            style={{
                                flex: 1, padding: '10px 14px', borderRadius: '8px',
                                border: '1px solid var(--border-color, #444)',
                                background: 'var(--input-bg, rgba(0,0,0,0.3))',
                                color: 'inherit', fontSize: '0.9em', outline: 'none'
                            }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            style={{
                                padding: '10px 16px', borderRadius: '8px', border: 'none',
                                background: isLoading ? '#555' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                                color: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes chatSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </>
    );
}
