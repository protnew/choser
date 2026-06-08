#!/usr/bin/env node
/**
 * Choser Table Refresh Pipeline v3 — Multi-Agent Parallel
 * 
 * 6 parallel workers: FILTER → SCOUT → RESEARCH → BUILDER (chunked) → CRITIC → SAVE+VERIFY
 * 
 * Usage:
 *   node pipeline.js --dry-run              # Preview which tables would be processed
 *   node pipeline.js --limit 5              # Process 5 tables
 *   node pipeline.js --table some-table-id  # Process one table
 *   node pipeline.js --all                  # Process all ~400 real tables
 *   node pipeline.js --workers 3 --limit 10 # 3 workers, 10 tables
 * 
 * Requirements:
 *   - Node.js 18+
 *   - ZAI_API_KEY in environment
 *   - Choser API running (default http://127.0.0.1:3002)
 *   - Optional: ddgs CLI for web search (pip install duckduckgo-search)
 */

import { execFile } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Configuration ───────────────────────────────────────────────────────────

const CONFIG = {
  choserBaseUrl: process.env.CHOSER_URL || 'http://127.0.0.1:3002',
  zaiApiKey: process.env.ZAI_API_KEY || '',
  zaiBaseUrl: 'https://api.z.ai/api/coding/paas/v4/chat/completions',
  zaiModel: 'GLM-5.1',
  fallbackBaseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  fallbackApiKey: process.env.OPENROUTER_API_KEY || '',
  fallbackModel: 'google/gemini-2.0-flash-001',
  workers: parseInt(process.env.WORKERS || '6'),
  rateLimitMs: 2000,        // pause between API calls per worker
  betweenTablesMs: 3000,    // pause between tables
  chunkSize: 10,            // max params per BUILDER chunk
  maxRetries: 3,
  retryDelayMs: 5000,
  reportDir: join(__dirname, 'pipeline-reports'),
  snapshotDir: join(__dirname, 'pipeline-reports', 'snapshots'),
  logFile: join(__dirname, 'pipeline-reports', 'pipeline.log'),
  queueFile: join(__dirname, 'pipeline-reports', 'queue.json'),
};

// Async log stream (non-blocking)
let _logStream = null;
function getLogStream() {
  if (!_logStream) {
    ensureDir(CONFIG.reportDir);
    _logStream = createWriteStream(CONFIG.logFile, { flags: 'a' });
  }
  return _logStream;
}

// ─── Argument Parsing ────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, limit: 0, tableId: null, all: false, workers: CONFIG.workers };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--all') opts.all = true;
    else if (args[i] === '--limit' && args[i + 1]) { opts.limit = parseInt(args[++i]); }
    else if (args[i] === '--table' && args[i + 1]) { opts.tableId = args[++i]; }
    else if (args[i] === '--workers' && args[i + 1]) { opts.workers = parseInt(args[++i]); }
  }
  return opts;
}

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try { getLogStream().write(line + '\n'); } catch {}
}

function workerLog(workerId, msg) {
  log(`[W${workerId}] ${msg}`);
}

// ─── HTTP Helper ─────────────────────────────────────────────────────────────

async function httpGet(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`GET ${url} → ${resp.status}`);
  return resp.json();
}

async function httpPost(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`POST ${url} → ${resp.status}: ${text.slice(0, 300)}`);
  }
  return resp.json();
}

// ─── Choser API ──────────────────────────────────────────────────────────────

const choser = {
  async listAllTables() {
    // API may not support offset, try single large request first
    try {
      const all = await httpGet(`${CONFIG.choserBaseUrl}/api/tables?limit=1000`);
      if (all.length > 0) return all;
    } catch {}
    // Fallback: no query params
    return httpGet(`${CONFIG.choserBaseUrl}/api/tables`);
  },

  async getTable(id) {
    return httpGet(`${CONFIG.choserBaseUrl}/api/tables/${encodeURIComponent(id)}`);
  },

  async saveTable(tableData) {
    // POST /api/table (singular!)
    return httpPost(`${CONFIG.choserBaseUrl}/api/table`, tableData);
  },

  async healthCheck() {
    return httpGet(`${CONFIG.choserBaseUrl}/v1/api/health`);
  },
};

// ─── LLM Client ─────────────────────────────────────────────────────────────

