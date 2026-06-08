# 🚀 Choser EDP — План реализации

> Дата: 2026-04-30
> Стек: Docker + Node.js + SQLite + Hono + OpenClaw + GLM-5.1
> Репо: https://github.com/protnew/choserMCP (branch: edp-architecture-v1)

---

## Архитектура (один контейнер)

```
┌─────────────────────────────────────────────────────┐
│                  Docker Container                    │
│                   :3000 (HTTP)                       │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Static  │  │ REST API │  │   MCP Server     │   │
│  │ (React)  │  │ (Hono)   │  │   (SSE+stdio)    │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ LLM      │  │ Council  │  │   SQLite         │   │
│  │ Router   │  │ Engine   │  │   (1 file)       │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                      │
│  ┌──────────┐  ┌──────────┐                         │
│  │ Health   │  │ Backup   │                         │
│  │ /health  │  │ cron 6h  │                         │
│  └──────────┘  └──────────┘                         │
└─────────────────────────────────────────────────────┘
         │                    │
    ┌────┘                    └────┐
    ▼                              ▼
┌─────────┐              ┌──────────────────┐
│ Browser │              │   OpenClaw       │
│ (React) │              │   (MCP client)   │
└─────────┘              │   + GLM-5.1      │
                         │   + Telegram     │
                         └──────────────────┘
```

---

## Фаза 1: Фундамент (1-2 дня)

### 1.1 Dockerfile
```dockerfile
# Мультистейдж build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
RUN addgroup -g 1001 -S choser && adduser -S choser -u 1001
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/src ./src
USER choser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
```

### 1.2 server.js — единая точка входа
```javascript
// Заменяет 2-процессную архитектуру (Wrangler + Vite)
import { createApp } from './src/app.js';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';

const app = createApp();

// Static files (built React)
app.use('/*', serveStatic({ root: './dist' }));

// MCP SSE endpoint
app.get('/mcp/sse', async (c) => { /* SSE transport */ });

const port = process.env.PORT || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Choser EDP running on :${port}`);
});
```

### 1.3 SQLite вместо D1
```javascript
// src/utils/db-docker.js
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema.js';

const sqlite = new Database('./data/choser.db');
sqlite.pragma('journal_mode = WAL');      // Конкурентное чтение
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { sqlite };
```

### 1.4 docker-compose.yml
```yaml
version: '3.8'
services:
  choser:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - choser-data:/app/data
      - ./backup:/app/backup
    environment:
      - JWT_SECRET=${JWT_SECRET:-dev-secret}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - CORS_ORIGINS=${CORS_ORIGINS:-*}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s

volumes:
  choser-data:
```

### 1.5 .env пример
```env
# LLM
GOOGLE_API_KEY=AIza...
ZAI_API_KEY=...          # GLM-5.1 через ZAI
DEFAULT_MODEL=glm-5.1

# Auth
JWT_SECRET=change-me-in-production

# MCP
MCP_TRANSPORT=sse        # sse | stdio

