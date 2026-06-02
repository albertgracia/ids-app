# IDS-GHCR-WEB-STAGING-TAG-VERIFY-01

## Resultado

**PARTIAL**

El workflow `Publish staging container images` no pudo ejecutarse automáticamente: no hay `gh` CLI ni `GITHUB_TOKEN`/`GH_TOKEN` en este entorno. Se documentan los pasos exactos para que el operador humano los ejecute en GitHub UI y valide localmente.

## Agente principal

@devops-engineer

## Apoyo

@debugger (obligatorio)
@frontend-specialist (obligatorio)

---

## T1 — Baseline local (ejecutado)

```powershell
git status --short              # limpio
git status -sb                  # ## scaffold/ids-v2-dev-env-01...origin/...
git branch --show-current       # scaffold/ids-v2-dev-env-01
git rev-parse --short HEAD      # 54080f2
git rev-parse --short origin    # 54080f2
```

**HEAD local:** `54080f2`
**HEAD origin:** `54080f2`
**Rama:** `scaffold/ids-v2-dev-env-01`
**Working tree:** limpio ✅

---

## T2 — Guía: Ejecutar workflow correcto en GitHub UI

> **El agente no pudo ejecutar esto automáticamente.** El operador humano debe seguir estos pasos:

1. Abrir navegador en: https://github.com/albertgracia/ids-app
2. Clic en la pestaña **Actions**
3. En el panel izquierdo, seleccionar **Publish staging container images**
4. Clic en el botón **Run workflow** (a la derecha)
5. En el desplegable **Branch:**, **seleccionar `scaffold/ids-v2-dev-env-01`**
6. **Confirmar que NO está seleccionada `main`**
7. Clic en **Run workflow**

## T3 — Guía: Verificar workflow

1. Esperar a que el workflow complete (~10 min, 4 jobs en paralelo)
2. Verificar que el job **ids-web** muestre ✅ **SUCCESS**
3. Clic en el job **ids-web** y confirmar en los logs que:
   - `Checkout repository` usó la rama correcta
   - `Build and push` muestra las rutas App Router en la salida de `next build`
4. Verificar que el tag `staging` fue actualizado:
   ```
   ghcr.io/albertgracia/ids-app/ids-web:staging
   ```
5. Anotar el commit SHA usado (visible en el workflow run)

## T4 — Guía: Validar imagen sin tocar staging (desde máquina local)

```bash
# En la máquina con Docker y credenciales GHCR:

# 1. Autenticarse en GHCR (si es necesario)
echo $GITHUB_TOKEN | docker login ghcr.io -u albertgracia --password-stdin

# 2. Pull la imagen staging
docker pull ghcr.io/albertgracia/ids-app/ids-web:staging

# 3. Ejecutar contenedor de prueba
docker run --rm -d --name ids-web-ghcr-verify -p 3099:3000 ghcr.io/albertgracia/ids-app/ids-web:staging

# 4. Esperar y validar rutas
sleep 10

curl -I http://127.0.0.1:3099/
# Esperado: HTTP/1.1 200 OK   (✓)

curl -I http://127.0.0.1:3099/design-lab/v0-network
# Esperado: HTTP/1.1 200 OK   (✓)

curl -fsS http://127.0.0.1:3099/api/health
# Esperado: {"service":"ids-web","status":"ok"}   (✓)

# 5. Revisar logs
docker logs --tail=80 ids-web-ghcr-verify

# 6. Limpiar
docker rm -f ids-web-ghcr-verify
```

### Criterio de aprobación

| Ruta | Código esperado |
|------|----------------|
| `/` | 200 |
| `/design-lab/v0-network` | 200 |
| `/api/health` | `{"status":"ok"}` |

Si pasa, la imagen está lista para deployar en staging.

---

## Causa de PARTIAL

| Recurso | Estado |
|---------|--------|
| `gh` CLI | No disponible en PATH |
| `GITHUB_TOKEN` / `GH_TOKEN` | No configurado |
| GitHub API (curl) | No posible sin token |
| Docker local | Disponible ✅ (pero no se puede validar sin imagen actualizada) |

---

## Confirmaciones

- [x] No se tocó staging.
- [x] No se hizo pull en 192.168.1.40.
- [x] No se redeployó.
- [x] No se reiniciaron contenedores.
- [x] No se tocó backend.
- [x] No se tocó DB/Redis.
- [x] No se tocó Nginx/Cloudflare.
- [x] No se hizo prune.

---

## Próxima fase recomendada

**IDS-V0-STAGING-PREVIEW-DEPLOY-RETRY-01**

Una vez que el operador humano:
1. Ejecute el workflow en `scaffold/ids-v2-dev-env-01`
2. Valide las rutas localmente (T4)
3. Reporte que la imagen es correcta

Entonces se procede al deploy en staging siguiendo el plan ya documentado en `IDS-V0-STAGING-PREVIEW-MANUAL-DEPLOY-01.md`.
