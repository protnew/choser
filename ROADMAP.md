# Choser — Roadmap & Feature Backlog

Дата: 2026-05-18
Версия: v1.0

---

## Методика ранжирования

Каждая фича оценена по 3 параметрам (1-10):
- **Value** — ценность для пользователя (удобство, продажи, retention)
- **Effort** — сложность реализации (10 = очень сложно, 1 = тривиально)
- **ROI Score** = Value × (11 - Effort) / 10 — чем выше, тем лучше

---

## 50 Фич — Ranked by ROI

### 🏆 TOP 10 (реализовать сейчас)

| # | Фича | Value | Effort | ROI | Описание |
|---|------|-------|--------|-----|----------|
| 1 | **Token Tracker Dashboard** | 9 | 3 | 7.2 | Панель с графиками потребления токенов по агентам/моделям/дням. Стоимость в ₽ и $. Heatmap по часам. |
| 2 | **Export to PDF/Google Slides** | 9 | 4 | 6.3 | Экспорт таблицы сравнения в PDF с графиками, или в Google Slides как презентацию. |
| 3 | **Comparison Templates Library** | 8 | 2 | 7.2 | Библиотека шаблонов: CRM, ERP, AI-модели, ноутбуки, etc. One-click создание таблицы с готовыми критериями. |
| 4 | **Real-time Collaboration** | 8 | 8 | 2.4 | WebSocket совместное редактирование. Курсоры пользователей, комментарии. |
| 5 | **AI Auto-Fill from URLs** | 9 | 5 | 5.4 | Вставил URL продукта → AI парсит характеристики и заполняет строку. С support Ozon, Wildberries, Amazon, G2. |
| 6 | **Sensitivity Heatmap** | 8 | 3 | 6.4 | Визуализация sensitivity analysis как heatmap: критерий × объект, цвет = влияние на итоговый score. |
| 7 | **Council Streaming (SSE)** | 7 | 3 | 5.6 | Ответы персон Council приходят потоком (Server-Sent Events), пользователь видит процесс «мышления» в реальном времени. |
| 8 | **Smart Weight Suggester** | 8 | 4 | 5.6 | AI анализирует контекст выбора и предлагает оптимальные веса критериев с обоснованием. |
| 9 | **Dark/Light Theme Polish** | 7 | 2 | 6.3 | Полированная тема с анимированным переключателем, auto-detect system preference, smooth transitions. |
| 10 | **PWA + Offline Mode** | 7 | 4 | 4.9 | Service Worker, offline таблицы, push-уведомления, install to homescreen. |

### 📋 BACKLOG (11-50, ranked)