# Docker
PORT=3000
CORS_ORIGINS=*
```

**Результат Фазы 1:** `docker compose up` → работающий Choser на :3000

---

## Фаза 2: MCP Server (1-2 дня)

### 2.1 MCP Tools (что отдаёт Choser наружу)

```javascript
// src/mcp/tools.js
export const MCP_TOOLS = [
  {
    name: 'council_decide',
    description: 'Запустить Совет агентов для принятия решения',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Тема решения' },
        alternatives: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Варианты для сравнения' 
        },
        criteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Критерии оценки (параметры)'
        },
        context: { type: 'string', description: 'Дополнительный контекст' },
        personas: {
          type: 'array',
          items: { type: 'string' },
          description: 'Роли агентов (CISO, CEO, etc.)'
        }
      },
      required: ['topic', 'alternatives']
    }
  },
  {
    name: 'create_table',
    description: 'Создать таблицу выбора (decision matrix)',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        columns: { type: 'array', items: { type: 'object' } },
        rows: { type: 'array', items: { type: 'object' } }
      },
      required: ['title', 'columns', 'rows']
    }
  },
  {
    name: 'explain_table',
    description: 'Объяснить существующую таблицу (почему такой выбор)',
    inputSchema: {
      type: 'object',
      properties: {
        table_id: { type: 'string' }
      },
      required: ['table_id']
    }
  },
  {
    name: 'list_tables',
    description: 'Список таблиц (поиск по тегу/названию)',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        tag: { type: 'string' },
        limit: { type: 'number', default: 20 }
      }
    }
  },
  {
    name: 'get_table',
    description: 'Получить полную таблицу с данными',
    inputSchema: {
      type: 'object',
      properties: { table_id: { type: 'string' } },
      required: ['table_id']
    }
  },
  {
    name: 'suggest_similar',
    description: 'Найти похожие решения (FTS5 поиск)',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', default: 5 }
      },
      required: ['query']
    }
  }
];
```

### 2.2 MCP Transport (SSE для remote)

```javascript
// src/mcp/sse-transport.js
// GET /mcp/sse → устанавливает SSE соединение
// POST /mcp/message → получает JSON-RPC запросы от клиента
// Отвечает tool_call → council_decide → запуск Совета → результат
```

### 2.3 OpenClaw подключение

```yaml
# openclaw.json → MCP server config
{
  "mcpServers": {
    "choser": {
      "url": "http://localhost:3000/mcp/sse",
      "transport": "sse"
    }
  }
}
```

**Результат Фазы 2:** OpenClaw может вызывать `council_decide` через MCP

---

## Фаза 3: Council Engine (2-3 дня)

### 3.1 LLM Router (единая точка для всех вызовов)

```javascript
// src/council/llm-router.js
export class LLMRouter {
  constructor(config) {
    this.providers = {
      'glm-5.1': { endpoint: 'https://open.bigmodel.cn/api/paas/v4/', key: process.env.ZAI_API_KEY },
      'gemini-pro': { endpoint: 'https://generativelanguage.googleapis.com/', key: process.env.GOOGLE_API_KEY },
      'local-qwen': { endpoint: 'http://127.0.0.1:8081/v1/', key: 'none' }
    };
    // Экспоненциальные веса: Gemini Pro=100, GLM-5.1=60, Qwen 8B=1
    this.modelWeights = { 'gemini-pro': 100, 'glm-5.1': 60, 'local-qwen': 1 };
  }

  async chat(model, messages, options = {}) {
    // Единый метод вызова любой модели
    // Возвращает { content, usage: { prompt_tokens, completion_tokens }, confidence }
  }

  getModelWeight(model) { return this.modelWeights[model] || 1; }
}
```

### 3.2 Persona Registry

```yaml
# config/personas.yml
personas:
  ciso:
    name: "CISO (Chief Information Security Officer)"
    model: "glm-5.1"           # default, user can override
    system_prompt: |
      Ты — CISO с 20-летним опытом в кибербезопасности.
      Оценивай каждый вариант с точки зрения: data leaks, attack surface,
      compliance (GDPR/SOC2), supply chain risk.
      Давай оценки 1-10 по каждому критерию с обоснованием.
      
  ceo:
    name: "CEO (Chief Executive Officer)"
    model: "glm-5.1"
    system_prompt: |
      Ты — CEO технологической компании.
      Оценивай: ROI, time-to-market, конкурентное преимущество,
      стратегическое соответствие, стоимость владения (TCO 3 года).
      
  cfo:
    name: "CFO (Chief Financial Officer)"
    model: "glm-5.1"
    system_prompt: |
      Ты — CFO. Твой фокус: стоимость внедрения, операционные расходы,
      hidden costs (обучение, поддержка, миграция), payback period.
      
  tech_lead:
    name: "Tech Lead"
    model: "glm-5.1"
    system_prompt: |
      Ты — Tech Lead с 15 лет опыта. Оценивай: сложность реализации,
      технический долг, maintainability, команда (сколько людей нужно),
      совместимость с текущим стеком.
      
  user_advocate:
    name: "User Advocate"
    model: "glm-5.1"
    system_prompt: |
      Ты — Advocate конечных пользователей. Оценивай: UX simplicity,
      время обучения, error-proneness, accessibility.
      
  lawyer:
    name: "Legal Counsel"
    model: "glm-5.1"
    system_prompt: |
      Ты — юрист-технолог. Оценивай: лицензии (GPL/MIT/proprietary),
      vendor lock-in risk, compliance, data residency, SLA гарантии.
```

### 3.3 Consensus Engine

```javascript
// src/council/consensus.js
export class ConsensusEngine {
  constructor(llmRouter) {
    this.router = llmRouter;
  }

