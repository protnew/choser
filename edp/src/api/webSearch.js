import { search } from 'duck-duck-scrape';

/**
 * Выполняет поиск по сети с помощью DuckDuckGo.
 * @param {string} query - Поисковый запрос
 * @param {number} maxResults - Максимальное количество результатов (URL)
 * @returns {Promise<string[]>} Массив URL-адресов
 */
export async function fetchWebSources(query, maxResults = 5) {
    try {
        console.log(`[webSearch] Searching DDG for: "${query}"`);
        const searchResults = await search(query, {
            time: 'y'
        });

        if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
            console.warn(`[webSearch] No results found for: "${query}"`);
            return [];
        }

        const urls = searchResults.results
            .slice(0, maxResults)
            .map(result => result.url);

        console.log(`[webSearch] Found ${urls.length} URLs for "${query}"`);
        return urls;
    } catch (e) {
        console.error(`[webSearch] Error searching DDG for "${query}":`, e.message);
        return [];
    }
}
