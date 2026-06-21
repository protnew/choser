import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('choser_theme');
        if (saved) return saved;
        // Auto-detect system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });
    const [displayMode, setDisplayMode] = useState(localStorage.getItem('choser_view') || 'grid');
    const [uiMode, setUiMode] = useState(localStorage.getItem('choser_ui_mode') || 'classic');

    // Apply theme to DOM with smooth transition
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        // Add transition class for smooth theme switch
        document.body.classList.add('theme-transition');
        if (theme === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
        localStorage.setItem('choser_theme', theme);
        // Remove transition class after animation
        const timer = setTimeout(() => document.body.classList.remove('theme-transition'), 400);
        return () => clearTimeout(timer);
    }, [theme]);

    // Listen for system theme changes (only if user hasn't set preference)
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => {
            if (!localStorage.getItem('choser_theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        if (uiMode === 'premium') {
            document.body.classList.add('premium-ui');
        } else {
            document.body.classList.remove('premium-ui');
        }
        localStorage.setItem('choser_ui_mode', uiMode);
    }, [uiMode]);

    useEffect(() => {
        localStorage.setItem('choser_view', displayMode);
    }, [displayMode]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
    const toggleDisplayMode = () => setDisplayMode(prev => prev === 'grid' ? 'card' : 'grid');
    const toggleUiMode = () => setUiMode(prev => prev === 'classic' ? 'premium' : 'classic');

    return (
        <AppContext.Provider value={{
            theme, toggleTheme,
            displayMode, toggleDisplayMode,
            uiMode, toggleUiMode
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
}
