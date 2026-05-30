# ---- Build Stage ----
FROM golang:1.25-alpine AS builder
WORKDIR /build

# Cache Go modules
COPY services/ids-core/go.mod services/ids-core/go.sum ./
RUN go mod download 2>/dev/null || true

# Copy source
COPY services/ids-core/ .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -trimpath -o /ids-core ./cmd/ids-core

# ---- Runtime Stage ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget tzdata
RUN adduser -D -u 1001 ids
COPY --from=builder /ids-core /app/ids-core

EXPOSE 8088
USER ids
WORKDIR /app

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8088/healthz || exit 1

CMD ["/app/ids-core"]
