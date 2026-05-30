FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy pyproject first for caching
COPY services/mcp-server/pyproject.toml services/mcp-server/uv.lock* ./
RUN pip install --no-cache-dir . 2>/dev/null || pip install --no-cache-dir fastapi uvicorn httpx pydantic

# Copy source
COPY services/mcp-server/src/ src/

ENV PYTHONPATH=/app/src
ENV IDS_MCP_MODE=read_only
EXPOSE 8091

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8091/healthz || exit 1

CMD ["python", "-m", "ids_mcp.main"]