async function callLLM(systemPrompt, userPrompt, opts = {}) {
  const model = opts.model || CONFIG.zaiModel;
  const temperature = opts.temperature ?? 0.3;
  const maxTokens = opts.maxTokens || 4096;
  const retries = opts.retries ?? CONFIG.maxRetries;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const body = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      };

      const resp = await fetch(CONFIG.zaiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.zaiApiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (resp.status === 429) {
        // Try fallback on rate limit
        if (CONFIG.fallbackApiKey) {
          log(`  ⏳ ZAI rate limited, trying OpenRouter fallback...`);
          try {
            const fbResp = await fetch(CONFIG.fallbackBaseUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.fallbackApiKey}`,
                'HTTP-Referer': 'https://choser.org',
              },
              body: JSON.stringify({ ...body, model: CONFIG.fallbackModel }),
            });
            if (fbResp.ok) {
              const fbData = await fbResp.json();
              const fbContent = fbData.choices?.[0]?.message?.content || '';
              const fbUsage = fbData.usage || {};
              return { text: fbContent, tokens: { input: fbUsage.prompt_tokens || 0, output: fbUsage.completion_tokens || 0 } };
            } else {
              log(`  ⚠️ Fallback also failed: ${fbResp.status}`);
            }
          } catch (fbErr) {
            log(`  ⚠️ Fallback error: ${fbErr.message}`);
          }
        }
        if (attempt === retries - 1) throw new Error('Rate limited after all retries');
        await sleep(CONFIG.retryDelayMs * (attempt + 1));
        continue;
      }
      // Try fallback immediately if ZAI unavailable
      if (!resp.ok && CONFIG.fallbackApiKey) {
        const errText = await resp.text();
        if (errText.includes('1113') || errText.includes('1211') || errText.includes('余额')) {
          log(`  ⚠️ ZAI error, trying OpenRouter fallback...`);
          try {
            const fbResp = await fetch(CONFIG.fallbackBaseUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.fallbackApiKey}`,
                'HTTP-Referer': 'https://choser.org',
              },
              body: JSON.stringify({ ...body, model: CONFIG.fallbackModel }),
            });
            if (fbResp.ok) {
              const fbData = await fbResp.json();
              const fbContent = fbData.choices?.[0]?.message?.content || '';
              const fbUsage = fbData.usage || {};
              return { text: fbContent, tokens: { input: fbUsage.prompt_tokens || 0, output: fbUsage.completion_tokens || 0 } };
            } else {
              log(`  ⚠️ Fallback also failed: ${fbResp.status}`);
            }
          } catch (fbErr) {
            log(`  ⚠️ Fallback error: ${fbErr.message}`);
          }
        }
        throw new Error(`LLM ${resp.status}: ${errText.slice(0, 300)}`);
      }
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`LLM ${resp.status}: ${errText.slice(0, 300)}`);
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || {};

      return { text: content, tokens: { input: usage.prompt_tokens || 0, output: usage.completion_tokens || 0 } };
    } catch (e) {
      if (attempt === retries - 1) throw e;
      log(`  ⚠️ LLM attempt ${attempt + 1} failed: ${e.message}, retrying...`);
      await sleep(CONFIG.retryDelayMs);
    }
  }
  throw new Error('LLM call exhausted all retries');
}

function extractJSON(text) {
  // Try to find the first complete JSON object
  // Strategy: find the first { and match its closing }
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' && depth === 0) start = i;
    if (text[i] === '{') depth++;
    if (text[i] === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        return text.slice(start, i + 1);
      }
    }
    // Skip content inside strings
    if (text[i] === '"' && (i === 0 || text[i-1] !== '\\')) {
      const end = text.indexOf('"', i + 1);
      if (end >= 0) i = end;
    }
  }
  return null;
}

async function callLLMJson(systemPrompt, userPrompt, opts = {}) {
  const result = await callLLM(systemPrompt, userPrompt, opts);
  if (!result || !result.text) throw new Error('LLM returned empty response');
  const jsonStr = extractJSON(result.text);
  if (!jsonStr) throw new Error('LLM did not return JSON. Raw: ' + result.text.slice(0, 200));
  try {
    return { ...JSON.parse(jsonStr), _tokens: result.tokens };
  } catch (e) {
    // Try again with a fix prompt
    if ((opts.retries ?? CONFIG.maxRetries) > 1) {
      const fixPrompt = userPrompt + '\n\nПРЕДЫДУЩИЙ ОТВЕТ СОДЕРЖИЛ НЕВАЛИДНЫЙ JSON. ОШИБКА: ' + e.message + '\nОтветь СТРОГО JSON без markdown обёрток.';
      return callLLMJson(systemPrompt, fixPrompt, { ...opts, retries: (opts.retries ?? CONFIG.maxRetries) - 1 });
    }
    throw new Error(`JSON parse failed: ${e.message}. Raw: ${result.text.slice(0, 200)}`);
  }
}

// ─── Web Search (async ddgs) ─────────────────────────────────────────────────

