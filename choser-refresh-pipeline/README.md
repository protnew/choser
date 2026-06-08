# Choser Table Refresh Pipeline v3

## Что делает

Обновляет устаревшие таблицы сравнения в Choser (500 таблиц, многие 2019-2022 года) через AI-пайплайн.

**6 параллельных воркеров** обрабатывают таблицы через цепочку агентов:

```
FILTER → SCOUT → RESEARCH → BUILDER (чанками) → CRITIC → SAVE+VERIFY
```

- **FILTER** — удаляет мусор, дубли, тестовые таблицы (500 → ~347)
- **SCOUT** — анализирует таблицу, определяет что устарело, что добавить
- **RESEARCH** — web search через DuckDuckGo для актуальных данных
- **BUILDER** — генерирует обновлённые данные чанками по 10 параметров
- **CRITIC** — валидирует оценки, полноту, адекватность (confidence score)
- **SAVE+VERIFY** — сохраняет, проверяет что записалось, откатывает при ошибке

## Требования

- Node.js 18+
- ZAI API ключ с балансом ( Hermes: `ecf4acc290fc4df3bd4236683d429dd3.UCbUs6RwModed7lj`)
- Choser API запущен (http://127.0.0.1:3002)
- Опционально: `duckduckgo-search` для web search (`pip install duckduckgo-search`)

## Запуск

```powershell
cd "C:\Сделать\Чейчер SCRUM\openclaw\choser-refresh-pipeline"

# Обязательные переменные
$env:ZAI_API_KEY="ecf4acc290fc4df3bd4236683d429dd3.UCbUs6RwModed7lj"

# Посмотреть что попадёт под обновление
node pipeline.js --dry-run

# Обновить 5 таблиц (тест)
node pipeline.js --limit 5

# Обновить одну конкретную таблицу
node pipeline.js --table sravnenie-ide-dlya-python

# Обновить все 347 таблиц
node pipeline.js --all

# 3 воркера, 10 таблиц
node pipeline.js --workers 3 --limit 10
```

## Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `ZAI_API_KEY` | — | API ключ ZAI (обязательно) |
| `OPENROUTER_API_KEY` | — | Fallback API ключ OpenRouter |
| `CHOSER_URL` | `http://127.0.0.1:3002` | URL Choser API |
| `WORKERS` | `6` | Количество параллельных воркеров |

## Результат тестового прогона

```
✅ Done: 1 (Сравнение IDE для Python)
   SCOUT → RESEARCH → BUILDER → CRITIC (0.92) → SAVE → VERIFY
   4 objects, 10 params, 134s, 7310 tokens = $0.004
```

## Отчёты

- `pipeline-reports/queue.json` — очередь с прогрессом (перезапускаемый)
- `pipeline-reports/pipeline.log` — полный лог
- `pipeline-reports/snapshots/` — JSON бэкапы таблиц до обновления
- `pipeline-reports/report-YYYY-MM-DD.json` — финальный отчёт

## Стоимость (оценка)

~7K токенов на таблицу × 347 таблиц = ~2.5M токенов ≈ **$3-5** через ZAI GLM-5.1.

## Категории

Пайплайн автоматически определяет категорию по названию:

| Категория | Ключевые слова | Частота обновления |
|---|---|---|
| `tech` | смартфон, ноутбук, авто... | Раз в год |
| `software` | CRM, VPN, хостинг, IDE... | Раз в полгода |
| `finance` | кредит, страховка, банк... | Раз в квартал |
| `general` | всё остальное | По необходимости |

Для каждой категории — свой system prompt для SCOUT и BUILDER.

## Безопасность

- Snapshot каждой таблицы ДО обновления
- Verify после записи (сравнение количества строк)
- Автоматический откат при неудачной записи
- Graceful shutdown через Ctrl+C (прогресс сохраняется)
- Queue — персистентная, можно прервать и продолжить
- Fallback на OpenRouter при исчерпании баланса ZAI

## Исправленные баги Choser

- `extractTCO is not defined` — функция определена в tablesWrite.js, но вызывается в tablesRead.js. Исправлено: добавлена копия функции в tablesRead.js (патч контейнера).

## Отличия от v2 (Hermes)

| Что | v2 (Hermes) | v3 (OpenClaw) |
|---|---|---|
| webSearch | `execSync` (блокирует) | `execFile` + python (async) |
| Choser URL | `localhost:3002` | `127.0.0.1:3002` |
| Row data | `row.param_XXX` | `row.data.param_XXX` |
| POST endpoint | `/api/tables/:id` | `/api/table` (singular) |
| Token tracking | hardcoded 0 | Реальный подсчёт |
| Логирование | console only | файл + консоль |
| Workers | до 4 | до 6+ |
| ZAI balance issue | нет fallback | fallback → OpenRouter |
| extractTCO bug | не исправлен | исправлен (патч контейнера) |
