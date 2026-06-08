# Choser EDP — OpenClaw MCP Integration

## MCP Server Config

Добавьте в ваш `openclaw.json` (или через OpenClaw UI → Settings → MCP):

```json
{
  "mcpServers": {
    "choser": {
      "url": "http://localhost:3000/mcp",
      "transport": "sse"
    }
  }
}
```

Для Docker (если Choser в контейнере):

```json
{
  "mcpServers": {
    "choser": {
      "url": "http://host.docker.internal:3000/mcp",
      "transport": "sse"
    }
  }
}
```

## Доступные инструменты

| Инструмент | Описание |
|---|---|
| `council_decide` | Запустить AI-Совет (4+ персоны оценивают варианты, consensus) |
| `create_table` | Создать таблицу параметрического выбора |
| `get_table` | Получить таблицу с данными + TCO/IRR/ROIC |
| `list_tables` | Поиск таблиц по названию/тегу (FTS5) |
| `explain_table` | Объяснить выбор (LLM rationale) |
| `suggest_similar` | Найти похожие решения |

## Использование

Пользователь пишет: «Сравни Caddy vs Nginx vs Traefik для SSL»

OpenClaw → MCP `council_decide` → Council отвечает → OpenClaw форматирует → пользователь

### Примеры запросов

- «Какую БД выбрать для проекта?» → `council_decide`
- «Покажи таблицу выбора TLS» → `get_table`
- «Найди таблицы про мониторинг» → `list_tables`
- «Почему выбран Caddy?» → `explain_table`

## Переменные окружения (для Council Engine)

```env
ZAI_API_KEY=...        # GLM-5.1 через ZAI (primary)
GOOGLE_API_KEY=...     # Gemini (fallback)
```

## API Endpoints

| Метод | Путь | Описание |
|---|---|---|
| GET | `/v1/api/health` | Health check |
| GET | `/v1/api/tables` | Список таблиц |
| GET | `/v1/api/tables/:id` | Таблица с данными |
| POST | `/v1/api/tables` | Создать/обновить таблицу |
| POST | `/v1/api/council/decide` | Запустить Совет |
| GET | `/v1/api/council/jobs/:id` | Статус Совета |
| GET | `/v1/api/pool/dashboard` | Dashboard |
| POST | `/mcp` | MCP JSON-RPC endpoint |
| GET | `/mcp/sse` | MCP SSE transport |
| GET | `/` | React SPA |
