# IDS-UNIFI-TRAFFICLOG-PERSISTENT-SERVICE-PLAN-01

**Status:** PASS  
**Date:** 2026-06-06  
**Objective:** Plan persistent collector service for traffic.log without installing anything

## 1. Local Baseline

| Item | Value |
|------|-------|
| Branch | `scaffold/ids-v2-dev-env-01` |
| HEAD | `28bcca6 docs(unifi): plan traffic log collector source` |
| git status | Clean (1 untracked file: `docs/phases/IDS-UNIFI-TRAFFICLOG-SEND-SMOKE-01.md`) |
| Remote | `origin https://github.com/albertgracia/ids-app.git` |
| Upstream | In sync with `origin/scaffold/ids-v2-dev-env-01` |

## 2. Baseline .40 (Read-Only)

| Check | Result |
|-------|--------|
| Host | `ubuntu-server` |
| Deploy dir | `/home/albert/docker/ids-app` |
| ids-core | `running` / `healthy` |
| /healthz | `200` |
| /readyz | `200` |
| /api/v1/status | OK — contains `unifi_internal_ingest_dry_run` |
| Endpoint without token | `503` (confirmed) |
| rsyslog | `active` |
| Port 8088 | `LISTEN` (0.0.0.0:8088, [::]:8088) |
| rsyslog ports | 1514 TCP+UDP LISTEN (orphaned), 15514 TCP+UDP LISTEN (active) |
| traffic.log | `3826325 bytes / 14341 lines` — growing, last mod `12:42:50` |
| ids.log | `978581 bytes / 3658 lines` — stale since `Jun 5 22:21` |

### Log Details

```
/var/log/unifi/traffic.log:  -rw-r-----  syslog adm    3826325  Jun 6 12:43
/var/log/unifi/ids.log:      -rw-r--r--  syslog syslog  978581  Jun 5 22:21
```

Both files use the **same rsyslog template**: `%timegenerated% %HOSTNAME% %syslogtag%%msg%\n`

traffic.log format is identical to ids.log — parser handles both without changes.

### Log Rotation

The default `/etc/logrotate.d/rsyslog` only covers standard syslog files. **`/var/log/unifi/*.log` files are NOT covered by logrotate.** This means:
- traffic.log will grow unboundedly (currently ~3.8 MB, growing ~2.5 KB/min = ~130 MB/year)
- The collector must handle files that never rotate, OR we need a logrotate config for `/var/log/unifi/*.log` before running persistently

**Recommendation:** Add logrotate config for `/var/log/unifi/*.log` before enabling persistent collector.

## 3. Collector Review

### Binary/Package

- **Package:** `github.com/albertgracia/ids-app/services/ids-core/cmd/unifi-parallel-collector`
- **Binary name:** `unifi-parallel-collector`
- **Language:** Go (compiled, no runtime dependencies)

### Available Flags

| Flag | Type | Default | Purpose |
|------|------|---------|---------|
| `--tail-file` | string | `""` | Path to file to tail (required for tail mode) |
| `--state-file` | string | `""` | JSON file for offset persistence |
| `--start-position` | string | `"end"` | `beginning` or `end` for initial offset |
| `--once` | bool | `false` | Process available lines and exit |
| `--poll-interval` | duration | `1s` | Polling interval (reserved for future continuous mode) |
| `--send` | bool | `false` | Send batch via HTTP POST |
| `--endpoint` | string | `""` | Full URL including path for batch POST |
| `--token-env` | string | `"IDS_UNIFI_INGEST_TOKEN"` | Environment variable name for Bearer token |
| `--ingest-batch` | bool | `false` | Build UniFi ingest batch format |
| `--batch-size` | int | `50` | Max events per batch (1–100) |
| `--collector-id` | string | `"unifi-parallel-collector-local"` | Identifier for batch metadata |
| `--source-host` | string | `"unifi-gateway"` | Synthetic source host |
| `--print-payload-summary` | bool | `true` | Print safe batch summary to stderr |
| `--input` | string[] | — | File inputs (mutually exclusive with --tail-file) |
| `--stdin` | bool | `false` | Read from stdin |
| `--output` | string | `"ndjson"` | Output format: ndjson or json |
| `--mode` | string | `"dry-run"` | Only `dry-run` accepted currently |
| `--dedupe` | bool | `true` | Deduplicate by raw_hash |
| `--include-raw` | bool | `false` | Include raw log line in output |
| `--operational` | bool | `true` | Enable operational syslog parser |

