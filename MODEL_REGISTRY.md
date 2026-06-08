# 🤖 Choser Model Registry

> Автоматически сгенерировано: 2026-05-09
> Тестировалось через OpenRouter API (free tier)

## Результаты тестирования

### ✅ Работающие бесплатные модели (OpenRouter)

| # | ID | Имя | Параметры | Контекст | Статус |
|---|---|---|---|---|---|
| 1 | `nvidia/nemotron-3-super-120b-a12b:free` | Nemotron Super 120B | 120B (A12B active) | 262K | ✅ OK |
| 2 | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | Nemotron Omni 30B (reasoning) | 30B (A3B active) | 256K | ✅ OK |
| 3 | `nvidia/nemotron-3-nano-30b-a3b:free` | Nemotron Nano 30B | 30B (A3B active) | 256K | ✅ OK |
| 4 | `openai/gpt-oss-120b:free` | GPT-OSS 120B | 120B | 131K | ✅ OK |
| 5 | `poolside/laguna-m.1:free` | Poolside Laguna M.1 | — | 131K | ✅ OK |
| 6 | `inclusionai/ring-2.6-1t:free` | Ring 2.6 1T | 1T total | 262K | ✅ OK |
| 7 | `minimax/minimax-m2.5:free` | MiniMax M2.5 | — | 197K | ✅ OK |
| 8 | `nvidia/nemotron-nano-12b-v2-vl:free` | Nemotron Nano 12B VL | 12B (vision) | 128K | ✅ OK |
| 9 | `nvidia/nemotron-nano-9b-v2:free` | Nemotron Nano 9B | 9B | 128K | ✅ OK |
| 10 | `liquid/lfm-2.5-1.2b-instruct:free` | Liquid LFM 2.5 1.2B | 1.2B | 33K | ✅ OK |

### ⚠️ Permanently rate-limited (популярные, перегружены)

| ID | Имя | Причина |
|---|---|---|
| `nousresearch/hermes-3-llama-3.1-405b:free` | Hermes 405B | 429 — самая популярная free, всегда перегружена |
| `meta-llama/llama-3.3-70b-instruct:free` | Llama 3.3 70B | 429 — перегружена |
| `qwen/qwen3-coder:free` | Qwen3 Coder 480B | 429 — перегружена |
| `google/gemma-4-31b-it:free` | Gemma 4 31B | 429 — перегружена |

### ❌ Не работает

| ID | Причина |
|---|---|
| `google/gemma-4-26b-a4b-it:free` | 400 Bad Request |

### 💰 Платные модели (через OpenRouter)

Рекомендованные для production (цена за 1K токенов):

| ID | Имя | Ввод $/1K | Вывод $/1K | Контекст | ~Стоимость таблицы* |
|---|---|---|---|---|---|
| `deepseek/deepseek-v4-flash` | DeepSeek V4 Flash | $0.00014 | $0.00028 | 576K | ~$0.001 |
| `deepseek/deepseek-v3.2` | DeepSeek V3.2 | $0.000252 | $0.000378 | 1M | ~$0.002 |
| `z-ai/glm-4.7-flash` | GLM 4.7 Flash | $0.00006 | $0.00040 | 752K | ~$0.001 |
| `z-ai/glm-5.1` | GLM 5.1 | $0.00105 | $0.00350 | 752K | ~$0.008 |
| `openai/gpt-4o-mini` | GPT-4o Mini | $0.00015 | $0.00060 | 128K | ~$0.002 |
| `google/gemini-2.5-flash` | Gemini 2.5 Flash | $0.0003 | $0.0025 | 576K | ~$0.005 |
| `anthropic/claude-sonnet-4` | Claude Sonnet 4 | $0.003 | $0.015 | 200K | ~$0.03 |
| `openai/gpt-4o` | GPT-4o | $0.0025 | $0.01 | 128K | ~$0.02 |

*\*Оценка: генерация одной таблицы (~3K токенов ввод + ~4K токенов вывод)*

### 🔧 Прямой доступ (не через OpenRouter)

| Провайдер | URL | Модель | Цена | Примечание |
|---|---|---|---|---|
| ZAI | `open.bigmodel.cn/api/paas/v4` | glm-5.1 | По подписке | 429 при лимите подписки |
| Groq | `api.groq.com/openai/v1` | llama-3.3-70b-versatile | Free (rate limited) | Быстрая, но маленький контекст |

---

## 📋 Рекомендованные пресеты для Council

### Пресет «Бесплатный» (0 руб)
```
1. nvidia/nemotron-3-super-120b-a12b:free    → 120B, главный генератор
2. openai/gpt-oss-120b:free                  → 120B, второй голос
3. nvidia/nemotron-3-nano-omni-30b-a3b:free  → reasoning, критик
4. poolside/laguna-m.1:free                  → 131K контекст, третий голос
5. minimax/minimax-m2.5:free                 → 197K контекст
```
**Проходов:** 1 генерация + 1 критика + ремонт если нужно
**Токенов за Council:** ~15-25K (5 персон × 3-5K каждая)
**Стоимость:** $0

### Пресет «Смешанный» (дешёвый)
```
1. deepseek/deepseek-v4-flash       → $0.00014/$0.00028, главный
2. nvidia/nemotron-3-super-120b:free → бесплатный, второй голос
3. z-ai/glm-4.7-flash               → $0.00006/$0.00040, быстрый
4. openai/gpt-oss-120b:free         → бесплатный, третий
5. nvidia/nemotron-nano-30b:free    → бесплатный, ремонт
```
**Стоимость за Council:** ~$0.003

### Пресет «Премиум»
```
1. anthropic/claude-sonnet-4   → лучший анализ
2. openai/gpt-4o               → второй голос
3. z-ai/glm-5.1                → русский язык (нативный)
4. google/gemini-2.5-flash     → скорость
5. deepseek/deepseek-r1        → reasoning
```
**Стоимость за Council:** ~$0.10

---

## 🔗 Ссылки

- [OpenRouter Models](https://openrouter.ai/models) — все модели с ценами
- [OpenRouter Docs](https://openrouter.ai/docs) — API документация
- [OpenRouter Limits](https://openrouter.ai/docs/limits) — лимиты free tier
- [ZAI / BigModel](https://open.bigmodel.cn/) — GLM прямой доступ
- [Groq Console](https://console.groq.com/) — управление ключами Groq
