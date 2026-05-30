# Agent Remote Operations Policy

## 1. Purpose

Define the rules, restrictions, and procedures that AI agents must follow when performing remote operations: SSH connections, server audits, staging preparation, deployments, or any action on a remote machine.

## 2. General Principles

1. **Read-only by default.** All remote operations start in read-only mode unless the phase explicitly authorizes write operations.
2. **Explicit authorization required.** No agent may connect to a server unless the phase prompt explicitly authorizes it.
3. **Least privilege.** Perform only the operations specified in the phase. Do not explore, modify, or inspect beyond the stated scope.
4. **No surprises.** Do not restart services, stop containers, modify configurations, or install packages without explicit authorization.
5. **Leave no trace.** Do not create files, modify configurations, or change state in read-only mode.
6. **Report everything.** Every phase must produce a report documenting what was done, what was found, and any risks.
7. **Secrets never.** Never read, print, copy, or commit secrets, tokens, passwords, or credentials.

## 3. Modes of Operation

### READ-ONLY

- SSH allowed only for inspection commands (`ss`, `docker ps`, `df -h`, `free -h`, `systemctl status`, etc.).
- No file creation, modification, or deletion.
- No container operations.
- No service restarts.
- No package installation.
- No configuration changes.

### WRITE-LIMITED

- SSH allowed.
- File creation/modification allowed **only within explicitly authorized paths**.
- Examples: creating `/home/albert/docker/ids-app/` and its contents.
- All other restrictions from READ-ONLY apply outside the authorized path.

### DEPLOY

- Full deployment operations allowed.
- Requires explicit phase authorization with rollback plan.
- Must include pre-deployment backup/snapshot verification.
- Must include post-deployment health checks.
- Must include rollback procedure documentation.

### EMERGENCY / ROLLBACK

- Only for reverting a failed deployment.
- Requires explicit human approval before execution.
- Must follow the rollback plan documented in the deployment phase.
- Must be followed by an incident report.

## 4. Known Servers

| Server | Role | Authorized Access |
|--------|------|-------------------|
| `192.168.1.40` | Ubuntu Server — observability + future ids-app staging | Only when phase explicitly authorizes |
| `192.168.1.50` (ai-lab) | Not documented in ids-app context | Not authorized unless explicitly stated |

## 5. Rules for 192.168.1.40

This server hosts the homelab observability stack (Prometheus, Grafana, Loki, Alloy, Node Exporter, cAdvisor, Dozzle, UnPoller, Nginx Proxy Manager, Cloudflare Tunnel, Portainer, WordPress).

### Allowed path for ids-app operations

```text
/home/albert/docker/ids-app/
```

### Prohibited without explicit authorization

```text
/home/albert/docker/monitorizacion/
/home/albert/docker/nginx/
/home/albert/docker/wordpress/
/home/albert/docker/portainer/
/home/albert/docker/redis/
/etc/prometheus/
/etc/grafana/
/etc/alloy/
/etc/nginx/
```

### Prohibited always (unless phase explicitly bypasses)

- Stopping or restarting Docker containers.
- Modifying docker-compose files outside `/home/albert/docker/ids-app/`.
- Modifying Prometheus targets, alert rules, or config.
- Modifying Grafana dashboards or data sources.
- Modifying Loki retention or storage config.
- Modifying Alloy config.
- Modifying Nginx Proxy Manager config.
- Modifying Cloudflare Tunnel config.
- Modifying firewall rules (UFW/iptables).
- Creating or modifying systemd services.
- Installing system packages.

## 6. Procedure Before SSH Connection

1. Verify the phase prompt explicitly authorizes remote access.
2. Verify the target server is documented in the phase or in this policy.
3. Run local pre-checks:
   ```powershell
   git status --short
   git branch --show-current
   git log --oneline --decorate -5
   ```
4. Verify the server is reachable:
   ```powershell
   Test-Connection -ComputerName <server> -Count 2 -Quiet
   ```
5. If SSH credentials exist in a local script, use them **only for the connection**, never print, log, or commit them.

## 7. Procedure During a Remote Session

1. Start with read-only inspection commands.
2. Do not modify anything outside the authorized path.
3. Do not explore directories or files outside the stated scope.
4. Do not read `.env` files or display their contents.
5. If a command returns unexpected output (e.g., `sudo` requires a terminal), document it and stop — do not work around it.
6. If any risk is detected (e.g., occupied port, low disk space), document it and inform.
7. Run all commands in the order specified by the phase.
8. Capture command output for the report, but **never include secrets**.

## 8. Procedure After a Remote Session

