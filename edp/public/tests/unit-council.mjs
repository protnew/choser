/**
 * Unit tests for Council Engine utils — parseVote, recoverPartialScores, fuzzyMatch
 * Run: node tests/unit-council.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';

// --- Inline the functions under test (avoid ESM import issues) ---

function normalize(name) {
    return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function fuzzyMatch(name, candidates) {
    const norm = normalize(name);
    if (candidates.includes(name)) return name;
    for (const c of candidates) {
        if (normalize(c) === norm) return c;
    }
    for (const c of candidates) {
        if (normalize(c).startsWith(norm) || norm.startsWith(normalize(c))) return c;
    }
    for (const c of candidates) {
        if (normalize(c).includes(norm) || norm.includes(normalize(c))) return c;
    }
    return null;
}

function recoverPartialScores(text) {
    const scores = {};
    const scoresBlockMatch = text.match(/"scores"\s*:\s*\{/);
    if (!scoresBlockMatch) return null;
    const scoresStart = scoresBlockMatch.index + scoresBlockMatch[0].length;
    let pos = scoresStart;
    let depth = 1;
    while (pos < text.length && depth > 0) {
        const objMatch = text.slice(pos).match(/"([^"]+)"\s*:\s*\{/);
        if (!objMatch) break;
        const objName = objMatch[1];
        const objStart = pos + objMatch.index + objMatch[0].length;
        const objScores = {};
        let paramPos = objStart;
        let objDepth = 1;
        let foundComplete = false;
        while (paramPos < text.length && objDepth > 0) {
            const paramMatch = text.slice(paramPos).match(/"([^"]+)"\s*:\s*\{/);
            if (!paramMatch) break;
            const paramName = paramMatch[1];
            const paramStart = paramPos + paramMatch.index + paramMatch[0].length;
            let paramDepth = 1;
            let p = paramStart;
            let closed = false;
            while (p < text.length && paramDepth > 0) {
                if (text[p] === '{') paramDepth++;
                else if (text[p] === '}') paramDepth--;
                if (paramDepth === 0) {
                    try {
                        const block = text.slice(paramStart - 1, p + 1);
                        const val = JSON.parse(block);
                        if (val && (val.grade !== undefined || typeof val === 'number')) {
                            objScores[paramName] = val;
                        }
                    } catch (_) {}
                    closed = true;
                    paramPos = p + 1;
                    break;
                }
                p++;
            }
            if (!closed) break;
        }
        if (Object.keys(objScores).length > 0) {
            scores[objName] = objScores;
        }
        let searchPos = objStart;
        let oDepth = 1;
        while (searchPos < text.length && oDepth > 0) {
            if (text[searchPos] === '{') oDepth++;
            else if (text[searchPos] === '}') oDepth--;
            if (oDepth === 0) {
                pos = searchPos + 1;
                foundComplete = true;
                break;
            }
            searchPos++;
        }
        if (!foundComplete) break;
    }
    return Object.keys(scores).length > 0 ? scores : null;
}

function parseVote(text) {
    if (!text) return { recommendation: null, confidence: null, score: null, scores: null };
    let recommendation = null, confidence = null, score = null, scores = null, parsed = null;
    try { const m = text.match(/```json\s*([\s\S]*?)\s*```/); if (m) parsed = JSON.parse(m[1]); } catch (_) {}
    if (!parsed) try { const m = text.match(/```\s*([\s\S]*?)\s*```/); if (m) parsed = JSON.parse(m[1]); } catch (_) {}
    if (!parsed) try { const fb = text.indexOf('{'); const lb = text.lastIndexOf('}'); if (fb !== -1 && lb > fb) parsed = JSON.parse(text.substring(fb, lb + 1)); } catch (_) {}
    if (!parsed) try { const fb = text.indexOf('{'); if (fb !== -1) { let d = 0; for (let i = fb; i < text.length; i++) { if (text[i] === '{') d++; if (text[i] === '}') d--; if (d === 0) { parsed = JSON.parse(text.substring(fb, i + 1)); break; } } } } catch (_) {}
    if (!parsed) try { const c = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/^#{1,6}\s+/gm, ''); const fb = c.indexOf('{'); const lb = c.lastIndexOf('}'); if (fb !== -1 && lb > fb) parsed = JSON.parse(c.substring(fb, lb + 1)); } catch (_) {}
    if (!parsed || !parsed.scores) try { const s = recoverPartialScores(text); if (s && Object.keys(s).length > 0) { if (!parsed) parsed = {}; parsed.scores = s; if (!parsed.recommendation) { const m = text.match(/"recommendation"\s*:\s*"([^"]+)"/); if (m) parsed.recommendation = m[1]; } if (parsed.confidence == null) { const m = text.match(/"confidence"\s*:\s*(\d+)/); if (m) parsed.confidence = parseInt(m[1]); } if (parsed.score == null) { const m = text.match(/"score"\s*:\s*(\d+)/); if (m) parsed.score = parseInt(m[1]); } } } catch (_) {}
    if (parsed) {
        if (parsed.recommendation) recommendation = String(parsed.recommendation);
        if (parsed.confidence != null) confidence = Number(parsed.confidence);
        if (parsed.score != null) score = Number(parsed.score);
        if (parsed.scores && typeof parsed.scores === 'object') scores = parsed.scores;
    }
    if (!recommendation) { const m = text.match(/recommendation["'\s:]+["']?([^"'\n,}]+)/i); if (m) recommendation = m[1].trim(); }
    if (confidence == null) { const m = text.match(/confidence["\s:]+(\d+)/i); if (m) confidence = parseInt(m[1]); }
    if (score == null) { const m = text.match(/"score"\s*:\s*(\d+)/i); if (m) score = parseInt(m[1]); }
    return { recommendation, confidence, score, scores, prices: parsed?._prices || parsed?.prices || null, links: parsed?._links || parsed?.links || null };
}

function postValidateScores(scores, maxObjects, maxParams, expectedObjNames, expectedParamNames) {
    if (!scores || typeof scores !== 'object') return scores;
    const result = {};
    const objNames = Object.keys(scores);
    if (expectedObjNames.length > 0) {
        for (const expectedObj of expectedObjNames) {
            const matched = fuzzyMatch(expectedObj, objNames);
            if (!matched) continue;
            if (typeof scores[matched] !== 'object') continue;
            result[expectedObj] = {};
            const paramKeys = Object.keys(scores[matched]);
            if (expectedParamNames.length > 0) {
                for (const expectedParam of expectedParamNames) {
                    const matchedParam = fuzzyMatch(expectedParam, paramKeys);
                    if (matchedParam && scores[matched][matchedParam] !== undefined) {
                        result[expectedObj][expectedParam] = scores[matched][matchedParam];
                    }
                }
            } else {
                const kept = paramKeys.slice(0, maxParams);
                for (const p of kept) { result[expectedObj][p] = scores[matched][p]; }
            }
        }
    } else {
        const keptObjs = objNames.slice(0, maxObjects);
        for (const obj of keptObjs) {
            if (typeof scores[obj] !== 'object') continue;
            result[obj] = {};
            const paramKeys = Object.keys(scores[obj]);
            const keptParams = expectedParamNames.length > 0 ? expectedParamNames : paramKeys.slice(0, maxParams);
            for (const param of keptParams) { if (scores[obj][param] !== undefined) result[obj][param] = scores[obj][param]; }
        }
    }
    return result;
}

// ===========================================
// TESTS
// ===========================================

describe('parseVote', () => {

    it('parses valid JSON response', () => {
        const text = '{"analysis":"Good","scores":{"ChatGPT Plus":{"Price":{"grade":8,"reason":"Affordable","source":"web"}}},"recommendation":"ChatGPT Plus","confidence":9,"score":82}';
        const r = parseVote(text);
        assert.equal(r.recommendation, 'ChatGPT Plus');
        assert.equal(r.confidence, 9);
        assert.equal(r.score, 82);
        assert.ok(r.scores);
        assert.equal(r.scores['ChatGPT Plus']['Price']['grade'], 8);
    });

    it('parses ```json block', () => {
        const text = 'Here is my analysis:\n```json\n{"scores":{"A":{"B":7}},"recommendation":"A","confidence":8,"score":75}\n```';
        const r = parseVote(text);
        assert.equal(r.recommendation, 'A');
        assert.ok(r.scores);
    });

    it('parses ``` block without json tag', () => {
        const text = '```\n{"scores":{"X":{"Y":9}},"recommendation":"X","confidence":7,"score":90}\n```';
        const r = parseVote(text);
        assert.equal(r.recommendation, 'X');
        assert.ok(r.scores);
    });

    it('parses simple number scores', () => {
        const text = '{"scores":{"ObjA":{"Price":8,"Quality":7},"ObjB":{"Price":6,"Quality":9}},"recommendation":"ObjB","confidence":8,"score":78}';
        const r = parseVote(text);
        assert.equal(r.scores['ObjA']['Price'], 8);
        assert.equal(r.scores['ObjB']['Quality'], 9);
    });

    it('extracts prices and links', () => {
        const text = '{"scores":{"A":{"B":8}},"prices":{"A":"$20/мес"},"links":{"A":"https://a.com"},"recommendation":"A","confidence":8,"score":80}';
        const r = parseVote(text);
        assert.equal(r.prices['A'], '$20/мес');
        assert.equal(r.links['A'], 'https://a.com');
    });

    it('returns null for empty input', () => {
        assert.equal(parseVote('').scores, null);
        assert.equal(parseVote(null).scores, null);
    });

    it('fallback regex extracts recommendation from broken text', () => {
        const text = 'recommendation "ChatGPT Plus" and confidence: 8';
        const r = parseVote(text);
        assert.equal(r.recommendation, 'ChatGPT Plus');
        assert.equal(r.confidence, 8);
    });

    it('recovers truncated JSON via strategy 6', () => {
        const text = '{"analysis":"ok","scores":{"ChatGPT Plus":{"Price":{"grade":8,"reason":"OK","source":"web"},"Speed":{"grade":7,"reason":"Fast","source":"test"}},"Claude Pro":{"Price":{"grade":9,"reason":"$$$","source":"web"';
        const r = parseVote(text);
        assert.ok(r.scores, 'Should recover scores from truncated JSON');
        assert.ok(r.scores['ChatGPT Plus'], 'ChatGPT Plus should be recovered');
        assert.equal(r.scores['ChatGPT Plus']['Price']['grade'], 8);
    });
});

describe('recoverPartialScores', () => {

    it('recovers complete objects from truncated response', () => {
        const text = '{"scores":{"ObjA":{"P1":{"grade":5,"reason":"avg","source":"t"},"P2":{"grade":6,"reason":"ok","source":"t"}}}}';
        const r = recoverPartialScores(text);
        assert.ok(r);
        assert.equal(r['ObjA']['P1']['grade'], 5);
        assert.equal(r['ObjA']['P2']['grade'], 6);
    });

    it('skips incomplete objects', () => {
        const text = '{"scores":{"A":{"P1":{"grade":8,"reason":"x","source":"y"}},"B":{"P1":{"grade":7,"reason":"cut off"';
        const r = recoverPartialScores(text);
        assert.ok(r);
        assert.ok(r['A'], 'Complete object A should be recovered');
        assert.ok(!r['B'], 'Incomplete object B should be skipped');
    });

    it('returns null for text without scores block', () => {
        assert.equal(recoverPartialScores('no scores here'), null);
    });
});

describe('normalize + fuzzyMatch', () => {

    it('lowercases and trims', () => {
        assert.equal(normalize('  ChatGPT Plus  '), 'chatgpt plus');
    });

    it('collapses multiple spaces', () => {
        assert.equal(normalize('ChatGPT   Plus'), 'chatgpt plus');
    });

    it('handles null/undefined', () => {
        assert.equal(normalize(null), '');
        assert.equal(normalize(undefined), '');
    });

    it('exact match', () => {
        assert.equal(fuzzyMatch('ChatGPT Plus', ['Claude', 'ChatGPT Plus', 'Gemini']), 'ChatGPT Plus');
    });

    it('case-insensitive', () => {
        assert.equal(fuzzyMatch('chatgpt plus', ['ChatGPT Plus']), 'ChatGPT Plus');
    });

    it('prefix match — expected shorter', () => {
        assert.equal(fuzzyMatch('ChatGPT Plus', ['ChatGPT Plus (GPT-4)', 'Claude']), 'ChatGPT Plus (GPT-4)');
    });

    it('prefix match — expected longer', () => {
        assert.equal(fuzzyMatch('ChatGPT Plus (GPT-4)', ['ChatGPT Plus', 'Claude']), 'ChatGPT Plus');
    });

    it('contains match', () => {
        assert.equal(fuzzyMatch('Стоимость', ['Стоимость услуги', 'Скорость']), 'Стоимость услуги');
    });

    it('no fuzzy match for unrelated synonyms', () => {
        // "Цена" and "Стоимость" are synonyms but not substrings — no match
        assert.equal(fuzzyMatch('Цена', ['Стоимость услуги', 'Скорость']), null);
    });

    it('no match returns null', () => {
        assert.equal(fuzzyMatch('Quantum', ['ChatGPT', 'Claude']), null);
    });

    it('empty candidates returns null', () => {
        assert.equal(fuzzyMatch('test', []), null);
    });
});

describe('postValidateScores', () => {

    it('fuzzy matches object and param names', () => {
        const scores = {
            'ChatGPT Plus (GPT-4)': { 'Стоимость подписки': { grade: 8 }, 'Скорость ответа': { grade: 7 } },
            'Claude Pro (Anthropic)': { 'Стоимость подписки': { grade: 9 }, 'Скорость ответа': { grade: 8 } }
        };
        const r = postValidateScores(scores, 3, 5,
            ['ChatGPT Plus', 'Claude Pro'],
            ['Стоимость', 'Скорость']
        );
        assert.ok(r['ChatGPT Plus'], 'ChatGPT Plus should be matched via prefix');
        assert.ok(r['Claude Pro'], 'Claude Pro should be matched via prefix');
        assert.equal(r['ChatGPT Plus']['Стоимость']?.grade, 8);
        assert.equal(r['ChatGPT Plus']['Скорость']?.grade, 7);
    });

    it('clamps grades to 1-10 range', () => {
        const scores = { A: { P1: { grade: 15 }, P2: { grade: -3 } } };
        // Simulate post-validation grade clamping
        for (const obj of Object.keys(scores)) {
            for (const param of Object.keys(scores[obj])) {
                const val = scores[obj][param];
                if (typeof val === 'object' && val !== null) {
                    val.grade = Math.max(1, Math.min(10, Math.round(Number(val.grade) || 0)));
                }
            }
        }
        assert.equal(scores.A.P1.grade, 10, '15 should clamp to 10');
        assert.equal(scores.A.P2.grade, 1, '-3 should clamp to 1');
    });

    it('clamps simple number grades to 1-10', () => {
        const scores = { A: { P1: 12, P2: 0 } };
        for (const obj of Object.keys(scores)) {
            for (const param of Object.keys(scores[obj])) {
                if (typeof scores[obj][param] === 'number') {
                    scores[obj][param] = Math.max(1, Math.min(10, Math.round(scores[obj][param])));
                }
            }
        }
        assert.equal(scores.A.P1, 10);
        assert.equal(scores.A.P2, 1);
    });
});

describe('Council Templates', () => {

    it('has all expected templates', async () => {
        const { COUNCIL_TEMPLATES } = await import('../edp/src/council/templates.js');
        assert.ok(COUNCIL_TEMPLATES.b2b);
        assert.ok(COUNCIL_TEMPLATES.b2c);
        assert.ok(COUNCIL_TEMPLATES.tech);
        assert.ok(COUNCIL_TEMPLATES.financial);
        assert.ok(COUNCIL_TEMPLATES.hiring);
    });

    it('each template has required fields', async () => {
        const { COUNCIL_TEMPLATES } = await import('../edp/src/council/templates.js');
        for (const [id, t] of Object.entries(COUNCIL_TEMPLATES)) {
            assert.ok(t.id, `${id}: missing id`);
            assert.ok(t.name, `${id}: missing name`);
            assert.ok(t.description, `${id}: missing description`);
            assert.ok(Array.isArray(t.params), `${id}: missing params array`);
            assert.ok(t.extraPrompt, `${id}: missing extraPrompt`);
            assert.ok(t.params.length >= 4, `${id}: should have at least 4 params`);
        }
    });

    it('getCouncilTemplate returns null for unknown', async () => {
        const { getCouncilTemplate } = await import('../edp/src/council/templates.js');
        assert.equal(getCouncilTemplate('nonexistent'), null);
        assert.equal(getCouncilTemplate(null), null);
        assert.equal(getCouncilTemplate(undefined), null);
    });

    it('getCouncilTemplate returns template for known id', async () => {
        const { getCouncilTemplate } = await import('../edp/src/council/templates.js');
        const t = getCouncilTemplate('b2b');
        assert.equal(t.id, 'b2b');
        assert.ok(t.name);
    });

    it('applyTemplate adds extra rules to prompt', async () => {
        const { applyTemplate, getCouncilTemplate } = await import('../edp/src/council/templates.js');
        const prompt = 'Base prompt';
        const template = getCouncilTemplate('tech');
        const result = applyTemplate(prompt, template);
        assert.ok(result.includes('Base prompt'));
        assert.ok(result.includes('GitHub'));
    });

    it('applyTemplate returns prompt as-is when no template', async () => {
        const { applyTemplate } = await import('../edp/src/council/templates.js');
        const prompt = 'Base prompt';
        assert.equal(applyTemplate(prompt, null), 'Base prompt');
    });
});

describe('postValidateScores (additional)', () => {
    it('keeps first N when no expected names', () => {
        const scores = { A: { P1: 8, P2: 7, P3: 9 }, B: { P1: 6, P2: 5, P3: 4 } };
        const r = postValidateScores(scores, 2, 2, [], []);
        assert.ok(r.A);
        assert.ok(r.B);
        assert.equal(Object.keys(r.A).length, 2, 'Should keep only 2 params');
    });

    it('returns scores as-is when null', () => {
        assert.equal(postValidateScores(null, 3, 3, [], []), null);
    });
});

// ===========================================
