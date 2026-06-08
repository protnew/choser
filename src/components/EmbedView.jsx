import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Grid from './Grid';

export default function EmbedView() {
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        // Добавляем класс к body, чтобы скрыть лишние элементы дизайна (header, footer)
        document.body.classList.add('embed-mode');

        return () => {
            document.body.classList.remove('embed-mode');
        };
    }, []);

    if (!id) {
        navigate('/');
        return null;
    }

    return (
        <div className="embed-container" style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, position: 'relative' }}>
                <Grid isEmbed={true} />
            </div>

            <a
                href={`https://choser.ru/table/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '8px',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    textDecoration: 'none',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                }}
            >
                ⚡ Создать такую же таблицу на Choser.ru
            </a>
        </div>
    );
}
