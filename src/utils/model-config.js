/**
 * model-config.js — Пользовательская конфигурация моделей для Choser
 * 
 * Каждый пресет описывает:
 * - models[]: список моделей в порядке приоритета (deep → smart)
 * - passes: сколько проходов делать (1 = генерация, 2 = генерация + критика, 3 = генерация + критика + ремонт)
 * - description: текст для UI
 */

// === Статус тестирования (2026-05-09) ===
// ✅ Работающие free: nemotron-super-120b, nemotron-omni-30b, nemotron-nano-30b, 
//    gpt-oss-120b, laguna-m.1, ring-2.6-1t, minimax-m2.5, nemotron-nano-12b-vl,
//    nemotron-nano-9b, liquid-1.2b
// ⚠️ Всегда 429: hermes-405b, llama-3.3-70b, qwen3-coder, gemma-4-31b
// 💰 Платные через OpenRouter: deepseek-v4-flash, glm-4.7-flash, gpt-4o-mini

export const MODEL_CATALOG = {
    // === Бесплатные (OpenRouter) ===
    'nemotron-super-120b': {
        id: 'nvidia/nemotron-3-super-120b-a12b:free',
        name: 'Nemotron Super 120B',
        params: '120B (12B active)',
        context: 262000,
        provider: 'openrouter',
        pricing: 'free',
        costPer1kTokens: { input: 0, output: 0 },
        tested: '2026-05-09',
        status: 'ok',
        strengths: ['Огромный контекст', 'Глубокий анализ', 'Хороший русский'],
        estimatedTokensPerTable: { input: 3000, output: 4000 }
    },
    'gpt-oss-120b': {
        id: 'openai/gpt-oss-120b:free',
        name: 'GPT-OSS 120B',
        params: '120B',
        context: 131000,
        provider: 'openrouter',
        pricing: 'free',
        costPer1kTokens: { input: 0, output: 0 },
        tested: '2026-05-09',
        status: 'ok',
        strengths: ['OpenAI качество', 'Структурированный вывод'],
        estimatedTokensPerTable: { input: 3000, output: 4000 }
    },
    'nemotron-omni-30b': {
        id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        name: 'Nemotron Omni 30B (reasoning)',
        params: '30B (3B active)',
        context: 256000,
        provider: 'openrouter',
        pricing: 'free',
        costPer1kTokens: { input: 0, output: 0 },
        tested: '2026-05-09',
        status: 'ok',
        strengths: ['Reasoning', 'Критика', 'Анализ ошибок'],
        estimatedTokensPerTable: { input: 3000, output: 4000 }
    },
    'laguna-m1': {
        id: 'poolside/laguna-m.1:free',
        name: 'Poolside Laguna M.1',
        params: '—',
        context: 131000,
        provider: 'openrouter',
        pricing: 'free',
        costPer1kTokens: { input: 0, output: 0 },
        tested: '2026-05-09',
        status: 'ok',
        strengths: ['Код', 'Технические таблицы'],
        estimatedTokensPerTable: { input: 3000, output: 4000 }
    },
    'ring-1t': {
        id: 'inclusionai/ring-2.6-1t:free',
        name: 'Ring 2.6 1T',
        params: '1T total',
        context: 262000,
        provider: 'openrouter',
        pricing: 'free',
        costPer1kTokens: { input: 0, output: 0 },
        tested: '2026-05-09',
        status: 'ok',
        strengths: ['Самая большая модель', '262K контекст'],
        estimatedTokensPerTable: { input: 3000, output: 4000 }
    },
    'minimax-m25': {
        id: 'minimax/minimax-m2.5:free',
        name: 'MiniMax M2.5',
        params: '—',
        context: 197000,
        provider: 'openrouter',
        pricing: 'free',
        costPer1kTokens: { input: 0, output: 0 },
        tested: '2026-05-09',
        status: 'ok',
        strengths: ['197K контекст', 'Китайский + русский'],
        estimatedTokensPerTable: { input: 3000, output: 4000 }
    },
    'nemotron-nano-9b': {
        id: 'nvidia/nemotron-nano-9b-v2:free',
        name: 'Nemotron Nano 9B',
        params: '9B',
        context: 128000,
        provider: 'openrouter',
        pricing: 'free',
        costPer1kTokens: { input: 0, output: 0 },
        tested: '2026-05-09',
        status: 'ok',
        strengths: ['Быстрая', 'Ремонт JSON'],
        estimatedTokensPerTable: { input: 2000, output: 2000 }
    },

    // === Платные (OpenRouter) ===
    'deepseek-v4-flash': {
        id: 'deepseek/deepseek-v4-flash',
        name: 'DeepSeek V4 Flash',
        params: '—',
        context: 576000,
        provider: 'openrouter',
        pricing: 'paid',
        costPer1kTokens: { input: 0.00014, output: 0.00028 },
        tested: '2026-05-09',
        status: 'ok',
        strengths: ['Лучшая цена/качество', '576K контекст'],
        estimatedTokensPerTable: { input: 3000, output: 4000 },
        estimatedCostPerTable: '$0.001'
    },
    'glm-47-flash': {
        id: 'z-ai/glm-4.7-flash',
        name: 'GLM 4.7 Flash',
        params: '—',
        context: 752000,
        provider: 'openrouter',
        pricing: 'paid',
        costPer1kTokens: { input: 0.00006, output: 0.00040 },
        tested: '2026-05-09',
        status: 'ok',
        strengths: ['Дешёвая', '752K контекст', 'Русский язык'],
        estimatedTokensPerTable: { input: 3000, output: 4000 },
        estimatedCostPerTable: '$0.001'
    },
    'gpt-4o-mini': {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        params: '—',
        context: 128000,
        provider: 'openrouter',
        pricing: 'paid',
        costPer1kTokens: { input: 0.00015, output: 0.00060 },
        tested: '2026-05-09',
        status: 'ok',
        strengths: ['OpenAI качество', 'Дешёвый'],
        estimatedTokensPerTable: { input: 3000, output: 4000 },
        estimatedCostPerTable: '$0.003'
    },
    'glm-51': {
        id: 'z-ai/glm-5.1',
        name: 'GLM 5.1',
        params: '—',
        context: 752000,
        provider: 'openrouter',
        pricing: 'paid',
        costPer1kTokens: { input: 0.00105, output: 0.00350 },
        tested: '2026-05-09',
        status: 'ok',
        strengths: ['Лучший русский', '752K контекст', 'Рассуждения'],
        estimatedTokensPerTable: { input: 3000, output: 4000 },
        estimatedCostPerTable: '$0.017'
    },

    // === Прямой доступ ===
    'glm-51-direct': {
        id: 'glm-5.1',
        name: 'GLM 5.1 (прямой ZAI)',
        params: '—',
        context: 752000,
        provider: 'zai',
        pricing: 'subscription',
        costPer1kTokens: { input: 0, output: 0 },  // По подписке
        tested: '2026-05-09',
        status: 'rate-limited',
        strengths: ['По подписке', 'Без OpenRouter наценки'],
        estimatedTokensPerTable: { input: 3000, output: 4000 },
        estimatedCostPerTable: 'По подписке ZAI'
    }
};

