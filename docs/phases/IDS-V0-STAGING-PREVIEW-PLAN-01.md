# IDS-V0-STAGING-PREVIEW-PLAN-01

## Resultado

**PARTIAL**

## Agente principal

@devops-engineer

## Apoyo

@frontend-specialist (obligatorio)
@code-archaeologist (obligatorio)

## Repo

Rama: scaffold/ids-v2-dev-env-01
HEAD: 3072947 feat(web): surface Suricata EVE context in v0 design lab
Working tree: limpio
Push: pendiente (HEAD no coincide con origin)

## 1. Baseline local

```powershell
git status --short
# (sin salida — limpio)

git branch --show-current
# scaffold/ids-v2-dev-env-01

git rev-parse --short HEAD
# 3072947

git log --oneline --decorate -10
# 3072947 (HEAD -> scaffold/ids-v2-dev-env-01) feat(web): surface Suricata EVE context in v0 design lab
# 20fda29 (origin/scaffold/ids-v2-dev-env-01) feat(web): add synthetic GeoIP to v0 design lab
# 510daca feat(web): integrate scoring severity into v0 design lab
# 958ca95 feat(web): integrate asset classifier into v0 design lab
# 7991429 docs(phases): add v0 real data integration plan
# f514c38 docs(phases): close v0 stats derived from events
# 13166c9 feat(web): derive v0 design lab stats from IDS events
# 0061249 feat(web): add SSE live stream to v0 design lab
# 0606487 feat(web): connect v0 design lab to recent IDS events
# 57d6ac4 feat(web): import v0 network analyzer design lab
```

**Confirmado:**
- Rama correcta: scaffold/ids-v2-dev-env-01
- HEAD: 3072947
- Working tree limpio
- Push pendiente: origin está en 20fda29 (2 commits detrás)

## 2. Build local web

```powershell
cd apps/web
npm run build
npm run typecheck
```

**Build: PASS** (Compiled successfully in ~1.5s, Turbopack)

**Typecheck: PASS** (tsc --noEmit sin errores)

**Rutas generadas:**
- `/`
- `/_not-found`
- `/api/health`
- `/design-lab`
- `/design-lab/v0-network` ✅

**Ruta `/` confirmada intacta:** Se genera como página estática.
**Ruta `/design-lab/v0-network` confirmada presente:** Se genera como página estática.

No hay errores de lint que rompan build. (ESLint 10 no presente o no bloqueante.)

## 3. Auditoría staging read-only — NO ACCESIBLE

```powershell
Test-Connection -ComputerName 192.168.1.40 -Count 2 -Quiet
# True (servidor responde ping)

ssh -o BatchMode=yes albert@192.168.1.40
# Permission denied (publickey,password)
```

El servidor `192.168.1.40` es alcanzable por ping pero SSH no tiene key-based auth configurada desde esta máquina. No se encontraron scripts locales con credenciales SSH.

**No se pudo ejecutar:**
- `docker ps`
- `curl` a servicios internos
- Verificación de contenedores ids-*

**Decisión:** Documentar como restricción de conectividad. El plan de despliegue futuro debe contemplar que el operador humano ejecute las validaciones in-situ.

## 4. Plan de publicación futuro

### 4.1 Imagen/branch/tag para staging

| Servicio | Imagen GHCR | Tag |
|----------|-------------|-----|
| ids-web | `ghcr.io/albertgracia/ids-app/ids-web` | `staging` |

Branch de trabajo: `scaffold/ids-v2-dev-env-01` → merge a `main` o build directo desde feature branch.

La imagen se construye con GitHub Actions:
- `docker build -f apps/web/Dockerfile -t ghcr.io/albertgracia/ids-app/ids-web:staging .`
- Se pushea a GHCR antes del deploy.

### 4.2 Validar que `/design-lab/v0-network` existe en build

```bash
# Local (pre-deploy):
docker build -f apps/web/Dockerfile -t ids-web-check:latest .
docker run --rm ids-web-check:latest sh -c "ls /app/.next/server/app/design-lab/v0-network/"

# Buscar los archivos:
# /app/.next/server/app/design-lab/v0-network/page.js
# /app/.next/server/app/design-lab/v0-network/page.html (static)
```

Si la ruta no existe como página en el build, no desplegar.

### 4.3 Publicar solo ids-web

En el servidor staging (192.168.1.40):

