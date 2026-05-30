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

## Phase 2 — OBS-SERVER-IDS-READINESS-01 ⬜
- [ ] Prepare staging server (192.168.1.40)
- [ ] Install required tools
- [ ] Configure Docker on server
- [ ] Set up reverse proxy (if needed)
- [ ] Configure basic monitoring
- [ ] Test deployment pipeline

## Phase 3 — IDS-CORE-EVENT-MODEL-01 ⬜
- [ ] Define core event data model
- [ ] Define asset data model
- [ ] Define alert data model
- [ ] Implement event storage (PostgreSQL)
- [ ] Implement event API endpoints
- [ ] Add event validation with Pydantic/Go structs
- [ ] Add OpenAPI schema for events

## Phase 4 — IDS-CORE-ASSET-INVENTORY-01 ⬜
- [ ] Implement asset discovery logic
- [ ] Implement asset storage
- [ ] Implement asset API endpoints
- [ ] Add asset fingerprinting (OT protocols)
- [ ] Asset lifecycle management

## Phase 5 — IDS-SIMULATED-INGEST-01 ⬜
- [ ] Build event simulator service
- [ ] Generate realistic OT/IT traffic patterns
- [ ] Test ingestion pipeline end-to-end
- [ ] Validate event processing

## Phase 6 — IDS-CONSOLE-DASHBOARD-MVP-01 ⬜
- [ ] Design main dashboard layout
- [ ] Real-time event stream component
- [ ] Asset inventory view
- [ ] Network topology visualization
- [ ] Basic alert list
- [ ] Status indicators for all services

## Phase 7 — IDS-ANALYTICS-SCORING-01 ⬜
- [ ] Implement baseline learning
- [ ] Implement anomaly scoring
- [ ] Implement alert generation
- [ ] Add reporting endpoints
- [ ] Integrate with ids-core

## Phase 8 — IDS-MCP-READONLY-01 ⬜
- [ ] Expand MCP tools for events
- [ ] Expand MCP tools for assets
- [ ] Add explain_alert tool
- [ ] Add generate_report tool
- [ ] Test MCP integration with OpenCode

## Phase 9 — IDS-STAGING-DEPLOY-OBS-SERVER-01 ⬜
- [ ] Full deployment to 192.168.1.40
- [ ] End-to-end testing on staging
- [ ] Performance benchmarking
- [ ] Document deployment procedure

## Phase 10 — IDS-SENSOR-SURICATA-ZEEK-RESEARCH-01 ⬜
- [ ] Research Suricata/Zeek integration
- [ ] Design sensor architecture
- [ ] Prototype sensor pipeline
- [ ] Evaluate SPAN/mirror requirements
