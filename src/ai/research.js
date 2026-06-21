/**
 * Deep Research — multi-phase internet research using Gemini + Google Search Grounding
 * Also: autoUpdateRow using Search Grounding
 */
import { rawCallGemini } from './callers.js';
import { extractJSON, smartRepair } from './helpers.js';

export async function deepResearch(env, topic, { phase = 'overview', previousData = null } = {}) {
    if (!env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is missing for Deep Research.");

    const phases = {
        overview: { prompt: `# ЗАДАЧА: Обзорное исследование\n\nПроведи широкий обзор по теме: "${topic}".\nНайди основных игроков/варианты, ключевые характеристики.\n\nПРАВИЛА:\n1. Минимум 7-10 объектов\n2. Для каждого: название, цена (USD), 5-8 ключевых параметров\n3. Веса = 100%\n4. Оценки 0-10\n5. Возвращай ТОЛЬКО JSON в формате Choser\n\nФормат:\n{"title":"Тема","description":"Обоснование","columns":[{"key":"p1","title":"Параметр","weight":20,"type":"number","is_inverse":false}],"data":[{"name":"Объект","price":100,"p1":{"grade":8,"value":"Значение"}}]}` },
        deep_dive: { prompt: `# ЗАДАЧА: Углублённое исследование\n\nТема: "${topic}"\n\nРанее собранные данные:\n${previousData ? JSON.stringify(previousData).substring(0, 12000) : 'Нет данных'}\n\nЗАДАНИЕ:\n1. Проверь КАЖДЫЙ объект — актуальны ли цены и характеристики?\n2. Заполни пустые ячейки\n3. Уточни оценки на основе фактов\n4. Добавь новые объекты если нашёл\n5. Возвращай ПОЛНЫЙ обновлённый JSON.` },
        verification: { prompt: `# ЗАДАЧА: Верификация и финальная калибровка\n\nТема: "${topic}"\n\nДанные для верификации:\n${previousData ? JSON.stringify(previousData).substring(0, 12000) : 'Нет данных'}\n\nЗАДАНИЕ:\n1. Перекрёстно проверь данные\n2. Нет ли завышенных оценок? Нужен разброс\n3. Все ли цены актуальны?\n4. Проверь веса\n5. Убери дубликаты\n\nВозвращай ФИНАЛЬНЫЙ JSON.` }
    };

    const phaseConfig = phases[phase] || phases.overview;
    const model = "gemini-2.5-flash";
    console.log(`[AI] Deep Research phase: ${phase} for "${topic}" using ${model}...`);

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GOOGLE_API_KEY}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: phaseConfig.prompt }] }],
            tools: [{ googleSearch: {} }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        };
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        const data = await response.json();
        if (!data.candidates?.[0]?.content) throw new Error("No candidates");
        const text = data.candidates[0].content.parts[0].text;
        try {
            const result = extractJSON(text);
            result._model = `${model} (+Search)`;
            result._phase = phase;
            return result;
        } catch (jsonErr) {
            const fixed = await smartRepair(env, text, jsonErr.message);
            fixed._model = `${model} (+Search & Fixer)`;
            fixed._phase = phase;
            return fixed;
        }
    } catch (e) {
        throw new Error(`Deep Research (${phase}) failed: ${e.message}`);
    }
}

export async function autoUpdateRow(env, rowData, columns, topic) {
    if (!env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is missing for AutoUpdate.");

    const systemPrompt = `You are an expert Data Analyst and Researcher.\nUpdate an existing object in a comparison table with CURRENT internet data.\n\nTopic: ${topic || "Объекты"}\nObject: ${rowData.name || "Неизвестно"}\nColumns: ${JSON.stringify(columns.map(c => ({ key: c.key, title: c.title, weight: c.weight, type: c.type })))}\nCurrent Data: ${JSON.stringify(rowData)}\n\nOutput: JSON ONLY (same structure, updated values).\n1. Return ONLY valid JSON\n2. Re-evaluate grades (1-10)\n3. Update price if found\n4. Add "_update_notes" with description of changes`;

    const model = "gemini-2.5-pro";
    console.log(`[AI] Auto-updating row: ${rowData.name} via Gemini + Search...`);

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GOOGLE_API_KEY}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
            tools: [{ googleSearch: {} }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        };
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        const data = await response.json();
        if (!data.candidates?.[0]?.content) throw new Error("No candidates");
        const text = data.candidates[0].content.parts[0].text;
        try {
            const result = extractJSON(text);
            result._model = `${model} (+Search)`;
            return result;
        } catch (jsonErr) {
            const fixed = await smartRepair(env, text, jsonErr.message);
            fixed._model = `${model} (+Search & Fixer)`;
            return fixed;
        }
    } catch (e) {
        throw new Error(`AutoUpdate failed: ${e.message}`);
    }
}
