/**
 * Grid sub-components: cell renderers, editors, headers, overlays, locale
 */
import React, { useState } from 'react';

// Bar cell renderer
export const BarCell = ({ value, max, colorStart, colorEnd, label }) => {
    const percent = Math.min(100, Math.max(5, ((value || 0) / (max || 1)) * 100));
    return (
        <div className="bar">
            <div className="bar-bg" style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${colorStart}, ${colorEnd})` }} />
            <span className="bar-val">{label}</span>
        </div>
    );
};

// Russian locale for AG Grid
export const AG_GRID_LOCALE_RU = {
    page: 'Стр.', more: 'Ещё', to: 'до', of: 'из', next: 'Далее', last: 'Последняя',
    first: 'Первая', previous: 'Назад', loadingOoo: 'Загрузка...', loadingError: 'Ошибка',
    noRowsToShow: 'Нет данных', filterOoo: 'Фильтр...', equals: 'Равно',
    notEqual: 'Не равно', contains: 'Содержит', notContains: 'Не содержит',
    startsWith: 'Начинается с', endsWith: 'Заканчивается на', blank: 'Пусто',
    notBlank: 'Не пусто', lessThan: 'Меньше', greaterThan: 'Больше',
    lessThanOrEqual: 'Меньше или равно', greaterThanOrEqual: 'Больше или равно',
    inRange: 'В диапазоне', inRangeStart: 'от', inRangeEnd: 'до',
    andCondition: 'И', orCondition: 'ИЛИ', applyFilter: 'Применить', resetFilter: 'Сбросить',
    clearFilter: 'Очистить', cancelFilter: 'Отмена',
    copy: 'Копировать', copyWithHeaders: 'С заголовками', paste: 'Вставить',
    export: 'Экспорт', csvExport: 'CSV', excelExport: 'Excel',
    selectAll: 'Выбрать всё', selectAllSearchResults: 'Все результаты',
    searchOoo: 'Поиск...', pinColumn: 'Закрепить', pinLeft: 'Слева', pinRight: 'Справа',
    noPin: 'Открепить', autosizeThisColumn: 'Автоширина', autosizeAllColumns: 'Авто для всех',
    resetColumns: 'Сбросить', sortAscending: 'По возрастанию', sortDescending: 'По убыванию',
    sortUnSort: 'Без сортировки',
    sum: 'Сумма', min: 'Мин', max: 'Макс', none: 'Нет', count: 'Кол-во',
    avg: 'Среднее', filteredRows: 'Отфильтровано', selectedRows: 'Выбрано',
    totalRows: 'Всего строк', totalAndFilteredRows: 'Строк',
    pageSize: 'Строк на стр.', pageSizeSelectorLabel: 'На странице:',
};

// Loading overlay
export const CustomLoadingOverlay = () => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', padding:'40px' }}>
        <div style={{ fontSize:'32px', animation:'pulse 1.5s ease-in-out infinite' }}>⚡</div>
        <div style={{ fontSize:'14px', color:'#64748b' }}>Загрузка данных Choser...</div>
    </div>
);

// No rows overlay
export const CustomNoRowsOverlay = () => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', padding:'40px' }}>
        <div style={{ fontSize:'40px' }}>📭</div>
        <div style={{ fontSize:'16px', fontWeight:600, color:'var(--text-color)' }}>Таблица пуста</div>
        <div style={{ fontSize:'13px', color:'#64748b' }}>Нажмите «+ Строка» или «🪄 AI» чтобы начать</div>
    </div>
);

// Autocomplete cell editor
export const AutocompleteCellEditor = React.forwardRef((props, ref) => {
    const [value, setValue] = useState(props.value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = React.useRef(null);
    const timerRef = React.useRef(null);

    React.useImperativeHandle(ref, () => ({
        getValue: () => value,
        isCancelAfterEnd: () => false,
        afterGuiAttached: () => inputRef.current?.focus()
    }));

    const fetchSuggestions = (q) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!q || q.length < 2) { setSuggestions([]); setShowDropdown(false); return; }
        timerRef.current = setTimeout(async () => {
            try {
                const field = props.colDef.field || 'name';
                const res = await fetch(`/api/autocomplete?field=${field}&q=${encodeURIComponent(q)}`);
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) { setSuggestions(data); setShowDropdown(true); }
                else { setShowDropdown(false); }
            } catch (e) { setShowDropdown(false); }
        }, 300);
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input ref={inputRef} value={value}
                onChange={(e) => { setValue(e.target.value); fetchSuggestions(e.target.value); }}
                onKeyDown={(e) => { if (e.key === 'Escape') setShowDropdown(false); }}
                style={{ width: '100%', padding: '2px 4px', border: '1px solid #3b82f6', borderRadius: '3px', fontSize: '12px', outline: 'none' }} />
            {showDropdown && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', maxHeight: '200px', overflowY: 'auto' }}>
                    {suggestions.map((s, i) => (
                        <div key={i} onClick={() => { setValue(s); setShowDropdown(false); }}
                            style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #f1f5f9' }}
                            onMouseEnter={(e) => e.target.style.background = '#eff6ff'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}>
                            {s}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

// Parameter header component
export const ParamHdr = (props) => {
    const { column, displayName, setCols } = props;
    const [isHovered, setIsHovered] = useState(false);
    const onRename = (e) => {
        e.stopPropagation();
        const newName = prompt('Название:', displayName);
        if (newName && newName.trim()) setCols(cols => cols.map(c => c.key === column.colId ? { ...c, title: newName.trim() } : c));
    };
    const onDelete = (e) => {
        e.stopPropagation();
        if (confirm(`Удалить "${displayName}"?`)) setCols(cols => cols.filter(c => c.key !== column.colId));
    };
    return (
        <div className="param-hdr" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <span onClick={onRename} style={{ flex: 1, cursor: 'pointer' }}>{displayName}</span>
            {isHovered && <span onClick={onDelete} style={{ color: 'red', cursor: 'pointer', marginLeft: '4px' }}>×</span>}
        </div>
    );
};

// Grade header component
export const GradeHdr = (props) => {
    const { column, setCols, cols } = props;
    const colKey = column.colId.replace('_g', '');
    const colDef = cols.find(c => c.key === colKey);
    const weight = colDef ? colDef.weight : 0;
    const onChangeWeight = (e) => {
        e.stopPropagation();
        const n = prompt('Вес (%):', weight);
        if (n && !isNaN(n)) setCols(prev => prev.map(c => c.key === colKey ? { ...c, weight: parseFloat(n) } : c));
    };
    return <div className="grade-hdr" onClick={onChangeWeight}>{weight}%</div>;
};
