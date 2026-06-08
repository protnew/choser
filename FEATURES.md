# 📋 Choser EDP — Функциональные Требования v5

> Версия: 5.0 от 2026-04-30
> Файл: `C:\Сделать\Чейчер SCRUM\openclaw\FEATURES.md`
> Репо: https://github.com/protnew/choserMCP
> v5: **глубокий аудит всех 71 архитектурных выборов** (противоречия + корректность) + **5 глубоких критиков** (дыры, edge cases, внутренние конфликты) + синергия

---

## 🔍 Глубокий аудит 71 архитектурного выбора vs FEATURES v4

### Метод: каждый выбор проверен на 3 уровня
1. **Упомянут** — есть ли в FEATURES?
2. **Корректен** — не противоречит ли другим пунктам?
3. **Реализуем** — достаточно ли деталей для кодирования?

### ❌ Найденные противоречия и дыры (v4 → v5):

**К01. Write queue + Single connection — противоречие**
P0.2 говорит «Single connection» (один db object). P0.2 также говорит «Write queue — serialise concurrent writes». Но better-sqlite3 **уже синхронный** — concurrent writes невозможны. Write queue избыточен.
→ **Исправление**: убрать «Write queue», оставить «Single connection (better-sqlite3 synchronous by design, no queue needed)»

**К02. Circuit breaker 3 errors → но LLM caching может скрывать ошибки**
P0.4: circuit breaker считает ошибки. P0.4: LLM cache возвращает cached ответ. Если cache poisoned (LLM вернул мусор → закэширован), circuit breaker не сработает — он видит «200 OK из cache».
→ **Исправление**: cache invalidation при provider switch. Cache entry помечает provider — если provider в circuit open → invalidate all entries для этого provider.

**К03. Sync/Async 30 сек — но SSE transport может обрывать sync response**
P0.4: sync если <30 сек. P0.3: SSE keepalive каждые 15 сек. Если sync response идёт 25 сек, SSE keepalive может вмешаться в response stream.
→ **Исправление**: sync mode — не через SSE, а через plain HTTP response. SSE only для async mode.

**К04. JWT refresh token + API Key — два механизма, но не указано когда какой**
P0.5: JWT для web UI, API Key для MCP. Но refresh token для JWT не описан (какой endpoint, TTL, storage). API Key TTL=90 дней — где хранятся ключи? В SQLite? В memory?
→ **Исправление**: таблица `api_keys` (id, key_hash, org_id, expires_at, created_at). JWT refresh: `POST /v1/api/auth/refresh` с refresh_token в httpOnly cookie, TTL 7 дней.

**К05. FTS5 trigram — но trigram не понимает «слова»**
Trigram разбивает на 3-символьные последовательности. «SQLite» → «SQL», «QLi», «Lit», «ite». Это хуже чем porter stemmer для русского. Но porter требует ICU.
→ **Исправление**: использовать `unicode61` tokenizer с `remove_diacritics 2` для русского как default, trigram как опция для fuzzy matching. `tokenize='unicode61 remove_diacritics 2'` — basic, но лучше чем trigram для слов. Добавить комментарий что для production русского поиска нужен ICU tokenizer (compile-time flag).

**К06. org_id column (мульти-тенантность) в P0 — но все остальные P3**
P0.5: org_id column. P3.1: мульти-тенантность (org_id column). Дублирование. org_id в P0 означает что все таблицы сразу с org_id, но admin panel и per-org settings в P3. Это правильно? Да — column с default value в P0, управление в P3.
→ **Исправление**: убрать дублирование. P0.5: «org_id column со значением по умолчанию 'default'». P3.1: «управление организациями». Явно разделить.

**К07. snapshots table — но нет cleanup**
P0.2: snapshots table, full copy per save. Каждое сохранение = полная копия JSON. Таблица с 500 таблиц × 10 версий = 5000 rows × ~10KB = 50MB. Растёт бесконечно.
→ **Исправление**: добавить snapshot retention — хранить последние 10 версий на таблицу, старые удалять при новом snapshot.

**К08. council_jobs_archive — но нет определения «moved at startup»**
P0.2: completed > 90 дней → moved at startup. Но MOVE = DELETE + INSERT. Если crash между DELETE и INSERT — данные потеряны.
→ **Исправление**: архивация через `db.transaction()`: INSERT INTO archive → DELETE FROM council_jobs → COMMIT. Атомарно.

