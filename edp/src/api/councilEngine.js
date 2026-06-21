// Council Engine v2 — agents create selection tables (scores), not YES/NO voting
// Each agent: proposes objects + parameters, scores them 1-10, recommends best
import { Hono } from 'hono';

const ZAI_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';

const ALL_AGENTS = [
  {name: 'CEO', emoji: '\uD83D\uDC54', sys: 'Ты — CEO, член Совета директоров. Стратегическое соответствие бизнес-целям, конкурентное преимущество, ROI, масштабируемость. Оценивай с позиции топ-менеджмента.'},
  {name: 'CFO', emoji: '\uD83D\uDCB0', sys: 'Ты — CFO, финансовый директор. TCO, hidden costs, payback period, NPV, влияние на cash flow. Эффективность = Полезность / Цена.'},
  {name: 'CISO', emoji: '\uD83D\uDD12', sys: 'Ты — CISO. Data privacy, vendor lock-in, compliance, incident response, репутационные риски.'},
  {name: 'COO', emoji: '\uD83C\uDFD7\uFE0F', sys: 'Ты — COO. SLA, время внедрения, операционные риски, масштабируемость операций.'},
  {name: 'Юрист', emoji: '\u2696\uFE0F', sys: 'Ты — Главный юрисконсульт. Правовые риски, лицензирование, GDPR/ФЗ-152, штрафы, limitation of liability.'},
  {name: 'CHRO', emoji: '\uD83D\uDC65', sys: 'Ты — CHRO. Влияние на команду, обучение, принятие сотрудниками, культурный фит.'}
];

function buildTableContext(db, tableId) {
  if (!db || !tableId) return '';
  try {
    const tbl = db.prepare('SELECT title, description FROM tables WHERE id = ?').get(tableId);
    if (!tbl) return '';
    let params = [];
    try {
      const colRow = db.prepare('SELECT definition FROM columns WHERE table_id = ?').get(tableId);
      if (colRow && colRow.definition) {
        const parsed = JSON.parse(colRow.definition);
        if (Array.isArray(parsed)) params = parsed.slice(0, 20);
      }
    } catch (_) {}
    let objects = [];
    try {
      const rowObjs = db.prepare('SELECT data FROM rows WHERE table_id = ? LIMIT 20').all(tableId);
      for (const r of rowObjs) {
        if (!r.data) continue;
        const d = JSON.parse(r.data);
        objects.push({name: d.name, price: d.price});
      }
    } catch (_) {}
    let ctx = 'Таблица: ' + (tbl.title || tableId) + '\n';
    if (tbl.description) ctx += 'Описание: ' + tbl.description + '\n';
    if (objects.length) {
      ctx += 'Объекты:\n' + objects.map(o => '- ' + (o.name || '?') + (o.price != null ? ' (цена: ' + o.price + ')' : '')).join('\n') + '\n';
    }
    if (params.length) {
      ctx += 'Параметры:\n' + params.map(p => '- ' + (p.title || p.key || '?') + (p.weight != null ? ' (вес: ' + p.weight + ')' : '')).join('\n') + '\n';
    }
    return ctx;
  } catch (e) {
    return '';
  }
}

function parseJSON(text) {
  if (!text) return null;
  // Try to extract JSON from markdown code block or plain text
  let cleaned = text.trim();
  // Remove markdown code fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  // Find first { and last }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  cleaned = cleaned.substring(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    return null;
  }
}

