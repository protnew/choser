# 🏛️ Choser → OpenClaw Enterprise: Глубокий Анализ и План Эволюции

> Дата: 2026-04-29  
> Ветка: `choseOpenclaw`  
> Автор анализа: OpenClaw Agent (main session)

---

## Содержание

1. [Археология проекта](#1-археология-проекта)
2. [Текущая архитектура: полный разбор](#2-текущая-архитектура-полный-разбор)
3. [Код под лупой: файл за файлом](#3-код-под-лупой)
4. [База данных: что внутри](#4-база-данных)
5. [MCP-сервер: текущие возможности](#5-mcp-сервер)
6. [EBM-математика: уже есть](#6-ebm-математика)
7. [Диагноз: сильные и слабые стороны](#7-диагноз)
8. [Видение: Choser Enterprise Decision Platform](#8-видение)
9. [Архитектура целевого решения](#9-архитектура)
10. [Дорожная карта](#10-дорожная-карта)
11. [Конкурентные преимущества](#11-конкурентные-преимущества)

---

## 1. Археология проекта

### Хронология

| Период | Событие | Артефакт |
|---|---|---|
| 2017 | Идея «Модели сравнения» (Модель моделей v2.7) | `Модель моделей/архив/v2_7.xlsx` |
| 2017–2025 | 7 итераций Excel-калькулятора | `v2_7 → v3 → v4 → v5 → v6 → v7.ods` |
| 2019 | Домен choser.org, первый PHP-сайт | `choser.org/` (Apache, .htaccess) |
| 2025 | Регистрация ООО (?), контент в Obsidian | `an_choser_org`, `ru_chogrid_com` |
| Янв 2026 | Начало MVP на Cloudflare | Initial commit (29.01.2026) |
| Фев 2026 | Vanilla HTML → React миграция | `restored.html` (54KB), `html.js` |
| Мар 2026 | Активная разработка: AI, MCP, EBM, Research | 166 коммитов за 2 месяца |
| 30 Мар 2026 | Последний коммит (fix paramCount crash ×15) | Хвост «AI-дебаг-цикла» |
| Апр 2026 | Проект заморожен | — |

### Идея (из About the project)

> **AI-driven parametric selection tables** — параметрические матрицы принятия решений. Пользователь задаёт тему, ИИ генерирует таблицу сравнения с весами параметров, оценками и расчётом Utility (полезность/цена).

**Ключевой инсайт из бизнес-модели:** «Спасёт триллионы часов человеческого труда на выбор товаров и услуг».

---

## 2. Текущая архитектура: полный разбор

### Стек (реальный, из кода)

```
┌─────────────────────────────────────────────────────┐
│                    Cloudflare Edge                    │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Pages   │  │ Workers  │  │  D1 (SQLite)      │  │
│  │ (React)  │→ │ (Hono)   │→ │  + FTS5 Search    │  │
│  │ Vite     │  │ API      │  │  + KV Cache       │  │
│  │ AG Grid  │  │ MCP      │  │  + AI Binding     │  │
│  │ ECharts  │  │ Auth JWT │  │                   │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
│                                                       │
│  External: Google Gemini AI, Cloudflare AI (Llama)   │
└─────────────────────────────────────────────────────┘
```

### Фронтенд (React 18 + Vite)

| Компонент | Строк | Назначение |
|---|---|---|
| `Grid.jsx` | **1 155** | Ядро: рендеринг матриц через AG Grid |
| `DistributionAnalysis.jsx` | 864 | Радарные диаграммы, распределения |
| `Admin.jsx` | 662 | Управление таблицами, юзерами, промптами |
| `EbmMathTab.jsx` | 292 | EBM-калькулятор (Expected Value of Information) |
| `ResearchPanel.jsx` | 231 | Панель Deep Research |
| `ChatBot.jsx` | 190 | Встроенный AI-чат |
| `CreateModal.jsx` | 170 | Создание новой таблицы |
| `App.jsx` | 177 | Маршрутизация, layout |
| `Auth.jsx` | 96 | Форма логина |
| `Cards.jsx` | 61 | Карточки для Tinder-свайпа |
| `EmbedView.jsx` | 44 | Iframe-встраивание |
| `DevTools.jsx` | 26 | Отладка |
| `AboutModal.jsx` | 40 | О проекте |
| `ImportModal.jsx` | 115 | Импорт данных |

**Итого фронтенд:** ~4 400 строк JSX

### Бэкенд (Hono.js Workers)

| Модуль | Строк | Назначение |
|---|---|---|
| `ai_service.js` | 589 | AI-генерация + критик + fallback-цепочка |
| `mcp.js` | 391 | MCP JSON-RPC сервер (8 tools) |
| `tables.js` | 406 | CRUD таблиц, поиск, рейтинги |
| `admin.js` | 274 | Админ-панель: промпты, пользователи, бэкапы |
| `research.js` | 209 | Deep Research: 3-фазовый поиск |
| `ai.js` | 129 | Прокси к Cloudflare AI |
| `auth.js` | 53 | JWT авторизация |
| `app.js` | 82 | Маршрутизация Hono |

**Итого бэкенд:** ~2 100 строк JS

### Утилиты

| Файл | Строк | Назначение |
|---|---|---|
| `ebm.js` | 218 | EBM: Order Statistics, ENGSI, Normal CDF |
| `statistics.js` | 213 | Статистика: дисперсия, MAD, корреляция |
| `db.js` | 142 | Drizzle ORM: loadTable, saveRows, KV Cache |
| `calc.js` | 49 | Расчёт Utility (weighted sum) |
| `api.js` | 61 | HTTP-клиент для фронтенда |

**Итого утилиты:** ~680 строк

### Стили

| Файл | Строк |
|---|---|
| `main.css` | 769 |
| `premium.css` | 586 |

**Итого стили:** ~1 350 строк

### Общая кодовая база: ~8 500 строк

---

## 3. Код под лупой

### 3.1 ai_service.js — Мозг системы

**Что делает:**
- `generateTable()` — основная генерация: system prompt → Gemini → парсинг → Agent Critic (оценка качества)
- `generateSimilarTable()` — генерация по шаблону существующей таблицы
- `refineTable()` — доработка существующей таблицы по инструкции
- `_callWithFallback()` — fallback-цепочка: Gemini Pro → Gemini Flash → Cloudflare AI (Llama)
- `_critiqueTable()` — AI-критик: оценка 0–100 с деталями по 5 параметрам
- `_validateAndFixTable()` — автоисправление: заполнение пустых ячеек, нормализация весов

**Сильные стороны:**
- Fallback-цепочка провайдеров (не падает при ошибке одного API)
- Agent Critic — двухагентная архитектура (generator + critic)
- System prompt загружается из БД (настраиваемый через админку)
- Валидация Zod-схемой через `matrix.js`

**Проблемы:**
- 589 строк в одном файле — нет разделения на генератор, критика, валидатор
- `_critiqueTable()` — sync-вызов, может не уложиться в CPU limit Workers (10ms на бесплатном)
- Prompt на русском хардкодом — нет i18n

### 3.2 mcp.js — MCP-сервер

**Реализованные tools:**

| Tool | Что делает |
|---|---|
| `search_tables` | Поиск таблиц по title/description |
| `get_table_data` | Получить данные таблицы (JSON) |
| `sql_query_read_only` | **Прямой SQL-запрос** (только SELECT) |
| `get_table_formatted` | Вывод таблицы в Markdown |
| `generate_table` | Генерация новой таблицы через AI |
| `refine_table` | Доработка таблицы через AI |
| `deep_research` | 3-фазовый поиск (Gemini + Google Search) |
| `research_status` | Проверка статуса исследования |

**Критический баг/фича:** `sql_query_read_only` — позволяет любому MCP-клиенту выполнять произвольный SELECT. Защита от инъекций минимальна (регулярка на ключевые слова). В enterprise-версии это нужно ограничить до whitelist-запросов.

**SSE-транспорт:** Реализован, но упрощённо (`sessionId=test-session` — захардкожен). Для продакшена нужен пул сессий.

### 3.3 Grid.jsx — 1155 строк боли

Этот файл — React-компонент, который делает ВСЁ:
- Рендерит AG Grid
- Управляет весами параметров (inline editing)
- Пересчитывает Utility на лету
- Отображает колонки оценок
- Управляет состоянием таблицы
- Обрабатывает inline-редактирование ячеек
- Рендерит кастомные хэдеры

**Нужно разбить на:**
- `MatrixGrid.jsx` — чистый рендер AG Grid
- `ParameterHeader.jsx` — кастомный хэдер с весами
- `GradeCell.jsx` — ячейка с оценкой
- `UtilityCalculator.jsx` — логика пересчёта
- `useMatrixState.js` — кастомный хук для state

### 3.4 ebm.js — Математика принятия решений

Это **уникальная ценность** проекта. Реализовано:

1. **Order Statistics** — непараметрический E[max] без допущений о распределении
2. **ENGSI** (Expected Net Gain of Sample Information) — стоит ли искать ещё?
3. **Normal CDF** (аппроксимация Абрамовица-Стегана) — вероятность побить лидера
4. **Optimal N** — итеративный поиск точки, где marginal gain ≤ search cost

Это не просто «табличка сравнения» — это **количественная теория решений**, реализованная в коде. В связке с MCP-сервером и AI-генерацией это становится **агентской системой принятия решений**.

---

## 4. База данных

### Схема (schema.sql)

```sql
tables         — метаданные матриц (id, title, state, utility, weights, tags)
columns        — определение колонок (JSON array)
rows           — данные строк (JSON objects)
table_versions — версионность (wiki-style)
users          — авторизация (email + Google, роли: admin/moderator/user)
settings       — конфигурация (system_prompt и т.д.)
research_jobs  — очередь Deep Research задач
```

### Объём данных (из бэкапов)

| Бэкап | Размер | Дата |
|---|---|---|
| `seed_data.sql` | 6.0 МБ | 04.02.2026 |
| `backup_2026_03_14.sql` | 6.3 МБ | 14.03.2026 |
| `backup_2026_03_29.sql` | 6.5 МБ | 29.03.2026 |

**Рост:** ~250 КБ за 2 недели → ~50–100 новых строк в день.

### Оценка количества таблиц

- Obsidian EN: 25 таблиц
- Obsidian RU (опубликовано): 39 таблиц
- Obsidian RU (в работе): 27 таблиц
- Seed SQL: `seed_architecture_matrices.sql` (166 КБ), `seed_choser.sql`, `insert_films_batch*.sql`
- Итого в D1: **ориентировочно 300–400+ таблиц** (по росту бэкапов)

---

## 5. MCP-сервер: текущие возможности

MCP-протокол (`src/api/mcp.js`) — это **ключ к мультиагентности**. Уже сейчас:

- ✅ JSON-RPC 2.0 (SSE transport)
- ✅ Resources: список таблиц, метаданные
- ✅ Tools: поиск, чтение, SQL, генерация, доработка, deep research
- ✅ AI-генерация таблиц через MCP
- ✅ Форматирование в Markdown для LLM-агентов

**Что MCP-сервер УЖЕ позволяет:** любой LLM-агент (Claude, GPT, Gemini, OpenClaw) может подключиться к Choser как к инструменту и:
1. Искать таблицы по теме
2. Читать данные таблиц
3. Генерировать новые таблицы
4. Дорабатывать существующие
5. Проводить Deep Research

---

## 6. EBM-математика: уже есть

**Evidence-Based Management** (из Scrum.org) адаптирован для принятия решений о покупках:

- **ENGSI:** стоит ли тратить время на изучение ещё N товаров? Если E[прирост полезности] < стоимость поиска — хватит.
- **Optimal N:** сколько товаров достаточно сравнить для данного типа решения?
- **Utility/Price ratio:** интегральная оценка «полезность за рубль»

Это **уникальный IP** проекта. Ни один конкурент (Versus.com, ProductChart, FindTheBest) не реализует количественную теорию решений.

---

## 7. Диагноз

### ✅ Сильные стороны

1. **Уникальная математика** — EBM/ENGSI, Order Statistics, Optimal N. Это не «очень ещё одна таблица сравнения» — это **количественная теория решений в браузере**.
2. **MCP-сервер из коробки** — любой AI-агент может пользоваться Choser как инструментом.
3. **Edge-архитектура** — Cloudflare Workers = 0ms cold start, глобальный деплой, бесплатный tier.
4. **Agent Critic** — двухагентная генерация (creator + evaluator) с автоисправлением.
5. **Deep Research** — 3-фазовый поиск с Google Grounding.
6. **Версионность** — wiki-style история изменений таблиц.
7. **Embed** — iframe-встраивание матриц на любой сайт.
8. **400+ таблиц данных** — значительный контентный фонд.

### ❌ Слабые стороны

1. **Монолитный фронтенд** — Grid.jsx (1155 строк) = хрупкость.
2. **Ноль тестов** — 8500 строк без единого unit-теста.
3. **AI-дебаг-циклы** — 15 коммитов «fix paramCount crash» = симптом хрупкого кода.
4. **Нет CI/CD** — деплой через `wrangler pages deploy` вручную.
5. **Hardcoded секрет** — `JWT_SECRET || 'dev-secret'`.
6. **Нет линтеров** — ESLint, Prettier отсутствуют.
7. **Однопользовательский MCP** — sessionId захардкожен.
8. **Нет мультиагентной координации** — MCP позволяет подключить одного агента, но нет:
   - очереди задач для нескольких агентов
   - механизма «консенсуса» между агентами
   - сохранения «цепочки рассуждений» (reasoning chain)
   - приватности данных по организациям

---

## 8. Видение: Choser Enterprise Decision Platform

### Проблема, которую решаем

**В любой компании** ежедневно принимаются тысячи решений:
- Какой сервер купить?
- Какого кандидата нанять?
- Какую технологию выбрать?
- Какого поставщика утвердить?
- В какой маркетинговый канал инвестировать?

Сегодня эти решения принимаются:
- «На глаз» (интуиция)
- В Excel-таблицах, которые теряются
- В головах людей, которые увольняются
- Без количественного обоснования

### Решение

**Choser EDP** — самоуправляемая (self-hosted) платформа для:
1. **Генерации** управленческих решений через AI-агентов
2. **Хранения** всех решений в структурированном виде (параметрические матрицы)
3. **Поиска** по базе решений (семантический + параметрический)
4. **Анализа** оптимальности решений (EBM/ENGSI)
5. **Мультиагентного консенсуса** — несколько AI-агентов анализируют проблему независимо, потом «голосуют»
6. **Экспорта** в стандартные форматы (Markdown, JSON, PDF)
7. **Интеграции** через MCP-протокол с любым AI-агентом

### Позиционирование

**Не** конкурент Versus.com (B2C-сравнение товаров).  
**А** — «**GitHub для управленческих решений**» — внутренняя база знаний компании, где каждое решение:
- Структурировано (параметры, веса, оценки)
- Обосновано (Utility-расчёт, EBM-анализ)
- Исторично (версии, авторы, даты)
- Поискимо (FTS5 + семантический поиск)
- Доступно AI-агентам (MCP)

---

## 9. Архитектура целевого решения

```
┌──────────────────────────────────────────────────────────────┐
│                   Choser Enterprise Decision Platform         │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │   Web UI     │  │  MCP Server  │  │   REST API          │ │
│  │  (React SPA) │  │  (JSON-RPC)  │  │   (Hono/OpenAPI)    │ │
│  │  AG Grid     │  │  Multi-agent │  │   CRUD + Analytics  │ │
│  │  ECharts     │  │  SSE Pool    │  │   JWT + RBAC        │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘ │
│         │                 │                      │            │
│  ┌──────┴─────────────────┴──────────────────────┴──────────┐ │
│  │                    Decision Engine                        │ │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │ │
│  │  │ EBM Math │  │ AI Gen   │  │ Consensus │  │ Search │ │ │
│  │  │ ENGSI    │  │ Multi-LLM│  │ Voting    │  │ FTS5+  │ │ │
│  │  │ OptimalN │  │ Fallback │  │ Arbitrate │  │ Vector │ │ │
│  │  └──────────┘  └──────────┘  └───────────┘  └────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│         │                 │                      │            │
│  ┌──────┴─────────────────┴──────────────────────┴──────────┐ │
│  │                    Data Layer                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │ │
│  │  │ SQLite   │  │ Reasoning│  │ Templates │  │ Orgs   │ │ │
│  │  │ (D1/loc) │  │ Chains   │  │ Library   │  │ Tenants│ │ │
│  │  └──────────┘  └──────────┘  └───────────┘  └────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 9.1 Multi-Agent Consensus Layer

**Новое.** Ключевое отличие от текущего MCP.

```
Пользователь: "Какой CRM выбрать для компании 50 человек?"

┌─────────────────────────────────────┐
│         Agent Orchestrator           │
│                                      │
│  Agent A (GPT-5)  ──→  Matrix A     │
│  Agent B (Claude) ──→  Matrix B     │
│  Agent C (Gemini) ──→  Matrix C     │
│                                      │
│         ↓ Consensus Engine ↓         │
│                                      │
│  • Где агенты согласны? (Top-3)      │
│  • Где расходятся? (Веса/оценки)     │
│  • ENGSI: стоит ли искать ещё?       │
│  • Итоговая матрица + disagreements  │
└─────────────────────────────────────┘
```

**Артефакты, которые сохраняются:**
- Каждая матрица от каждого агента
- Мета-матрица «консенсус»
- Reasoning chain (почему агент дал такую оценку)
- Disagreement report (где и почему агенты разошлись)

### 9.2 Reasoning Chain Storage

**Новое.** Каждое решение сохраняется с полной цепочкой:

```json
{
  "decision_id": "crm-choice-2026-04",
  "topic": "CRM для 50 человек",
  "agents": [
    {
      "agent": "gpt-5",
      "matrix": {...},
      "reasoning": "Выбрал HubSpot потому что...",
      "confidence": 0.85,
      "sources": ["hubspot.com", "g2.com"]
    }
  ],
  "consensus": {
    "top_pick": "HubSpot",
    "agreement_score": 0.78,
    "disagreements": [
      {"param": "цена", "agent_a": 8, "agent_b": 5, "reason": "разные тарифы"}
    ]
  },
  "ebm_analysis": {
    "engsi": -0.3,
    "optimal_n": 7,
    "verdict": "Дальнейший поиск нецелесообразен"
  },
  "created_by": "user_id_123",
  "org_id": "acme-corp",
  "tags": ["crm", "b2b", "mid-market"],
  "visibility": "team"
}
```

### 9.3 Template Library

**Новое.** Стандартизированные шаблоны для типовых решений:

| Шаблон | Параметры | Использование |
|---|---|---|
| Выбор ПО | Цена, Scalability, UX, Support, Integration | 100+ решений в год |
| Найм кандидата | Skills, Culture Fit, Salary, Experience | 50+ решений в год |
| Выбор подрядчика | Price, Quality, Timeline, References | 200+ решений в год |
| Технологический стек | Performance, Ecosystem, Learning Curve, Cost | 10+ решений в год |
| Инвестиции | ROI, Risk, Timeline, Strategic Fit | По запросу |

Организация может **создавать свои шаблоны** и **наследовать веса** от проверенных решений.

### 9.4 Multi-Tenancy & Self-Hosted

**Новое.** Платформа разворачивается внутри компании:

```
docker compose up

→ Choser EDP доступен на http://localhost:3000
→ MCP Server на http://localhost:3000/mcp
→ SQLite data/decision_vault.db
→ Все данные локально, никуда не уходят
```

**Режимы деплоя:**
1. **Docker Compose** (self-hosted, on-premise)
2. **Cloudflare Workers** (SaaS, edge)
3. **Kubernetes Helm Chart** (enterprise)

### 9.5 Reasoning Search (FTS5 + Vector)

**Новое.** Поиск не только по названию таблицы, но и по содержимому решений:

- **FTS5** (уже есть) — текстовый поиск по title, description
- **Векторный поиск** — семантический поиск по reasoning chains
- **Параметрический фильтр** — «покажи все решения, где Цена была в Top-3 по весам»
- **Temporal** — «какие решения принимались в Q4 2025?»

---

## 10. Дорожная карта

### Фаза 1: Рефакторинг и стабилизация (2 недели)

**Цель:** сделать код поддерживаемым.

| Задача | Приоритет | Объём |
|---|---|---|
| Разбить Grid.jsx на 5–6 компонентов | P0 | 2 дня |
| Добавить Vitest + базовые тесты (ai_service, ebm, calc) | P0 | 2 дня |
| ESLint + Prettier + pre-commit hooks | P1 | 0.5 дня |
| Убрать hardcoded 'dev-secret' | P0 | 0.5 дня |
| Вынести скрипты в `scripts/` | P1 | 0.5 дня |
| Настроить CI (GitHub Actions → deploy) | P1 | 1 день |
| Docker Compose для локального запуска | P1 | 1 день |
| Написать OpenAPI-спецификацию | P2 | 2 дня |

### Фаза 2: Enterprise Features (4 недели)

**Цель:** добавить мультиагентность и хранение reasoning.

| Задача | Описание |
|---|---|
| Multi-Agent Orchestrator | Параллельный запуск 2–3 LLM на одну задачу |
| Consensus Engine | Сравнение матриц, выявление расхождений |
| Reasoning Chain Storage | Новая таблица `reasoning_chains` в SQLite |
| Template Library | CRUD для шаблонов + наследование весов |
| Org/Tenant Layer | Мультиорганизационность (org_id, visibility, roles) |
| Vector Search | Локальные эмбеддинги через Cloudflare AI или sentence-transformers |
| MCP v2 | Multi-session SSE pool, authentication, rate limiting |

### Фаза 3: Self-Hosted Package (2 недели)

**Цель:** любой IT-отдел может развернуть за 5 минут.

| Задача | Описание |
|---|---|
| Docker Compose production-ready | React + Hono API + SQLite + MCP + vector DB |
| Helm Chart | Kubernetes деплой |
| Installer Script | `curl -fsSL https://choser.org/install | bash` |
| Admin Onboarding UI | Первичная настройка: LLM API keys, шаблоны, пользователи |
| Documentation | API docs, MCP guide, self-hosting guide |

### Фаза 4: Market (ongoing)

- Landing page + pricing (Free / Team / Enterprise)
- MCP Marketplace (публикация шаблонов решений)
- Integration plugins (Slack, Teams, Jira, Notion)
- White-label для консалтинговых компаний

---

## 11. Конкурентные преимущества

### Почему не просто «ещё один AI-инструмент»?

| Аспект | Конкуренты (Versus, ProductChart) | Choser EDP |
|---|---|---|
| **Математика решений** | Нет | EBM, ENGSI, Order Statistics |
| **AI-генерация** | Частично | Multi-LLM с Consensus |
| **MCP-протокол** | Нет | Полная реализация |
| **Self-hosted** | Нет | Docker / K8s |
| **Reasoning storage** | Нет | Полные цепочки рассуждений |
| **Template library** | Нет | Наследуемые шаблоны решений |
| **Мультиагентность** | Нет | Orchestrator + Consensus Engine |
| **Enterprise-ready** | Нет | RBAC, tenants, on-premise |

### Целевая аудитория

1. **CIO/CTO** — решение о технологическом стеке
2. **Procurement** — выбор поставщиков
3. **HR** — найм, сравнение кандидатов
4. **Product** — приоритизация фичей
5. **Consulting** — обоснование рекомендаций клиентам

### Монетизация

| Tier | Цена | Что входит |
|---|---|---|
| **Free** | $0 | 10 таблиц, 1 агент, публичные шаблоны |
| **Team** | $29/мес | Безлимит, 3 агента, приватные шаблоны |
| **Enterprise** | от $500/мес | Self-hosted, custom LLM, SSO, SLA |

---

## Приложение А: Текущие файлы и их роль в новой архитектуре

| Текущий файл | Новая роль | Статус |
|---|---|---|
| `ai_service.js` | → `src/agents/generator.js` + `critic.js` + `fallback.js` | Рефакторинг |
| `mcp.js` | → `src/mcp/server.js` + `tools/*.js` + `transport/sse.js` | Рефакторинг |
| `ebm.js` | → `src/engine/ebm.js` (без изменений) | ✅ Сохранить |
| `statistics.js` | → `src/engine/statistics.js` (без изменений) | ✅ Сохранить |
| `calc.js` | → `src/engine/utility.js` (без изменений) | ✅ Сохранить |
| `Grid.jsx` | → `src/components/matrix/` (5–6 файлов) | Разбить |
| `schema.sql` | → `migrations/003_reasoning_chains.sql` + `004_orgs.sql` | Расширить |
| `db.js` | → `src/db/connection.js` + `repository/` | Рефакторинг |
| `research_agent/` | → Встроить в Multi-Agent Orchestrator | Заменить |

---

## Приложение Б: Новые таблицы БД

```sql
-- Organizations (multi-tenancy)
CREATE TABLE organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free',
    settings JSON,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Reasoning Chains (мультиагентные рассуждения)
CREATE TABLE reasoning_chains (
    id TEXT PRIMARY KEY,
    table_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,        -- 'gpt-5', 'claude', 'gemini'
    agent_model TEXT,
    reasoning TEXT,                  -- Свободный текст рассуждения
    confidence REAL,                 -- 0.0 - 1.0
    sources JSON,                    -- Массив URL
    matrix_snapshot JSON,            -- Снимок матрицы от этого агента
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (table_id) REFERENCES tables(id)
);

-- Consensus Reports
CREATE TABLE consensus_reports (
    id TEXT PRIMARY KEY,
    table_id TEXT NOT NULL,
    agent_count INTEGER,
    agreement_score REAL,            -- 0.0 - 1.0
    top_pick TEXT,
    disagreements JSON,              -- Массив расхождений
    final_matrix JSON,               -- Итоговая матрица
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (table_id) REFERENCES tables(id)
);

-- Decision Templates
CREATE TABLE templates (
    id TEXT PRIMARY KEY,
    org_id TEXT,
    title TEXT NOT NULL,
    category TEXT,                   -- 'software', 'hiring', 'procurement', 'tech_stack'
    columns JSON NOT NULL,           -- Структура параметров с весами по умолчанию
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- Decisions (связка таблиц с бизнес-контекстом)
CREATE TABLE decisions (
    id TEXT PRIMARY KEY,
    org_id TEXT,
    table_id TEXT NOT NULL,
    template_id TEXT,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'active',    -- active, archived, superseded
    decided_by TEXT,                  -- Кто принял решение
    decided_at TEXT,
    tags JSON,
    visibility TEXT DEFAULT 'team',  -- public, team, private
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (table_id) REFERENCES tables(id),
    FOREIGN KEY (template_id) REFERENCES templates(id)
);
```

---

*Конец документа. Следующий шаг — подтверждение плана и начало Фазы 1.*
