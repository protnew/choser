import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function Auth() {
    const navigate = useNavigate();
    const { user, login, logout } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [formData, setFormData] = useState({ email: '', password: '', name: '' });
    const [error, setError] = useState('');

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

        try {
            const data = await API.post(url, formData);
            if (data.error) {
                setError(data.error);
                return;
            }

            if (mode === 'register') {
                alert('Регистрация успешна! Теперь войдите.');
                setMode('login');
                return;
            }

            // Login Success
            API.setToken(data.token);
            login(data.user);
            setShowModal(false);
        } catch (err) {
            console.error(err);
            setError('Ошибка сети');
        }
    };

    const isAdmin = user?.role === 'admin';

    return (
        <>
            {/* Auth UI in Header */}
            {user ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => navigate('/?filter=my')} className="tbtn">Мои таблицы</button>
                    <div className="user-menu">
                        <span style={{ fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                            {isAdmin ? '👑 ' + user.name : user.name} ▼
                        </span>
                        <div className="user-menu-content">
                            {isAdmin && <div className="user-menu-item" onClick={() => navigate('/admin')}>Админка</div>}
                            <div className="user-menu-item" onClick={handleLogout}>Выйти</div>
                        </div>
                    </div>
                </div>
            ) : (
                <button onClick={() => setShowModal(true)} className="auth-btn">Войти</button>
            )}

            {/* Auth Modal */}
            {showModal && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h2>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
                            <span onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '20px' }}>×</span>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {mode === 'register' && (
                                <div className="form-group">
                                    <label>Имя</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required={mode === 'register'} />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Пароль</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                            </div>

                            {error && <div style={{ color: 'red', fontSize: '12px', marginBottom: '10px' }}>{error}</div>}

                            <button type="submit" className="btn-primary">
                                {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
                            </button>
                        </form>

                        <div className="link-text" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                            {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
