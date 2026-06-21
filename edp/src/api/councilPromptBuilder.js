/**
 * Council Prompt Builder — prompt construction, table context, trimming, post-validation
 * Extracted from councilStream.js for maintainability.
 */

/**
 * Normalize a name for fuzzy matching: lowercase, trim, remove extra spaces
 */
function normalize(name) {
    return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Find best fuzzy match for a name in a list of candidates.
 * Returns the original candidate name (with original case) or null.
 */
function fuzzyMatch(name, candidates) {
    const norm = normalize(name);
    // Exact match first
    if (candidates.includes(name)) return name;
    // Normalized exact
    for (const c of candidates) {
        if (normalize(c) === norm) return c;
    }
    // Starts with
    for (const c of candidates) {
        if (normalize(c).startsWith(norm) || norm.startsWith(normalize(c))) return c;
    }
    // Contains
    for (const c of candidates) {
        if (normalize(c).includes(norm) || norm.includes(normalize(c))) return c;
    }
    return null;
}

/**
 * Post-validate scores: trim to numObjects/numParams if LLM returned extras.
 * Uses fuzzy matching — LLM often returns "ChatGPT Plus (GPT-4)" instead of "ChatGPT Plus".
 */
function postValidateScores(scores, maxObjects, maxParams, expectedObjNames, expectedParamNames) {
    if (!scores || typeof scores !== 'object') return scores;
    const result = {};
    const objNames = Object.keys(scores);

    if (expectedObjNames.length > 0) {
        // Fuzzy-match expected objects to actual LLM output
        for (const expectedObj of expectedObjNames) {
            const matched = fuzzyMatch(expectedObj, objNames);
            if (!matched) continue;
            if (typeof scores[matched] !== 'object') continue;
            result[expectedObj] = {};

            const paramKeys = Object.keys(scores[matched]);
            if (expectedParamNames.length > 0) {
                // Fuzzy-match expected params
                for (const expectedParam of expectedParamNames) {
                    const matchedParam = fuzzyMatch(expectedParam, paramKeys);
                    if (matchedParam && scores[matched][matchedParam] !== undefined) {
                        result[expectedObj][expectedParam] = scores[matched][matchedParam];
                    }
                }
            } else {
                // No expected params — keep first maxParams
                const kept = paramKeys.slice(0, maxParams);
                for (const p of kept) {
                    result[expectedObj][p] = scores[matched][p];
                }
            }
        }
    } else {
        // No expected objects — keep first maxObjects with first maxParams
        const keptObjs = objNames.slice(0, maxObjects);
        for (const obj of keptObjs) {
            if (typeof scores[obj] !== 'object') continue;
            result[obj] = {};
            const paramKeys = Object.keys(scores[obj]);
            const keptParams = expectedParamNames.length > 0 ? expectedParamNames : paramKeys.slice(0, maxParams);
            for (const param of keptParams) {
                if (scores[obj][param] !== undefined) {
                    result[obj][param] = scores[obj][param];
                }
            }
        }
    }
    return result;
}

/**
 * Build the strict JSON prompt for a council persona
 * Now includes tableContext with explicit object/parameter lists
 */
function buildPrompt(persona, topic, userQuestion, tableContext, nP, nO, trimmedObjNames, trimmedParamNames, tokenBudget) {
    const exactObjCount = trimmedObjNames.length || nO;
    const exactParamCount = trimmedParamNames.length || nP;
    const objList = trimmedObjNames.length > 0
        ? `ОБЪЕКТЫ (СТРОГО ${exactObjCount}, используй ТОЛЬКО эти названия):\n${trimmedObjNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
        : `Объекты: РОВНО ${nO} объекта. Выбери ${nO} наиболее релевантных темы.`;
    const paramList = trimmedParamNames.length > 0
        ? `ПАРАМЕТРЫ (СТРОГО ${exactParamCount}, используй ТОЛЬКО эти названия):\n${trimmedParamNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
        : `Параметры: РОВНО ${nP} параметра. Выбери ${nP} наиболее важных для сравнения.`;

    const budgetNote = tokenBudget ? `\n\n# БЮДЖЕТ ТОКЕНОВ: ${tokenBudget}. Уложись в лимит — не добавляй лишних объектов и параметров.` : '';

    return `# ЗАДАЧА (ВЫПОЛНИТЬ СТРОГО):
Ты — ${persona.name} (${persona.role}).
Оцени РОВНО ${exactObjCount} объектов по РОВНО ${exactParamCount} параметрам.
ВЕРНИ ТОЛЬКО JSON. Никакого текста до или после JSON.${budgetNote}

# ТЕМА:
${topic || userQuestion}

# КОНТЕКСТ:
${tableContext || 'Оценивай на основе собственных знаний.'}

# ${objList}

# ${paramList}

!!! АБСОЛЮТНЫЙ ЗАПРЕТ:
- НЕ добавляй объекты сверх списка выше (${exactObjCount} максимум)
- НЕ добавляй параметры сверх списка выше (${exactParamCount} максимум)
- НЕ пропускай ячейки (каждый объект × каждый параметр = оценка)
- НЕ пиши текст до { и после }

# ФОРМАТ ОТВЕТА (JSON):
{
  "scores": {
    "Объект1": {
      "Параметр1": { "grade": 8, "reason": "Конкретное обоснование с цифрами", "source": "https://..." },
      "Параметр2": { "grade": 7, "reason": "Почему 7 — факты", "source": "https://..." }
    },
    "Объект2": {
      "Параметр1": { "grade": 6, "reason": "Обоснование", "source": "https://..." },
      "Параметр2": { "grade": 9, "reason": "Обоснование", "source": "https://..." }
    }
  },
  "prices": { "Объект1": "$20/мес", "Объект2": "$39/мес" },
  "links": { "Объект1": "https://...", "Объект2": "https://..." },
  "recommendation": "название лучшего",
  "confidence": 8,
  "score": 75
}

ПРАВИЛА:
- scores: РОВНО ${exactObjCount} ключей (объекты) × РОВНО ${exactParamCount} ключей (параметры) = ${exactObjCount * exactParamCount} ячеек
- grade: число 1-10
- reason: 1-2 предложения с фактами
- source: URL или "данные из базы знаний"
- prices: цена для КАЖДОГО объекта
- links: URL для КАЖДОГО объекта
- ТОЛЬКО JSON. Начни с { и закончи }`;
}

/**
 * Build a correction prompt when LLM returned wrong dimensions
 */
function buildCorrectionPrompt(originalResponse, expectedObjCount, expectedParamCount, expectedObjNames, expectedParamNames) {
    const objHint = expectedObjNames.length > 0
        ? `Нужные объекты: ${expectedObjNames.join(', ')}`
        : `Нужно объектов: ${expectedObjCount}`;
    const paramHint = expectedParamNames.length > 0
        ? `Нужные параметры: ${expectedParamNames.join(', ')}`
        : `Нужно параметров: ${expectedParamCount}`;

    return `ТВОЙ ПРЕДЫДУЩИЙ ОТВЕТ СОДЕРЖИТ ОШИБКУ:
- Требуется: ${expectedObjCount} объектов × ${expectedParamCount} параметров
- ${objHint}
- ${paramHint}
- КАЖДАЯ ячейка должна иметь {grade, reason, source}

ИСПРАВЬ И ВЕРНИ ТОЛЬКО КОРРЕКТНЫЙ JSON с РОВНО ${expectedObjCount} объектами и РОВНО ${expectedParamCount} параметрами.`;
}

/**
/**
 * Build table context from DB — trimming columns/rows as needed.
 * Returns { tableContext, trimmedObjNames, trimmedParamNames }
 */
function buildTableContext(db, tableId, effectiveNumParams, effectiveNumObjects) {
    let tableContext = '';
    let trimmedObjNames = [];
    let trimmedParamNames = [];

    if (!tableId) return { tableContext, trimmedObjNames, trimmedParamNames };

    try {
        const table = db.prepare('SELECT title, description FROM tables WHERE id = ?').bind(tableId).get();
        if (table) {
            const colDef = db.prepare('SELECT definition FROM columns WHERE table_id = ?').bind(tableId).get();
            const rowsData = db.prepare('SELECT data FROM rows WHERE table_id = ? LIMIT 20').bind(tableId).all();
            let columns = colDef ? JSON.parse(colDef.definition) : [];
            let rows = rowsData.map(r => JSON.parse(r.data));

            // Trim columns by weight (top-N)
            if (effectiveNumParams && columns.length > effectiveNumParams) {
                columns = [...columns].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, effectiveNumParams);
            }
            // Trim rows (first-N)
            if (effectiveNumObjects && rows.length > effectiveNumObjects) {
                rows = rows.slice(0, effectiveNumObjects);
            }

            trimmedParamNames = columns.map(col => col.title);
            trimmedObjNames = rows.map(r => r.name || JSON.stringify(r)).filter(n => n && n !== '{}');

            tableContext = '\nТаблица "' + table.title + '": ' + (table.description || '') +
                '\nКритерии (' + columns.length + '): ' + columns.map(col => col.title + ' (' + col.weight + '%)').join(', ') +
                '\nОбъекты (' + rows.length + '): ' + trimmedObjNames.join(', ') +
                '\nДанные: ' + JSON.stringify(rows).substring(0, 6000) + '\n';
        }
    } catch (e) { console.warn('[CouncilStream] Table context failed:', e.message); }

    return { tableContext, trimmedObjNames, trimmedParamNames };
}

export {
    normalize,
    fuzzyMatch,
    postValidateScores,
    buildPrompt,
    buildCorrectionPrompt,
    buildTableContext,
};