// === Пресеты ===
export const MODEL_PRESETS = {
    'free': {
        name: '🆓 Бесплатный',
        description: 'Только бесплатные модели через OpenRouter. 0 рублей за генерацию.',
        models: ['nemotron-super-120b', 'gpt-oss-120b', 'nemotron-omni-30b', 'laguna-m1', 'ring-1t'],
        criticModel: 'nemotron-omni-30b',  // Reasoning model для критики
        repairModels: ['nemotron-nano-9b', 'nemotron-nano-9b'],
        passes: 2,  // генерация + критика
        estimatedTotalTokens: '~15-25K',
        estimatedCost: '$0.00',
        links: {
            test: 'https://openrouter.ai/playground',
            pricing: 'https://openrouter.ai/docs/limits'
        }
    },
    'mixed': {
        name: '🔀 Смешанный',
        description: 'Дешёвые платные + бесплатные. Оптимальное соотношение цена/качество.',
        models: ['deepseek-v4-flash', 'nemotron-super-120b', 'glm-47-flash', 'gpt-oss-120b', 'minimax-m25'],
        criticModel: 'nemotron-omni-30b',
        repairModels: ['nemotron-nano-9b', 'glm-47-flash'],
        passes: 2,
        estimatedTotalTokens: '~15-25K',
        estimatedCost: '$0.003 за Council',
        links: {
            test: 'https://openrouter.ai/playground',
            pricing: 'https://openrouter.ai/models'
        }
    },
    'premium': {
        name: '👑 Премиум',
        description: 'Только платные модели высшего качества.',
        models: ['glm-51', 'gpt-4o-mini', 'glm-47-flash', 'deepseek-v4-flash', 'gpt-4o-mini'],
        criticModel: 'glm-51',
        repairModels: ['glm-47-flash', 'deepseek-v4-flash'],
        passes: 3,  // генерация + критика + финальная полировка
        estimatedTotalTokens: '~20-35K',
        estimatedCost: '$0.02-0.05 за Council',
        links: {
            test: 'https://openrouter.ai/playground',
            pricing: 'https://openrouter.ai/models'
        }
    },
    'zai-only': {
        name: '🇨🇳 ZAI подписка',
        description: 'Только GLM через подписку ZAI (без OpenRouter).',
        models: ['glm-51-direct'],
        criticModel: 'glm-51-direct',
        repairModels: ['glm-51-direct'],
        passes: 2,
        estimatedTotalTokens: '~15-25K',
        estimatedCost: 'По подписке',
        links: {
            test: 'https://open.bigmodel.cn/dev/howuse/glm-5',
            pricing: 'https://open.bigmodel.cn/pricing'
        }
    }
};

