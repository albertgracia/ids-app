# Fase: IDS-CORE-ASSET-INVENTORY-01 — Informe

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
| `services/ids-core/internal/domain/asset.go` | Asset struct + NewAsset + Validate + helpers |
| `services/ids-core/internal/domain/asset_type.go` | AssetType enum (19 tipos IT/OT) |
| `services/ids-core/internal/domain/asset_status.go` | AssetStatus enum (7 estados) |
| `services/ids-core/internal/domain/criticality.go` | Criticality enum (5 niveles) |
| `services/ids-core/internal/domain/asset_test.go` | 21 tests unitarios |
| `docs/06-asset-inventory.md` | Documentación del modelo de activos |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `services/ids-core/cmd/ids-core/main.go` | Añadido `asset_inventory_model` a capabilities |

---

## Modelo de asset

- **Asset**: estructura principal con 17 campos (ID, name, type, status, criticality, zone, IPs, MACs, hostnames, vendor, model, firmware, protocols, tags, first/last seen, metadata)
- **Enums**: AssetType (19), AssetStatus (7), Criticality (5) + reutiliza Zone y Protocol del event model
- **Helpers**: `NewAsset`, `Touch`, `AddIP`, `AddMAC`, `AddProtocol` (todos con validación y dedup)
- **Validación**: método `Validate()` completo
- Sin dependencias externas (solo stdlib)

---

## Tests

**34 tests total** (21 new asset + 13 existing event), **0 failures**

| Test | Resultado |
|------|-----------|
| TestNewAssetDefaults | ✅ |
| TestAssetValidateValidAsset | ✅ |
| TestAssetValidateMissingID | ✅ |
| TestAssetValidateMissingName | ✅ |
| TestAssetValidateInvalidType | ✅ |
| TestAssetValidateInvalidStatus | ✅ |
| TestAssetValidateInvalidCriticality | ✅ |
| TestAssetValidateInvalidZone | ✅ |
| TestAssetValidateInvalidIP | ✅ |
| TestAssetValidateInvalidMAC | ✅ |
| TestAssetValidateLastSeenBeforeFirstSeen | ✅ |
| TestAssetTouchUpdatesLastSeen | ✅ |
| TestAssetAddIPDeduplicates | ✅ |
| TestAssetAddIPInvalid | ✅ |
| TestAssetAddMACDeduplicates | ✅ |
| TestAssetAddMACInvalid | ✅ |
| TestAssetAddProtocolDeduplicates | ✅ |
| TestAssetAddProtocolInvalid | ✅ |
| TestAssetJSONRoundTrip | ✅ |
| TestAssetJSONFields | ✅ |
| TestNewAssetUniqueIDs | ✅ |

---

## Validaciones

| Validación | Resultado |
|-----------|-----------|
| `go build ./cmd/ids-core` | ✅ PASS |
| `go test ./... -count=1` | ✅ PASS (34/34) |
| `task check` | ✅ PASS (web lint warning known) |

---

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `feat(core): add IDS asset inventory model` |
| Push realizado | ✅ `origin/scaffold/ids-v2-dev-env-01` |
| HEAD local/remoto sincronizado | ✅ |

---

## Confirmaciones

- ✅ No se tocó `192.168.1.40`.
- ✅ No se desplegó nada.
- ✅ No se copiaron secretos.
- ✅ No se copiaron PCAPs.
- ✅ No se copiaron binarios legacy.
- ✅ Sin dependencias externas (solo stdlib + crypto/rand).

---

## Próxima fase recomendada

`IDS-SIMULATED-INGEST-01` — Implementar ingesta de eventos simulados.
