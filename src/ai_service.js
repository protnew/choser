/**
 * AI Service — thin orchestrator re-exporting from split modules.
 * Keeps backward compatibility: import { AI_SERVICE } from './ai_service'
 */
import { rawCallZAI } from './ai/callers.js';
import { extractJSON, smartRepair, critiqueTable } from './ai/helpers.js';
import { deepResearch, autoUpdateRow } from './ai/research.js';

async function callWithRepair(env, getText) {
    const text = await getText();
    try {
        const result = extractJSON(text);
        return result;
    } catch (jsonErr) {
        const fixed = await smartRepair(env, text, jsonErr.message);
        return fixed;
    }
}

export const AI_SERVICE = {
    // --- Generation with fallback chain ---
    async _callWithFallback(env, systemPrompt, userMessage) {
        const _debug = [];

        // ZAI only — all other providers removed
        if (env.ZAI_API_KEY) {
            const t0 = Date.now();
            try {
                const model = env.ZAI_MODEL || 'glm-5.1';
                const result = await callWithRepair(env, () => rawCallZAI(env, model, systemPrompt + "\n\nIMPORTANT: Output strictly valid JSON.", userMessage));
                result._model = `ZAI/${model}`;
                _debug.push({ provider: 'ZAI', status: '✅', model, ms: Date.now() - t0 });
                result._debug = _debug; return result;
            } catch (e) {
                _debug.push({ provider: 'ZAI', status: '❌', error: e.message, ms: Date.now() - t0 });
            }
        } else _debug.push({ provider: 'ZAI', status: '⏭️' });

        const summary = _debug.map(d => `${d.provider}: ${d.status} ${d.error || ''}`).join(' | ');
        const err = new Error(`Все AI провайдеры не смогли. ${summary}`);
        err._debug = _debug;
        throw err;
    },

    async generateTable(env, prompt, objCount, paramCount) {
        let systemPrompt = `Ты — эксперт по анализу данных. Создай матрицу принятия решений (СТРОГИЙ JSON).\nПравила: полнота, веса=100%, оценки 0-10, цены USD, русский язык. Каждая ячейка (кроме name и price) ОБЯЗАНА быть объектом вида {"grade": оценка, "value": "подробный текст + ссылка на источник"}.\nФормат: {"id":"slug","title":"Тема","description":"...","columns":[{"key":"p1","title":"Параметр","weight":20,"type":"number","is_inverse":false}],"rows":[{"name":"Объект","price":100,"p1":{"grade":8,"value":"Описание с пруфами и ссылками"}}]}`;
        try {
            if (env.DB) { const s = await env.DB.prepare("SELECT value FROM settings WHERE id = 'system_prompt'").first(); if (s?.value) systemPrompt = s.value; }
        } catch (e) { }

        const result = await this._callWithFallback(env, systemPrompt, `Тема: ${prompt}\nОбъектов: ${objCount || 10}\nПараметров: ${paramCount || 15}`);
        try { const c = await critiqueTable(env, result); result._quality_score = c.overall_score; result._quality_details = c; } catch (e) { result._quality_score = null; }
        return result;
    },

    async generateSimilarTable(env, exampleTable, newTopic, objCount, paramCount) {
        const sp = `Expert Data Analyst. Create table for "${newTopic}" using same column structure.\nColumns: ${JSON.stringify(exampleTable.columns.map(c => ({ title: c.title, weight: c.weight })))}\nOutput JSON only.`;
        return await this._callWithFallback(env, sp, `Create table about "${newTopic}".`);
    },

    async refineTable(env, currentData, instruction) {
        const sp = `Expert Data Analyst. Modify existing table JSON. Output full updated JSON.`;
        return await this._callWithFallback(env, sp, `Current: ${JSON.stringify(currentData).substring(0, 20000)}\nInstruction: ${instruction}`);
    },

    async autoUpdateRow(env, rowData, columns, topic) {
        return await autoUpdateRow(env, rowData, columns, topic);
    },

    async deepResearch(env, topic, opts) {
        return await deepResearch(env, topic, opts);
    },

    // Expose raw caller for council/other modules
    _rawCallZAI: rawCallZAI,
    _extractJSON: extractJSON,
    _smartRepair: smartRepair,
    _critiqueTable: critiqueTable,
};