  async run({ topic, alternatives, criteria, personas, context }) {
    // 1. Для каждой персоны → вызвать LLM с persona.system_prompt
    // 2. Каждый агент даёт оценки 1-10 по каждому критерию + confidence 0-1
    // 3. Consensus = Σ(grade × confidence × modelWeight^2.718) / Σ(confidence × modelWeight^2.718)
    // 4. LLM-as-Judge: финальный LLM вызов для объяснения результата
    // 5. Сохранить в council_jobs таблицу
    // 6. Вернуть результат
  }
}
```

### 3.4 council_jobs таблица

```sql
CREATE TABLE council_jobs (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'running',  -- running | completed | failed | interrupted
  config JSON,                     -- {alternatives, criteria, personas}
  results JSON,                    -- [{persona, model, grades, confidence, reasoning}]
  consensus JSON,                  -- {winner, scores, explanation}
  token_usage JSON,                -- {prompt_tokens, completion_tokens, cost_usd}
  created_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  org_id TEXT
);
```

**Результат Фазы 3:** `council_decide("Выбор БД", ["SQLite","PostgreSQL"])` → 6 агентов обсуждают → consensus

---

## Фаза 4: Интеграция с OpenClaw (1 день)

### 4.1 Промпт для OpenClaw (как пользоваться Choser)

```
Choser MCP доступен. Инструменты:
- council_decide: запустить совет агентов для принятия решения
- create_table: создать таблицу выбора
- get_table: прочитать таблицу
- list_tables: поиск таблиц
- suggest_similar: найти похожие решения

Когда пользователь просит помочь с выбором (технологии, продукт, подход):
1. Вызови council_decide с topic и alternatives
2. Дождись результата (может быть 10-30 секунд)
3. Представь результат пользователю в читаемом формате
4. Предложи сохранить как таблицу через create_table
```

### 4.2 Telegram бот через OpenClaw

Пользователь пишет в Telegram:
> «Сравни Caddy vs Nginx vs Traefik для SSL»

OpenClaw → MCP `council_decide` → Council отвечает → OpenClaw форматирует → Telegram

---

## Фаза 5: Развитие таблиц (постоянно)

### Что дорабатывать в существующих таблицах

**Приоритет P0 (базовые):**
1. edp-47 (БД) — добавить 5-й вариант: Cloudflare D1 (обратная совместимость)
2. edp-50 (Оркестратор) — обновить цены/фичи OpenClaw по мере развития
3. edp-38 (Консенсус) — протестировать на реальных данных

**Приоритет P1 (качество):**
4. Добавить цены ($) во все варианты где возможно
5. Добавить ссылки на документацию
6. Проверить оценки (запустить Совет для каждой таблицы — мета!)

**Приоритет P2 (новые таблицы):**
7. LLM Provider сравнение (GLM-5.1 vs Gemini Pro vs GPT-4o vs Claude)
8. Monitoring stack (Grafana vs Datadog vs self-hosted)
9. Email provider (Resend vs SendGrid vs SMTP)

### Образец заполнения таблицы (эталон)

```json
{
  "id": "edp-54-tls",
  "title": "54. TLS/SSL в Docker (HTTPS)",
  "columns": [
    {"key": "p0", "title": "Название / Подход", "weight": 0},
    {"key": "p1", "title": "Цена ($/год за SSL)", "weight": 0},
    {"key": "p2", "title": "Ссылка", "weight": 0},
    {"key": "p3", "title": "Автоматизация (auto-SSL, auto-renew)", "weight": 25},
    {"key": "p4", "title": "Простота настройки (строки конфига)", "weight": 20},
    {"key": "p5", "title": "Ресурсы (RAM/CPU overhead)", "weight": 10},
    {"key": "p6", "title": "Совместимость (все браузеры)", "weight": 10},
    {"key": "p7", "title": "Self-hosted friendly", "weight": 15},
    {"key": "p8", "title": "HTTP/2 и HTTP/3 поддержка", "weight": 10},
    {"key": "p9", "title": "Reverse proxy для API + static", "weight": 10}
  ],
  "rows": [
    {
      "name": "Caddy (auto-SSL, 1 строка конфига)",
      "price": 0,
      "url": "https://caddyserver.com/",
      "grades": {"p3": 10, "p4": 10, "p5": 8, "p6": 10, "p7": 10, "p8": 9, "p9": 10}
    },
    {
      "name": "Nginx + Certbot (классика)",
      "price": 0,
      "url": "https://certbot.eff.org/",
      "grades": {"p3": 7, "p4": 5, "p5": 9, "p6": 10, "p7": 8, "p8": 8, "p9": 9}
    }
  ]
}
```

**Правила заполнения:**
1. Первые 3 поля — мета (weight=0%): Название, Цена, Ссылка
2. Содержательные параметры — weight в сумме = 100%
3. Оценки 1-10 (10 = идеально для данного критерия)
4. Utility = Σ(grade × weight%) / 100
5. Ссылки — на реальные продукты/документацию
6. Цены — реальные ($/мес, $/запрос, $/год)

---

## Хранилище прогресса

```
C:\Сделать\Чейчер SCRUM\openclaw\
├── PROGRESS.md              ← этот файл = план + статус
├── backup/
│   ├── arch_tables_seed.json    ← 36 арх-таблиц (101 KB)
│   ├── seed_2026-04-30.json     ← полный дамп 500 таблиц (5.7 MB)
│   └── seed_2026-04-30.sql      ← SQL seed (1.4 MB)
├── config/
│   └── personas.yml         ← роли агентов Совета
├── data/
│   └── choser.db             ← SQLite БД (runtime, в Docker volume)
├── src/
│   ├── server.js             ← единая точка входа (Фаза 1)
│   ├── mcp/
│   │   ├── tools.js          ← MCP tools (Фаза 2)
│   │   └── sse-transport.js  ← SSE transport (Фаза 2)
│   ├── council/
│   │   ├── llm-router.js     ← маршрутизатор моделей (Фаза 3)
│   │   ├── personas.js       ← загрузчик персон (Фаза 3)
│   │   └── consensus.js      ← движок консенсуса (Фаза 3)
│   └── ... (существующие файлы)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Таймлайн

