/**
 * treeBuilder.js — строит дерево решений по УРОВНЯМ.
 *
 * Уровень 0: Корень (Proxi Messenger / Choser EDP)
 * Уровень 1: Архитектурные домены (Бэкенд, Фронтенд, БД, AI, Инфра)
 * Уровень 2: Конкретные технологии в домене
 * Уровень 3: Таблицы выбора
 */

export const TREE_CATEGORIES = [
    {
        name: 'Бэкенд',
        icon: '⚙️',
        keywords: ['api', 'backend', 'бэкенд', 'fastapi', 'django', 'express', 'node', 'сервер', 'rest', 'graphql', 'go ', 'golang', 'rust', 'python', 'java', 'microservice', 'микросервис'],
        subcategories: [
            { name: 'Язык/Фреймворк', keywords: ['go ', 'golang', 'rust', 'python', 'fastapi', 'django', 'node', 'express', 'java', 'spring'] },
            { name: 'API протокол', keywords: ['rest', 'graphql', 'grpc', 'websocket', 'api'] },
            { name: 'Архитектура', keywords: ['microservice', 'микросервис', 'monolith', 'монолит', 'soa', 'ddd'] },
        ],
    },
    {
        name: 'Базы данных',
        icon: '🗄️',
        keywords: ['бд', 'баз данных', 'база данных', 'database', 'sql', 'sqlite', 'postgres', 'mongo', 'redis', 'clickhouse', 'influx', 'cassandra', 'elasticsearch', 'dynamodb'],
        subcategories: [
            { name: 'Реляционные', keywords: ['postgres', 'mysql', 'sqlite', 'mariadb', 'ms sql'] },
            { name: 'NoSQL', keywords: ['mongo', 'redis', 'cassandra', 'dynamodb', ' firestore'] },
            { name: 'Аналитические', keywords: ['clickhouse', 'olap', 'elasticsearch', 'influx'] },
        ],
    },
    {
        name: 'Frontend / UI',
        icon: '🎨',
        keywords: ['react', 'vue', 'angular', 'frontend', 'фронтенд', 'ui', 'css', 'tailwind', 'chart', 'граф', 'визуализ', 'svelte', 'solid'],
        subcategories: [
            { name: 'Фреймворк', keywords: ['react', 'vue', 'angular', 'svelte', 'solid'] },
            { name: 'Графики/Визуализация', keywords: ['chart', 'граф', 'визуализ', 'echarts', 'd3', 'canvas'] },
            { name: 'Стилизация', keywords: ['css', 'tailwind', 'styled', 'sass'] },
        ],
    },
    {
        name: 'AI / LLM',
        icon: '🤖',
        keywords: ['ai', 'ии', 'llm', 'gpt', 'openai', 'embedding', 'машинн', 'нейрон', 'классифик', 'трансформ', 'transformer', 'bert', 'rag'],
        subcategories: [
            { name: 'LLM провайдеры', keywords: ['gpt', 'openai', 'claude', 'llama', 'mistral', 'gemini'] },
            { name: 'ML инструменты', keywords: ['embedding', 'классифик', 'трансформ', 'vector', 'rag'] },
        ],
    },
    {
        name: 'Инфраструктура',
        icon: '🏗️',
        keywords: ['docker', 'kubernetes', 'k8s', 'nginx', 'cloud', 'aws', 'облак', 'deploy', 'cicd', 'инфра', 'terraform', 'ansible', 'monitoring'],
        subcategories: [
            { name: 'Контейнеризация', keywords: ['docker', 'container', 'kubernetes', 'k8s'] },
            { name: 'Облако', keywords: ['aws', 'gcp', 'azure', 'cloud', 'облак'] },
            { name: 'CI/CD', keywords: ['ci', 'cd', 'cicd', 'github action', 'gitlab', 'jenkins'] },
        ],
    },
    {
        name: 'Безопасность',
        icon: '🔒',
        keywords: ['secur', 'безопас', 'auth', 'ssl', 'парол', 'шифр', 'уязв', 'vault', 'jwt', 'oauth'],
        subcategories: [
            { name: 'Аутентификация', keywords: ['auth', 'jwt', 'oauth', 'sso', 'парол'] },
            { name: 'Шифрование', keywords: ['шифр', 'ssl', 'tls', 'vault', 'crypto'] },
        ],
    },
];

/**
 * Строит дерево из таблиц БД.
 * @param {Array} tables — массив таблиц из API
 * @param {string} rootName — имя корня
 * @param {Array} domains — кастомный список доменов (если фильтр активен)
 */
export function buildDecisionTree(tables, rootName = 'Choser EDP', domains, winnersPerBranch = 0) {
    const cats = domains || TREE_CATEGORIES;
    const root = { name: rootName, children: [] };

    for (const cat of cats) {
        let matchingTables = tables.filter(t => {
            const text = ((t.title || '') + ' ' + (t.description || '')).toLowerCase();
            return cat.keywords.some(kw => text.includes(kw));
        });
        if (matchingTables.length === 0) continue;

        const catNode = {
            name: `${cat.icon} ${cat.name}`,
            value: matchingTables.length * 100,
            children: [],
        };

        const usedIds = new Set();
        for (const sub of cat.subcategories) {
            let subTables = matchingTables.filter(t => {
                if (usedIds.has(t.id)) return false;
                const text = ((t.title || '') + ' ' + (t.description || '')).toLowerCase();
                return sub.keywords.some(kw => text.includes(kw));
            });
            if (subTables.length === 0) continue;

            // Sort by utility descending
            subTables.sort((a, b) => (b.utility || 0) - (a.utility || 0));

            // If winnersOnly: keep only top-N per subcategory
            if (winnersPerBranch > 0) {
                subTables = subTables.slice(0, winnersPerBranch);
            }

            const subNode = {
                name: sub.name,
                value: subTables.length * 100,
                children: subTables.map(t => ({
                    name: (t.title || t.id || '').substring(0, 40),
                    value: t.utility || 100,
                    tableId: t.id,
                })),
            };
            subTables.forEach(t => usedIds.add(t.id));
            catNode.children.push(subNode);
        }

        // Remaining tables
        let remaining = matchingTables.filter(t => !usedIds.has(t.id));
        if (remaining.length > 0) {
            remaining.sort((a, b) => (b.utility || 0) - (a.utility || 0));
            if (winnersPerBranch > 0) {
                remaining = remaining.slice(0, winnersPerBranch);
            } else {
                remaining = remaining.slice(0, 10);
            }
            catNode.children.push({
                name: 'Прочее',
                value: remaining.length * 100,
                children: remaining.map(t => ({
                    name: (t.title || t.id || '').substring(0, 40),
                    value: t.utility || 100,
                    tableId: t.id,
                })),
            });
        }

        // Skip empty categories in winners mode
        if (winnersPerBranch > 0 && catNode.children.length === 0) continue;

        root.children.push(catNode);
    }

    return root;
}

export function flattenForGraph(tables, limit = 100, domains) {
    const cats = domains || TREE_CATEGORIES;
    const result = [];
    for (const cat of cats) {
        const matching = tables.filter(t => {
            const text = ((t.title || '') + ' ' + (t.description || '')).toLowerCase();
            return cat.keywords.some(kw => text.includes(kw));
        }).slice(0, Math.floor(limit / cats.length));
        matching.forEach(t => {
            result.push({
                ...t,
                category: cat.name,
                title: (t.title || t.id || '').substring(0, 25),
            });
        });
    }
    return result.slice(0, limit);
}
