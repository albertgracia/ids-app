# Fase: IDS-SENSOR-SURICATA-EVE-PARSER-01 — Informe

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
| `services/ids-core/internal/suricata/eve.go` | Structs EVE JSON (EVEEvent + 8 substructs) |
| `services/ids-core/internal/suricata/parser.go` | ParseEVEJSON + ParseEVEEvent + mapping functions |
| `services/ids-core/internal/suricata/parser_test.go` | 12 tests con 9 fixtures sintéticos |

### Archivos copiados

| Archivo | Propósito |
|---------|-----------|
| `services/ids-core/internal/suricata/testdata/*.json` | 9 fixtures sintéticos EVE JSON |

---

## Parser Suricata

| Componente | Estado |
|-----------|--------|
| ParseEVEJSON (bytes → domain.Event) | ✅ |
| ParseEVEEvent (EVEEvent struct → domain.Event) | ✅ |
| Event type mapping | ✅ 9 event types |
| Severity mapping | ✅ 1→critical, 2→high, 3→medium, 4→low |
| Protocol mapping (app_proto > event_type > proto) | ✅ 10 protocolos |
| Zone inference (CIDR ranges) | ✅ ot (172.16.100.0/24), it (10.10.0.0/16) |
| Direction inference | ✅ lateral, internal, inbound, outbound |
| Title generation | ✅ alert signature, DNS hostname, HTTP URL, TLS SNI, etc. |
| Metadata preservation | ✅ 20+ campos preservados |
| event.Validate() antes de devolver | ✅ |
| Errores controlados | ✅ JSON inválido, event_type vacío |

---

## Fixtures cubiertos

| Fixture | Event type esperado | Protocolo esperado | Zona esperada |
|---------|-------------------|-------------------|---------------|
| alert-scan-detected.json | scan_detected | tcp | ot |
| flow-normal-it.json | network_connection | https | it |
| dns-query.json | network_connection | dns | it |
| http-request.json | network_connection | http | it |
| tls-handshake.json | network_connection | https | it |
| ssh-session.json | network_connection | ssh | it |
| rdp-session.json | network_connection | rdp | it |
| smb-session.json | network_connection | smb | it |
| modbus-read.json | ot_command | modbus | ot |

---

## Tests

**12 tests, 0 failures**

| Test | Resultado |
|------|-----------|
| TestParseAlertScanDetected | ✅ |
| TestParseFlowNormalIT | ✅ |
| TestParseDNSQuery | ✅ |
| TestParseHTTPRequest | ✅ |
| TestParseTLSHandshake | ✅ |
| TestParseSSHSession | ✅ |
| TestParseRDPSession | ✅ |
| TestParseSMBSession | ✅ |
| TestParseModbusRead | ✅ |
| TestParseInvalidJSON | ✅ |
| TestParseUnknownEventType | ✅ |
| TestParsedEventsValidate | ✅ |

---

## Validaciones

| Validación | Resultado |
|-----------|-----------|
| `go build ./internal/suricata/` | ✅ |
| `go test ./internal/suricata/ -count=1` | ✅ 12/12 |
| `go test ./... -count=1` | ✅ 79 tests |
| `go build ./cmd/ids-core` | ✅ |
| `task check` | ✅ |
| `task validate:suricata-contract` | ✅ |

---

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `feat(sensor): parse Suricata EVE JSON samples` |
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
- ✅ Todos los datos son sintéticos (TEST-NET, example.com, lab-/ot- prefijos).

---

## Próxima fase recomendada

`IDS-SENSOR-SURICATA-EVE-INGEST-01` — Integrar parser con pipeline de ingesta runtime.
