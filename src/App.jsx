import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { ChoserLog } from './utils/log';
import DecisionPage from './components/DecisionPage';
import Auth from './components/Auth';
import DevTools from './components/DevTools';
import Grid from './components/Grid';
import CreateModal from './components/CreateModal';
import ImportModal from './components/ImportModal';
import AboutModal from './components/AboutModal';
import EmbedView from './components/EmbedView';
import TreesList from './components/TreesList';
import ArchitectureTree from './components/ArchitectureTree';
// ChatBot removed per user request
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { LangProvider, useLang } from './contexts/LangContext';
import { t } from './i18n';

// Lazy load heavy components (Admin 51KB, Distribution 53KB, Research 11KB)
const Admin = React.lazy(() => import('./components/Admin'));
const DistributionAnalysis = React.lazy(() => import('./components/DistributionAnalysis'));
const ResearchPanel = React.lazy(() => import('./components/ResearchPanel'));
const SensitivityTab = React.lazy(() => import('./components/admin/SensitivityTab'));
const SensitivityExtended = React.lazy(() => import('./components/admin/SensitivityExtended'));
const CouncilN8n = React.lazy(() => import('./components/CouncilN8n'));

// Error Boundary — ловит крэши вместо белого экрана
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null, stack: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error, stack: error?.stack }; }
    componentDidCatch(error, info) {
        console.error('ErrorBoundary:', error, info);
        ChoserLog.error('APP', 'React crash: ' + error?.message, { stack: error?.stack?.slice(0, 500), component: info?.componentStack?.slice(0, 300) });
        this.setState({ stack: error?.stack + '\n\nComponent Stack:\n' + (info?.componentStack || '') });
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:'16px', background:'#0f172a', color:'#f8fafc', padding: 20 }}>
                    <div style={{ fontSize:'48px' }}>⚠️</div>
                    <h2 style={{ margin:0 }}>Error</h2>
                    <p style={{ color:'#f87171', maxWidth:'600px', textAlign:'left', fontFamily: 'monospace', fontSize: 13, background: '#1e293b', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {this.state.error?.message || 'Unknown error'}
                    </p>
                    {this.state.stack && (
                        <details style={{ maxWidth: '600px', width: '100%' }}>
                            <summary style={{ color:'#94a3b8', cursor:'pointer', fontSize: 12 }}>Stack trace</summary>
                            <pre style={{ color:'#64748b', fontSize: 12, overflow:'auto', maxHeight: 200, background: '#1e293b', padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {this.state.stack}
                            </pre>
                        </details>
                    )}
                    <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ padding:'10px 24px', background:'#ef4444', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px' }}>
                        Clear cache & Reload
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// Suspense fallback for lazy components
const LazyFallback = () => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh', color:'#64748b' }}>
        <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:'8px', animation:'pulse 1.5s infinite' }}>⚡</div>
            {t('app.loadingModule')}
        </div>
    </div>
);

function AppContent() {
    const { user } = useAuth();
    const { theme, toggleTheme, displayMode, toggleDisplayMode, uiMode, toggleUiMode } = useApp();
    const { locale, changeLocale, languages } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [showResearch, setShowResearch] = useState(false);
    const [showNewDropdown, setShowNewDropdown] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    // Close new dropdown on outside click
    useEffect(() => {
        if (!showNewDropdown) return;
        const handler = (e) => {
            if (!e.target.closest('[data-new-dropdown]')) setShowNewDropdown(false);
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [showNewDropdown]);

    const [searchParams, setSearchParams] = useSearchParams();
    const searchParam = searchParams.get('q') || '';
    const [searchQuery, setSearchQuery] = useState(searchParam);

    // Debounce search update to URL
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== searchParam) {
                if (searchQuery) {
                    searchParams.set('q', searchQuery);
                } else {
                    searchParams.delete('q');
                }
                setSearchParams(searchParams, { replace: true });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, searchParams, searchParam, setSearchParams]);

    const isHome = location.pathname === '/';
    const isAdminView = location.pathname.startsWith('/admin');
    const isTable = location.pathname.startsWith('/table/');
    const isEmbed = location.pathname.startsWith('/embed/');

    if (isEmbed) {
        return (
            <div className="content" style={{ height: '100vh', width: '100vw' }}>
                <Routes>
                    <Route path="/embed/:id" element={<EmbedView />} />
                </Routes>
            </div>
        );
    }

    return (
        <>
            <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--border-color)' }}>
                {/* ЛЕВЫЙ БЛОК: Логотип */}
                <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                        <h1 style={{ margin: 0, fontSize: '1.3em', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('app.title')}</h1>
                        <span style={{ fontSize: '0.6em', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px' }}>{t('app.subtitle')}</span>
                    </div>
                </div>

                {/* ЦЕНТРАЛЬНЫЙ БЛОК: Навигация */}
                {user && (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <button onClick={() => navigate('/')} className={`tbtn ${isHome ? 'active' : ''}`} style={{ background: isHome ? 'var(--bg-main)' : 'transparent', border: 'none', color: isHome ? 'var(--text-color)' : 'var(--text-muted)' }}>📊 Таблицы</button>
                        <button onClick={() => navigate('/trees')} className={`tbtn ${location.pathname.startsWith('/trees') ? 'active' : ''}`} style={{ background: location.pathname.startsWith('/trees') ? 'var(--bg-main)' : 'transparent', border: 'none', color: location.pathname.startsWith('/trees') ? '#10b981' : 'var(--text-muted)' }}>🌳 Деревья</button>
                        <button onClick={() => setShowResearch(true)} className="tbtn" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>🔍 Исследования</button>
                        <button onClick={() => navigate('/decision')} className={`tbtn ${location.pathname === '/decision' ? 'active' : ''}`} style={{ background: location.pathname === '/decision' ? 'var(--bg-main)' : 'transparent', border: 'none', color: location.pathname === '/decision' ? '#f59e0b' : 'var(--text-muted)' }}>🏛️ Совет</button>
                        <button onClick={() => navigate('/council-n8n')} className={`tbtn ${location.pathname === '/council-n8n' ? 'active' : ''}`} style={{ background: location.pathname === '/council-n8n' ? 'var(--bg-main)' : 'transparent', border: 'none', color: location.pathname === '/council-n8n' ? '#f59e0b' : 'var(--text-muted)' }}>⚙️ n8n Совет</button>
                    </div>
                )}

                {/* ПРАВЫЙ БЛОК: Инструменты, Поиск и Профиль */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isHome && (
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder={t('nav.search')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '6px 16px', color: 'var(--text-color)', width: '200px' }}
                            />
                        </div>
                    )}

                    {user && (
                        <div data-new-dropdown style={{ position: 'relative' }}>
                            <button onClick={(e) => { e.stopPropagation(); setShowNewDropdown(v => !v); }} className="tbtn" style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '20px', padding: '6px 16px' }}>{t('nav.newTable')} ▾</button>
                            {showNewDropdown && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, overflow: 'hidden', zIndex: 100, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                                    <button onClick={() => { setShowNewDropdown(false); setShowCreate(true); }} style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: 13 }}>{t('nav.newTableMenu')}</button>
                                    <button onClick={() => { setShowNewDropdown(false); setShowImport(true); }} style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: 13, borderTop: '1px solid rgba(255,255,255,0.1)' }}>{t('nav.importJsonMenu')}</button>
                                </div>
                            )}
                        </div>
                    )}

                    <select value={locale} onChange={e => changeLocale(e.target.value)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '6px', padding: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        {languages.map(l => (
                            <option key={l.code} value={l.code} style={{ background: '#1e293b', color: '#fff' }}>{l.label}</option>
                        ))}
                    </select>

                    {user && user.role === 'admin' && (
                        <button onClick={() => navigate('/admin')} className="tbtn" style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '6px' }} title={t('nav.admin')}>⚙️</button>
                    )}
                    
                    <button onClick={toggleTheme} className="tbtn" style={{ background: 'transparent', border: 'none', fontSize: '16px' }} title={t('nav.theme')}>
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                    <Auth />
                </div>
            </div>

            <div className="content">
                <Suspense fallback={<LazyFallback />}>
                    <Routes>
                        <Route path="/" element={<Grid />} />
                        <Route path="/table/:id" element={<Grid />} />
                        <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
                        <Route path="/admin/1-settings" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
                        <Route path="/admin/2-users" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
                        <Route path="/admin/3-trash" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
                        <Route path="/admin/4-backup" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
                        <Route path="/admin/5-objects" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
                        <Route path="/admin/6-params" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
                        <Route path="/admin/7-analytics" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
                        <Route path="/admin/8-decisions" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
                        <Route path="/admin/9-sensitivity" element={user?.role === 'admin' ? <SensitivityTab /> : <Navigate to="/" />} />
                        <Route path="/admin/10-sensitivity-extended" element={user?.role === 'admin' ? <SensitivityExtended /> : <Navigate to="/" />} />
                        <Route path="/admin/11-distributions" element={user?.role === 'admin' ? <DistributionAnalysis /> : <Navigate to="/" />} />
                        <Route path="/decision" element={user ? <DecisionPage /> : <Navigate to="/" />} />
                        <Route path="/council-n8n" element={user ? <CouncilN8n /> : <Navigate to="/" />} />
                        <Route path="/trees" element={<TreesList />} />
                        <Route path="/trees/:id" element={<ArchitectureTree />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </Suspense>
            </div>

            <div className="footer">
                <span>© 2026 Choser • {t('app.stableVersion')}</span>
                <span id="saveStatus"></span>
            </div>

            <CreateModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
            <ImportModal
                isOpen={showImport}
                onClose={() => setShowImport(false)}
                onImportSuccess={(id) => navigate(`/table/${id}`)}
            />
            <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
            <Suspense fallback={null}>
                <ResearchPanel
                    isOpen={showResearch}
                    onClose={() => setShowResearch(false)}
                    onTableCreated={(id) => { setShowResearch(false); navigate(`/table/${id}`); }}
                />
            </Suspense>
            {/* ChatBot removed */}
        </>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <AppProvider>
                    <LangProvider>
                        <HashRouter>
                            <AppContent />
                        </HashRouter>
                    </LangProvider>
                </AppProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