### Continuous Mode Support

- **Currently:** `--once is required` for tail mode. Line 280-283 of `main.go`:
  ```go
  if cfg.tailFile != "" && !cfg.once {
      fmt.Fprintln(stderr, "error: modo tail sin --once aun no implementado en esta fase")
      return config{}, exitInvalidConfig
  }
  ```
- **Continuous mode is NOT yet implemented.** The collector can only run `--once` and exit.
- **For persistent service:** The collector needs to run periodically (e.g., every 30s via systemd timer or cron), OR continuous mode must be implemented.

**Decision:** Use systemd timer running every 30s with `--once` flag. This avoids implementing continuous tail mode and provides natural restart-on-failure via systemd.

### Endpoint Validation

The `validateLocalEndpoint` function (batch.go:196-214) ensures the endpoint:
- Is not a known remote IP (`192.168.1.40`)
- Must resolve to `127.0.0.1`, `localhost`, or `::1`
- This guardrail works correctly for `.40` when using `127.0.0.1:8088`

### Token Reading

Token is read from **process environment** via `os.Getenv(cfg.tokenEnv)` (batch.go:156). Default env var name: `IDS_UNIFI_INGEST_TOKEN`.

This is compatible with systemd `EnvironmentFile=` directive.

### Duplicate Handling

- In-process dedupe by `raw_hash` (SHA256 of trimmed line)
- Server-side dedupe by `idempotency_key` (`unifi:<raw_hash>`) with 5-min in-memory window
- If state-file is deleted, offset resets to `end`, avoiding replay of old lines

### Log Rotation Behavior

In `tail.go:187-198` (`determineTailOffset`):
- If state.offset > current file size → detect truncation/rotation, reset to `0` (read from beginning)
- If state.path matches current file path → resume from stored offset
- Otherwise → use `startPosition` (default: `end`)

**Risk:** If log rotates (new file created) and old file is renamed, the inode/path changes. The state-file stores only `path`, not `inode` — so on rotation, `state.Path != absPath` (since the old file was renamed and a new file with the same name was created). Wait — actually the path wouldn't change if rsyslog does a copy-truncate or if logrotate creates a new file with the same name. Let me think more carefully:

With `copytruncate`: same filename, same path, same inode? No, copytruncate copies and truncates, keeping the same inode. In this case, state.offset might be > new size after truncation → `determineTailOffset` returns `0` (start over). But this means it would re-read lines already ingested. With dedupe at 5-min window, some duplicates could arrive.

