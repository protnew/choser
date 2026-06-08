/**
 * Council Templates — preset prompts for different decision types
 * Injected into buildPrompt() based on user-selected template
 */

export const COUNCIL_TEMPLATES = {
    b2b: {
        id: 'b2b',
        name: 'B2B Vendor Selection',
        description: 'Выбор вендора/подрядчика для B2B',
        params: ['Цена лицензии', 'Скорость внедрения', 'Поддержка 24/7', 'Интеграции', 'Безопасность', 'Масштабируемость'],
        extraPrompt: `Дополнительные правила B2B:
- Учитывай TCO (Total Cost of Ownership) на 3 года
- Оценивай риски vendor lock-in
- Учитывай SLA и штрафы за нарушение
- Оценивай наличие локальной поддержки`,
    },
    b2c: {
        id: 'b2c',
        name: 'B2C Product Choice',
        description: 'Выбор потребительского продукта/сервиса',
        params: ['Цена', 'Качество', 'UX/Удобство', 'Репутация бренда', 'Гарантия', 'Доступность'],
        extraPrompt: `Дополнительные правила B2C:
- Учитывай соотношение цена/качество
- Оценивай отзывы реальных пользователей
- Учитывай удобство возврата/обмена
- Оценивай наличие в регионе пользователя`,
    },
    tech: {
        id: 'tech',
        name: 'Technology Stack',
        description: 'Выбор технологии/фреймворка/сервиса',
        params: ['Производительность', 'Документация', 'Community', 'Стоимость', 'Кривая обучения', 'Longevity'],
        extraPrompt: `Дополнительные правила технического выбора:
- Учитывай зрелость технологии (how long in production)
- Оценивай размер community и активность на GitHub
- Учитывай наличие talent pool на рынке
- Оценивай migration path если технология устареет`,
    },
    financial: {
        id: 'financial',
        name: 'Financial Decision',
        description: 'Финансовое решение (инвестиция, кредит, страхование)',
        params: ['Доходность/ROI', 'Риск', 'Ликвидность', 'Комиссии', 'Налоги', 'Регулирование'],
        extraPrompt: `Дополнительные правила финансового выбора:
- Учитывай NPV (Net Present Value) на 5 лет
- Оценивай risk-adjusted return
- Учитывай инфляцию и валютные риски
- Оценивай tax implications`,
    },
    hiring: {
        id: 'hiring',
        name: 'Hiring/HR Decision',
        description: 'Выбор кандидата/сервиса HR',
        params: ['Компетенции', 'Культурный fit', 'Стоимость', 'Опыт', 'Рекомендации', 'Мотивация'],
        extraPrompt: `Дополнительные правила HR:
- Учитывай cultural fit и values alignment
- Оценивай potential growth (не только текущие навыки)
- Учитывай стоимость найма и onboarding
- Оценивай retention risk`,
    },
};

/**
 * Get template by ID, returns null if not found
 */
export function getCouncilTemplate(templateId) {
    if (!templateId) return null;
    return COUNCIL_TEMPLATES[templateId] || null;
}

/**
 * Inject template-specific params and rules into a prompt
 */
export function applyTemplate(prompt, template) {
    if (!template) return prompt;
    return `${prompt}

${template.extraPrompt}`;
}
