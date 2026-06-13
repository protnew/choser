# Быстрый старт для разработки Choser

## Требования
- Node.js 18+
- npm

## 3 шага

### 1. Настроить API-ключи
```bash
# Скопировать шаблон и заполнить ключи
cp .dev.vars.example .dev.vars
```

Заполнить в `.dev.vars`:
- `GOOGLE_API_KEY` — [Google AI Studio](https://aistudio.google.com/apikey)
- `GROQ_API_KEY` — [Groq Console](https://console.groq.com/keys)

### 2. Инициализировать локальную D1 базу
```bash
npm run db:seed:local
```

### 3. Запустить
```bash
npm run dev:full
```
- **Frontend (Vite):** http://localhost:5173
- **Backend (Wrangler):** http://localhost:8788

## Полезные команды

| Команда | Описание |
|---------|----------|
| `npm run dev:frontend` | Только фронтенд (Vite HMR) |
| `npm run dev:backend` | Только бэкенд (Wrangler Pages local) |
| `npm run dev:full` | Оба одновременно |
| `npm run db:seed:local` | Пересоздать локальную БД |
| `npm run build` | Сборка для production |
| `npm run build:deploy` | Ручная сборка + деплой в Cloudflare |

## Автоматический Деплой (Windows Task Scheduler)
Для автоматического деплоя из приватного репозитория в публичный GitHub (и далее в Cloudflare Pages) используется скрипт `sync-public.cjs` (и обертка `sync-public.bat`).
Скрипт полностью вырезает токены, пароли и базы данных перед пушем.
Он добавлен в **Планировщик заданий Windows (Windows Task Scheduler)** под именем `ChoserSyncPublic` и запускается **ежедневно в 15:30**. При пуше в публичный репозиторий Cloudflare собирает новую версию фронтенда автоматически.

## Бесплатные лимиты Cloudflare

| Ресурс | Free Tier |
|--------|-----------|
| Workers (requests) | 100,000/день |
| D1 (reads) | 5M/день |
| D1 (writes) | 100K/день |
| D1 (storage) | 5GB |
| KV (reads) | 100K/день |
| Workers AI | 10,000 neurons/день |
