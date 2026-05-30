export default function Home() {
  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>IDS OT/IT Platform</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>Development Scaffold — Phase 1</p>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Services</h2>
        <ul>
          <li><strong>ids-core</strong> — Go IDS engine (port 8088)</li>
          <li><strong>analytics-api</strong> — Python/FastAPI analytics (port 8090)</li>
          <li><strong>mcp-server</strong> — MCP read-only agent (port 8091)</li>
          <li><strong>PostgreSQL</strong> — Event and asset storage (port 5433)</li>
          <li><strong>Redis</strong> — Cache and lightweight events (port 6380)</li>
        </ul>
      </section>

      <section>
        <h2>Status</h2>
        <p>All services are in development scaffold mode. No production data is being processed.</p>
      </section>
    </main>
  );
}
