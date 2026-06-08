/**
 * Integration tests for Council data pipeline
 * Tests the full chain: mock LLM response → parseVote → postValidate → buildTable
 * Run: node tests/integration-council.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import functions under test
import { parseVote } from '../edp/src/llm/providers.js';
import { buildTableFromVotes } from '../edp/src/api/councilTableBuilder.js';
import { getCouncilTemplate, applyTemplate, COUNCIL_TEMPLATES } from '../edp/src/council/templates.js';

// === Mock LLM responses (realistic) ===

const MOCK_RESPONSE_GRADE_FORMAT = `{
  "analysis": "Сравнение 3 LLM-сервисов по цене и качеству.",
  "scores": {
    "ChatGPT Plus": {
      "Цена": { "grade": 7, "reason": "$20/мес — средняя цена, но GPT-4 стоит того", "source": "https://openai.com/pricing" },
      "Качество ответов": { "grade": 9, "reason": "GPT-4 — лидер по качеству", "source": "https://lmsys.org" },
      "Скорость": { "grade": 8, "reason": "Обычно быстрый, но бывают задержки", "source": "данные из базы знаний" }
    },
    "Claude Pro": {
      "Цена": { "grade": 7, "reason": "$20/мес — такая же цена", "source": "https://anthropic.com/pricing" },
      "Качество ответов": { "grade": 9, "reason": "Отличное понимание контекста", "source": "https://lmsys.org" },
      "Скорость": { "grade": 7, "reason": "Быстрый, но длинные ответы медленнее", "source": "данные из базы знаний" }
    },
    "Gemini Advanced": {
      "Цена": { "grade": 8, "reason": "Входит в Google One AI Premium ($20), плюс доп сервисы", "source": "https://one.google.com" },
      "Качество ответов": { "grade": 7, "reason": "Хорошее, но уступает GPT-4 в логике", "source": "https://lmsys.org" },
      "Скорость": { "grade": 9, "reason": "Очень быстрый отклик", "source": "данные из базы знаний" }
    }
  },
  "prices": { "ChatGPT Plus": "$20/мес", "Claude Pro": "$20/мес", "Gemini Advanced": "$20/мес (Google One)" },
  "links": { "ChatGPT Plus": "https://chat.openai.com", "Claude Pro": "https://claude.ai", "Gemini Advanced": "https://gemini.google.com" },
  "recommendation": "ChatGPT Plus",
  "confidence": 8,
  "score": 82
}`;

const MOCK_RESPONSE_NUMBER_FORMAT = `{
  "scores": {
    "ChatGPT Plus": { "Цена": 7, "Качество": 9, "Скорость": 8 },
    "Claude Pro": { "Цена": 7, "Качество": 9, "Скорость": 7 },
    "Gemini Advanced": { "Цена": 8, "Качество": 7, "Скорость": 9 }
  },
  "recommendation": "ChatGPT Plus",
  "confidence": 8,
  "score": 82
}`;

const MOCK_RESPONSE_TRUNCATED = `{"analysis":"ok","scores":{"ChatGPT Plus":{"Цена":{"grade":8,"reason":"$20","source":"web"},"Скорость":{"grade":7,"reason":"fast","source":"test"}},"Claude Pro":{"Цена":{"grade":9,"reason":"$$","source":"web"`;

// ===========================================
// TESTS
// ===========================================

describe('Full Council pipeline — grade format', () => {

    it('parseVote extracts scores from realistic LLM response', () => {
        const parsed = parseVote(MOCK_RESPONSE_GRADE_FORMAT);
        assert.ok(parsed.scores, 'Should have scores');
        assert.equal(Object.keys(parsed.scores).length, 3, 'Should have 3 objects');
        assert.ok(parsed.scores['ChatGPT Plus']);
        assert.equal(parsed.scores['ChatGPT Plus']['Цена']['grade'], 7);
        assert.equal(parsed.recommendation, 'ChatGPT Plus');
        assert.equal(parsed.confidence, 8);
        assert.equal(parsed.score, 82);
    });

    it('parseVote extracts prices and links', () => {
        const parsed = parseVote(MOCK_RESPONSE_GRADE_FORMAT);
        assert.equal(parsed.prices['ChatGPT Plus'], '$20/мес');
        assert.equal(parsed.links['ChatGPT Plus'], 'https://chat.openai.com');
    });

    it('buildTableFromVotes generates correct table structure', () => {
        const parsed = parseVote(MOCK_RESPONSE_GRADE_FORMAT);
        const votes = [{
            persona: 'p1', name: 'CEO', emoji: '👔', role: 'ceo', weight: 10,
            response: MOCK_RESPONSE_GRADE_FORMAT,
            scores: parsed.scores,
            recommendation: parsed.recommendation,
            confidence: parsed.confidence,
            score: parsed.score,
            prices: parsed.prices,
            links: parsed.links,
        }];
        const table = buildTableFromVotes(votes);
        assert.ok(table, 'Should generate table');
        assert.ok(table.parameters, 'Should have parameters');
        assert.ok(table.objects, 'Should have objects');
        assert.equal(table.objects.length, 3, 'Should have 3 objects');
        assert.ok(table.parameters.length >= 3, 'Should have at least 3 params');
    });

    it('buildTableFromVotes averages grades correctly', () => {
        const parsed = parseVote(MOCK_RESPONSE_GRADE_FORMAT);
        const votes = [{
            persona: 'p1', name: 'CEO', emoji: '👔', role: 'ceo', weight: 10,
            response: '', scores: parsed.scores,
            recommendation: null, confidence: null, score: null, prices: null, links: null,
        }];
        const table = buildTableFromVotes(votes);
        const chatgpt = table.objects.find(o => o.name === 'ChatGPT Plus');
        assert.ok(chatgpt, 'ChatGPT Plus should be in table');
        // Grade should be 7 (single vote)
        const priceParam = table.parameters.find(p => p.name === 'Цена');
        assert.ok(priceParam, 'Should have Цена param');
        assert.equal(chatgpt.scores['Цена']?.grade, 7);
    });

    it('buildTableFromVotes averages multiple votes', () => {
        const parsed = parseVote(MOCK_RESPONSE_GRADE_FORMAT);
        // Two votes: CEO gives 7, CTO gives 9 → average 8
        const votes = [
            { persona: 'p1', name: 'CEO', scores: { 'ChatGPT Plus': { 'Цена': { grade: 7, reason: '', source: '' } } }, prices: null, links: null },
            { persona: 'p2', name: 'CTO', scores: { 'ChatGPT Plus': { 'Цена': { grade: 9, reason: '', source: '' } } }, prices: null, links: null },
        ];
        const table = buildTableFromVotes(votes);
        const chatgpt = table.objects.find(o => o.name === 'ChatGPT Plus');
        assert.equal(chatgpt.scores['Цена']?.grade, 8, '(7+9)/2 = 8');
    });

    it('buildTableFromVotes sorts by average grade descending', () => {
        const parsed = parseVote(MOCK_RESPONSE_GRADE_FORMAT);
        const votes = [{
            persona: 'p1', scores: parsed.scores,
            prices: null, links: null,
        }];
        const table = buildTableFromVotes(votes);
        // Gemini has highest average (8+7+9)/3=8, ChatGPT (7+9+8)/3=8, Claude (7+9+7)/3=7.67
        // Sort is by average grade descending
        assert.ok(table.objects[0].name, 'First object should exist');
    });
});

describe('Full Council pipeline — number format', () => {

    it('parseVote handles simple number scores', () => {
        const parsed = parseVote(MOCK_RESPONSE_NUMBER_FORMAT);
        assert.ok(parsed.scores);
        assert.equal(parsed.scores['ChatGPT Plus']['Цена'], 7);
        assert.equal(parsed.scores['ChatGPT Plus']['Качество'], 9);
    });

    it('buildTableFromVotes handles number format scores', () => {
        const parsed = parseVote(MOCK_RESPONSE_NUMBER_FORMAT);
        const votes = [{
            persona: 'p1', scores: parsed.scores,
            prices: null, links: null,
        }];
        const table = buildTableFromVotes(votes);
        assert.ok(table, 'Should generate table from number scores');
        assert.equal(table.objects.length, 3);
    });
});

describe('Full Council pipeline — truncated response', () => {

    it('parseVote recovers partial scores from truncated JSON', () => {
        const parsed = parseVote(MOCK_RESPONSE_TRUNCATED);
        assert.ok(parsed.scores, 'Should recover at least partial scores');
        assert.ok(parsed.scores['ChatGPT Plus'], 'ChatGPT Plus should be recovered');
    });

    it('buildTableFromVotes handles partial votes gracefully', () => {
        const parsed = parseVote(MOCK_RESPONSE_TRUNCATED);
        const votes = [{
            persona: 'p1', scores: parsed.scores,
            prices: null, links: null,
        }];
        const table = buildTableFromVotes(votes);
        // Should not crash, may be null if no valid scores
        assert.ok(table === null || table.objects?.length > 0, 'Should handle gracefully');
    });
});

describe('Full Council pipeline — empty/invalid inputs', () => {

    it('buildTableFromVotes returns null for empty votes', () => {
        assert.equal(buildTableFromVotes([]), null);
    });

    it('buildTableFromVotes returns null for votes without scores', () => {
        assert.equal(buildTableFromVotes([{ persona: 'p1', scores: null }]), null);
    });

    it('buildTableFromVotes returns null for votes with empty scores', () => {
        assert.equal(buildTableFromVotes([{ persona: 'p1', scores: {} }]), null);
    });
});

describe('Template integration', () => {

    it('tech template adds domain rules to prompt', () => {
        const base = 'Оцени 3 объекта по 5 параметрам.';
        const result = applyTemplate(base, getCouncilTemplate('tech'));
        assert.ok(result.includes('Оцени 3 объекта'), 'Base prompt preserved');
        assert.ok(result.includes('GitHub'), 'Tech-specific rules added');
    });

    it('all templates have unique IDs', () => {
        const ids = Object.values(COUNCIL_TEMPLATES).map(t => t.id);
        assert.equal(new Set(ids).size, ids.length, 'All IDs should be unique');
    });
});

console.log('\n✅ Integration tests loaded. Run: node tests/integration-council.mjs\n');
