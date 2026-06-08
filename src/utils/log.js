// ═══════════════════════════════════════════════════════════
// CHOSER LOG — единая система логирования
// Все логи → console + localStorage для чтения без DevTools
// ═══════════════════════════════════════════════════════════

const LOG_KEY = 'choser_log';
const MAX_ENTRIES = 500;

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function readLog() {
    try {
        const raw = localStorage.getItem(LOG_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function writeLog(entries) {
    try {
        if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
        localStorage.setItem(LOG_KEY, JSON.stringify(entries));
    } catch { /* localStorage full — ignore */ }
}

function log(level, tag, message, data) {
    const entry = {
        ts: new Date().toISOString().slice(11, 23),  // HH:MM:SS.mmm
        level,
        tag,
        msg: message,
    };
    if (data !== undefined) {
        try { entry.data = typeof data === 'object' ? JSON.stringify(data).slice(0, 500) : String(data).slice(0, 200); }
        catch { entry.data = String(data).slice(0, 200); }
    }

    // Console — всегда
    const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.info;
    consoleFn(`[${entry.ts}][${level.toUpperCase()}][${tag}] ${message}`, data ?? '');

    // localStorage — всегда
    const entries = readLog();
    entries.push(entry);
    writeLog(entries);
}

export const ChoserLog = {
    error: (tag, msg, data) => log('error', tag, msg, data),
    warn:  (tag, msg, data) => log('warn', tag, msg, data),
    info:  (tag, msg, data) => log('info', tag, msg, data),
    debug: (tag, msg, data) => log('debug', tag, msg, data),

    // Читать лог — для отладки
    getLog: () => readLog(),

    // Читать последние N
    getRecent: (n = 50) => readLog().slice(-n),

    // Читать ошибки
    getErrors: () => readLog().filter(e => e.level === 'error'),

    // Очистить
    clear: () => localStorage.removeItem(LOG_KEY),

    // Распечатать в консоль — для copy-paste
    dump: () => {
        const entries = readLog();
        entries.forEach(e => {
            const prefix = `[${e.ts}][${e.level.toUpperCase()}][${e.tag}]`;
            console.log(prefix, e.msg, e.data || '');
        });
        return entries;
    },
};

// Глобальный доступ — window.ChoserLog
if (typeof window !== 'undefined') {
    window.ChoserLog = ChoserLog;
    window.CL = ChoserLog;  // короткий алиас
}
