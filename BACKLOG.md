# Choser EDP — Бэклог на год (июнь 2026 — июнь 2027)

## Приоритеты
- **P0** — критично, ломает продукт
- **P1** — важно, влияет на качество
- **P2** — улучшение UX/технический долг
- **P3** — nice-to-have

---

## Q3 2026 (июнь-сентябрь)

### P0 — Критические баги и стабильность
- [x] **BUG: Council игнорирует numObjects/numParams** — FIX: postValidateScores + обрезка tableContext + усиление промта (e8a915d)
- [x] **BUG: Council job зависает при таймауте ZAI** — FIX: Promise.race 5 мин, job→'failed' (e8a915d)
- [x] **BUG: curl.exe на Windows ломает JSON body** — FIX: JSON body normalization middleware (BOM strip, \r\n) + global error handler (c8dac68)

### P1 — Качество Council Engine
- [x] **Council post-validation** — grade range 1-10 clamp + type normalization (c8dac68)
- [x] **Council retry logic** — simplified prompt retry when scores empty after validation (c8dac68)
- [x] **parseVote улучшение** — recoverPartialScores для обрезанного JSON + fuzzy matching (c22121a)
- [x] **Council streaming** — councilStream.js использует numObjects/numParams + обрезает tableContext + fuzzy match (e8a915d, c22121a)
- [ ] **EBM integration** — Council должен использовать EVSI/Bayesian из ebm.js для рекомендаций сколько ещё параметров добавить
- [x] **Council templates** — пресеты промптов для B2B, B2C, Tech, Financial, Hiring + GET /council/templates (c8dac68)

### P2 — UX и техдолг
- [x] **Автотесты** — 33 unit тестов (parseVote, recoverPartialScores, fuzzyMatch, normalize, postValidateScores, templates, grade clamping) — 33/33 ✅ (df3e201)
- [ ] **EBM тренды** — экспоненциальный и квадратичный тренды опциональны, но линейный иногда неточен. Добавить auto-detection лучшего тренда
- [ ] **Grid.jsx рефакторинг** — 1007 строк God Object. Разбить на 5-7 компонентов
- [ ] **Error boundaries** — React error boundaries на все табы админки
- [ ] **Rate limiter** — сделать persistent (Redis/SQLite), сейчас in-memory сбрасывается при рестарте
- [ ] **LLM provider abstraction** — providers.js + engine.js дублируют логику. engine.js используется в 5 файлах. Унифицировать

### P3 — Nice-to-have
- [ ] **Council history** — UI для просмотра прошлых решений с фильтрами/сравнением
- [ ] **Тёмная тема** — подправить контрастность, сейчас isDark берётся из classList — ненадёжно
- [ ] **Export PDF/XLSX** — проверить что работают с текущими данными

---

## Q4 2026 (октябрь-декабрь)

### P1 — Ядро
- [ ] **Sensitivity analysis v2** — автоматический анализ чувствительности: «если изменить вес X на ±10%, как поменяется рейтинг?»
- [ ] **Decision quality score** — метрика качества решения на основе размерности таблицы, разброса оценок, кол-ва экспертов
- [ ] **Collaboration** — real-time совместное редактирование таблиц (collaboration.js существует, но не интегрирован)
- [ ] **Templates library** — шаблоны таблиц для типовых задач (выбор CRM, хостинга, авто и т.д.)

### P2 — Технологии
- [ ] **Миграция на Hono v5** — если будет major release
- [ ] **Docker multi-stage optimization** — уменьшить размер образа
- [ ] **MCP server** — handler.js существует, протестировать и задокументировать
- [ ] **Backup automation** — cron работает, но нет мониторинга (was backup successful?)
- [ ] **LLM provider abstraction** — providers.js + engine.js дублируют логику. Унифицировать

### P3
- [ ] **i18n** — i18n/index.js есть, но не используется. Подключить для EN/RU
- [ ] **PWA** — offline-first для мобильных
- [ ] **API documentation** — OpenAPI/Swagger

---

## Q1 2027 (январь-март)

### P1
- [ ] **AI vs Human analytics v2** — улучшить метрики match_percent, добавить статистическую значимость
- [ ] **Autofill AI** — adminAutofill.js: AI-заполнение таблиц на основе веб-поиска
- [ ] **Weight suggestion** — adminWeightSuggest.js: AI-рекомендация весов критериев
- [ ] **Financial model** — financial.js: TCO/IRR/ROIC расчёты интегрировать в Council

### P2
- [ ] **Performance monitoring** — p95 latency, token usage per table, cost tracking
- [ ] **A/B testing framework** — для тестирования разных промптов Council
- [ ] **Data import** — CSV/Excel → Choser table
- [ ] **Hermes agent integration** — hermes.js для автономного AI-агента

### P3
- [ ] **GraphQL** — альтернатива REST для сложных запросов
- [ ] **WebSocket notifications** — real-time обновления Council

---

## Q2 2027 (апрель-июнь)

### P1
- [ ] **Multi-org** — org_id уже есть в схеме, реализовать изоляцию данных
- [ ] **API keys management** — api_keys таблица есть, UI для управления
- [ ] **Audit log** — audit_log таблица есть, реализовать запись + UI

### P2
- [ ] **Mobile responsive** — адаптация Grid.jsx для мобильных
- [ ] **Obsidian sync** — bi-directional sync с Obsidian vault
- [ ] **choser.org v2** — публичный сайт с SEO, статьями, embedded таблицами

### P3
- [ ] **Plugin system** — расширения через MCP/WebAssembly
- [ ] **Benchmark suite** — нагрузочное тестирование Council с разными размерами таблиц

---

## Текущий спринт (выполнено 2026-06-03)

1. ✅ max_tokens 4096→16000 (сделано ранее)
2. ✅ Council numObjects/numParams enforcement — postValidateScores + обрезка + fuzzy matching (e8a915d, c22121a)
3. ✅ parseVote improvement — recoverPartialScores + partial JSON recovery (e8a915d, c22121a)
4. ✅ Council timeout protection — Promise.race 5 мин (e8a915d)
5. ✅ councilStream: council_logs + council_jobs (e8a915d)
6. ✅ Council post-validation — grade range 1-10 (c8dac68)
7. ✅ Council retry logic при пустых scores (c8dac68)
8. ✅ BUG: curl.exe на Windows — BOM strip + global error handler (c8dac68)
9. ✅ Council templates — b2b/b2c/tech/financial/hiring пресеты (c8dac68)
10. ✅ Unit тесты — 33/33 ✅ (df3e201)

## Следующий спринт
1. ⬜ EBM integration — Council + EVSI/Bayesian рекомендации
2. ⬜ LLM provider abstraction — унифицировать providers.js + engine.js
3. ⬜ API тесты для Council endpoints (integration tests)
