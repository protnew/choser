/**
 * Web Search — search API for Council search modes
 * Uses Brave Search API (free tier: 2000 queries/month)
 * Fallback: generates search-based context from LLM knowledge
 */

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY || '';
const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

/**
 * Single web search — returns top results as text
 */
export async function webSearch(query, maxResults = 5) {
    if (!BRAVE_API_KEY) {
        console.log('[Search] No BRAVE_SEARCH_API_KEY, using LLM-knowledge fallback');
        return null; // caller should fallback to no-search mode
    }

    try {
        const t0 = Date.now();
        const resp = await fetch(`${BRAVE_API_URL}?q=${encodeURIComponent(query)}&count=${maxResults}&text_format=raw`, {
            headers: { 'Accept': 'application/json', 'X-Subscription-Token': BRAVE_API_KEY }
        });
        if (!resp.ok) throw new Error(`Brave HTTP ${resp.status}`);
        const data = await resp.json();
        const results = (data.web?.results || []).map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.description || r.text || ''
        }));
        console.log(`[Search] Brave OK in ${Date.now() - t0}ms, ${results.length} results for "${query}"`);
        return results;
    } catch (e) {
        console.warn('[Search] Brave fail:', e.message);
        return null;
    }
}

/**
 * Format search results as text for LLM context
 */
export function formatSearchContext(results, query) {
    if (!results || results.length === 0) return '';
    return `\n\n🔍 ДАННЫЕ ИЗ ИНТЕРНЕТА (запрос: "${query}"):\n${results.map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`).join('\n\n')}\n\nИспользуй эти данные для оценок. Указывай источники.`;
}

/**
 * Generate role-specific search query for each agent
 */
export function getRoleSearchQuery(role, topic) {
    const queries = {
        'ceo': `лучшие ${topic} сравнение рейтинг 2026`,
        'cfo': `${topic} цены стоимость TCO hidden costs 2026`,
        'ciso': `${topic} безопасность privacy compliance data protection`,
        'coo': `${topic} SLA uptime внедрение масштабируемость`,
        'legal': `${topic} юридические риски GDPR terms of service`,
        'chro': `${topic} обучение onboarding команда внедрение`,
        'tech': `${topic} API технические характеристики benchmarks 2026`,
        'user_advocate': `${topic} отзывы пользователей UX community`,
        'critic': `${topic} проблемы минусы риски недостатки`,
        'editor': `${topic} сравнение обзор экспертов 2026`,
    };
    return queries[role] || `${topic} сравнение обзор 2026`;
}
