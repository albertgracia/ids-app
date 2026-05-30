# Fase: IDS-SOC-UI-INTEGRATE-MOCK-INTO-DASHBOARD-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Commit:** `826ef87` — `feat(console): integrate SOC command center mock into dashboard`
**Commit estable anterior:** `38c1079`

---

## RESULTADO: PASS

### Integración
Se fusionó la dirección visual de `/design-lab` en el dashboard real `/`, manteniendo TODOS los datos reales del backend.

### Qué se tomó de /design-lab
- Estructura SOC Command Center: Header 2 filas → KPIs sidebar + Mapa + Topología → iSID bar → Timeline → Radar/Assets/IoCs/SevDist → Events + Inspector
- AttackWorldMap con SVG de continentes simplificados, líneas curvas de ataque, paquetes en movimiento
- IsidDefensiveBar — 6 botones deshabilitados (Copiar IOC, Marcar, Recomendar bloqueo, Vigilancia, Investigar, Informe)
- Estilo visual: header 2 filas con capability badges

### Datos reales preservados
- `getStatus()` → core status + capabilities + storage_mode
- `getRecentEvents()` → eventos reales del backend
- `getAnalyticsStatus()` → analytics status
- `scoreEvent()` → scoring real
- AbortController + mountedRef + polling 10s

### Lo que NO se tocó
- `/design-lab` intacto ✅
- Clientes API intactos ✅
- Backend, DB, staging ✅

### Staging
```
http://192.168.1.40:3002 → HTTP 200 ✅
6 contenedores healthy ✅
```

### Próxima fase
`IDS-DASHBOARD-REVIEW-GATE-03`