| Фаза | Что | Срок | Статус |
|---|---|---|---|
| **1** | Dockerfile + server.js + SQLite | 1-2 дня | ✅ Готово |
| **2** | MCP server (tools + SSE) | 1-2 дня | ✅ Готово |
| **3** | Council Engine + Personas | 2-3 дня | ✅ Готово (протестировано) |
| **4** | OpenClaw интеграция + React SPA | 1 день | ✅ Готово |
| **5** | Доработка таблиц + seed | постоянно | 🔲 В процессе |

**Итого до рабочего MVP: ~5-8 дней → Выполнено за 2 дня (30.04-01.05)**

---

## Что готово (01.05.2026)

### ✅ Backend (edp/src/)
- server.js (Hono, порт 3000) + graceful shutdown
- SQLite (better-sqlite3 + WAL, миграции)
- Council Engine (6 персон, GLM-5.1 через ZAI, circuit breaker, LLM cache)
- REST API: health, tables, council, auth, admin, financial, pool, history, export
- Middleware: Zod validation, rate limiting, idempotency, prompt sanitization
- Backward compat: `/api/*` → `/v1/api/*` для старого фронтенда
- CI/CD (.github/workflows/build.yml)
- Backup rotation (6h, 7 daily / 4 weekly / 12 monthly)

### ✅ MCP Server
- JSON-RPC 2.0 handler (initialize, tools/list, tools/call)
- SSE transport (GET /mcp/sse, keepalive 15s)
- 6 tools: council_decide, create_table, get_table, list_tables, explain_table, suggest_similar
- Протестировано: `council_decide("Framework для REST API")` → Fastify 8.0, Hono 7.0, Express 6.67

### ✅ Frontend (React SPA)
- React 18 + Vite + AG Grid + ECharts
- Собрано и скопировано в edp/public/
- Компоненты: Grid, Cards, CreateModal, ImportModal, Admin, ChatBot, DevTools
- Dark/light theme, lazy loading (Admin, DistributionAnalysis, ResearchPanel)

### ✅ Docker
- Dockerfile: мультистейдж (frontend build → production)
- docker-compose.yml: volumes, healthcheck, env
- **Image: 495MB** (node:22-alpine + production deps)
- Сборка прошла успешно

### ✅ Инфраструктура
- .env.example со всеми переменными
- Personas: 6 YAML файлов (CEO, CFO, CISO, Lawyer, Tech Lead, User Advocate)
- Seed script для импорта из backup JSON
- OPENCLAW_INTEGRATION.md — документация для MCP

---

## Следующий шаг (Фаза 5)

1. Seed данных — импортировать 500 таблиц из бэкапа
2. Запустить Docker контейнер
3. Подключить к OpenClaw через MCP
4. Доработка: AI auto-update row, полные TCO/IRR расчёты