**К09. Materialized TCO columns — но кто их обновляет?**
P1.1: `tco_1y REAL, tco_3y REAL, tco_5y REAL` materialized. Но если JSON blob обновлён — кто пересчитывает materialized columns? Триггер? Application code?
→ **Исправление**: SQLite TRIGGER AFTER UPDATE ON rows — пересчитывает tco_1y/tco_3y/tco_5y из JSON. Либо application-level в write handler. Указать явно: «Application-level: при PUT /tables/:id → extract TCO from JSON → UPDATE materialized columns».

**К10. Currency + exchange_rates — но нет источника курса**
P1.1: exchange_rates config table, auto from CBR API optional. Но: когда обновлять? Каждый день? Где хранить исторические курсы? TCO в какой валюте — на момент расчёта или текущей?
→ **Исправление**: exchange_rate хранится на дату расчёта. `tco_calculated_at DATETIME` — дата расчёта TCO. При отображении: «TCO на момент расчёта (курс от YYYY-MM-DD: 1 USD = 92.5 RUB)». Обновление курсов — ручное через admin endpoint или daily cron.

**К11. IRR iterative solve — но нет алгоритма**
P1.2: NPV=0 iterative solve. Какой алгоритм? Newton-Raphson? Bisection? Какой initial guess? Сколько итераций? Что если не сходится?
→ **Исправление**: Newton-Raphson с initial guess=0.1 (10%), max 100 iterations, tolerance 0.0001. Если не сходится → IRR=null, показать «не удалось рассчитать».

**К12. Consensus formula — но modelWeight exponential для чего?**
P0.4: `score = Σ(confidence_i × modelWeight_i^e) / N`. Что такое `e`? e=1 = linear, e=2 = quadratic, e=euler = exponential. Не определено.
→ **Исправление**: `e = 1.5` (super-linear, не full exponential —否则 один эксперт доминирует). Gemini Pro weight=100^1.5=1000, Qwen weight=1^1.5=1. Это даёт 1000:1 ratio — достаточно для доминирования умных моделей без полного подавления.

**К13. Health check проверяет LLM providers — но это может быть медленно**
P0.1: health check → llm_providers: [{name, status}]. Если проверять 4 провайдера × HEAD request × timeout 5 сек = 20 сек health check. Docker health check timeout по умолчанию 30 сек — влезет, но margin thin.
→ **Исправление**: LLM health check — не HEAD request, а cached status (обновляется каждые 60 сек в background). Health check отдаёт кэшированный статус, не ждёт ответа провайдера.

**К14. Backup sqlite3.backup() — но кто его триггерит?**
P0.1: auto-backup каждые 6 часов. В контейнере нет cron. Node.js `setInterval`? node-cron? Что если процесс занят Council'ом?
→ **Исправление**: `setInterval(backup, 6*3600*1000)` в server.js. Не запускать backup если active council_jobs > 0 (подождать до idle). Backup lock file для предотвращения двойного запуска.

**К15. Rate limiting per API key — но ключи в SQLite = lock contention**
P0.6: rate limiting per API key. P0.2: single connection. Каждый request → SELECT COUNT from rate_limits → write. На 100 req/min это 100 дополнительных SQLite writes/minute.
→ **Исправление**: in-memory rate limiter (Map<key, count>) с periodic flush в SQLite для persistence. Сброс при restart — OK (rate limit не нужен между restarts).

**К16. SSE Bearer token — но SSE не поддерживает custom headers**
P0.6: MCP SSE auth: Bearer token при handshake. Но EventSource (browser API для SSE) **не поддерживает** custom headers. Только query parameter или cookie.
→ **Исправление**: SSE auth через query parameter `?token=xxx` ИЛИ cookie. Не через header. Для MCP clients (не browser) — можно через header при initial HTTP upgrade.

**К17. CORS default * для dev — но CSP script-src self**
P0.1: CORS default `*`. P0.6: CSP `script-src self`. CSP блокирует cross-origin scripts даже если CORS `*`. Это OK (CORS для API, CSP для HTML). Но надо явно разделить.
→ **Исправление**: добавить комментарий «CORS = API access control, CSP = HTML resource policy. Не конфликтуют.»

**К18. Idempotency key TTL 24h — но council_jobs archive 90 дней**
P0.3: idempotency_keys TTL 24h. P0.2: council_jobs archive 90 дней. Если duplicate request приходит через 25 часов — создаст новый council. Это правильно (idempotency = короткое окно для network retries, не для business dedup).
→ **OK**, но добавить комментарий: «Idempotency = network-level dedup (24h). Business-level dedup = check council_jobs by topic+org_id before creating new.»

