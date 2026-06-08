# Архитектурная развилка: Hermes → ZAI Direct

**Дата:** 2026-05-24  
**Контекст:** Choser Council (совет AI-агентов)

## Проблема

Council не мог получить ответы от LLM — все агенты падали с ошибкой **"No LLM provider available"**.

### Диагностика

1. **Hermes работает** (PID 12 в контейнере, `hermes gateway run` под supervisord)
2. **API-ключ валидный** (`hermes-choser-internal-2026`, 401 при неверном → модель `hermes-agent` видна при верном)
3. **НО Hermes маршрутизировал через OpenRouter**, а не через ZAI:
   - `provider=openrouter base_url=https://openrouter.ai/api/v1 model= (пусто!)`
   - DNS в контейнере **не резолвит `openrouter.ai`**
   - `config.yaml`: `default_provider: zai`, `default_model: zai/glm-5.1` — но Hermes это **игнорировал**
4. **ZAI напрямую работал** мгновенно из контейнера

### Корневая причина

Hermes внутри Docker-контейнера не мог маршрутизировать запросы к ZAI, хотя ключи были прописаны. Ошибка: `"No models provided"` от OpenRouter (DNS-провал + пустая модель).

## Решение

**Обход Hermes → прямой вызов ZAI API** из `providers.js`.

### Схема до (через Hermes)

```
councilStream.js → providers.js → Hermes (127.0.0.1:9090) → OpenRouter → ❌ DNS fail
```

### Схема после (напрямую)

```
councilStream.js → providers.js → ZAI API (open.bigmodel.cn) → ✅ GLM-5.1
```

### Что изменено в `providers.js`

Функция `callWithChain()` переписана:
- **Primary:** прямой HTTP к `https://open.bigmodel.cn/api/coding/paas/v4/chat/completions`
- **Fallback #1:** Hermes (оставлен на случай починки)
- **Fallback #2:** OpenRouter
- **Fallback #3:** Groq
- Ключи читаются из `process.env` (уже были в контейнере через docker-compose)

### Почему не починили Hermes

| Фактор | Оценка |
|---|---|
| Время починки Hermes | 30-60 мин дебага Python-конфига |
| Время обхода через ZAI | 15 мин правки providers.js |
| Надёжность | Прямой вызов = минус 1 звено |
| Риск | Низкий — одна правка в callWithChain() |

## Результат

- CEO и CFO отвечают за ~65 сек каждый
- ~3500 токенов на агента
- Токены корректно считаются (input/output)
- Вердикт генерируется

## Файлы

- `/app/src/llm/providers.js` — основной файл с маршрутизацией
- `/app/src/api/councilStream.js` — вызывает `callWithChain(process.env, ...)`
- `/home/choser/.hermes/config.yaml` — конфиг Hermes (не изменён)
