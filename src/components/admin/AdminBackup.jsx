import React from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export default function AdminBackup({
    theme, onDownloadBackup, loading, snapshots, snapCols, gt
}) {
    return (
        <div style={{
            background: theme === 'dark' ? '#1e293b' : '#f9fafb',
            padding: '20px',
            borderRadius: '8px',
            border: `1px solid ${theme === 'dark' ? '#334155' : '#eee'}`,
            userSelect: 'text'
        }}>
            <h3>💾 Бэкап и версионирование</h3>
            <div style={{ display: 'flex', gap: '10px', margin: '15px 0' }}>
                <button
                    onClick={onDownloadBackup}
                    className="tbtn"
                    style={{ background: '#dbeafe', color: '#1d4ed8', padding: '10px 20px', fontWeight: 600 }}
                >
                    📥 Скачать бэкап (JSON)
                </button>
            </div>
            <div style={{
                background: theme === 'dark' ? '#0f172a' : '#fffbeb',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #fbbf24',
                marginBottom: '16px',
                fontSize: '12px',
                color: theme === 'dark' ? '#fbbf24' : '#92400e'
            }}>
                <b>📋 Как работают выгрузки (бэкапы):</b><br />
                • При нажатии <b>«Скачать бэкап»</b> вы получаете весь файл JSON на свой компьютер.<br />
                • В этот момент алгоритм <b>автоматически</b> делает запись в журнал (ниже), фиксируя время, название и метаданные (кол-во таблиц/объектов на этот момент).<br />
                • Для локального восстановления используйте скрипт <code>python migrate_sql.py путь/к/вашему_бэкапу.json</code>.<br />
                • Для восстановления на сервере Cloudflare D1 за последние 30 дней доступен <b>Time Travel</b>.
            </div>
            <h4>📅 Журнал выгруженных бэкапов (последние 20)</h4>
            <div className={gt} style={{ width: '100%', marginTop: '8px', height: '300px' }}>
                <AgGridReact
                    rowData={snapshots}
                    columnDefs={snapCols}
                    defaultColDef={{ sortable: true, resizable: true }}
                    pagination={true}
                    paginationPageSize={10}
                />
            </div>
        </div>
    );
}
