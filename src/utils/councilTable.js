/**
 * Council table utilities — extract & build Choser-format comparison tables from council votes
 * Extracted from DecisionPage.jsx (was ~175 lines)
 */
import { calc } from './calc';

export function extractJSON(text) {
    if (!text) return null;
    // Try ```json ... ```
    const m = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (m) { try { return JSON.parse(m[1]); } catch {} }
    // Try raw JSON (full text)
    try { return JSON.parse(text); } catch {}
    // Try first { ... last } in text
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        try { return JSON.parse(text.substring(firstBrace, lastBrace + 1)); } catch {}
    }
    // Try first balanced { ... } via brace counting
    if (firstBrace >= 0) {
        let depth = 0;
        for (let i = firstBrace; i < text.length; i++) {
            if (text[i] === '{') depth++;
            if (text[i] === '}') depth--;
            if (depth === 0) {
                try { return JSON.parse(text.substring(firstBrace, i + 1)); } catch {}
                break;
            }
        }
    }
    return null;
}

export function stripMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/```[\s\S]*?```/g, m => m.replace(/```\w*\n?/g, '').trim())
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/___/g, '').replace(/__/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '• ')
        .replace(/^\s*\d+\.\s+/gm, m => m.trim() + ' ');
}

const PARAM_ALIASES = {
    'цена': ['цена','стоимость','цена_качество','price','cost'],
    'качество_кода': ['качество_кода','генерация_кода','качество_генерации_кода','code_quality'],
    'контекст': ['контекст','контекстное_окно','context_window','размер_контекстного_окна'],
    'лимиты': ['лимиты','лимиты_токенов','token_limits','лимит'],
    'api': ['api','api_доступ','доступ_к_api','api_access'],
    'скорость': ['скорость','скорость_ответа','speed','скорость_внедрения'],
    'мультимодальность': ['мультимодальность','multimodal','multimodality'],
    'интеграции': ['интеграции','integrations','ide_integration'],
    'безопасность': ['безопасность','приватность','privacy','security','gdpr'],
    'tco': ['tco','прогнозируемость','скрытые_расходы','стоимость_на_человека','цена_токен'],
    'экосистема': ['экосистема','community','сообщество','поддержка'],
    'документация': ['документация','documentation','learning','обучение'],
    'модели': ['модели','количество_моделей','models'],
    'агенты': ['агенты','autonomous','кастомизация','гибкость'],
    'sla': ['sla','uptime','операционные_риски','масштабируемость'],
    'ux': ['ux','пользовательский_опыт','обучаемость','порог_входа'],
    'кастомизация': ['кастомизация','fine_tuning','настройка','гибкость'],
};

export function normalizeParam(rawParam) {
    const n = rawParam.replace(/[_\-\s]+/g, '_').toLowerCase();
    for (const [canonical, aliases] of Object.entries(PARAM_ALIASES)) {
        if (aliases.some(a => n.includes(a) || a === n)) return canonical;
    }
    return n;
}

/**
 * Build Choser-compatible table data from council votes.
 * Returns { rows, columns } in Choser format.
 */
export function buildComparisonTable(votes) {
    const allObjects = new Map();
    const paramSet = new Map();
    const analysisTexts = new Map();
    for (const v of votes) {
        // Use pre-parsed scores from SSE if available, fallback to extractJSON
        let j = null;
        if (v.scores && typeof v.scores === 'object' && Object.keys(v.scores).length > 0) {
            // Scores already parsed by backend — use directly
            j = { scores: v.scores, prices: v.prices, links: v.links, analysis: null };
        } else {
            // Fallback: parse from raw response text
            j = extractJSON(v.response);
        }
        if (!j?.scores) continue;
        if (j.analysis) {
            if (!analysisTexts.has('__all__')) analysisTexts.set('__all__', []);
            analysisTexts.get('__all__').push({ agent: v.name || v.persona, text: j.analysis });
        }
        for (const [objName, params] of Object.entries(j.scores)) {
            if (typeof params !== 'object') continue;
            if (!allObjects.has(objName)) allObjects.set(objName, {});
            const obj = allObjects.get(objName);
            for (const [rawParam, val] of Object.entries(params)) {
                const canonical = normalizeParam(rawParam);
                if (!paramSet.has(canonical)) paramSet.set(canonical, rawParam);
                if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                    if (val.grade !== undefined) {
                        const num = typeof val.grade === 'number' ? val.grade : parseFloat(val.grade);
                        if (!isNaN(num)) {
                            if (!obj[canonical]) obj[canonical] = { values: [], texts: [], sources: [] };
                            obj[canonical].values.push(num);
                            if (val.reason) obj[canonical].texts.push(String(val.reason));
                            if (val.source) obj[canonical].sources.push(String(val.source));
                        }
                    } else {
                        for (const [subKey, subVal] of Object.entries(val)) {
                            const subCanonical = normalizeParam(subKey);
                            const num = typeof subVal === 'number' ? subVal : parseFloat(subVal);
                            if (!isNaN(num)) {
                                if (!obj[subCanonical]) obj[subCanonical] = { values: [], texts: [], sources: [] };
                                obj[subCanonical].values.push(num);
                                if (!paramSet.has(subCanonical)) paramSet.set(subCanonical, subKey);
                            }
                        }
                    }
                } else {
                    const num = typeof val === 'number' ? val : parseFloat(val);
                    if (!isNaN(num)) {
                        if (!obj[canonical]) obj[canonical] = { values: [], texts: [], sources: [] };
                        obj[canonical].values.push(num);
                        if (j.analysis) {
                            obj[canonical].texts.push(`${v.name || '?'}: ${j.analysis.substring(0, 150)}`);
                        }
                    }
                }
            }
        }
    }
    const params = [...paramSet.keys()];
    const weight = params.length > 0 ? Math.round(100 / params.length) : 10;
    const columns = params.map(p => ({ key: p, title: (paramSet.get(p) || p).replace(/_/g, ' '), weight, type: 'number', editable: false }));

    const rows = [...allObjects.keys()].map(name => {
        const raw = allObjects.get(name);
        const row = { id: 'dec_' + Math.random().toString(36).substr(2, 9), name };
        for (const p of params) {
            const d = raw[p];
            if (d && d.values.length > 0) {
                const avg = Math.round(d.values.reduce((a, b) => a + b, 0) / d.values.length * 10) / 10;
                const rounded = Math.max(0, Math.min(10, Math.round(avg)));  // clamp to [0,10]
                let explanation = '';
                if (d.texts.length > 0) {
                    explanation = d.texts.join(' | ');
                    if (explanation.length > 120) explanation = explanation.substring(0, 117) + '...';
                } else {
                    explanation = `${rounded}/10`;
                }
                // Append source links if available
                if (d.sources && d.sources.length > 0) {
                    const uniqueSources = [...new Set(d.sources.filter(s => s))];
                    for (const src of uniqueSources) {
                        if (src.startsWith('http')) {
                            explanation += ` [🔗](${src})`;
                        } else {
                            explanation += ` (${src})`;
                        }
                    }
                }
                row[p] = { grade: rounded, value: explanation };
            } else {
                row[p] = { grade: 0, value: '—' };
            }
        }
        const priceMap = {};
        const linkMap = {};
        for (const v of votes) {
            // Prefer pre-parsed prices/links, fallback to extractJSON
            const prices = v.prices || extractJSON(v.response)?.prices;
            const links = v.links || extractJSON(v.response)?.links;
            const analysis = extractJSON(v.response)?.analysis;
            if (prices) {
                for (const [k, p] of Object.entries(prices)) {
                    if (!priceMap[k]) priceMap[k] = String(p);
                }
            }
            if (links) {
                for (const [k, l] of Object.entries(links)) {
                    if (!linkMap[k]) linkMap[k] = String(l);
                }
            }
            if (analysis) {
                for (const objName of allObjects.keys()) {
                    if (!priceMap[objName]) {
                        const priceMatch = analysis.match(new RegExp(objName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*?(\\$\\d+[/.]\\d*)', 'i'));
                        if (priceMatch) priceMap[objName] = priceMatch[1];
                    }
                }
            }
        }
        const fallbackPrices = {
            'Claude Pro': '$20/мес', 'Claude Pro (Anthropic)': '$20/мес', 'ChatGPT Plus': '$20/мес',
            'ChatGPT Plus (OpenAI)': '$20/мес', 'Gemini Advanced': '$19.99/мес', 'Gemini Advanced (Google)': '$19.99/мес',
            'Cursor Pro': '$20/мес', 'Perplexity Pro': '$20/мес', 'Claude Team': '$30/мес',
            'ChatGPT Team': '$25/мес',
        };
        row.price = priceMap[name] || fallbackPrices[name] || '—';
        row.link = linkMap[name] || '';
        row.notes = '';
        const c = calc(row, columns);
        row._u = c.s;
        row._up = c.up;
        return row;
    });
    rows.sort((a, b) => (b._u || 0) - (a._u || 0));
    if (rows.length > 0 && rows[0]._u > 0) rows[0].name = '👑 ' + rows[0].name;
    return { rows, columns };
}

export const TEST_TOPIC = 'Сравнение 5 смартфонов по 6 параметрам:\n1. Цена ($)\n2. Производительность (AnTuTu, баллы)\n3. Камера (оценка 1-10)\n4. Батарея (мАч)\n5. Экран (оценка 1-10)\n6. Экосистема (оценка 1-10)\n\nБюджет: до $1200. Цель: лучший смартфон для повседневного использования и фото.\n\nКандидаты:\n1. Samsung Galaxy S25 Ultra — $1099, Snapdragon 8 Elite, 200 МП камера, 5000 мАч, 6.9" AMOLED\n2. iPhone 16 Pro Max — $1199, A18 Pro, 48 МП камера, 4685 мАч, 6.9" OLED\n3. Google Pixel 9 Pro — $899, Tensor G4, 50 МП камера, 4700 мАч, 6.3" OLED\n4. Xiaomi 15 Pro — $699, Snapdragon 8 Elite, 50 МП камера, 5400 мАч, 6.73" AMOLED\n5. OnePlus 13 — $599, Snapdragon 8 Elite, 50 МП камера, 6000 мАч, 6.82" AMOLED';
