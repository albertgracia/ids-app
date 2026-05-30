# Security Model

## Guiding Principles

1. **No real data in development.** All development occurs with simulated or anonymized data.
2. **No secrets in version control.** API keys, tokens, and credentials are never committed.
3. **Least privilege.** Each service has the minimum access required.
4. **Read-only by default.** The MCP server starts in read-only mode.
5. **Human approval for destructive actions.** No automated blocking, firewall changes, or data deletion without explicit human confirmation.

## Data Handling

| Data Type | Development | Staging | Production |
|-----------|------------|---------|------------|
| PCAPs | ❌ Never | ❌ Until approved | ✅ With controls |
| Network traffic | Simulated only | Anonymized | Actual (filtered) |
| IP addresses | RFC 1918 / fake | Anonymized | Real |
| Credentials | Dev-only in .env.example | Vault/env vars | Vault/env vars |
| API tokens | ❌ Hardcoded | Environment | Vault |

## Service Boundaries

```
Console (Next.js) ───► ids-core (Go)
                        │
                        ├──► PostgreSQL (events, assets)
                        ├──► Redis (cache, pub/sub)
                        │
                        ├──► analytics-api (scoring, read-only)
                        │
                        └──► mcp-server (read-only tools)
                              │
                              └──► AI Agents (read-only)
```

- **ids-core** is the only service that writes to PostgreSQL.
- **analytics-api** reads from ids-core API (future).
- **mcp-server** reads from ids-core API (future).
- **Console** reads from ids-core and analytics-api.

## MCP Restrictions

The MCP server is strictly read-only:
- No system command execution.
- No file modification.
- No data deletion.
- No IP blocking.
- No firewall changes.
- No detection rule changes.
- No connection to production servers.

## Future Security Considerations

- TLS for all inter-service communication.
- API keys for service-to-service auth.
- Session management for console users.
- Audit logging for all state changes.
- Rate limiting on public endpoints.
- CORS configuration for console.
- Separation between platform and sensor networks.