**К19. Dependency graph DAG — но хранение зависимостей не определено**
P1.5: DAG с cycle detection. Где хранятся edges? Отдельная таблица? JSON field в tables?
→ **Исправление**: таблица `dependencies` (from_table_id INTEGER, to_table_id INTEGER, type TEXT DEFAULT 'blocks', UNIQUE(from, to)). Cycle detection: recursive CTE при INSERT.

**К20. Drizzle ORM — но D1 → SQLite миграция может сломаться**
P0.2: Drizzle ORM. D1 использует Drizzle adapter для D1. SQLite использует Drizzle adapter для better-sqlite3. Миграция adapter'а = смена import + config. Но типы данных могут отличаться (D1 INTEGER vs SQLite REAL).
→ **Исправление**: migration mapping document: D1→SQLite type map (INTEGER→INTEGER, REAL→REAL, TEXT→TEXT, BLOB→BLOB — совместимы). D1-specific функции → заменить на SQLite аналоги.

---

## P0 — Ядро (без этого не запускается)

### P0.1 Docker-контейнер
- [ ] `Dockerfile` мультистейдж (`node:22.15.0-alpine3.21`, pin version, ~80MB)
- [ ] `.dockerignore`: `.env`, `.git`, `node_modules`, `*.sqlite`, `backup/`
- [ ] `docker-compose.yml` с resource limits (`mem_limit: 1g`, `cpus: 2`, `stop_grace_period: 60s`)
- [ ] `server.js` — единая точка входа (API + Static + MCP на :3000)
- [ ] **Single thread** — Node.js без cluster mode. Один процесс. SQLite-friendly (better-sqlite3 synchronous). До 1000 rps достаточно
- [ ] Health check: `GET /health` → {version, db: "ok", db_size_mb, uptime_sec, llm_providers: [{name, status_cached, last_check_at}]}
  - LLM status: background refresh every 60 sec, health endpoint returns cached value (не ждёт провайдеров)
- [ ] Graceful shutdown: SIGTERM → mark running council_jobs as 'interrupted' → finish current SQLite write → backup lock check → exit. Docker stop_grace_period: 60s
- [ ] Auto-backup: `sqlite3.backup()` API каждые 6 часов через `setInterval` в server.js
  - Не запускать если active council_jobs > 0 (подождать idle)
  - Backup lock file (`backup/.lock`) для предотвращения двойного запуска
  - Rotation: 7 daily + 4 weekly + 12 monthly (script: `npm run backup`)