| # | Фича | Value | Effort | ROI | Описание |
|---|------|-------|--------|-----|----------|
| 11 | **History/Versioning** | 7 | 3 | 5.6 | История изменений таблицы с diff-view и rollback |
| 12 | **Multi-language UI** | 6 | 4 | 4.2 | EN/RU/ZH интерфейс с i18n |
| 13 | **Sharing & Permissions** | 8 | 6 | 4.0 | Публичные ссылки, пароли, роли viewer/editor |
| 14 | **Mobile-First UI** | 8 | 7 | 3.2 | Адаптивный мобильный интерфейс с swipe-жестами |
| 15 | **API Rate Limiting UI** | 6 | 2 | 5.4 | Визуализация rate limits, throttle, очереди |
| 16 | **Custom Personas Editor** | 7 | 3 | 5.6 | UI для создания/редактирования персон Council |
| 17 | **Batch Compare Mode** | 7 | 4 | 4.9 | Сравнение 3-5 таблиц одновременно |
| 18 | **Email Reports (Cron)** | 6 | 3 | 4.8 | Еженедельный дайджест изменений по email |
| 19 | **2FA Authentication** | 7 | 5 | 3.5 | TOTP 2FA для админки |
| 20 | **Webhook Integrations** | 6 | 3 | 4.8 | Webhooks на события: таблица создана, Council завершён, etc. |
| 21 | **Excel Import/Export** | 7 | 3 | 5.6 | .xlsx import с маппингом колонок + export в Excel |
| 22 | **Kanban Board View** | 5 | 4 | 3.5 | Kanban-вид для объектов с кастомными статусами |
| 23 | **Notification Center** | 6 | 4 | 4.2 | In-app уведомления: Council готов, таблица изменена, etc. |
| 24 | **Advanced EBM Dashboard** | 8 | 6 | 4.0 | Расширенная EBM панель: A/B тесты, confidence intervals, what-if сценарии |
| 25 | **Voice Input (STT)** | 6 | 5 | 3.6 | Голосовой ввод критериев и описаний |
| 26 | **Embed Anywhere Widget** | 7 | 4 | 4.9 | JS-виджет для встраивания таблицы на любой сайт |
| 27 | **Audit Log** | 7 | 3 | 5.6 | Полный лог действий пользователей |
| 28 | **Favorites/Bookmarks** | 4 | 1 | 4.0 | Избранные таблицы с папками |
| 29 | **Tag System** | 5 | 2 | 4.5 | Теги для таблиц + фильтрация по тегам |
| 30 | **Keyboard Shortcuts** | 5 | 2 | 4.5 | Hotkeys для быстрой навигации (Vim-like) |
| 31 | **Cost Calculator Widget** | 6 | 3 | 4.8 | Калькулятор стоимости AI-поиска в сайдбаре |
| 32 | **Smart Search (Semantic)** | 7 | 6 | 3.5 | Семантический поиск по содержимому таблиц |
| 33 | **Screenshot to Table** | 8 | 7 | 3.2 | OCR: скриншот таблицы → автоматическое создание в Choser |
| 34 | **Comparison Diff** | 6 | 3 | 4.8 | Diff двух версий таблицы или двух таблиц |
| 35 | **Drag & Drop Reorder** | 4 | 2 | 3.6 | DnD для критериев и объектов |
| 36 | **Graph View (Knowledge)** | 6 | 5 | 3.6 | Граф связей между таблицами |
| 37 | **Plugin System** | 8 | 9 | 1.6 | Плагины для расширения функционала |
| 38 | **Benchmarking Service** | 7 | 6 | 3.5 | Автоматические бенчмарки AI-моделей |
| 39 | **AI Summary Generator** | 6 | 3 | 4.8 | AI-генерация summary таблицы в 3 предложения |
| 40 | **Duplicate Detection** | 5 | 3 | 4.0 | Авто-детекция дубликатов объектов |
| 41 | **Color Coding Rules** | 5 | 2 | 4.5 | Правила раскраски ячеек по условиям |
| 42 | **Markdown Cells** | 4 | 3 | 2.8 | Markdown рендеринг в ячейках |
| 43 | **Table of Contents** | 3 | 1 | 3.0 | Оглавление для длинных таблиц |
| 44 | **Bulk Operations** | 6 | 4 | 4.2 | Массовое редактирование, удаление, экспорт |
| 45 | **Search History** | 4 | 2 | 3.6 | История поисковых запросов |
| 46 | **Watermark Protection** | 5 | 3 | 4.0 | Водяные знаки для embedding |
| 47 | **REST API Docs (Swagger)** | 6 | 2 | 5.4 | Swagger/OpenAPI документация |
| 48 | **Load Testing Suite** | 4 | 3 | 2.8 | k6/Artillery нагрузочные тесты |
| 49 | **CLI Tool** | 5 | 4 | 3.5 | CLI для создания таблиц и запуска Council |
| 50 | **Gamification** | 3 | 5 | 1.8 | Бейджи, уровни, ачивки за использование |

---

## Детальные ТЗ на TOP-10

### 1. Token Tracker Dashboard
**Файлы:** `src/components/admin/TokenTrackerTab.jsx`, `edp/src/api/adminTokens.js`

**API:**
```
GET /v1/api/admin/tokens/summary?period=7d
GET /v1/api/admin/tokens/by-model
GET /v1/api/admin/tokens/by-agent
GET /v1/api/admin/tokens/timeline
```

**DB Migration (007):**
```sql
CREATE TABLE IF NOT EXISTS token_usage (
  id INTEGER PRIMARY KEY,
  timestamp TEXT DEFAULT (datetime('now')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_rub REAL DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  agent_name TEXT,
  table_id INTEGER,
  council_job_id INTEGER,
  duration_ms INTEGER
);
```