1. Run close-out checks on the server:
   ```bash
   # Verify no unintended changes
   docker ps | grep ids-   # Should show no ids- containers if not deployed
   ```
2. Verify no containers were started or stopped unintentionally.
3. Generate the phase report in `docs/phases/`.
4. If the phase modified the repo, commit and push (see Section 15).

## 9. Using sudo

- `sudo` is allowed only for **read-only commands** that require elevated privileges (e.g., `sudo ss -tulpn`, `sudo iptables -S`).
- `sudo` is **never** allowed for write operations without explicit authorization.
- If `sudo` prompts for a password in batch mode, document it and skip the command — do not provide a password in the command line.

## 10. Docker and Docker Compose

### Allowed (with authorization)

```bash
docker ps
docker network ls
docker volume ls
docker system df
docker compose -f <path> config --quiet
docker logs <container> --tail <n>
```

### Prohibited (unless explicitly authorized)

```bash
docker compose up
docker compose down
docker compose restart
docker compose stop
docker compose start
docker rm
docker rmi
docker network create
docker volume create
```

### Exception

`docker compose config --quiet` is always allowed — it only validates the compose file without running anything.

## 11. Ports and Service Exposure

- Do not open ports on the host firewall.
- Do not modify Nginx Proxy Manager to expose services.
- Do not modify Cloudflare Tunnel to expose services.
- Service exposure is a separate phase requiring human approval.

## 12. Secrets, .env, and Sensitive Data

### Never

- Read or display `.env` file contents.
- Copy `.env` file contents to any report or log.
- Commit `.env` files to the repository.
- Include passwords, tokens, API keys, or connection strings in reports.
- Include values from `.env` in documentation or examples (use placeholders like `CHANGE_ME`).

### Allowed

- List `.env` file **paths** for inventory purposes.
- Create `.env.example` files with placeholder values.
- Reference environment variable **names** without values.

## 13. PCAPs, Logs, Databases, and Binaries

### Never commit to the repository

- `.env` files
- `.db`, `.sqlite`, `.sqlite3` files
- `.pcap`, `.pcapng` files
- `.exe`, `.dll`, `.msi` files
- `.rar`, `.zip` archives (unless explicitly authorized)
- `.log` files
- `node_modules/`, `.next/`, `.venv/`, `__pycache__/` directories
- Binary build artifacts
- Core dumps or crash dumps

### Handling in reports

- Log excerpts are allowed as long as they do not contain secrets.
- Database file existence can be mentioned, but contents must not be extracted or displayed.
- PCAP existence can be mentioned, but files must not be opened or analyzed in the same session without authorization.

## 14. Required Reports

Every phase must produce:

1. **Phase report** in `docs/phases/<PHASE-NAME>.md`
2. If the phase involved server inspection, a copy should also be saved to `E:\opencode\Observabilidad\<PHASE-NAME>.md` (if that directory exists).

Phase reports must include:

- Result (PASS / PARTIAL / FAIL)
- Commands executed
- Files created or modified
- Validation results
- Risks identified
- Confirmation that no restricted actions were taken
- Next phase recommendation

## 15. Git Sync

### Before commit

```powershell
git status --short
git diff --stat
```

Verify no forbidden files:

- `.env`
- `*.db`, `*.sqlite`
- `*.pcap`, `*.pcapng`
- `*.exe`, `*.rar`
- `node_modules`, `.next`, `.venv`, `__pycache__`

### Commit

```bash
git add <files>
git commit -m "<type>(<scope>): <description>"
```

### Push

```bash
git push
```

### After push

```powershell
git log --oneline --decorate -5
```

Confirm HEAD and origin point to the same commit.

## 16. Stop Criteria

Stop immediately and document if any of the following occur:

1. SSH connection fails due to authentication (do not work around it).
2. A command requires interactive input not specified in the phase.
3. A command returns unexpected errors that could indicate a misconfiguration.
4. A restricted path is encountered while exploring.
5. A secret, password, or token is accidentally displayed — do not include it in any output.
6. The phase scope is unclear or contradictory.
7. A remote service becomes unresponsive during inspection.
8. Disk, memory, or CPU resources are critically low.

## 17. Phase Deliverable Template

```text
RESULTADO: PASS / PARTIAL / FAIL

Servidor:
Ruta informe ids-app:
Ruta informe Observabilidad:
Rama:
Commit:

Cambios realizados:
- ...

Validaciones:
- ...

Riesgos:
- ...

Recomendacion:
- ...

Confirmaciones:
- No se modifico el servidor.
- No se reiniciaron servicios.
- No se tocaron compose existentes.
- No se expusieron secretos.
- No se desplego ids-app.

Proxima fase recomendada:
...
```
