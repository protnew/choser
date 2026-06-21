import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { API } from '../utils/api';
import { useApp } from '../contexts/AppContext';
import { t } from '../i18n';
import { useNavigate, useLocation } from 'react-router-dom';
import AnalyticsTab from './admin/AnalyticsTab';
import DecisionTab from './admin/DecisionTab';
import AdminSettings from './admin/AdminSettings';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export default function Admin() {
    const [activeTab, setActiveTab] = useState('settings');
    const [archiveSub, setArchiveSub] = useState('tables');
    const [users, setUsers] = useState([]);
    const [archivedTables, setArchivedTables] = useState([]);
    const [settings, setSettings] = useState({ system_prompt: '' });
    const [snapshots, setSnapshots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [catalogObjects, setCatalogObjects] = useState([]);
    const [catalogParams, setCatalogParams] = useState([]);
    const [stats, setStats] = useState(null);
    const { theme } = useApp();

    useEffect(() => {
        if (activeTab==='users') loadUsers();
        if (activeTab==='archive') loadArchive();
        if (activeTab==='settings') loadSettings();
        if (activeTab==='backup') loadSnapshots();
        if (activeTab==='objects') loadCatalogObjects();
        if (activeTab==='params') loadCatalogParams();
        if (activeTab==='analytics') loadStats();
    }, [activeTab]);

    useEffect(() => {
        // Sync URL → tab (was done during render, causing React warning)
        const pathTab = routeToTab[location.pathname];
        if (pathTab && pathTab !== activeTab) setActiveTab(pathTab);
    }, [location.pathname]);

    const loadUsers = async () => { setLoading(true); try { setUsers(await API.get('/api/admin/users')||[]); } catch(e) { console.error(e); } finally { setLoading(false); } };
    const loadArchive = async () => { setLoading(true); try { setArchivedTables(await API.get('/api/admin/archive')||[]); } catch(e) { console.error(e); } finally { setLoading(false); } };
    const loadSettings = async () => { setLoading(true); try { setSettings(await API.get('/api/admin/settings')||{system_prompt:''}); } catch(e) { console.error(e); } finally { setLoading(false); } };
    const loadSnapshots = async () => { setLoading(true); try { setSnapshots(await API.get('/api/admin/snapshots')||[]); } catch(e) { console.error(e); } finally { setLoading(false); } };
    const loadStats = async () => { setLoading(true); try{setStats(await API.get('/api/admin/stats-full'));}catch(e){console.error(e);} finally { setLoading(false); } };
    const loadCatalogObjects = async (q='') => { setLoading(true); try { setCatalogObjects(await API.get(`/api/catalog/objects${q?`?q=${encodeURIComponent(q)}`:''}`) || []); } catch(e) { console.error(e); } finally { setLoading(false); } };
    const loadCatalogParams = async (q='') => { setLoading(true); try { setCatalogParams(await API.get(`/api/catalog/params${q?`?q=${encodeURIComponent(q)}`:''}`) || []); } catch(e) { console.error(e); } finally { setLoading(false); } };

    const onPromote = async (email,role) => { if(confirm(`Сменить роль ${email} → ${role}?`)){const r=await API.post('/api/admin/promote',{email,role});if(r.success)loadUsers();else alert(r.error||'Ошибка');}};
    const onDeleteUser = async (id) => { if(confirm('Удалить?')){const r=await API.delete(`/api/admin/user/${id}`);if(r.success)loadUsers();}};
    const onRestoreUser = async (id) => { const r=await API.post(`/api/admin/restore/${id}`);if(r.success)loadUsers(); };
    const onRestoreTable = async (id) => { const r=await API.post(`/api/admin/restore-table/${id}`);if(r.success)loadArchive(); };
    const onSaveSettings = async () => { const r=await API.post('/api/admin/settings',{id:'system_prompt',value:settings.system_prompt});alert(r.success?'Сохранено':r.error||'Ошибка'); };
    const onDownloadBackup = async () => {
        try {
            setLoading(true);
            const r = await fetch('/api/admin/backup', { headers: API.getHeaders() });
            const b = await r.blob();
            const filename = `choser-backup-${new Date().toISOString().slice(0, 10)}.json`;
            const u = URL.createObjectURL(b);
            const a = document.createElement('a'); a.href = u; a.download = filename; a.click(); URL.revokeObjectURL(u);
            const sr = await API.post('/api/admin/snapshot', { label: filename });
            if (sr.success) loadSnapshots();
        } catch (e) { alert('Ошибка выгрузки: ' + e.message); } finally { setLoading(false); }
    };

    const userCols = useMemo(()=>[
        {field:'id',width:70},{field:'name',headerName:'Имя',width:150},{field:'email',headerName:'Email',width:220},
        {field:'role',headerName:'Роль',width:120,editable:true,cellEditor:'agSelectCellEditor',cellEditorParams:{values:['admin','moderator','user']},onCellValueChanged:p=>onPromote(p.data.email,p.newValue)},
        {field:'is_deleted',headerName:'Удален',width:90,cellRenderer:p=>p.value?'✅':''},
        {headerName:'Действия',width:150,cellRenderer:p=>(<div style={{display:'flex',gap:'5px',alignItems:'center',height:'100%'}}>{p.data.is_deleted?<button onClick={()=>onRestoreUser(p.data.id)} className="tbtn" style={{padding:'2px 8px'}}>♻️</button>:<button onClick={()=>onDeleteUser(p.data.id)} className="tbtn" style={{color:'red',padding:'2px 8px'}}>🗑️</button>}</div>)}
    ],[]);

    const archCols = useMemo(()=>[
        {field:'title',headerName:'Название',width:250,filter:true},{field:'tags',headerName:'Теги',width:100,filter:true},
        {field:'description',headerName:'Описание',width:180},{field:'object_count',headerName:'Объект.',width:80},
        {field:'param_count',headerName:'Парам.',width:80},{field:'author',headerName:'Автор',width:100,filter:true},
        {field:'views',headerName:'Просм.',width:80},
        {field:'updated_at',headerName:'Удалено',width:110,valueFormatter:p=>p.value?new Date(p.value).toLocaleDateString():'—'},
        {headerName:'Действия',width:140,cellRenderer:p=>(<button onClick={()=>onRestoreTable(p.data.id)} className="tbtn tbtn-success" style={{fontWeight:600}}>♻️ Восстановить</button>)}
    ],[]);

    const snapCols = useMemo(()=>[
        {field:'id',headerName:'ID',width:70},
        {field:'label',headerName:'Название',width:250},
        {field:'created_at',headerName:'Дата',width:180,valueFormatter:p=>p.value?new Date(p.value*1000).toLocaleString():'—'},
        {headerName:'Содержимое',width:350,valueGetter:p=>{
            try{const d=JSON.parse(p.data.data||'{}');
                const tb=d.tables??(Array.isArray(d.tables)?d.tables.length:'—');
                const rw=d.rows??(Array.isArray(d.rows)?d.rows.length:'—');
                const cl=d.columns??(Array.isArray(d.columns)?d.columns.length:'—');
                const us=d.users??d.user_count??'—';
                return `Таблиц: ${tb}, Объектов: ${rw}, Столбцов: ${cl}, Юзеров: ${us}`;
            }catch(e){return '—';}
        }},
    ],[]);

    const gt = theme==='dark'?'ag-theme-quartz-dark':'ag-theme-quartz';
    const Tab = ({id,label,color='#2563eb',goTo}) => (
        <button onClick={()=>goTo(id)}
            style={{padding:'8px 12px',border:'none',background:'none',borderBottom:activeTab===id?`2px solid ${color}`:'none',fontWeight:activeTab===id?'bold':'normal',cursor:'pointer',fontSize:'13px',whiteSpace:'nowrap'}}
        >{label}</button>
    );

    const navigate = useNavigate();
    const location = useLocation();

    // Named routes mapping
    const tabRoutes = {
        'settings': '/admin/1-settings',
        'users': '/admin/2-users',
        'archive': '/admin/3-trash',
        'backup': '/admin/4-backup',
        'objects': '/admin/5-objects',
        'params': '/admin/6-params',
        'analytics': '/admin/7-analytics',
        'decision': '/admin/8-decisions',
    };
    const routeToTab = {};
    for (const [k, v] of Object.entries(tabRoutes)) routeToTab[v] = k;

    // Resolve active tab from URL — moved to useEffect above

    const goToTab = (id) => {
        setActiveTab(id);
        if (tabRoutes[id]) navigate(tabRoutes[id]);
    };

    const AdminNav = () => (
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ddd', marginBottom: 16, flexWrap: 'wrap', padding: '8px 0' }}>
            <Tab id="settings" label="1 ⚙️ Настройки AI" goTo={goToTab} />
            <Tab id="users" label="2 👤 Пользователи" goTo={goToTab} />
            <Tab id="archive" label="3 🗑️ Корзина" goTo={goToTab} />
            <Tab id="backup" label="4 💾 Бэкап" goTo={goToTab} />
            <Tab id="objects" label="5 📦 Объекты" goTo={goToTab} color="#22c55e" />
            <Tab id="params" label="6 📐 Параметры" goTo={goToTab} color="#f59e0b" />
            <Tab id="analytics" label="7 📊 Аналитика" goTo={goToTab} color="#8b5cf6" />
            <Tab id="decision" label="8 🎯 Правильные решения" goTo={goToTab} color="#059669" />
            <button onClick={() => navigate('/admin/9-sensitivity')} style={{ padding: '8px 12px', border: 'none', background: 'none', borderBottom: location.pathname === '/admin/9-sensitivity' ? '2px solid #059669' : 'none', fontWeight: location.pathname === '/admin/9-sensitivity' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', color: '#059669' }}>{t('admin.sensitivity')}</button>
            <button onClick={() => navigate('/admin/10-sensitivity-extended')} style={{ padding: '8px 12px', border: 'none', background: 'none', borderBottom: location.pathname === '/admin/10-sensitivity-extended' ? '2px solid #6366f1' : 'none', fontWeight: location.pathname === '/admin/10-sensitivity-extended' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', color: '#6366f1' }}>{t('admin.sensitivityExt')}</button>
            <button onClick={() => navigate('/admin/11-distributions')} style={{ padding: '8px 12px', border: 'none', background: 'none', borderBottom: location.pathname === '/admin/11-distributions' ? '2px solid #db2777' : 'none', fontWeight: location.pathname === '/admin/11-distributions' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', color: '#db2777' }}>{t('admin.ebm')}</button>
        </div>
    );

    return (
        <div style={{padding:'10px 20px',width:'100%',height:'100%',display:'flex',flexDirection:'column',overflow:'auto',userSelect:'text'}}>
            <h1 style={{marginBottom:'12px'}}>Панель администратора</h1>
            <AdminNav />

            {loading && <div style={{padding:'10px',color:'#94a3b8'}}>Загрузка...</div>}

            {activeTab==='users' && (
                <div className={gt} style={{width:'100%',flex:1,minHeight:0,display:'flex',flexDirection:'column'}}>
                    <AgGridReact rowData={users} columnDefs={userCols} defaultColDef={{sortable:true,filter:true,resizable:true}} pagination={true} paginationPageSize={20} paginationPageSizeSelector={[10,20,50,100]}/>
                </div>
            )}

            {activeTab==='archive' && (
                <div style={{width:'100%',flex:1,minHeight:0,display:'flex',flexDirection:'column'}}>
                    <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
                        <button onClick={()=>setArchiveSub('tables')} className="tbtn" style={archiveSub==='tables'?{background:'#3b82f6',color:'#fff',fontWeight:600}:{background:theme==='dark'?'#1e293b':'#f1f5f9',color:theme==='dark'?'#94a3b8':'#64748b'}}>📦 Таблицы ({archivedTables.length})</button>
                        <button onClick={()=>setArchiveSub('users')} className="tbtn" style={archiveSub==='users'?{background:'#3b82f6',color:'#fff',fontWeight:600}:{background:theme==='dark'?'#1e293b':'#f1f5f9',color:theme==='dark'?'#94a3b8':'#64748b'}}>👤 Пользователи</button>
                    </div>
                    {archiveSub==='tables' && (
                        <div className={gt} style={{width:'100%',flex:1,minHeight:0,display:'flex',flexDirection:'column'}}>
                            <AgGridReact rowData={archivedTables} columnDefs={archCols} defaultColDef={{sortable:true,filter:true,resizable:true}} pagination={true} paginationPageSize={20} paginationPageSizeSelector={[10,20,50,100]}/>
                        </div>
                    )}
                    {archiveSub==='users' && (
                        <div style={{padding:'40px',textAlign:'center',color:theme==='dark'?'#94a3b8':'#64748b',background:theme==='dark'?'#0f172a':'#f8fafc',borderRadius:'8px',border:`1px solid ${theme==='dark'?'#334155':'#e2e8f0'}`}}>
                            <div style={{fontSize:'32px',marginBottom:'12px'}}>👤</div>
                            <div>Удалённые пользователи будут отображаться здесь</div>
                            <div style={{fontSize:'12px',marginTop:'8px'}}>Функция soft-delete для пользователей в разработке</div>
                        </div>
                    )}
                </div>
            )}

            {activeTab==='settings' && (
                <AdminSettings theme={theme} />
            )}

            {activeTab==='backup' && (
                <div style={{background:theme==='dark'?'#1e293b':'#f9fafb',padding:'20px',borderRadius:'8px',border:`1px solid ${theme==='dark'?'#334155':'#eee'}`, userSelect:'text'}}>
                    <h3>💾 Бэкап и версионирование</h3>
                    <div style={{display:'flex',gap:'10px',margin:'15px 0'}}>
                        <button onClick={onDownloadBackup} className="tbtn" style={{background:'#dbeafe',color:'#1d4ed8',padding:'10px 20px',fontWeight:600}}>📥 Скачать бэкап (JSON)</button>
                    </div>
                    <div style={{background:theme==='dark'?'#0f172a':'#fffbeb',padding:'12px',borderRadius:'8px',border:'1px solid #fbbf24',marginBottom:'16px',fontSize:'12px',color:theme==='dark'?'#fbbf24':'#92400e'}}>
                        <b>📋 Как работают выгрузки (бэкапы):</b><br/>
                        • При нажатии <b>«Скачать бэкап»</b> вы получаете весь файл JSON на свой компьютер.<br/>
                        • В этот момент алгоритм <b>автоматически</b> делает запись в журнал (ниже), фиксируя время, название и метаданные (кол-во таблиц/объектов на этот момент).<br/>
                        • Для локального восстановления используйте скрипт <code>python migrate_sql.py путь/к/вашему_бэкапу.json</code>.<br/>
                        • Для восстановления на сервере Cloudflare D1 за последние 30 дней доступен <b>Time Travel</b>.
                    </div>
                    <h4>📅 Журнал выгруженных бэкапов (последние 20)</h4>
                    <div className={gt} style={{width:'100%',marginTop:'8px',height:'300px'}}>
                        <AgGridReact rowData={snapshots} columnDefs={snapCols} defaultColDef={{sortable:true,resizable:true}} pagination={true} paginationPageSize={10}/>
                    </div>
                </div>
            )}

            {activeTab==='objects' && (
                <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column'}}>
                    <div style={{marginBottom:'12px',display:'flex',gap:'10px',alignItems:'center'}}>
                        <input type="text" placeholder="Поиск объектов..." style={{padding:'8px 12px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'13px',width:'300px'}}
                            onChange={e=>{clearTimeout(window._os);window._os=setTimeout(()=>loadCatalogObjects(e.target.value),400);}}/>
                        <span style={{fontSize:'13px',color:'#64748b'}}>Всего: {catalogObjects.length}</span>
                    </div>
                    <div className={gt} style={{width:'100%',flex:1,minHeight:0,display:'flex',flexDirection:'column'}}>
                        <AgGridReact rowData={catalogObjects} columnDefs={[
                            {field:'name',headerName:'Название',width:300,filter:true},{field:'price',headerName:'Цена',width:100},
                            {field:'table_title',headerName:'Таблица',width:250,filter:true},{field:'table_id',headerName:'ID',width:200}
                        ]} defaultColDef={{sortable:true,resizable:true,filter:true}} pagination={true} paginationPageSize={50} paginationPageSizeSelector={[20,50,100,200]}/>
                    </div>
                </div>
            )}

            {activeTab==='params' && (
                <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column'}}>
                    <div style={{marginBottom:'12px',display:'flex',gap:'10px',alignItems:'center'}}>
                        <input type="text" placeholder="Поиск параметров..." style={{padding:'8px 12px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'13px',width:'300px'}}
                            onChange={e=>{clearTimeout(window._ps);window._ps=setTimeout(()=>loadCatalogParams(e.target.value),400);}}/>
                        <span style={{fontSize:'13px',color:'#64748b'}}>Уникальных: {catalogParams.length}</span>
                    </div>
                    <div className={gt} style={{width:'100%',flex:1,minHeight:0,display:'flex',flexDirection:'column'}}>
                        <AgGridReact rowData={catalogParams} columnDefs={[
                            {field:'title',headerName:'Параметр',width:250,filter:true},{field:'count',headerName:'Таблиц',width:100,sort:'desc'},
                            {field:'avg_weight',headerName:'Ср. вес (%)',width:120},
                            {field:'tables',headerName:'Где используется',width:400,filter:true,valueGetter:p=>(p.data.tables||[]).map(t=>t.title).join(', ')}
                        ]} defaultColDef={{sortable:true,resizable:true,filter:true}} pagination={true} paginationPageSize={50} paginationPageSizeSelector={[20,50,100,200]}/>
                    </div>
                </div>
            )}

            {activeTab==='analytics' && stats && (
                <div style={{flex:1,minHeight:0,overflow:'auto'}}>
                    <AnalyticsTab stats={stats} theme={theme}/>
                </div>
            )}

            {activeTab==='decision' && (
                <div style={{flex:1,minHeight:0,overflow:'auto'}}>
                    <DecisionTab />
                </div>
            )}
        </div>
    );
}