async function webSearch(query, maxResults = 5) {
  return new Promise((resolve) => {
    // Use python -c with safe argument passing (no injection)
    const script = `
import sys, json
try:
  from duckduckgo_search import DDGS
  q = sys.argv[1]
  results = DDGS().text(q, max_results=${maxResults}, region="ru-ru")
  print(json.dumps([{"title":r.get("title",""),"snippet":r.get("body",""),"url":r.get("href","")} for r in results]))
except Exception as e:
  print(json.dumps([]))
`;
    execFile('python', ['-c', script, query], { timeout: 20000 }, (err, stdout, stderr) => {
      if (err) {
        log(`  ⚠️ Web search failed: ${err.message.slice(0, 100)}`);
        resolve([]);
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(Array.isArray(parsed) ? parsed : []);
      } catch {
        resolve([]);
      }
    });
  });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function todayTag() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear() % 100}`;
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

// ─── FILTER Agent ────────────────────────────────────────────────────────────

function filterTables(tables) {
  const seen = new Map();
  const filtered = [];
  const stats = { total: tables.length, removed: { empty: 0, test: 0, copy: 0, edp: 0, oneObj: 0, dup: 0, trash: 0, research: 0, experiment: 0 } };

  for (const t of tables) {
    // Skip empty
    if (t.param_count === 0 || t.object_count === 0) { stats.removed.empty++; continue; }
    // Skip test/imp
    if (t.id.startsWith('test_') || t.id.startsWith('imp_')) { stats.removed.test++; continue; }
    // Skip copies
    if (t.title.includes('Копия') || t.title.includes('копия')) { stats.removed.copy++; continue; }
    // Skip EDP architecture
    if (t.id.startsWith('edp-')) { stats.removed.edp++; continue; }
    // Skip 1 object (not a comparison)
    if (t.object_count <= 1) { stats.removed.oneObj++; continue; }
    // Skip trash titles
    if (t.title.match(/^[\w\d]$/) || t.title.length <= 2) { stats.removed.trash++; continue; }
    // Skip research tables
    if (t.id.startsWith('res_')) { stats.removed.research++; continue; }
    // Skip AI experiments
    if (t.title.includes('AI эксперимент') || t.title.includes('эксперимент')) { stats.removed.experiment++; continue; }

    // Dedup by normalized title
    const key = normalizeTitle(t.title);
    if (seen.has(key)) {
      const existing = seen.get(key);
      if (t.param_count > existing.param_count) {
        // Replace with better version
        const idx = filtered.indexOf(existing);
        if (idx >= 0) filtered[idx] = t;
        seen.set(key, t);
      }
      stats.removed.dup++;
      continue;
    }

    seen.set(key, t);
    filtered.push(t);
  }

  log(`\n📊 FILTER: ${stats.total} total → ${filtered.length} to process`);
  log(`   Removed: ${JSON.stringify(stats.removed)}`);

  return filtered;
}

// ─── Category Detection ──────────────────────────────────────────────────────

function detectCategory(title) {
  const t = title.toLowerCase();
  const techKeywords = ['смартфон', 'телефон', 'ноутбук', 'планшет', 'наушник', 'телевизор', 'автомобиль', 'электросамокат', 'монитор', 'принтер', 'камера', 'фотоаппарат', 'роутер', 'часы', 'фитнес', 'браслет', 'процессор', 'видеокарт', 'ssd', 'hdd', 'флешк', 'power bank', 'колонк', 'проектор', 'пылесос', 'робот', 'квадрокопт', 'дрон', 'samsung', 'iphone', 'xiaomi', 'huawei'];
  const swKeywords = ['crm', 'erp', 'хостинг', 'vpn', 'антивирус', 'бухгалтер', 'скриншот', 'редактор', 'ide ', 'база данных', 'cms', 'ос ', 'система', 'мессенджер', 'почт', 'cloud', 'сервис', 'программ', 'софт', 'software', 'platform', 'saas', 'agile', 'devops', 'тариф'];
  const finKeywords = ['кредит', 'карт', 'вклад', 'страх', 'инвест', 'брокер', 'банк', 'ипотек', 'дмс', 'осаго', 'каско', 'депозит'];

  if (techKeywords.some(k => t.includes(k))) return 'tech';
  if (swKeywords.some(k => t.includes(k))) return 'software';
  if (finKeywords.some(k => t.includes(k))) return 'finance';
  return 'general';
}

// ─── Category-specific System Prompts ────────────────────────────────────────

const SYSTEM_PROMPTS = {
  scout_tech: `Ты — аналитик рынка техники. Анализируй таблицу сравнения техники и определи:
1. Какие параметры устарели (нет 5G, eSIM, спутниковой связи, Wi-Fi 7 и т.д.)
2. Какие объекты нужно заменить (старые модели → актуальные 2025-2026)
3. Какие новые параметры добавить
4. Какие веса скорректировать
Ответ в JSON: {"outdated_params": [...], "objects_to_replace": [...], "new_params": [...], "weight_changes": {...}, "action": "update|skip", "reason": "..."}`,

  scout_software: `Ты — аналитик SaaS-рынка. Анализируй таблицу сравнения ПО/сервисов и определи:
1. Какие сервисы закрыты/поглощены/переименованы
2. Какие тарифы устарели
3. Какие новые фичи стали стандартом
4. Какие параметры добавить (AI-фичи, интеграции, API)
Ответ в JSON: {"outdated_params": [...], "objects_to_replace": [...], "new_params": [...], "weight_changes": {...}, "action": "update|skip", "reason": "..."}`,

  scout_finance: `Ты — финансовый аналитик. Анализируй таблицу сравнения финансовых продуктов и определи:
1. Какие ставки/условия устарели
2. Какие продукты сняты с рынка
3. Какие новые условия появились
4. Актуальные ставки ЦБ и ключевые показатели
Ответ в JSON: {"outdated_params": [...], "objects_to_replace": [...], "new_params": [...], "weight_changes": {...}, "action": "update|skip", "reason": "..."}`,

  scout_general: `Ты — аналитик. Анализируй таблицу сравнения и определи:
1. Что устарело (данные, объекты, параметры)
2. Что добавить
3. Что заменить
4. Стоит ли обновлять или таблица актуальна
Ответ в JSON: {"outdated_params": [...], "objects_to_replace": [...], "new_params": [...], "weight_changes": {...}, "action": "update|skip", "reason": "..."}`,

  research: `Ты — исследователь. На основе результатов веб-поиска извлеки актуальную информацию по теме.
Верни JSON: {"objects": [{"name": "...", "price_range": "X-Y руб", "key_specs": {...}}], "price_range": [min, max], "market_trends": "...", "top_picks": ["...", "..."]}`,

  builder: `Ты — эксперт по созданию параметрических таблиц сравнения. Генерируй оценки (grade 0-10) для каждого параметра каждого объекта.
ПРАВИЛА:
- Grade 10 = лучший на рынке по данному параметру
- Grade 0 = худший или нет данных
- Value = конкретное значение (не «хорошо», а «12 ГБ» или «Да»)
- Цена — в рублях для российского рынка
- Все ячейки должны быть заполнены`,

  critic: `Ты — критик-валидатор. Проверь обновлённую таблицу:
1. Все ли ячейки заполнены (value + grade)?
2. Адекватны ли оценки (нет ли всех grade=7)?
3. Существуют ли объекты реально?
4. Разумны ли цены?
5. Нет ли пропущенных параметров?
Ответ в JSON: {"verdict": "approve|reject", "issues": [...], "confidence": 0.0-1.0}`,
};

function getScoutPrompt(category) {
  return SYSTEM_PROMPTS[`scout_${category}`] || SYSTEM_PROMPTS.scout_general;
}

// ─── Queue Manager ───────────────────────────────────────────────────────────

class Queue {
  constructor(file) {
    this.file = file;
    this.data = { pending: [], inProgress: {}, done: [], failed: [], skipped: [] };
    this.load();
  }

  load() {
    if (existsSync(this.file)) {
      try {
        this.data = JSON.parse(readFileSync(this.file, 'utf8'));
      } catch {}
    }
  }

  save() {
    writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }

  init(tableIds) {
    // Recover any tables stuck in inProgress (crash recovery)
    const stuckIds = Object.values(this.data.inProgress || {});
    if (stuckIds.length > 0) {
      log(`   Recovering ${stuckIds.length} stalled tables from previous run`);
      this.data.pending = [...stuckIds, ...this.data.pending];
      this.data.inProgress = {};
    }
    // Only add tables not already in done/failed/skipped
    const processed = new Set([
      ...this.data.done.map(d => d.id),
      ...this.data.failed.map(f => f.id),
      ...this.data.skipped.map(s => s.id),
    ]);
    const newIds = tableIds.filter(id => !processed.has(id));
    // Merge with existing pending (avoid duplicates)
    const existingPending = new Set(this.data.pending);
    for (const id of newIds) {
      if (!existingPending.has(id)) this.data.pending.push(id);
    }
    this.save();
  }

  next(workerId) {
    if (this.data.pending.length === 0) return null;
    const id = this.data.pending.shift();
    this.data.inProgress[workerId] = id;
    this.save();
    return id;
  }

  complete(workerId, result) {
    delete this.data.inProgress[workerId];
    this.data.done.push({ id: result.id, ...result, finishedAt: new Date().toISOString() });
    this.save();
  }

  fail(workerId, id, error) {
    delete this.data.inProgress[workerId];
    this.data.failed.push({ id, error: String(error).slice(0, 500), failedAt: new Date().toISOString() });
    this.save();
  }

  skip(workerId, id, reason) {
    delete this.data.inProgress[workerId];
    this.data.skipped.push({ id, reason, skippedAt: new Date().toISOString() });
    this.save();
  }

  get stats() {
    return {
      pending: this.data.pending.length,
      inProgress: Object.keys(this.data.inProgress).length,
      done: this.data.done.length,
      failed: this.data.failed.length,
      skipped: this.data.skipped.length,
    };
  }
}

// ─── Pipeline Agents ─────────────────────────────────────────────────────────

async function runScout(tableMeta, fullTable) {
  const category = detectCategory(tableMeta.title);
  const systemPrompt = getScoutPrompt(category);

  const cols = fullTable.meta.columns || [];
  const rows = (fullTable.data || []).map(r => {
    const rd = r.data || {};
    return { name: rd['Название'] || rd['name'] || '(unnamed)', price: rd['price'] || 0 };
  });
  const colSummary = cols.map(c => `${c.key}: ${c.title} (w=${c.weight})`).join('\n');

  const userPrompt = `Таблица: "${tableMeta.title}" (ID: ${tableMeta.id})
