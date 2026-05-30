# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /build

COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm ci

COPY apps/web/ .
RUN npm run build

# ---- Runtime Stage ----
FROM node:22-alpine
RUN apk add --no-cache wget ca-certificates
RUN adduser -D -u 1001 nextjs

WORKDIR /app
COPY --from=builder /build/.next/ ./.next/
COPY --from=builder /build/public/ ./public/
COPY --from=builder /build/package.json ./
COPY --from=builder /build/node_modules/ ./node_modules/
COPY --from=builder /build/next.config.ts ./

EXPOSE 3000
USER nextjs

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["npm", "run", "start"]
