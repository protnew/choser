import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../utils/api';

export default function HermesChat() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEnd = useRef(null);

    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            // Call Hermes via Choser proxy
            const r = await API.post('/api/hermes/chat', { message: userMsg, history: messages.slice(-10) });
            setMessages(prev => [...prev, { role: 'assistant', content: r.response || r.error || 'Нет ответа' }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ ' + e.message }]);
        }
        setLoading(false);
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <button onClick={() => navigate('/')} className="tbtn">← Назад</button>
                <h2 style={{ margin: 0, fontSize: 18 }}>🤖 Hermes Chat</h2>
                <span style={{ fontSize: 12, color: 'inherit' }}>AI-ассистент Hermes — задайте любой вопрос</span>
                <a href="http://127.0.0.1:9091" target="_blank" rel="noopener" style={{ marginLeft: 'auto', fontSize: 12, color: '#3b82f6' }}>Открыть полный UI ↗</a>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'inherit', marginTop: 60 }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Hermes Chat</div>
                        <div style={{ fontSize: 13, marginTop: 8 }}>Задайте вопрос или попросите о чём-нибудь</div>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%', padding: '10px 16px', borderRadius: 12,
                        background: m.role === 'user' ? '#3b82f6' : '#f1f5f9',
                        color: m.role === 'user' ? '#fff' : '#1e293b',
                        fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap'
                    }}>
                        {m.content}
                    </div>
                ))}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', padding: '10px 16px', borderRadius: 12, background: '#f1f5f9', color: 'inherit', fontSize: 14 }}>
                        ⏳ Думаю...
                    </div>
                )}
                <div ref={messagesEnd} />
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Напишите сообщение..."
                    rows={1}
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, resize: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={send} disabled={loading || !input.trim()}
                    style={{
                        padding: '10px 20px', background: loading ? '#94a3b8' : '#3b82f6', color: '#fff',
                        border: 'none', borderRadius: 8, cursor: loading ? 'default' : 'pointer', fontSize: 14, fontWeight: 600
                    }}>
                    ➤
                </button>
            </div>
        </div>
    );
}