Категория: ${category}
Параметры (${cols.length}):
${colSummary}
Объекты (${rows.length}): ${rows.map(r => r.name).join(', ')}

Таблица создана: ${fullTable.meta.created_at || 'неизвестно'}, обновлена: ${fullTable.meta.updated_at || 'неизвестно'}

Нужно ли обновлять? Если да — что именно?`;

  return callLLMJson(systemPrompt, userPrompt, { temperature: 0.2, retries: 2 });
}

async function runResearch(topic, objects, category) {
  const searchQueries = [
    `${topic} 2025 2026 сравнение рейтинг обзор`,
    `лучшие ${topic} рейтинг отзывы 2026`,
  ];

  let allResults = [];
  for (const q of searchQueries) {
    const results = await webSearch(q, 5);
    allResults = allResults.concat(results);
    await sleep(500);
  }

  if (allResults.length === 0) {
    return { objects: [], price_range: [0, 0], market_trends: 'Web search unavailable', top_picks: [], _tokens: { input: 0, output: 0 } };
  }

  const searchContext = allResults.map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}`).join('\n\n');

  const userPrompt = `Тема: "${topic}"
Категория: ${category}
Текущие объекты: ${objects.join(', ')}

Результаты поиска:
${searchContext}

Извлеки актуальную информацию: современные объекты, цены, ключевые характеристики.`;

  return callLLMJson(SYSTEM_PROMPTS.research, userPrompt, { temperature: 0.3 });
}

async function runBuilderChunk(fullTable, scoutResult, researchResult, chunkCols, allCols) {
  const rows = fullTable.data || [];
  const category = detectCategory(fullTable.meta.title);

  const colDefs = chunkCols.map(c => `  ${c.key}: "${c.title}" (weight=${c.weight}, type=${c.type})`).join('\n');
  const existingRows = rows.map(r => {
    const rd = r.data || {};
    const name = rd['Название'] || rd['name'] || '(unnamed)';
    const cells = {};
    for (const c of chunkCols) {
      if (rd[c.key]) cells[c.key] = rd[c.key];
    }
    return { name, price: rd.price || 0, existing_cells: cells };
  });

  let researchContext = '';
  if (researchResult && researchResult.objects && researchResult.objects.length > 0) {
    researchContext = `\n\nДанные из веб-поиска:\n${JSON.stringify(researchResult.objects.slice(0, 15), null, 2)}`;
    if (researchResult.market_trends) researchContext += `\nТренды: ${researchResult.market_trends}`;
  }

  const systemPrompt = SYSTEM_PROMPTS.builder;
  const userPrompt = `Таблица: "${fullTable.meta.title}"
Категория: ${category}
Всего параметров: ${allCols.length}, этот чанк: ${chunkCols.length}

Параметры для заполнения:
${colDefs}

SCOUT рекомендации:
${JSON.stringify(scoutResult, null, 2)}
${researchContext}

Текущие объекты (${existingRows.length}):
${JSON.stringify(existingRows, null, 2)}

Заполни для КАЖДОГО объекта: value и grade (0-10) для КАЖДОГО параметра из этого чанка.
Если объект устарел — замени на актуальный (сохрани position).
Ответ в JSON:
{
  "objects": [
    {
      "name": "Название",
      "price": число_в_рублях,
      "cells": {
        "param_XXX": {"value": "конкретное значение", "grade": число_0_10},
        ...
      }
    }
  ]
}`;

  // Estimate output tokens needed
  const estimatedCells = chunkCols.length * Math.max(existingRows.length, 10);
  const maxTokens = Math.min(8000, Math.max(3000, estimatedCells * 15));

  return callLLMJson(systemPrompt, userPrompt, { temperature: 0.3, maxTokens });
}

