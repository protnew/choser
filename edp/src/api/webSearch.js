/**
 * Web Search via DuckDuckGo — finds real sources/proofs for Council pipeline
 * DDG Instant Answer API + HTML fallback
 */
const SEARCH_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

export async function searchWeb(query, maxResults = 5) {
    if (!query || typeof query !== 'string') return [];
    const sanitized = query.trim().slice(0, 300);
    const results = [];

    // Strategy 1: DDG Instant Answer API (JSON)
    try {
        const apiResults = await searchDDGApi(sanitized, maxResults);
        if (apiResults.length > 0) results.push(...apiResults);
    } catch (e) {
        console.warn('[webSearch] DDG API error:', e.message);
    }

    // Strategy 2: DDG HTML fallback
    if (results.length === 0) {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const htmlResults = await searchDDGHtml(sanitized, maxResults);
                if (htmlResults.length > 0) { results.push(...htmlResults); break; }
            } catch (e) {
                console.warn(`[webSearch] DDG HTML attempt ${attempt}:`, e.message);
                if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
    return results.slice(0, maxResults);
}

async function fetchWithTimeout(url, headers) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    try {
        const resp = await fetch(url, { signal: controller.signal, headers });
        clearTimeout(timer);
        return resp;
    } finally { clearTimeout(timer); }
}

async function searchDDGApi(query, maxResults) {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetchWithTimeout(url, { 'User-Agent': 'Mozilla/5.0 (compatible; CouncilBot/1.0)' });
    if (!resp.ok) return [];
    const data = await resp.json();
    const results = [];

    // Abstract (direct answer) — highest priority
    if (data.Abstract && data.AbstractURL) {
        results.unshift({
            title: data.Heading || data.Abstract.slice(0, 80),
            url: data.AbstractURL,
            snippet: data.Abstract.slice(0, 250),
        });
    }
    // Related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
            if (results.length >= maxResults) break;
            if (topic.Text && topic.FirstURL) {
                results.push({ title: topic.Text.slice(0, 120), url: topic.FirstURL, snippet: topic.Text.slice(0, 250) });
            }
            if (topic.Topics && Array.isArray(topic.Topics)) {
                for (const sub of topic.Topics) {
                    if (results.length >= maxResults) break;
                    if (sub.Text && sub.FirstURL) {
                        results.push({ title: sub.Text.slice(0, 120), url: sub.FirstURL, snippet: sub.Text.slice(0, 250) });
                    }
                }
            }
        }
    }
    return results.slice(0, maxResults);
}

async function searchDDGHtml(query, maxResults) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const resp = await fetchWithTimeout(url, { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' });
    if (!resp.ok) return [];
    const html = await resp.text();
    return parseDDGHtml(html, maxResults);
}

function parseDDGHtml(html, maxResults) {
    const results = [];
    const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a/gi;
    const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    const urls = [], titles = [];

    let match;
    while ((match = resultRegex.exec(html)) !== null && urls.length < maxResults) {
        const actualUrl = extractRealUrl(match[1]);
        const title = stripTags(match[2]).trim();
        if (actualUrl && title) { urls.push(actualUrl); titles.push(title); }
    }
    const snippets = [];
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < maxResults) {
        snippets.push(stripTags(match[1]).trim());
    }
    for (let i = 0; i < urls.length; i++) {
        results.push({ title: titles[i] || '', url: urls[i], snippet: snippets[i] || '' });
    }
    return results;
}

function extractRealUrl(href) {
    if (!href) return null;
    const uddgMatch = href.match(/uddg=([^&]+)/);
    if (uddgMatch) { try { return decodeURIComponent(uddgMatch[1]); } catch (_) {} }
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    return null;
}

function stripTags(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

/** Build web context string for prompt injection */
export function buildWebContext(results) {
    if (!results || results.length === 0) return '';
    const lines = ['\n\n## Найденные источники из веб-поиска (используй их как sources/links):'];
    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        lines.push(`${i + 1}. **${r.title}** — ${r.url}`);
        if (r.snippet) lines.push(`   _${r.snippet}_`);
    }
    lines.push('\nОбязательно укажи релевантные URLs в поле "links" твоего JSON ответа.');
    return lines.join('\n');
}