export function councilEngineRoutes(app) {
  const apiKey = process.env.ZAI_API_KEY;

  app.post('/api/council-engine', async (c) => {
    const log = c.get('log');
    const db = c.get('db');
    const body = await c.req.json().catch(() => ({}));

    const topic = body.topic || 'No topic';
    const context = body.context || '';
    const tableId = body.tableId || '';
    const mode = (body.mode || 'parallel').toLowerCase();
    const numObjects = Math.min(Math.max(parseInt(body.numObjects) || 5, 2), 10);
    const numParams = Math.min(Math.max(parseInt(body.numParams) || 6, 3), 12);
    const AGENTS = ALL_AGENTS.slice(0, Math.min(Math.max(parseInt(body.agentCount) || 4, 2), 6));

    if (!apiKey) {
      return c.json({error: 'ZAI_API_KEY not configured', agents: []}, 500);
    }

    // Build the base user message
    let userMsg = 'ТЕМА АНАЛИЗА: ' + topic;
    if (context) userMsg += '\n\nДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ: ' + context;
    const tableCtx = buildTableContext(db, tableId);
    if (tableCtx) {
      userMsg += '\n\n--- КОНТЕКСТ ТАБЛИЦЫ ---\n' + tableCtx;
    }

    const callAgent = async (agent, previousAnalysis) => {
      let msg = userMsg;
      if (previousAnalysis) msg += '\n\n--- ПРЕДЫДУЩИЕ ОЦЕНКИ ---\n' + previousAnalysis;

      const prompt = agent.sys + '\n\n' +
        '# ЗАДАЧА\n' +
        'Ты — ' + agent.name + ' в Совете. Оцени РОВНО ' + numObjects + ' объектов по РОВНО ' + numParams + ' параметрам.\n' +
        'ВЕРНИ ТОЛЬКО JSON. Никакого текста до или после JSON.\n\n' +
        '# ФОРМАТ ОТВЕТА (JSON):\n' +
        '```\n' +
        '{\n' +
        '  "analysis": "Краткое обоснование (2-3 предложения)",\n' +
        '  "objects": ["Объект1", "Объект2", "Объект3"],\n' +
        '  "parameters": ["Параметр1", "Параметр2", "Параметр3"],\n' +
        '  "scores": {\n' +
        '    "Объект1": {"Параметр1": 8, "Параметр2": 7, "Параметр3": 6},\n' +
        '    "Объект2": {"Параметр1": 6, "Параметр2": 9, "Параметр3": 8},\n' +
        '    "Объект3": {"Параметр1": 7, "Параметр2": 6, "Параметр3": 9}\n' +
        '  },\n' +
        '  "recommendation": "Название лучшего объекта",\n' +
        '  "confidence": 8,\n' +
        '  "score": 82\n' +
        '}\n' +
        '```\n\n' +
        '# ПРАВИЛА:\n' +
        '- Оценки от 1 до 10 (целые числа)\n' +
        '- РОВНО ' + numObjects + ' объектов и ' + numParams + ' параметров\n' +
        '- Каждый объект должен иметь оценки по ВСЕМ параметрам\n' +
        '- score = средняя оценка * 10 (итоговый балл 1-100)\n' +
        '- recommendation = название объекта с лучшим итоговым баллом\n' +
        '- Все названия на русском языке\n';

      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 120000);
        const resp = await fetch(ZAI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
          },
          body: JSON.stringify({
            model: 'GLM-5.1',
            messages: [
              {role: 'system', content: prompt},
              {role: 'user', content: msg}
            ],
            max_tokens: 4000,
            temperature: 0.5
          }),
          signal: ctrl.signal
        });
        clearTimeout(timeout);

        const data = await resp.json();
        if (data.error) {
          return {name: agent.name, emoji: agent.emoji, response: 'API Error: ' + (data.error.message || 'Unknown'), scores: null, recommendation: '', confidence: 0, score: 0, tokensUsed: 0};
        }

        const text = data.choices?.[0]?.message?.content || 'No response';
        const parsed = parseJSON(text);

        if (parsed) {
          // Clamp scores 1-10
          if (parsed.scores) {
            for (const obj of Object.keys(parsed.scores)) {
              if (typeof parsed.scores[obj] !== 'object') continue;
              for (const param of Object.keys(parsed.scores[obj])) {
                const val = parsed.scores[obj][param];
                if (typeof val === 'number') {
                  parsed.scores[obj][param] = Math.max(1, Math.min(10, Math.round(val)));
                }
              }
            }
          }
          return {
            name: agent.name,
            emoji: agent.emoji,
            response: parsed.analysis || text.substring(0, 500),
            scores: parsed.scores || null,
            objects: parsed.objects || [],
            parameters: parsed.parameters || [],
            recommendation: parsed.recommendation || '',
            confidence: parsed.confidence || 0,
            score: parsed.score || 0,
            tokensUsed: data.usage?.total_tokens || 0
          };
        }
        return {
          name: agent.name,
          emoji: agent.emoji,
          response: text.substring(0, 1000),
          scores: null,
          recommendation: '',
          confidence: 0,
          score: 0,
          tokensUsed: data.usage?.total_tokens || 0
        };
      } catch (e) {
        log?.error?.({err: e.message, agent: agent.name}, 'Council agent error');
        return {name: agent.name, emoji: agent.emoji, response: 'Error: ' + e.message, scores: null, recommendation: '', confidence: 0, score: 0, tokensUsed: 0};
      }
    };

    try {
      let results;
      if (mode === 'sequential') {
        results = [];
        let previous = '';
        for (const agent of AGENTS) {
          const res = await callAgent(agent, previous || null);
          results.push(res);
          previous += agent.name + ': рекомендует ' + (res.recommendation || '?') + ' (score: ' + res.score + ')\n';
        }
      } else {
        results = await Promise.all(AGENTS.map(a => callAgent(a)));
      }

      // Build consensus
      const recommendations = {};
      for (const r of results) {
        if (r.recommendation) {
          recommendations[r.recommendation] = (recommendations[r.recommendation] || 0) + 1;
        }
      }
      const topRec = Object.entries(recommendations).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const avgScore = results.filter(r => r.score > 0).length > 0
        ? Math.round(results.filter(r => r.score > 0).reduce((s, r) => s + r.score, 0) / results.filter(r => r.score > 0).length)
        : 0;

      return c.json({
        agents: results,
        count: results.length,
        topic: topic,
        mode: mode,
        totalTokens: results.reduce((s, a) => s + a.tokensUsed, 0),
        consensus: {
          recommendation: topRec,
          score: avgScore,
          recommendations: recommendations
        }
      });
    } catch (e) {
      return c.json({error: e.message, agents: []}, 500);
    }
  });

  // Decision tree endpoint
  app.post('/api/decision-tree', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const topic = body.topic || 'No topic';
    if (!apiKey) return c.json({error: 'No API key'}, 500);

    const prompt = 'Построй дерево решений для темы: "' + topic + '".\n' +
      'Верни ТОЛЬКО JSON (без markdown, без текста до/после):\n' +
      '{"name":"Корневой вопрос?","children":[{"name":"Ветвь 1","value":"yes","children":[{"name":"Действие 1","value":"yes"},{"name":"Действие 2","value":"no"}]},{"name":"Ветвь 2","value":"no","children":[]}]\n\n' +
      'Правила:\n' +
      '- 2-3 ветви первого уровня\n' +
      '- value: "yes" или "no"\n' +
      '- 2-3 дочерних узла на ветвь\n' +
      '- Все названия на русском\n';

    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 60000);
      const resp = await fetch(ZAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: 'GLM-5.1',
          messages: [
            {role: 'system', content: prompt},
            {role: 'user', content: 'Тема: ' + topic}
          ],
          max_tokens: 2000,
          temperature: 0.5
        }),
        signal: ctrl.signal
      });
      clearTimeout(timeout);

      const data = await resp.json();
      if (data.error) return c.json({error: data.error.message}, 500);

      const text = data.choices?.[0]?.message?.content || '{}';
      const parsed = parseJSON(text);
      if (parsed && parsed.name) {
        return c.json({tree: parsed, raw: text});
      }
      return c.json({tree: {name: topic, children: []}, error: 'Failed to parse tree', raw: text});
    } catch (e) {
      return c.json({error: e.message}, 500);
    }
  });
}