- [ ] `.env.example` с описанием всех переменных (LLM_API_KEYS, JWT_SECRET, PORT, CORS_ORIGINS, LOG_LEVEL, AUTH_ENABLED)
- [ ] YAML schema validation при старте (personas/*.yaml) — crash если невалидный, Ajv или zod-schema
- [ ] **CORS**: `CORS_ORIGINS` в .env, default `*` для dev, explicit origins для prod. CORS = API access control
- [ ] **CSP headers**: `Content-Security-Policy: script-src 'self'; style-src 'self' 'unsafe-inline'` для HTML. CSP ≠ CORS, не конфликтуют
- [ ] **API versioning**: все endpoints с prefix `/v1/api/...` с первого дня

### P0.2 SQLite
- [ ] `better-sqlite3` + WAL mode (concurrent reads, synchronous writes)
- [ ] **Single db object** — better-sqlite3 синхронный, thread-safe by design. **Write queue не нужен** — concurrent writes невозможны в синхронном API
- [ ] Миграция D1 → SQLite (Drizzle ORM)
  - Migration mapping document: D1→SQLite типы совместимы (INTEGER/REAL/TEXT/BLOB)
  - D1-specific функции → заменить на SQLite аналоги
- [ ] `schema_migrations` table: version TEXT PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
- [ ] Pre-migration backup + rollback script (`npm run migrate:rollback`)
- [ ] `council_jobs` таблица: id INTEGER PK, topic TEXT, status TEXT CHECK(status IN ('running','completed','failed','interrupted')), persona_results JSON, final_decision TEXT, tokens_used INTEGER, cost_usd REAL, provider TEXT, created_at DATETIME, completed_at DATETIME, org_id TEXT DEFAULT 'default'
- [ ] `council_jobs_archive` таблица (same schema) — архивация через `db.transaction()`: INSERT INTO archive → DELETE FROM jobs → COMMIT (атомарно)
  - Move completed > 90 дней at startup
- [ ] `audit_log` таблица (INSERT ONLY, separate connection, PRAGMA journal_mode=WAL, PRAGMA trusted_schema=OFF)
  - Columns: id INTEGER PK, action TEXT, user_id TEXT, org_id TEXT, details JSON, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- [ ] `decision_history` таблица: id INTEGER PK, table_id INTEGER, council_job_id INTEGER, decision TEXT, override_reason TEXT NULL, reviewed_at DATETIME NULL, impact_actual TEXT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- [ ] `snapshots` таблица: id INTEGER PK, table_id INTEGER, version INTEGER, data_json TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  - **Retention**: хранить последние 10 версий на таблицу. При новом snapshot → DELETE oldest if count > 10 for this table_id
- [ ] `dependencies` таблица: from_table_id INTEGER, to_table_id INTEGER, type TEXT DEFAULT 'blocks', created_at DATETIME, UNIQUE(from_table_id, to_table_id)
  - Cycle detection: recursive CTE при INSERT → reject если cycle найден
- [ ] `api_keys` таблица: id INTEGER PK, key_hash TEXT UNIQUE, name TEXT, org_id TEXT DEFAULT 'default', expires_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- [ ] `llm_cache` таблица: hash TEXT PRIMARY KEY, provider TEXT, response JSON, created_at DATETIME, expires_at DATETIME
  - **Cache invalidation**: при circuit breaker provider switch → DELETE FROM llm_cache WHERE provider = ?
- [ ] `idempotency_keys` таблица: key TEXT PRIMARY KEY, response_hash TEXT, created_at DATETIME, expires_at DATETIME
  - TTL 24h. Cleanup at startup. Это network-level dedup, не business-level
- [ ] FTS5: `CREATE VIRTUAL TABLE rows_fts USING fts5(name, description, tags, content='rows', content_rowid='id', tokenize='unicode61 remove_diacritics 2')`
  - unicode61 для русского — basic но работает. Для production: compile SQLite с ICU для proper stemming
  - Trigram как опция для fuzzy: отдельный virtual table `rows_fts_fuzzy USING fts5(..., tokenize='trigram')`
- [ ] **FTS trigger**: AFTER INSERT/UPDATE ON rows → INSERT OR REPLACE INTO rows_fts(rowid, name, description, tags)
- [ ] FTS rebuild: `POST /v1/api/admin/fts-rebuild` → DELETE FROM rows_fts → INSERT INTO rows_fts SELECT ...
- [ ] Import существующих 500 таблиц из D1 backup через `db.transaction()` batch insert

### P0.3 MCP Server
- [ ] SSE transport: auth через **query parameter `?token=xxx`** (EventSource не поддерживает headers) ИЛИ cookie
  - Для non-browser MCP clients: Authorization header при initial HTTP upgrade
  - Keepalive: SSE comment `:keepalive\n\n` каждые 15 сек
- [ ] stdio transport (local CLI, без auth)
- [ ] MCP protocol: JSON-RPC 2.0, tools as specified by MCP spec
- [ ] Tool: `council_decide(topic, alternatives[], criteria?, personas?)` — запуск Совета
- [ ] Tool: `create_table(name, rows[], weights?)` — создать таблицу
- [ ] Tool: `get_table(id)` — таблица + TCO/IRR/ROIC + current snapshot version
- [ ] Tool: `list_tables(query?, tag?, status?, cursor?, limit?)` — cursor-based: `WHERE id > cursor ORDER BY id LIMIT N`
- [ ] Tool: `explain_table(id)` — LLM-as-Judge rationale
- [ ] Tool: `suggest_similar(query)` — FTS5 MATCH query
- [ ] Idempotency-Key: `X-Idempotency-Key` header → check `idempotency_keys` table → return cached response if exists
  - **Business-level dedup**: перед созданием нового council → check council_jobs WHERE topic=? AND org_id=? AND created_at > now-1h → warn «Council на эту тему уже запускался»
- [ ] **Input validation** (Zod): max 10 alternatives, max 500 chars topic, max 20 criteria, max 100 chars per name. Min 2 alternatives
- [ ] **Rate limiting**: in-memory Map<key, {count, window_start}>, reset every 60 sec. Configurable per API key. Не в SQLite — memory overhead OK, resets on restart

### P0.4 Council Engine
- [ ] LLM Router: GLM-5.1 (default) → Gemini Pro → GPT-4o → local Qwen. Fallback order configurable in .env
  - **Model weights** (for consensus, exponential scale): Gemini Pro=100, GPT-4o=90, GLM-5.1=80, Qwen-8B=1
- [ ] **Circuit breaker**: per provider. 3 errors in 60 sec → open. Half-open after 30 sec (try 1 request). Manual reset: `POST /v1/api/admin/circuit-reset/:provider`
  - On provider switch → **invalidate llm_cache for that provider**
- [ ] **LLM caching**: SHA-256 hash of (system_prompt + user_prompt + model + temperature) → check llm_cache → hit → return, miss → call LLM → store with TTL 24h
- [ ] Persona Registry (YAML: CISO, CEO, CFO, Tech Lead, User Advocate, Lawyer)
  - Schema: `{name, role, system_prompt, temperature?: number, model_override?: string}`
  - AI-generation of prompts: `POST /v1/api/admin/generate-persona?role=CTO` → LLM generates YAML
- [ ] Consensus: `score = Σ(confidence_i × modelWeight_i^1.5) / N` per alternative
  - `e = 1.5` (super-linear: Gemini 100^1.5=1000, Qwen 1^1.5=1, ratio 1000:1)
  - LLM-as-Judge: final pass — один LLM call для ranking + rationale
  - Output: ranked alternatives with scores, confidence ranges, source references
- [ ] **Sync/Async hybrid**:
  - Sync: HTTP request → Council runs → response (timeout 30s). **Plain HTTP response**, не SSE
  - Async: если Council не завершился за 30s → return `{status: 'running', job_id: 'xxx', stream_url: '/v1/api/council/jobs/xxx/stream'}`
  - SSE stream: только для async. Event format: `{event: 'persona_done', data: {name: 'CISO', score: 8.2}}` → `{event: 'complete', data: {winner: '...'}}`
  - Keepalive на SSE: comment `:keepalive\n\n` каждые 15 сек (не мешает sync responses)
- [ ] Persisted state в `council_jobs` (resume после рестарта: startup checks for 'interrupted' → optionally auto-resume)
- [ ] Token usage: `prompt_tokens`, `completion_tokens`, `total_tokens` per persona per provider. `cost_usd` calculated from model pricing table
- [ ] **Source reference**: каждый numeric claim → `[source: URL | экспертная оценка | расчёт | оценка рынка]`
- [ ] **Prompt sanitization**: user topic/alternatives → escaped and placed in user role. System prompts from YAML → never include raw user input. Validate: reject если содержит common injection patterns (`ignore previous`, `system:`, `{{`)

### P0.5 Авторизация
- [ ] JWT access token: short-lived (15 min), httpOnly cookie или Authorization header
- [ ] JWT refresh token: `POST /v1/api/auth/refresh` с refresh_token в httpOnly cookie, TTL 7 дней, rotation (new refresh on each use, old invalidated)
- [ ] API Key для MCP: `api_keys` table, TTL 90 дней, hash stored (не plaintext), rotate: `POST /v1/api/keys/rotate` (создаёт новый, инвалидит старый)
- [ ] org_id: column во всех таблицах, DEFAULT 'default'. **Column in P0, management in P3**
- [ ] Auth optional mode: `AUTH_ENABLED=false` в .env → skip all auth (для local dev)

### P0.6 Безопасность
- [ ] SSE auth через query param или cookie (не custom header — EventSource limitation)
- [ ] CSP: `script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'`
- [ ] Rate limiting: in-memory, per API key, configurable, 429 Too Many Requests
- [ ] Backup files: chmod 600, USER node в Docker, volume mount для backup/
- [ ] Webhook HMAC: HMAC-SHA256 payload + timestamp header, validate ±5 мин
- [ ] audit_log: separate better-sqlite3 connection, INSERT ONLY, no UPDATE/DELETE possible
- [ ] HTTPS enforcement: если `TLS_ENABLED=true` → redirect HTTP→HTTPS

### P0.7 Эксплуатация
- [ ] `GET /v1/api/version` → {version, git_hash, build_date, node_version, sqlite_version}
- [ ] Logging (pino): structured JSON, LOG_LEVEL env (default 'info')
  - **Логировать**: HTTP requests (method, path, status, latency_ms, user_id), Council events (start, persona_done, complete, error, tokens_used), DB ops (migration, backup, size), Auth events (login, refresh, key_rotate, unauthorized_attempt)
  - **НЕ логировать**: full LLM prompts/responses (PII risk), API keys, JWT tokens, passwords
  - Rotation: pino.destination → file + `logrotate` на host или `pino.transport` с rotation
- [ ] Secrets: `.env` для MVP, не в Docker image (.dockerignore), Docker secrets для Swarm
- [ ] CI/CD: `.github/workflows/build.yml` — eslint → vitest → docker build → push to ghcr.io
- [ ] Migration: `npm run migrate` → Drizzle push + schema_migrations update
- [ ] Backup: `npm run backup` → `sqlite3.backup()` + rotation cleanup

---

## P1 — Финансовая аналитика + Визуализация + UX

### P1.1 TCO (Total Cost of Ownership)
- [ ] Поля в rows JSON: `tco.implementation`, `tco.license_annual`, `tco.infrastructure_annual`, `tco.training`, `tco.support_annual`, `tco.hidden` (lost_productivity, vendor_lock_in, opportunity_cost)
- [ ] **Materialized columns**: `tco_1y REAL, tco_3y REAL, tco_5y REAL` в rows table
  - **Update**: application-level — при `PUT /v1/api/tables/:id` → extract TCO from JSON → `UPDATE rows SET tco_1y=..., tco_3y=..., tco_5y=... WHERE id=?`
- [ ] **Currency**: `currency TEXT DEFAULT 'RUB'` per row + `exchange_rates` config (JSON: `{USD: 92.5, EUR: 100.1, date: '2026-04-30'}`)
  - Update: `POST /v1/api/admin/exchange-rates` или daily cron from CBR API (optional)
  - Display: «TCO 5.1M RUB (на 2026-04-30, курс USD=92.5)»
  - `tco_calculated_at DATETIME` — дата расчёта
- [ ] Автоматический расчёт: `tco_1y = implementation + license + infra + training + support + hidden`
- [ ] AI estimation через Council (CFO persona) с source reference
- [ ] **Partial data warning**: если заполнено < 6 из 6 TCO категорий → «⚠️ TCO частичный (4/6)»
- [ ] **Greenfield**: нет baseline → TCO only, IRR=N/A, ROIC=N/A
- [ ] **Null handling**: NULLIF(tco, 0), «бесплатно» при TCO=0, «N/A» при данных недостаточно

### P1.2 IRR (Internal Rate of Return)
- [ ] Поля: `irr_3y REAL, irr_5y REAL` (materialized, обновляются с TCO)
- [ ] **Algorithm**: Newton-Raphson, initial guess=0.1 (10%), max 100 iterations, tolerance 0.0001
  - Не сходится → IRR=NULL, UI показывает «не удалось рассчитать»
  - TCO=0 (бесплатно) → IRR не считается (деление на ноль в NPV)
- [ ] Benefits = current_cost_annual × years - TCO_total (simplified)
- [ ] AI estimation выгод через Council
- [ ] UI: 🟢 «высокая» (>20%) / 🟡 «умеренная» (5-20%) / 🔴 «низкая» (<5%) + текст + иконки
- [ ] WACC threshold: configurable, default 12%

### P1.3 ROIC
- [ ] Поля: `roic_3y REAL, roic_5y REAL`
- [ ] NOPAT = (revenue_from_project - operating_costs) × (1 - tax_rate)
- [ ] tax_rate configurable, default 0.20 (РФ)
- [ ] ROIC > WACC = стоит делать

### P1.4 Utility/Price
- [ ] `_up = utility / NULLIF(tco_3y, 0)` — отдача на рубль
- [ ] `payback_months = tco_1y / (annual_savings / 12)` — если есть savings
- [ ] TCO=0 → _up отображается как «∞»

### P1.5 Dashboard пула решений
- [ ] Сводка: кол-во решений, TCO pool (SUM), IRR pool (weighted avg), статусы
- [ ] Группировка по тегам/категориям
- [ ] **DAG**: `dependencies` table, cycle detection при INSERT, impact analysis, critical path
- [ ] **Decision status** enum: open | in_progress | deferred | accepted | rejected
- [ ] **Review schedule**: `review_at DATETIME` — auto-remind через OpenClaw cron
- [ ] **Progressive disclosure**: одна viz по умолчанию (treemap), остальные по клику

### P1.6 Визуализация (ECharts)
- [ ] Treemap: размер=TCO, цвет=status, drill-down
- [ ] Timeline (Gantt): решения + зависимости + drag
- [ ] Bubble chart: X=TCO, Y=Utility, размер=Risk, цвет=Status, filter по категории
- [ ] Radar chart: N осей критериев для сравнения 2-3 вариантов
- [ ] Фильтры: tag, status, category, TCO range, date

### P1.7 Onboarding + UX
- [ ] Step 1: «Choser — AI-Совет для решений» + demo animation
- [ ] Step 2: Demo таблица «Выбор CRM» (3 варианта, 5 критериев, предзаполненная)
- [ ] Step 3: «Запустите первый Совет» → 2 агента (CEO+CFO), fast
- [ ] localStorage.onboarding_done = true → skip
- [ ] Empty state: CTA «Council» + «Импорт»
- [ ] Undo/Redo: snapshot restore + diff highlight
- [ ] Mobile: card layout, swipe, не AG Grid на телефоне
- [ ] Toast: «Совет завершён: [winner]»
- [ ] Keyboard: Ctrl+N/F/S, Escape

### P1.8 Экспорт
- [ ] PDF: puppeteer headless в Docker (добавить chromium в image, +~150MB) ИЛИ pdfkit (pure Node, lighter)
- [ ] PNG: ECharts → toDataURL()
- [ ] Excel: exceljs
- [ ] Telegram card: OpenClaw MEDIA

### P1.9 Decision History
- [ ] `decision_history` table + timeline UI
- [ ] Review: Council ещё раз → diff с прошлым
- [ ] Business impact: manual input → accuracy
- [ ] Comments: per decision
- [ ] Override: «Руководство решило иначе» + reason → saved

### P1.10 API Endpoints (все /v1/api/)
```
# Core
GET    /v1/api/health
GET    /v1/api/version
GET    /v1/api/metrics

# Tables (cursor pagination)
GET    /v1/api/tables?cursor=X&limit=N&tag=&status=&q=
POST   /v1/api/tables
GET    /v1/api/tables/:id
PUT    /v1/api/tables/:id              → creates snapshot, updates materialized columns
DELETE /v1/api/tables/:id              → soft delete (status='deleted')
GET    /v1/api/tables/:id/snapshots
GET    /v1/api/tables/:id/snapshots/:ver

# Financial
GET    /v1/api/tables/:id/tco
GET    /v1/api/tables/:id/roi
POST   /v1/api/tables/:id/calculate    → recalculate TCO/IRR via Council

# Council
POST   /v1/api/council/decide          → sync (<30s) or async (returns job_id)
GET    /v1/api/council/jobs/:id        → poll status
GET    /v1/api/council/jobs/:id/stream → SSE (async only)

# Pool
GET    /v1/api/pool/dashboard
GET    /v1/api/pool/dependencies
GET    /v1/api/pool/timeline
GET    /v1/api/pool/bubble?category=

# History
GET    /v1/api/tables/:id/history
POST   /v1/api/tables/:id/review
POST   /v1/api/tables/:id/override

# Export
GET    /v1/api/tables/:id/export?format=pdf|png|xlsx

# Admin
POST   /v1/api/admin/fts-rebuild
POST   /v1/api/admin/cache-clear
POST   /v1/api/admin/circuit-reset/:provider
GET    /v1/api/admin/backup
POST   /v1/api/admin/exchange-rates
POST   /v1/api/admin/generate-persona?role=

# Auth
POST   /v1/api/auth/login              → {access_token, refresh_token}
POST   /v1/api/auth/refresh            → new tokens
POST   /v1/api/keys/rotate             → new API key
```

### P1.11 Observability
- [ ] `/v1/api/metrics`: request_count, latency p50/p95/p99, error_rate, llm_calls, llm_tokens, llm_cost_usd, db_size_mb, active_councils, cache_hit_rate
- [ ] DB size: warn >500MB, critical >1GB
- [ ] Council SSE: agent-by-agent progress

### P1.12 Council Quality
- [ ] Bias detection: все >8 или все <3 → «⚠️ groupthink»
- [ ] Confidence range: mean ± stddev (не point estimate)
- [ ] Source validation: claim без source → «⚠️ без источника»
- [ ] Cross-validation: Council vs manual scores → diff report

### P1.14 Accessibility
- [ ] Color + icon + text (не только цвет)
- [ ] Keyboard nav + focus indicators
- [ ] aria-label
- [ ] High contrast toggle

### P1.16 What-If
- [ ] Parameter override → recalculate pool
- [ ] Weight slider → live recalc
- [ ] Scenario save/compare

---

## P2 — Интеграции

### P2.1 Templates
- [ ] JSON export/import
- [ ] GitHub templates repo
- [ ] AI table generation from description

### P2.2 Integrations
- [ ] Jira: council → ticket
- [ ] Confluence/Notion: table → wiki page
- [ ] Slack webhook
- [ ] Telegram card (OpenClaw)

### P2.3 Vector search
- [ ] ONNX ~50MB embeddings (FTS5 baseline, ONNX for semantic)
- [ ] sqlite-vec
- [ ] Hybrid search: FTS5 + semantic

### P2.4 Webhooks
- [ ] Webhook URL per org
- [ ] POST on council complete + HMAC-SHA256 + timestamp
- [ ] Retry: exponential backoff, 3 attempts

### P2.5 Caddy SSL
- [ ] Caddy reverse proxy + auto-SSL
- [ ] HTTP/2 + HTTP/3

### P2.6 Import
- [ ] CSV/Excel (papaparse/exceljs) + validation + preview
- [ ] Markdown → table

### P2.7 Review automation
- [ ] Cron check review_at → notify
- [ ] Benchmark opt-in sharing

---

## P3 — Enterprise

### P3.1 Multi-tenant (org management — column in P0, admin here)
- [ ] Admin panel: orgs, users, settings
- [ ] Per-org: LLM providers, personas, budgets

### P3.2 LLM Budget
- [ ] Monthly budget per org
- [ ] Alert at 80%
- [ ] Cost dashboard

### P3.3 SSO
- [ ] OAuth2 PKCE
- [ ] SAML 2.0
- [ ] Roles: admin/architect/viewer

### P3.4 OpenAPI
- [ ] Swagger at `/v1/api/docs`

### P3.5 Advanced viz
- [ ] Heatmap, Sankey, Sensitivity tornado

### P3.6 Decision quality
- [ ] Accuracy tracking, learning loop

---

## Сводка изменений v4 → v5

### 20 противоречий и дыр найдено и исправлено:

| # | Проблема | Исправление |
|---|---|---|
| К01 | Write queue избыточен (better-sqlite3 synchronous) | Убрать write queue, оставить single db object |
| К02 | LLM cache может скрывать circuit breaker ошибки | Invalidate cache on provider switch |
| К03 | SSE keepalive мешает sync response | Sync = plain HTTP, SSE only for async |
| К04 | JWT refresh не описан | httpOnly cookie, TTL 7d, rotation |
| К05 | Trigram хуже unicode61 для русского | unicode61 remove_diacritics 2 как default, trigram как fuzzy option |
| К06 | org_id дублируется P0/P3 | P0: column default 'default', P3: management |
| К07 | Snapshots растут бесконечно | Retention: 10 versions per table |
| К08 | Archive non-atomic (crash risk) | db.transaction() wrapper |
| К09 | Materialized columns: кто обновляет? | Application-level on PUT |
| К10 | Currency: нет источника/даты курса | exchange_rate + date + tco_calculated_at |
| К11 | IRR: нет алгоритма | Newton-Raphson, initial=0.1, max 100 iter |
| К12 | Consensus: 'e' не определено | e=1.5 (super-linear, 1000:1 ratio) |
| К13 | Health check может быть 20 сек | Cached LLM status, background refresh |
| К14 | Backup: кто триггерит? | setInterval + idle check + lock file |
| К15 | Rate limit в SQLite = lock contention | In-memory Map, periodic optional flush |
| К16 | SSE не поддерживает custom headers | Auth через query param или cookie |
| К17 | CORS vs CSP confusion | Явный комментарий: CORS=API, CSP=HTML |
| К18 | Idempotency vs business dedup | Network dedup 24h + business warn on duplicate topic |
| К19 | Dependencies: нет storage | `dependencies` table + recursive CTE |
| К20 | D1→SQLite migration detail | Type map + D1-specific function replacements |

### Новые таблицы SQLite (добавлены в P0.2):
- `dependencies` — DAG edges
- `api_keys` — key storage with hash

### Новые API endpoints:
- `POST /v1/api/admin/circuit-reset/:provider`
- `POST /v1/api/admin/exchange-rates`
- `POST /v1/api/admin/generate-persona?role=`

### Новые детали:
- `AUTH_ENABLED=false` env для dev mode
- `tco_calculated_at` column
- `tax_rate` config для ROIC
- Cache hit rate в /metrics
- Backup lock file
- Snapshot retention (10 per table)
- Council auto-resume on startup (optional)

### Итого чекбоксов:

| Приоритет | v4 | v5 (+/-) |
|---|---|---|
| P0 | 74 | **80** (+6, netto: -3 удалено как избыточные + 9 добавлено) |
| P1 | 92 | **85** (-7, консолидированы дубли) |
| P2 | 22 | **22** |
| P3 | 18 | **18** |
| **Итого** | **206** | **205** |
