# Roadmap

## Phase 1 — IDS-V2-DEV-ENV-SCAFFOLD-01 ✅
- [x] Monorepo structure
- [x] Next.js 16 scaffold
- [x] Go ids-core scaffold
- [x] Python analytics-api scaffold
- [x] Python MCP server scaffold (read-only)
- [x] Docker Compose (PostgreSQL + Redis)
- [x] Taskfile, .gitignore, .env.example
- [x] Initial documentation
- [x] Git repository initialization
- **Status:** PASS

## Phase 2 — OBS-SERVER-IDS-READINESS-01 ✅
- [x] Audit server 192.168.1.40
- [x] Identify ports, resources, risks
- [x] Confirm staging feasibility
- **Status:** PASS

## Phase 3 — IDS-CORE-EVENT-MODEL-01 ✅
- [x] Core event data model (Event, Endpoint, enums)
- [x] Validation and JSON serialization
- [x] Unit tests (13)
- **Status:** PASS

## Phase 4 — IDS-CORE-ASSET-INVENTORY-01 ✅
- [x] Asset data model (Asset, enums, helpers)
- [x] Validation and JSON serialization
- [x] Unit tests (21)
- **Status:** PASS

## Phase 5 — IDS-SIMULATED-INGEST-01 ✅
- [x] EventStore in memory (thread-safe, FIFO)
- [x] Simulator with 7 OT/IT scenarios
- [x] API endpoints (GET recent, POST simulate)
- [x] Unit tests (12)
- **Status:** PASS

## Phase 6 — IDS-CORE-PERSISTENCE-POSTGRES-01 ✅
- [x] EventRepository interface (memory + postgres)
- [x] PostgreSQL schema + indexes
- [x] pgx/v5 integration
- [x] Tests (8 storage)
- **Status:** PASS

## Phase 7 — IDS-CONSOLE-DASHBOARD-MVP-01 ✅
- [x] Dashboard with status, events, simulation
- [x] Components (CoreStatusCard, EventTable, etc.)
- [x] CORS middleware for dev
- **Status:** PASS

## Phase 8 — IDS-ANALYTICS-SCORING-01 ✅
- [x] Deterministic scoring engine (11 rules)
- [x] Score/event and score/events endpoints
- [x] Factors and recommendations
- [x] Tests (16 unit + API)
- **Status:** PASS

## Phase 9 — IDS-SENSOR-SURICATA-EVE-JSON-RESEARCH-01 ✅
- [x] Suricata integration research
- [x] EVE JSON mapping specification
- [x] Deployment options
- [x] Risk and security rules
- **Status:** PASS

## Phase 10 — IDS-MCP-READONLY-INTEGRATION-01 ⬜
- [ ] Expand MCP tools for events
- [ ] Expand MCP tools for assets
- [ ] Add explain_alert tool
- [ ] Add generate_report tool
- [ ] Test MCP integration with OpenCode

## Phase 11 — IDS-SENSOR-SURICATA-EVE-SAMPLE-CONTRACT-01 ✅
- [x] 9 synthetic EVE JSON samples (alert, flow, dns, http, tls, ssh, rdp, smb, modbus)
- [x] JSON schema for minimal contract
- [x] Python validation tests (no real data, all pass)
- [x] Taskfile integration
- **Status:** PASS

## Phase 12 — IDS-STAGING-DEPLOY-OBS-SERVER-01 ⬜
- [ ] Full deployment to 192.168.1.40
- [ ] End-to-end testing on staging
- [ ] Performance benchmarking
- [ ] Document deployment procedure

## Future Sensor Phases (Suricata)

| Phase | Description |
|-------|-------------|
| `IDS-SENSOR-SURICATA-EVE-SAMPLE-CONTRACT-01` | ✅ Complete |
| `IDS-SENSOR-SURICATA-EVE-PARSER-01` | Implement EVE JSON parser/normalizer |
| `IDS-SENSOR-SURICATA-EVE-INGEST-01` | Integrate parser with ids-core ingest pipeline |
| `IDS-SENSOR-SURICATA-LAB-DEPLOY-01` | Deploy Suricata in lab/VM for testing |
| `IDS-SENSOR-SURICATA-SPAN-MIRROR-PLAN-01` | Plan SPAN/mirror port deployment |
| `IDS-SENSOR-SURICATA-RULES-GOVERNANCE-01` | Rule management, updates, and tuning policy |
