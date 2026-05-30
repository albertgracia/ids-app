# Fase: IDS-SENSOR-SURICATA-EVE-INGEST-01 — Informe

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
| `internal/suricata/ingest.go` | EVEIngestor (IngestJSON, IngestJSONLines) |
| `internal/suricata/ingest_test.go` | 7 tests de ingesta |
| `internal/api/suricata_handler.go` | Handlers HTTP para /suricata/eve y /suricata/eve/batch |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `cmd/ids-core/main.go` | Wiring de EVEIngestor + SuricataHandler + capabilities |
| `docs/02-roadmap.md` | Fases 11-14 ✅ añadidas, 15 actual, corrección a 16 fases |

---

## Suricata ingest

| Componente | Estado |
|-----------|--------|
| EVEIngestor.IngestJSON | ✅ 1 evento → parse → validate → save |
| EVEIngestor.IngestJSONLines | ✅ JSON Lines con error por línea |
| POST /api/v1/suricata/eve | ✅ |
| POST /api/v1/suricata/eve/batch | ✅ máximo 100, errores controlados |
| Endpoints protegidos de body vacío | ✅ 400 |
| Capacidades añadidas | ✅ suricata_eve_parser, suricata_eve_ingest |
| Eventos ingeridos en /events/recent | ✅ verificado manualmente |

---

## Tests

**19 tests suricata + 67 anteriores = 86 tests total, 0 failures**

| Test | Resultado |
|------|-----------|
| TestEVEIngestorIngestJSON | ✅ |
| TestEVEIngestorRejectsInvalidJSON | ✅ |
| TestEVEIngestorIngestJSONLines | ✅ |
| TestEVEIngestorJSONLinesReportsLineError | ✅ |
| TestEVEIngestorStoresAllSyntheticSamples | ✅ (9/9) |
| TestEVEIngestorRecentEventsAfterIngest | ✅ |
| TestEVEIngestorRejectsEmptyBody | ✅ |
| ... + 12 parser tests | ✅ |

---

## Validaciones

| Validación | Resultado |
|-----------|-----------|
| `go build ./cmd/ids-core` | ✅ |
| `go test ./... -count=1` | ✅ 86 tests |
| `task check` | ✅ |
| `task validate:suricata-contract` | ✅ |
| Manual: POST suricata/eve (alert-scan) | ✅ event ingerido, visible en recent |
| Manual: capabilities en /status | ✅ suricata_eve_parser, suricata_eve_ingest |

---

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `feat(sensor): ingest Suricata EVE JSON events` |
| Push realizado | ✅ `origin/scaffold/ids-v2-dev-env-01` |
| HEAD local/remoto sincronizado | ✅ |

---

## Confirmaciones

- ✅ No se tocó `192.168.1.40`.
- ✅ No se instaló Suricata.
- ✅ No se usaron PCAPs reales.
- ✅ No se copiaron EVE JSON reales.
- ✅ No se copiaron secretos.
- ✅ No se copiaron binarios legacy.
- ✅ No quedaron contenedores activos.

---

## Próxima fase recomendada

`IDS-STAGING-DEPLOY-DRYRUN-01`