**UI:** Admin вкладка «Токены» — 4 карточки (всего токенов, стоимость, среднее/запрос, топ модель) + ECharts line chart по дням + pie chart по провайдерам + таблица с drill-down.

### 2. Export to PDF
**Файлы:** `edp/src/api/export-pdf.js`, `src/utils/pdf-renderer.js`

Подход: серверный HTML→PDF через Puppeteer (headless Chrome в Docker) или jsPDF на клиенте.
Приоритет: клиентский jsPDF (не требует доп. зависимостей в Docker).

Шаблон PDF:
- Заголовок таблицы + описание
- AG Grid данные в табличном формате
- Utility scores с progress bars
- EBM summary card
- Council recommendation (если есть)

### 3. Comparison Templates Library
**Файлы:** `src/components/TemplatesModal.jsx`, `edp/src/api/templates.js`

```sql
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  columns_json TEXT,
  description TEXT,
  is_public INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

Seed 15+ шаблонов: CRM-системы, ERP, AI-модели, облачные провайдеры, ноутбуки, смартфоны, BI-инструменты, языки программирования, фреймворки, автомобили, страховки, кредиты, VPN-сервисы, IDE, хостинг.

### 4. Real-time Collaboration
**Файлы:** `edp/src/api/ws.js`, `src/hooks/useCollaboration.js`

Подход: WebSocket через Hono + ws. Presence (кто онлайн), cursor positions, optimistic updates.
Протокол: JSON patch (RFC 6902) для синхронизации.

### 5. AI Auto-Fill from URLs
**Файлы:** `edp/src/api/autofill.js`, `src/components/AutoFillModal.jsx`

Подход: LLM extraktion — отправить URL content в LLM, распарсить характеристики.
Поддерживаемые форматы: product pages, spec sheets, review aggregators.
Cache results in `url_cache` table.

### 6. Sensitivity Heatmap
**Файлы:** `src/components/SensitivityHeatmap.jsx`

ECharts heatmap: X = критерии, Y = объекты, цвет = Δ(score) при ±10% весе.
Tooltip: "Если увеличить вес 'Цена' на 10%, Samsung +5 баллов, Apple −3 балла".

### 7. Council Streaming (SSE)
**Файлы:** `edp/src/api/councilStream.js`

Заменить polling на SSE. Каждый persona response — отдельное событие.
Frontend: EventSource + progressive rendering.

### 8. Smart Weight Suggester
**Файлы:** `edp/src/api/weight-suggest.js`

LLM-вызов с контекстом: тип решения, бюджет, приоритеты.
Возвращает предложенные веса с обоснованием каждого.

### 9. Dark/Light Theme Polish
**Файлы:** `src/styles/premium.css` (enhance)

- Smooth transition animation (300ms)
- Auto-detect system preference (prefers-color-scheme)
- Animated toggle button (sun/moon morph)
- Persistent choice in localStorage
- All components fully themed (modals, cards, tables, charts)

### 10. PWA + Offline Mode
**Файлы:** `public/manifest.json`, `public/sw.js`, `vite-plugin-pwa`

Service Worker стратегия: Cache-first для static, Network-first для API.
Offline: чтение ранее загруженных таблиц, редактирование с sync при reconnect.

---

## Порядок реализации TOP-10

1. **Token Tracker** (1-2ч) — данные уже есть в council engine, нужен API + UI
2. **Dark/Light Polish** (1ч) — улучшить существующее
3. **Templates Library** (2ч) — seed + API + modal
4. **Council Streaming** (1.5ч) — SSE endpoint + frontend
5. **Sensitivity Heatmap** (1.5ч) — ECharts визуализация
6. **Smart Weight Suggester** (1.5ч) — LLM endpoint + UI
7. **Export PDF** (2ч) — jsPDF клиентский
8. **AI Auto-Fill** (3ч) — URL parsing + LLM extraction
9. **PWA** (2ч) — manifest + SW
10. **Real-time Collab** (5ч) — WebSocket + presence

**Итого: ~20 часов** (5 сессий по 4 часа)
