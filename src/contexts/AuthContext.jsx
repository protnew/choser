import React, { createContext, useContext, useState, useEffect } from 'react';
import { API } from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem('choser_user');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch (e) {
            return null;
        }
    });

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('choser_token');
            if (token && !user) {
                try {
                    const data = await API.get('/api/auth/me');
                    if (data && data.user) {
                        login(data.user);
                    } else {
                        logout();
                    }
                } catch (err) {
                    console.error('Failed to verify session:', err);
                }
            } else if (!token && !user) {
                // Auto-login as admin (always, for self-hosted)
                try {
                    const data = await API.post('/api/auth/dev-login', { role: 'admin' });
                    if (data.token) {
                        API.setToken(data.token);
                        login(data.user);
                    }
                } catch (err) {
                    console.error('Auto-login failed:', err);
                }
            }
        };
        checkAuth();
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('choser_user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('choser_user');
        localStorage.removeItem('choser_token');
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    return useContext(AuthContext);
}