```bash
# 1. Pull solo la imagen de ids-web
docker pull ghcr.io/albertgracia/ids-app/ids-web:staging

# 2. Validar la imagen localmente
docker image inspect ghcr.io/albertgracia/ids-app/ids-web:staging

# 3. Hacer backup del compose actual
cp /home/albert/docker/ids-app/compose.yaml /home/albert/docker/ids-app/compose.yaml.bkp

# 4. Subir solo el contenedor ids-web
docker compose -f /home/albert/docker/ids-app/compose.yaml up -d ids-web
```

**Importante:** No tocar ids-core, postgres, redis, analytics, mcp.

### 4.4 Comprobar que `/` sigue intacto

```bash
curl -I http://127.0.0.1:3002/
# Esperado: HTTP/1.1 200 OK
# Content-Type: text/html

curl -fsS http://127.0.0.1:3002/ | grep -i "ids\|dashboard\|network\|home" | head -5
# Debe mostrar contenido de la página principal
```

Si `/` falla (404/500), detener y hacer rollback.

### 4.5 Comprobar `/design-lab/v0-network`

```bash
curl -I http://127.0.0.1:3002/design-lab/v0-network
# Esperado: HTTP/1.1 200 OK

curl -fsS http://127.0.0.1:3002/design-lab/v0-network | grep -i "analizador\|tráfico\|paquetes\|suricata" | head -5
# Debe mostrar contenido del v0-network
```

### 4.6 Validación visual humana

- Abrir `http://192.168.1.40:3002/` en navegador y confirmar que se ve correcto.
- Navegar a `/design-lab/v0-network` y confirmar que todos los paneles cargan:
  - KPIs
  - Packet Stream (con badges de Suricata, severidad, activos)
  - Estadísticas avanzadas (con SuricataSummary y SeverityDistribution)
  - Conexiones
  - Mapa con GeoIP sintético
- Confirmar que el source indicator muestra "Mock" o "Polling" según corresponda.
- Confirmar que el badge de EVE aparece en packets que tengan datos Suricata.

## 5. Rollback

### 5.1 Procedimiento

```bash
# 1. Revertir ids-web a la imagen anterior
docker pull ghcr.io/albertgracia/ids-app/ids-web:latest  # o tag anterior conocido

# 2. Si se guardó backup del compose:
cp /home/albert/docker/ids-app/compose.yaml.bkp /home/albert/docker/ids-app/compose.yaml

# 3. Re-desplegar solo ids-web
docker compose -f /home/albert/docker/ids-app/compose.yaml up -d ids-web

# 4. Verificar que / y /design-lab/v0-network responden
curl -I http://127.0.0.1:3002/
curl -I http://127.0.0.1:3002/design-lab/v0-network
```

### 5.2 Lo que NO se toca en rollback

- Volúmenes de postgres/redis
- ids-core, ids-analytics, ids-mcp
- Nginx/Cloudflare
- Firewall
- .env

## 6. Riesgos identificados

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `/design-lab/v0-network` no existe en build | Build pasa pero ruta no servida | Validar build local + inspeccionar .next |
| `/` se reemplaza o rompe | Pérdida de homepage existente | Verificar curl antes/después; rollback inmediato |
| SSH no disponible desde CI o máquina local | No se puede desplegar automáticamente | El operador humano debe ejecutar los comandos |
| Imagen GHCR no pública o PAT expirado | docker pull falla | Verificar antes del deploy |
| Puerto 3002 ocupado por otro servicio | ids-web no arranca | `docker ps` para confirmar disponibilidad |
| ESLint 10 warnings en build | Build pasa pero log sucio | Documentar, no blocker |

## 7. Confirmaciones READ-ONLY

- [x] No se hizo deploy.
- [x] No se ejecutó Docker build de imágenes de producción.
- [x] No se redeployó ningún servicio.
- [x] No se reiniciaron contenedores.
- [x] No se tocó backend (ids-core, analytics, mcp).
- [x] No se tocó DB/Redis.
- [x] No se tocó Nginx/Cloudflare.
- [x] No se reemplazó `/`.
- [x] No se expusieron secretos.

## 8. Próxima fase recomendada

**IDS-V0-STAGING-PREVIEW-01**

Ejecución del deploy en staging siguiendo este plan:
1. Construir imagen ids-web:staging y pushear a GHCR.
2. El operador humano SSHea a 192.168.1.40.
3. docker pull de la nueva imagen.
4. docker compose up -d ids-web.
5. Validar `/` y `/design-lab/v0-network`.
6. Validación visual con el usuario.
7. Si falla, rollback.

**Precondición:** Tener credenciales SSH configuradas o que el operador humano ejecute los comandos.
