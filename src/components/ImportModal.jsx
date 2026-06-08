import React, { useState } from 'react';
import { API } from '../utils/api';

export default function ImportModal({ isOpen, onClose, onImportSuccess }) {
    const [jsonText, setJsonText] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const validateAndImport = async () => {
        setError('');
        setLoading(true);

        try {
            // 1. Basic JSON validation
            let parsed;
            try {
                parsed = JSON.parse(jsonText);
            } catch (e) {
                throw new Error('Некорректный формат JSON. Проверьте скобки и кавычки.');
            }

            // 2. Structural validation
            if (!parsed.title || typeof parsed.title !== 'string') {
                throw new Error('Поле "title" (название) обязательно и должно быть строкой.');
            }
            if (!parsed.columns || !Array.isArray(parsed.columns) || parsed.columns.length === 0) {
                throw new Error('Поле "columns" обязательно и должно быть непустым массивом.');
            }
            if (!parsed.data || !Array.isArray(parsed.data)) {
                throw new Error('Поле "data" (данные) обязательно и должно быть массивом.');
            }

            // 3. Columns check
            const colKeys = parsed.columns.map(c => c.key);
            if (colKeys.some(k => !k)) {
                throw new Error('У каждой колонки должен быть уникальный "key".');
            }

            // 4. API call
            // Prepare payload
            const payload = {
                title: parsed.title,
                description: parsed.description || '',
                columns: parsed.columns,
                data: parsed.data.map(item => ({
                    id: item.id || 'obj_' + Math.random().toString(36).substr(2, 9),
                    name: item.name || item.title || 'Без названия',
                    price: parseFloat(item.price) || 0,
                    link: item.link || item.url || '',
                    ...item
                })),
                state: 'public' // Default to public
            };

            const res = await API.post('/api/table', payload);
            if (res.success) {
                setJsonText('');
                onImportSuccess(res.id);
                onClose();
            } else {
                throw new Error(res.error || 'Ошибка при сохранении на сервере.');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="modal" style={{ width: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2>Импорт из JSON</h2>
                    <span onClick={onClose} style={{ cursor: 'pointer', fontSize: '24px' }}>×</span>
                </div>

                <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                    Вставьте JSON код таблицы. Структура должна содержать title, columns и data.
                </p>

                <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder='{"title": "Моя таблица", "columns": [...], "data": [...]}'
                    style={{
                        width: '100%',
                        height: '250px',
                        padding: '10px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginBottom: '10px'
                    }}
                />

                {error && (
                    <div style={{
                        padding: '10px',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        fontSize: '12px',
                        borderRadius: '4px',
                        marginBottom: '10px',
                        border: '1px solid #fecaca'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={validateAndImport}
                        disabled={loading || !jsonText.trim()}
                        className="btn-primary"
                        style={{ margin: 0, flex: 1 }}
                    >
                        {loading ? 'Импорт...' : 'Создать таблицу'}
                    </button>
                    <button onClick={onClose} className="tbtn" style={{ margin: 0 }}>Отмена</button>
                </div>
            </div>
        </div>
    );
}