With create mode: old file renamed, new file created. Same path. New inode. State.path == absPath (both are the absolute path). So `state.path == path` is true, offset would be stale (pointing to the old inode's size which is larger than 0), so the collector would read from that offset in a smaller file → `state.Offset > size` → `return 0`.

So in either case, log rotation naturally causes offset reset to 0, which means it reads the rotated file from the beginning. But since `--once` processes only what's available between runs, and traffic.log grows at ~2.5KB/min, the amount of re-read data is bounded by the 30s polling window.

Also, the 5-min dedupe window on the server side handles duplicates within that window. With systemd timer every 30s, worst case: rotation happens, collector reads 0-5 lines from new file, then next 30s run reads those lines again → duplicates caught by server-side dedupe.

This is acceptable.

### Crash/Endpoint Down Behavior

- HTTP client timeout: 5 seconds (batch.go:160)
- On send failure: returns error, `runTailMode` returns non-zero exit code
- systemd `Restart=on-failure` restarts the process
- State-file offset is written AFTER successful read, BEFORE send
- This means on restart after send failure: same lines are re-read → re-sent → duplicates caught by server-side dedupe

## 4. Proposed Paths

| Resource | Path | Justification |
|----------|------|---------------|
| Binary | `/opt/ids-app/bin/unifi-parallel-collector` | Standard Linux `/opt` for third-party/commercial software, `ids-app` namespace |
| State file | `/var/lib/ids-app/unifi-collector/state.json` | `/var/lib` for application state, `ids-app` namespace |
| Env file | `/etc/ids-app/unifi-collector.env` | `/etc` for configuration, `ids-app` namespace |
| Own logs | journald (via systemd) | No separate log file; systemd captures stdout/stderr |
| Working dir | `/opt/ids-app/bin` | Same dir as binary; no runtime files written to CWD |

### Directory Structure

```
/opt/ids-app/
  bin/
    unifi-parallel-collector    # binary (755, root:root)
/var/lib/ids-app/
  unifi-collector/
    state.json                   # state file (644, ids-unifi-collector:ids-unifi-collector)
/etc/ids-app/
  unifi-collector.env            # env file (600, root:ids-unifi-collector)
```

## 5. Users and Permissions

### Recommended User

**Option A (Recommended): Dedicated system user `ids-unifi-collector`**

- Type: system user (no login, no home dir)
- Primary group: `ids-unifi-collector`
- Supplementary group: `adm` (to read traffic.log with 640 syslog:adm)
- Reason: Principle of least privilege, avoids running as `albert` or `root`

### Required Permissions

| Resource | Permission | Owner | Group |
|----------|-----------|-------|-------|
| Binary | `755` (rwxr-xr-x) | `root` | `root` |
| State dir | `755` (rwxr-xr-x) | `ids-unifi-collector` | `ids-unifi-collector` |
| State file | `644` (rw-r--r--) | `ids-unifi-collector` | `ids-unifi-collector` |
| Env file | `600` (rw-------) | `root` | `ids-unifi-collector` |
| traffic.log access | `640` (rw-r-----) | `syslog` | `adm` |

### Traffic Log Access

`/var/log/unifi/traffic.log` has `640 syslog:adm`. The collector needs read access. With `ids-unifi-collector` in `adm` group, access is granted without changing log permissions.

**Important:** Do NOT change traffic.log permissions. The `adm` group membership approach is correct.

## 6. Token Strategy

### Location

- Single copy: `/etc/ids-app/unifi-collector.env`
- Permissions: `600` (root:ids-unifi-collector)
- NOT in repo
- NOT in compose .env
- NOT in shell history
- NOT printed during installation/smoke

### Variable Format

```
IDS_UNIFI_INGEST_TOKEN=<token-value>
```

### Systemd Usage

```ini
[Service]
EnvironmentFile=/etc/ids-app/unifi-collector.env
```

The collector reads `IDS_UNIFI_INGEST_TOKEN` from process environment (default `--token-env`).

### Validation Without Printing

```bash
# Check file exists and is non-empty (without printing value)
test -s /etc/ids-app/unifi-collector.env && echo "env file OK"
# Check token is accessible to the service user
sudo -u ids-unifi-collector bash -c 'source /etc/ids-app/unifi-collector.env; [ -n "$IDS_UNIFI_INGEST_TOKEN" ]' && echo "token reachable"
```

### Rotation

```bash
# Generate new token
NEW_TOKEN=$(openssl rand -hex 32)
# Update env file
echo "IDS_UNIFI_INGEST_TOKEN=$NEW_TOKEN" | sudo tee /etc/ids-app/unifi-collector.env
sudo chmod 600 /etc/ids-app/unifi-collector.env
# Restart service
sudo systemctl restart ids-unifi-collector
```

### Revocation

- Remove/change token in env file
- Restart collector → new connections use new token
- Old token no longer valid in ids-core
- Can also remove token from ids-core if needed (but no need — old token simply stops working)

## 7. Proposed Systemd Unit

### Unit Name

`ids-unifi-collector.service`

### Unit Content (Proposed — NOT created yet)

```ini
[Unit]
Description=IDS UniFi Operational Syslog Collector
Documentation=https://github.com/albertgracia/ids-app
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/ids-app/bin/unifi-parallel-collector \
  --tail-file=/var/log/unifi/traffic.log \
  --state-file=/var/lib/ids-app/unifi-collector/state.json \
  --endpoint=http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi \
  --send=true \
  --batch-size=25 \
  --once \
  --ingest-batch \
  --collector-id=unifi-collector-staging \
  --source-host=ubuntu-server

EnvironmentFile=/etc/ids-app/unifi-collector.env
User=ids-unifi-collector
Group=ids-unifi-collector

Restart=on-failure
RestartSec=10s

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/ids-app/unifi-collector
PrivateTmp=true
CapabilityBoundingSet=
SystemCallFilter=@system-service

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Timer Unit (Proposed)

To run every 30s since `Type=oneshot` (not `Type=simple` — because `--once` exits immediately):

```ini
[Unit]
Description=Run IDS UniFi Collector every 30s
Requires=ids-unifi-collector.service

[Timer]
OnCalendar=*:*:0/30
Unit=ids-unifi-collector.service
AccuracySec=1s

[Install]
WantedBy=timers.target
```

**Alternative (simpler):** Use `Restart=always` + `ExecStartPost=/bin/sleep 30` hack. Not recommended.

**Alternative (simplest):** Keep `Type=oneshot` + `Restart=on-failure` + Timer. This is the cleanest approach.

### Why Type=oneshot + Timer

- `oneshot` is the correct type for a process that runs and exits
- Timer runs it every 30s
- `Restart=on-failure` restarts within the 30s window if it crashes
- Clean separation of concerns

### Hardening Notes

- `ProtectSystem=strict`: Only `ReadWritePaths` are writable (state dir)
- `ProtectHome=true`: Service cannot access /home
- `NoNewPrivileges=true`: Prevents privilege escalation
- `PrivateTmp=true`: Isolated /tmp

**Warning about ProtectSystem=strict:** The binary at `/opt/ids-app/bin/` needs to be readable. With `ProtectSystem=strict`, only `/usr/` is readable by default. Need to add `ReadOnlyPaths=/opt/ids-app/bin` or use `ProtectSystem=full` instead (which protects `/usr` and `/etc` but allows reading `/opt`).

**Revised hardening section:**

```ini
ProtectSystem=full
# or explicitly:
ReadWritePaths=/var/lib/ids-app/unifi-collector
ReadOnlyPaths=/opt/ids-app/bin
```

Actually `ProtectSystem=full` makes `/usr/` and `/etc/` read-only. `/opt/` is not affected. So `/opt/ids-app/bin` remains readable. Let me confirm: `ProtectSystem=full` makes `/usr/` and `/etc/` read-only and `/usr/` is implied `/usr/`. `/opt/` stays as-is. OK.

Better to use `ProtectSystem=strict` with explicit `ReadOnlyPaths=/opt/ids-app/bin` and `ReadWritePaths=/var/lib/ids-app/unifi-collector`. This is the most secure.

## 8. Installation Validation (Future Phase)

### Preflight

| Step | Command | Expected |
|------|---------|----------|
| Binary exists | `test -x /opt/ids-app/bin/unifi-parallel-collector` | exit 0 |
| Binary --help | `/opt/ids-app/bin/unifi-parallel-collector --help` | Prints help |
| Env file exists | `test -s /etc/ids-app/unifi-collector.env` | exit 0 |
| Env file perms | `stat -c '%a' /etc/ids-app/unifi-collector.env` | `600` |
| Token reachable | `sudo -u ids-unifi-collector bash -c 'source /etc/ids-app/unifi-collector.env; [ -n "$IDS_UNIFI_INGEST_TOKEN" ]'` | exit 0 |
| State dir exists | `test -d /var/lib/ids-app/unifi-collector` | exit 0 |
| State dir perms | `stat -c '%U:%G' /var/lib/ids-app/unifi-collector` | `ids-unifi-collector:ids-unifi-collector` |
| User exists | `id ids-unifi-collector` | exit 0 |
| User in adm group | `groups ids-unifi-collector` | includes `adm` |
| Traffic log readable | `sudo -u ids-unifi-collector test -r /var/log/unifi/traffic.log` | exit 0 |
| ids-core healthy | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8088/healthz` | `200` |
| Endpoint without token | `curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi` | `503` |

### Installation

| Step | Command |
|------|---------|
| Create user | `sudo useradd --system --no-create-home --shell /usr/sbin/nologin --groups adm ids-unifi-collector` |
| Create dirs | `sudo mkdir -p /opt/ids-app/bin /var/lib/ids-app/unifi-collector /etc/ids-app` |
| Copy binary | `sudo cp unifi-parallel-collector /opt/ids-app/bin/ && sudo chmod 755 /opt/ids-app/bin/unifi-parallel-collector` |
| Set state dir owner | `sudo chown -R ids-unifi-collector:ids-unifi-collector /var/lib/ids-app/unifi-collector` |
| Create env file | `echo 'IDS_UNIFI_INGEST_TOKEN=...' | sudo tee /etc/ids-app/unifi-collector.env && sudo chmod 600 /etc/ids-app/unifi-collector.env` |
| Install systemd unit | `sudo cp ids-unifi-collector.service /etc/systemd/system/ && sudo cp ids-unifi-collector.timer /etc/systemd/system/` |
| Reload | `sudo systemctl daemon-reload` |

### Smoke Test (Persistent Mode)

After installation, inject temporary token, start service for one run, validate:

| Step | Command |
|------|---------|
| Dry-run once | `sudo -u ids-unifi-collector /opt/ids-app/bin/unifi-parallel-collector ... --once --dry-run` |
| Start service | `sudo systemctl start ids-unifi-collector.service` |
| Check status | `sudo systemctl status ids-unifi-collector.service --no-pager` |
| Check journal | `sudo journalctl -u ids-unifi-collector.service --no-pager --since "1 min ago"` |
| Check endpoint | `curl -s http://127.0.0.1:8088/api/v1/events/recent` |
| Validate accepted | `accepted > 0` |
| Validate no errors | `rejected=0, duplicates controlled` |

### Health Gates for Enable

- **24h stability window** before `systemctl enable ids-unifi-collector.timer`
- Metrics: no crash loops, no duplicate explosion, no endpoint errors
- Optional: monitoring alert if `accepted == 0` for > 1h

## 9. Rollback Plan

| Step | Command |
|------|---------|
| Stop service | `sudo systemctl stop ids-unifi-collector.timer && sudo systemctl stop ids-unifi-collector.service` |
| Disable | `sudo systemctl disable ids-unifi-collector.timer` |
| Remove unit files | `sudo rm /etc/systemd/system/ids-unifi-collector.service /etc/systemd/system/ids-unifi-collector.timer` |
| Reload | `sudo systemctl daemon-reload` |
| Remove binary | `sudo rm /opt/ids-app/bin/unifi-parallel-collector` |
| Keep or remove state | **Keep** state.json (preserves offset for future reinstall) OR `sudo rm -rf /var/lib/ids-app/unifi-collector` |
| Remove env | `sudo rm /etc/ids-app/unifi-collector.env` |
| Remove user | `sudo userdel ids-unifi-collector` |
| Validate no process | `pgrep -f unifi-parallel-collector` → no output |
| Validate ids-core | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8088/healthz` → `200` |
| Validate rsyslog | `systemctl is-active rsyslog` → `active` |

### Rollback Verification Gates

- No `unifi-parallel-collector` processes running
- ids-core healthy
- rsyslog active
- traffic.log still growing
- No leftover env files with tokens
- Timer not scheduled

## 10. Enable on Boot Decision

### Recommendation: Start-only first, enable after 24h stability

**Install phase:**
- Start service + timer manually (`systemctl start`)
- Do NOT enable (`systemctl enable`)
- Monitor for 24h observation window

**After 24h stable:**
- Verify no crash loops, no duplicate issues, no endpoint errors
- Then: `sudo systemctl enable ids-unifi-collector.timer`
- This makes the timer persist across reboots

**Rationale:**
- If there's a bug (crash loop, duplicate storm, token issue), limiting to manual start avoids auto-start after reboot
- 24h gives enough data to verify stability
- Enable is a separate operation with its own verification

## 11. Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | **Token in env file exposed** | Unauthorized ingest access | `600` permissions, env file outside repo, rotation procedure documented |
| 2 | **State file deleted → replay** | Server-side duplicates within 5-min window | Server-side dedupe handles it; within 30s window, replay = few lines |
| 3 | **Use of `--start-position=end` on fresh state** | Lines between install and first run missed | Only first run; after that state file persists offset |
| 4 | **Log rotation (no logrotate configured for `/var/log/unifi/*.log`)** | traffic.log grows unbounded; if logrotate is later added, offset may reset | Recommended: add logrotate config before install phase |
| 5 | **traffic.log high growth rate** | ~130 MB/year — acceptable but should monitor | Low growth; alert if >10 MB/day |
| 6 | **Endpoint down / ids-core restart** | Failed sends accumulate in current batch; retry on next timer tick | `Restart=on-failure`, duplicates handled server-side |
| 7 | **ids-core in-memory dedupe (no persistent event store yet)** | Events visible in /events/recent but not persisted across restart | Acceptable for staging; plan event persistence separately |
| 8 | **UniFi operational noise** | Many DHCPv6 and DPI events that are not security threats | Expected; events are operational telemetry, not IDS alerts. Separate category, filterable in UI |
| 9 | **Parser accepts non-IDS events** | Event volume may be higher than expected | Acceptable; operational events have their own event types |
| 10 | **Systemd Timer + oneshot semantics** | If collector takes >30s (unlikely with --once), timer may overlap | `AccuracySec=1s` ensures precise scheduling; collector processes <1s |
| 11 | **No `ipcrm`/semaphore cleanup on crash** | None — the collector doesn't use IPC or shared memory | Not a risk for this binary |

## 12. Tests

```
?   	github.com/albertgracia/ids-app/services/ids-core/cmd/ids-core	[no test files]
ok  	github.com/albertgracia/ids-app/services/ids-core/cmd/unifi-cef-dryrun	(cached)
ok  	github.com/albertgracia/ids-app/services/ids-core/cmd/unifi-parallel-collector	(cached)
ok  	github.com/albertgracia/ids-app/services/ids-core/internal/api	(cached)
?   	github.com/albertgracia/ids-app/services/ids-core/internal/assets	[no test files]
?   	github.com/albertgracia/ids-app/services/ids-core/internal/config	[no test files]
ok  	github.com/albertgracia/ids-app/services/ids-core/internal/domain	(cached)
?   	github.com/albertgracia/ids-app/services/ids-core/internal/engine	[no test files]
?   	github.com/albertgracia/ids-app/services/ids-core/internal/eventstream	[no test files]
?   	github.com/albertgracia/ids-app/services/ids-core/internal/health	[no test files]
ok  	github.com/albertgracia/ids-app/services/ids-core/internal/ingest	(cached)
?   	github.com/albertgracia/ids-app/services/ids-core/internal/realtime	[no test files]
ok  	github.com/albertgracia/ids-app/services/ids-core/internal/storage	(cached)
ok  	github.com/albertgracia/ids-app/services/ids-core/internal/suricata	(cached)
ok  	github.com/albertgracia/ids-app/services/ids-core/internal/unifi	(cached)
```

All tests pass. No known issues.

**Known limitation:** Continuous tail mode (`--once` not required) is not yet implemented. This is intentional — the timer-based approach is simpler and avoids implementing continuous read-loop logic.

## 13. Key Decisions Summary

| Decision | Choice |
|----------|--------|
| Run mode | `--once` via systemd timer every 30s |
| Service type | `Type=oneshot` |
| Restart | `on-failure`, 10s delay |
| Timer | `OnCalendar=*:*:0/30`, `AccuracySec=1s` |
| Binary path | `/opt/ids-app/bin/unifi-parallel-collector` |
| State file | `/var/lib/ids-app/unifi-collector/state.json` |
| Env file | `/etc/ids-app/unifi-collector.env` (600, root:ids-unifi-collector) |
| Service user | `ids-unifi-collector` (system user, no login, in `adm` group) |
| Hardening | `NoNewPrivileges=true`, `ProtectSystem=strict`, `PrivateTmp=true`, explicit `ReadWritePaths`/`ReadOnlyPaths` |
| Logging | journald via `StandardOutput=journal` + `StandardError=journal` |
| Batch size | 25 (balance between latency and batching efficiency) |
| Endpoint | `http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi` |
| Enable on boot | **Start-only first**; enable after 24h stability observation |
| Log rotation | **Add logrotate config** for `/var/log/unifi/*.log` before install phase |
| Duplicates | Acceptable within 5-min window; server-side dedupe catches replays |
