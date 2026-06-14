/**
 * Frontend API client with token management and error handling.
 */
const API_BASE = import.meta.env.VITE_API_URL || '';

export const API = {
    token: localStorage.getItem('choser_token'),

    setToken(t) {
        this.token = t;
        if (t) localStorage.setItem('choser_token', t);
        else localStorage.removeItem('choser_token');
    },

    getHeaders() {
        return this.token ? { 'Authorization': 'Bearer ' + this.token } : {};
    },

    /**
     * Generic request method.
     * @param {string} url
     * @param {object} options - fetch options (method, body, etc.)
     * @returns {Promise<object>}
     */
    async request(url, options = {}) {
        const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
        const headers = { ...this.getHeaders(), ...options.headers };
        if (options.body && typeof options.body === 'object') {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        let res;
        try {
            const controller = new AbortController();
            // Council needs long timeout (10 agents × ~20s each)
            const ms = url.includes('/council/') ? 600000 : 15000;
            const timeout = setTimeout(() => controller.abort(), ms);
            res = await fetch(fullUrl, { ...options, headers, signal: controller.signal });
            clearTimeout(timeout);
        } catch (networkError) {
            if (networkError.name === 'AbortError') {
                throw new Error('Таймаут запроса (15 сек). Проверьте интернет.');
            }
            throw new Error(`Network error: ${networkError.message}`);
        }

        if (res.status === 401) {
            this.setToken(null);
            if (window.location.pathname !== '/login') {
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
            }
            throw new Error('Требуется авторизация. Перенаправление на страницу входа...');
        }

        if (!res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('text/html')) {
                throw new Error(`Сервер вернул HTML вместо JSON (HTTP ${res.status}). Возможно, сессия истекла или сервер недоступен.`);
            }
            const errorBody = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(errorBody.error || `HTTP ${res.status}`);
        }

        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
            throw new Error(`Ожидался JSON, получен ${ct || 'неизвестный тип'} (HTTP ${res.status}).`);
        }

        return res.json();
    },

    async get(url) {
        return this.request(url);
    },

    async post(url, body) {
        return this.request(url, { method: 'POST', body });
    },

    async put(url, body) {
        return this.request(url, { method: 'PUT', body });
    },

    async delete(url, body) {
        return this.request(url, { method: 'DELETE', body });
    },
};
