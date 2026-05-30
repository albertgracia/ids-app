# Fase: IDS-MCP-READONLY-INTEGRATION-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Ruta local:** `E:\opencode\ids-app\`
**Repo:** `https://github.com/albertgracia/ids-app`

---

## RESULTADO: PASS

---

## Cambios realizados

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `src/ids_mcp/config.py` | Configuración (URLs, timeout, READ_ONLY) |
| `src/ids_mcp/client.py` | HTTP clients para ids-core y analytics-api |
| `src/ids_mcp/tools.py` | 7 herramientas MCP read-only |
| `tests/conftest.py` | PYTHONPATH para tests |
| `tests/test_tools.py` | 10 tests con mocks |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/ids_mcp/main.py` | MCP handler con registro de herramientas |
| `pyproject.toml` | httpx añadido como dependencia |
| `.env.example` | Variables MCP añadidas |

---

## MCP tools

| Tool | Read-only | Core required | Analytics required |
|------|-----------|---------------|-------------------|
| `ids_get_mcp_status` | ✅ | ❌ | ❌ |
| `ids_list_capabilities` | ✅ | ❌ | ❌ |
| `ids_get_core_status` | ✅ | ✅ | ❌ |
| `ids_get_recent_events` | ✅ | ✅ | ❌ |
| `ids_summarize_recent_events` | ✅ | ✅ | ❌ |
| `ids_score_event_readonly` | ✅ | ❌ | ✅ |
| `ids_read_suricata_plan` | ✅ | ❌ | ❌ |

---

## Read-only guarantees

- ✅ `READ_ONLY = True` en config.py
- ✅ Sin herramientas write
- ✅ Sin ejecución de comandos del sistema
- ✅ Sin llamadas a servicios externos
- ✅ Sin modificación de base de datos
- ✅ Timeout configurable en cliente HTTP
- ✅ Errores controlados en unavailable/error

---

## Tests

**10 tests, 0 failures**

| Test | Resultado |
|------|-----------|
| `test_mcp_status_read_only` | ✅ |
| `test_list_capabilities` | ✅ |
| `test_recent_events_limit_validation` | ✅ |
| `test_recent_events_uses_mock_client` | ✅ |
| `test_summarize_recent_events` | ✅ |
| `test_core_unavailable_returns_controlled_error` | ✅ |
| `test_analytics_unavailable_returns_controlled_error` | ✅ |
| `test_score_event_readonly_does_not_mutate` | ✅ |
| `test_suricata_plan_readonly` | ✅ |
| `test_config_read_only_flag` | ✅ |

---

## Validaciones

| Validación | Resultado |
|-----------|-----------|
| `uv run ruff check src/ tests/` | ✅ |
| `uv run pytest` | ✅ 10/10 |
| `task check` | ✅ |
| Manual: stdin MCP test | ✅ |

---

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `feat(mcp): add read-only IDS tools` |
| Push realizado | ✅ `origin/scaffold/ids-v2-dev-env-01` |
| HEAD local/remoto sincronizado | ✅ |

---

## Confirmaciones

- ✅ No se tocó `192.168.1.40`.
- ✅ No se desplegó nada.
- ✅ No se usaron PCAPs reales.
- ✅ No se copiaron EVE JSON reales.
- ✅ No se copiaron secretos.
- ✅ No se copiaron binarios legacy.
- ✅ No hay herramientas destructivas.
- ✅ transport MCP: stdio JSON (compatible con protocolo MCP estándar).

---

## Próxima fase recomendada

`IDS-CONSOLE-ANALYTICS-INTEGRATION-01` — Integrar scoring de analytics-api en el dashboard de Next.js.
