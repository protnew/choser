# ====== Stage 1: Build React frontend ======
FROM node:22.15.0-alpine3.21 AS frontend-builder

WORKDIR /build

# Copy root package files (has React + Vite deps)
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source + config
COPY vite.config.js index.html ./
COPY src/ ./src/
COPY public/ ./public/

# Build React SPA
RUN npm run build

# ====== Stage 2: Production server with Hermes ======
FROM node:22.15.0-alpine3.21

LABEL maintainer="Choser EDP + Hermes Agent"
LABEL description="AI-driven parametric decision platform with embedded Hermes Agent"

WORKDIR /app

# Security: non-root user
RUN addgroup -S choser && adduser -S choser -G choser

# ─── Install system packages ───
RUN apk add --no-cache python3 py3-pip supervisor sqlite dcron && \
    pip3 install --no-cache-dir --break-system-packages hermes-agent aiohttp && \
    mkdir -p /home/choser/.hermes /var/log/supervisor && \
    chown -R choser:choser /home/choser/.hermes /var/log/supervisor

# ─── Install Node.js production deps ───
COPY edp/package.json edp/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm ci --production 2>/dev/null || npm install --production

# ─── Copy backend code ───
COPY edp/src/ ./src/
# rebuild 20260521111851
COPY edp/personas/ ./personas/
# db.js resolves ../../.env from src/lib/ → /app/.env
COPY edp/.env ./.env

# ─── Copy built frontend from stage 1 ───
COPY --from=frontend-builder /build/dist ./public/

# ─── Create data dirs with correct ownership ───
RUN mkdir -p /app/data /app/backup && \
    chown -R choser:choser /app

# ─── Hermes config ───
COPY hermes-config.yaml /home/choser/.hermes/config.yaml
COPY hermes-dot-env /home/choser/.hermes/.env
RUN chown -R choser:choser /home/choser/.hermes

# ─── Supervisord config ───
COPY supervisord.ini /etc/supervisor.d/choser.ini

# ─── Test suite ───
COPY tests/ /tests/

# ─── Backup cron ───
COPY backup-cron.sh /app/backup-cron.sh
RUN chmod +x /app/backup-cron.sh && \
    echo "0 */6 * * * /app/backup-cron.sh >> /var/log/backup.log 2>&1" | crontab -u choser -

# ─── Entrypoint (fix volume perms + auto-restore + supervisord + cron) ───
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3002/v1/api/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]

