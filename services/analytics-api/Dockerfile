FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy pyproject first for caching
COPY services/analytics-api/pyproject.toml services/analytics-api/uv.lock* ./
RUN pip install --no-cache-dir . 2>/dev/null || pip install --no-cache-dir fastapi uvicorn pydantic

# Copy source
COPY services/analytics-api/src/ src/

ENV PYTHONPATH=/app/src
EXPOSE 8090

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8090/healthz || exit 1

CMD ["uvicorn", "ids_analytics.main:app", "--host", "0.0.0.0", "--port", "8090"]