async function runCritic(originalTable, updatedData) {
  const origCols = originalTable.meta.columns || [];
  const updRows = updatedData.data || [];  // Array of {name, price, param_XXX: {value, grade}}

  const origSummary = `Параметры: ${origCols.length}, Объекты: ${(originalTable.data || []).length}`;
  const updSummary = `Объекты: ${updRows.length}`;

  // Sample grades for validation — updatedData.data is flat {name, price, param_XXX: {value, grade}}
  let allGrades = [];
  let emptyCells = 0;
  let totalCells = 0;
  for (const row of updRows) {
    for (const col of origCols) {
      totalCells++;
      const cell = row[col.key];  // Direct access, no .data nesting
      if (!cell || cell.grade === undefined || cell.grade === null) {
        emptyCells++;
      } else {
        allGrades.push(cell.grade);
      }
    }
  }

  const stats = {
    totalCells,
    emptyCells,
    fillRate: totalCells > 0 ? ((totalCells - emptyCells) / totalCells * 100).toFixed(1) + '%' : 'N/A',
    gradeMean: allGrades.length > 0 ? (allGrades.reduce((a, b) => a + b, 0) / allGrades.length).toFixed(1) : 'N/A',
    gradeStd: allGrades.length > 1 ? Math.sqrt(allGrades.reduce((s, g) => s + (g - allGrades.reduce((a, b) => a + b, 0) / allGrades.length) ** 2, 0) / allGrades.length).toFixed(1) : 'N/A',
    objects: updRows.map(r => r.name || r['Название'] || '?').slice(0, 15),
    sampleGrades: allGrades.slice(0, 20),
  };

  const userPrompt = `Оригинал: ${origSummary}
Обновление: ${updSummary}
Статистика оценок: ${JSON.stringify(stats, null, 2)}

Проверь: все ли ячейки заполнены, адекватны ли оценки, существуют ли объекты реально, разумны ли цены?`;

  return callLLMJson(SYSTEM_PROMPTS.critic, userPrompt, { temperature: 0.1, retries: 1 });
}

// ─── Table Processing Pipeline ───────────────────────────────────────────────