/**
 * Получить конфигурацию моделей для текущего пресета
 * @param {string} presetName - имя пресета ('free', 'mixed', 'premium', 'zai-only')
 * @param {object} env - переменные окружения (проверка наличия ключей)
 * @returns {object} - { models, criticModel, repairModels, passes, info }
 */
export function getModelConfig(presetName = 'free', env = {}) {
    const preset = MODEL_PRESETS[presetName] || MODEL_PRESETS['free'];
    
    // Фильтруем модели по доступности ключей
    const availableModels = preset.models.map(key => {
        const catalog = MODEL_CATALOG[key];
        if (!catalog) return null;
        
        // Проверяем наличие ключа
        if (catalog.provider === 'openrouter' && !env.OPENROUTER_API_KEY) return null;
        if (catalog.provider === 'zai' && !env.ZAI_API_KEY) return null;
        if (catalog.provider === 'groq' && !env.GROQ_API_KEY) return null;
        
        return catalog;
    }).filter(Boolean);

    const critic = MODEL_CATALOG[preset.criticModel];
    const repairs = preset.repairModels.map(k => MODEL_CATALOG[k]).filter(Boolean);

    return {
        models: availableModels,
        criticModel: critic,
        repairModels: repairs,
        passes: preset.passes,
        info: {
            name: preset.name,
            description: preset.description,
            estimatedTotalTokens: preset.estimatedTotalTokens,
            estimatedCost: preset.estimatedCost,
            links: preset.links
        }
    };
}

/**
 * Рассчитать примерную стоимость генерации
 * @param {object} model - модель из MODEL_CATALOG
 * @param {number} inputTokens - примерное кол-во входных токенов
 * @param {number} outputTokens - примерное кол-во выходных токенов
 * @returns {string} - стоимость в долларах
 */
export function estimateCost(model, inputTokens = 3000, outputTokens = 4000) {
    if (model.pricing === 'free' || model.pricing === 'subscription') return '$0.00';
    const cost = (inputTokens / 1000) * model.costPer1kTokens.input + 
                 (outputTokens / 1000) * model.costPer1kTokens.output;
    return `$${cost.toFixed(4)}`;
}