async function processTable(workerId, tableId, queue) {
  const startTime = Date.now();
  let totalTokens = { input: 0, output: 0 };

  try {
    // 1. Get full table
    workerLog(workerId, `📥 Fetching ${tableId}...`);
    const fullTable = await choser.getTable(tableId);
    const meta = fullTable.meta;

    if (!meta || !meta.columns || meta.columns.length === 0) {
      workerLog(workerId, `⏭️ ${tableId} — no columns, skipping`);
      queue.skip(workerId, tableId, 'no columns');
      return;
    }

    const title = meta.title || tableId;
    const category = detectCategory(title);
    const cols = meta.columns;
    const rows = fullTable.data || [];
    workerLog(workerId, `📊 ${title} (${category}, ${cols.length}p, ${rows.length}o)`);

    // 2. SCOUT — analyze what to update
    workerLog(workerId, `🔍 SCOUT analyzing...`);
    const scoutResult = await runScout(meta, fullTable);
    totalTokens.input += scoutResult._tokens?.input || 0;
    totalTokens.output += scoutResult._tokens?.output || 0;

    if (scoutResult.action === 'skip') {
      workerLog(workerId, `⏭️ SCOUT says skip: ${scoutResult.reason}`);
      queue.skip(workerId, tableId, `scout: ${scoutResult.reason}`);
      return;
    }

    // 3. RESEARCH — web search for fresh data
    let researchResult = null;
    const objectNames = rows.map(r => {
      const rd = r.data || {};
      return rd['Название'] || rd['name'] || '';
    }).filter(Boolean);

    try {
      workerLog(workerId, `🔎 RESEARCH web search...`);
      researchResult = await runResearch(title, objectNames, category);
      totalTokens.input += researchResult._tokens?.input || 0;
      totalTokens.output += researchResult._tokens?.output || 0;
    } catch (e) {
      workerLog(workerId, `⚠️ RESEARCH failed: ${e.message}, continuing without web data`);
    }

    // 4. BUILDER — generate updated data in chunks
    workerLog(workerId, `🔨 BUILDER generating (chunks of ${CONFIG.chunkSize})...`);
    const chunks = [];
    for (let i = 0; i < cols.length; i += CONFIG.chunkSize) {
      chunks.push(cols.slice(i, i + CONFIG.chunkSize));
    }

    const mergedObjects = new Map(); // name -> { name, price, cells }

    for (let ci = 0; ci < chunks.length; ci++) {
      workerLog(workerId, `  📦 Chunk ${ci + 1}/${chunks.length} (${chunks[ci].length} params)...`);
      const chunkResult = await runBuilderChunk(fullTable, scoutResult, researchResult, chunks[ci], cols);
      totalTokens.input += chunkResult._tokens?.input || 0;
      totalTokens.output += chunkResult._tokens?.output || 0;

      if (chunkResult.objects) {
        for (const obj of chunkResult.objects) {
          const name = obj.name || obj['Название'] || `Object_${mergedObjects.size + 1}`;
          if (!mergedObjects.has(name)) {
            mergedObjects.set(name, { name, price: obj.price || 0, cells: {} });
          }
          const entry = mergedObjects.get(name);
          if (obj.price) entry.price = obj.price;
          if (obj.cells) Object.assign(entry.cells, obj.cells);
        }
      }
      await sleep(CONFIG.rateLimitMs);
    }

    if (mergedObjects.size === 0) {
      workerLog(workerId, `❌ BUILDER produced 0 objects`);
      queue.fail(workerId, tableId, 'Builder produced 0 objects');
      return;
    }

    // 5. Assemble update data
    const updatedRows = [...mergedObjects.values()].map(obj => {
      const row = { name: obj.name, price: obj.price || 0 };
      for (const [paramKey, cell] of Object.entries(obj.cells)) {
        row[paramKey] = typeof cell === 'object' ? cell : { value: String(cell), grade: 5 };
      }
      return row;
    });

    // Add tag 05.26
    const currentTags = meta.tags || '';
    const tag = todayTag();
    const newTags = currentTags.includes(tag) ? currentTags : (currentTags ? currentTags + ',' + tag : tag);

    // Build columns: keep existing + add new from scout
    const updatedColumns = [...cols];
    if (scoutResult.new_params && Array.isArray(scoutResult.new_params)) {
      for (const np of scoutResult.new_params) {
        const paramObj = typeof np === 'string' ? { title: np } : np;
        const newKey = `param_${Date.now()}_${updatedColumns.length}`;
        updatedColumns.push({ key: newKey, title: paramObj.title || np, weight: paramObj.weight || 5, type: paramObj.type || 'text', description: '' });
      }
    }

    // Apply weight changes
    if (scoutResult.weight_changes) {
      for (const col of updatedColumns) {
        if (scoutResult.weight_changes[col.key] !== undefined) {
          col.weight = scoutResult.weight_changes[col.key];
        }
        if (scoutResult.weight_changes[col.title] !== undefined) {
          col.weight = scoutResult.weight_changes[col.title];
        }
      }
    }

    const updatePayload = {
      id: tableId,
      title: meta.title,
      description: meta.description || '',
      columns: updatedColumns,
      data: updatedRows,
      quality_score: null,
      quality_details: null,
      // Note: Choser API POST /api/table does not persist tags
      // Tags are stored in the `tables` row but this endpoint only updates title/description/state/columns/rows
    };

    // 6. CRITIC — validate before saving
    workerLog(workerId, `✅ CRITIC validating...`);
    const criticResult = await runCritic(fullTable, updatePayload);
    totalTokens.input += criticResult._tokens?.input || 0;
    totalTokens.output += criticResult._tokens?.output || 0;

    if (criticResult.verdict === 'reject') {
      workerLog(workerId, `❌ CRITIC rejected: ${JSON.stringify(criticResult.issues)}`);
      queue.fail(workerId, tableId, `Critic rejected: ${JSON.stringify(criticResult.issues).slice(0, 200)}`);
      return;
    }

    workerLog(workerId, `✅ CRITIC approved (confidence: ${criticResult.confidence || 'N/A'})`);

    // 7. Snapshot before save
    const snapshotPath = join(CONFIG.snapshotDir, `${tableId}-before.json`);
    try {
      writeFileSync(snapshotPath, JSON.stringify(fullTable, null, 2));
    } catch {}

    // 8. SAVE
    workerLog(workerId, `💾 Saving...`);
    await choser.saveTable(updatePayload);

    // 9. VERIFY
    await sleep(1000);
    const verifyResult = await choser.getTable(tableId);
    const savedRowCount = (verifyResult.data || []).length;

    if (savedRowCount < updatedRows.length * 0.5) {
      // Rollback
      workerLog(workerId, `⚠️ Save verification failed (${savedRowCount}/${updatedRows.length} rows), rolling back...`);
      try {
        // Re-save original from snapshot
        const originalPayload = {
          id: tableId,
          title: fullTable.meta.title,
          description: fullTable.meta.description || '',
          columns: fullTable.meta.columns || [],
          data: (fullTable.data || []).map(r => r.data || {}),
        };
        await choser.saveTable(originalPayload);
      } catch {}
      queue.fail(workerId, tableId, `Save verification failed: ${savedRowCount}/${updatedRows.length} rows`);
      return;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    workerLog(workerId, `✅ Done! ${updatedRows.length} objects, ${updatedColumns.length} params in ${elapsed}s | Tokens: ${totalTokens.input}in/${totalTokens.output}out`);

    queue.complete(workerId, {
      id: tableId,
      title: meta.title,
      category,
      paramsBefore: cols.length,
      paramsAfter: updatedColumns.length,
      objectsBefore: rows.length,
      objectsAfter: updatedRows.length,
      tokens: totalTokens,
      elapsedSeconds: parseFloat(elapsed),
    });

  } catch (e) {
    workerLog(workerId, `❌ Error processing ${tableId}: ${e.message}`);
    queue.fail(workerId, tableId, e.message);
  }
}

// ─── Worker Loop ─────────────────────────────────────────────────────────────

async function workerLoop(workerId, queue) {
  while (true) {
    const tableId = queue.next(workerId);
    if (!tableId) break;

    await processTable(workerId, tableId, queue);
    await sleep(CONFIG.betweenTablesMs);
  }
}

// ─── Progress Monitor ────────────────────────────────────────────────────────

function printProgress(queue) {
  const s = queue.stats;
  const total = s.pending + s.inProgress + s.done + s.failed + s.skipped;
  const pct = total > 0 ? ((s.done + s.failed + s.skipped) / total * 100).toFixed(1) : 0;
  log(`📈 Progress: ${s.done} done | ${s.failed} failed | ${s.skipped} skipped | ${s.inProgress} active | ${s.pending} queued (${pct}%)`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const startTime = Date.now();

  // Ensure dirs
  ensureDir(CONFIG.reportDir);
  ensureDir(CONFIG.snapshotDir);

  log('═══════════════════════════════════════════════════════════');
  log('🚀 Choser Table Refresh Pipeline v3');
  log(`   Workers: ${opts.workers} | Dry run: ${opts.dryRun}`);
  log(`   Choser: ${CONFIG.choserBaseUrl}`);
  log('═══════════════════════════════════════════════════════════');

  // Health check
  try {
    const health = await choser.healthCheck();
    log(`✅ Choser healthy (DB: ${health.db_size_mb} MB, uptime: ${health.uptime_sec}s)`);
  } catch (e) {
    log(`❌ Choser not reachable at ${CONFIG.choserBaseUrl}: ${e.message}`);
    process.exit(1);
  }

  // Check API key
  if (!CONFIG.zaiApiKey) {
    log('❌ ZAI_API_KEY not set');
    process.exit(1);
  }

  // Get all tables
  log('📋 Fetching table list...');
  const allTables = await choser.listAllTables();
  log(`   Total tables in DB: ${allTables.length}`);

  // Filter
  const filtered = filterTables(allTables);

  // Determine target tables
  let targetIds;
  if (opts.tableId) {
    targetIds = [opts.tableId];
  } else if (opts.limit > 0) {
    targetIds = filtered.slice(0, opts.limit).map(t => t.id);
  } else if (opts.all) {
    targetIds = filtered.map(t => t.id);
  } else {
    log('⚠️ No mode specified. Use --limit N, --table ID, or --all');
    log(`   Available: ${filtered.length} tables to process`);
    log(`   Sample IDs: ${filtered.slice(0, 5).map(t => t.id + ' (' + t.title + ')').join(', ')}`);
    process.exit(0);
  }

  log(`\n🎯 Target: ${targetIds.length} tables`);

  if (opts.dryRun) {
    log('\n📋 DRY RUN — tables to be processed:');
    for (const id of targetIds) {
      const t = filtered.find(x => x.id === id) || allTables.find(x => x.id === id);
      if (t) {
        const cat = detectCategory(t.title);
        log(`   ${t.id}: ${t.title} (${t.param_count}p, ${t.object_count}o, ${cat})`);
      }
    }
    log(`\n   Total: ${targetIds.length} tables`);
    return;
  }

  // Init queue
  const queue = new Queue(CONFIG.queueFile);
  queue.init(targetIds);
  log(`📊 Queue: ${queue.stats.pending} pending, ${queue.stats.done} already done, ${queue.stats.failed} previously failed`);

  // Progress interval
  const progressInterval = setInterval(() => printProgress(queue), 30000);

  // Launch workers
  const workerCount = Math.min(opts.workers, targetIds.length);
  log(`\n🏃 Launching ${workerCount} workers...\n`);

  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(workerLoop(i, queue));
  }

  await Promise.all(workers);

  clearInterval(progressInterval);

  // Final report
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const s = queue.stats;

  log('\n═══════════════════════════════════════════════════════════');
  log('📊 FINAL REPORT');
  log('═══════════════════════════════════════════════════════════');
  log(`   ✅ Done:    ${s.done}`);
  log(`   ❌ Failed:  ${s.failed}`);
  log(`   ⏭️ Skipped: ${s.skipped}`);
  log(`   ⏱️ Time:    ${elapsed}s`);

  // Token summary
  let totalIn = 0, totalOut = 0;
  for (const d of queue.data.done) {
    if (d.tokens) { totalIn += d.tokens.input || 0; totalOut += d.tokens.output || 0; }
  }
  log(`   💰 Tokens: ${totalIn} in / ${totalOut} out`);
  log(`   💵 Est cost: $${((totalIn + totalOut) / 1_000_000 * 0.5).toFixed(3)}`);

  // Category breakdown
  const catCounts = {};
  for (const d of queue.data.done) { catCounts[d.category || 'unknown'] = (catCounts[d.category || 'unknown'] || 0) + 1; }
  log(`   📊 By category: ${JSON.stringify(catCounts)}`);

  // Save final report
  const reportPath = join(CONFIG.reportDir, `report-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(reportPath, JSON.stringify(queue.data, null, 2));
  log(`\n   📄 Report: ${reportPath}`);

  if (s.failed > 0) {
    log(`\n   ⚠️ Failed tables:`);
    for (const f of queue.data.failed.slice(0, 20)) {
      log(`     ${f.id}: ${f.error?.slice(0, 100)}`);
    }
  }

  log('═══════════════════════════════════════════════════════════');
}

main().catch(e => {
  log(`💥 Fatal: ${e.message}`);
  process.exit(1);
});
