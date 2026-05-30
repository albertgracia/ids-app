"use client";

import { useEffect, useState, useCallback } from "react";
import type { CoreStatus, EventItem } from "@/lib/types";
import { getStatus, getRecentEvents } from "@/lib/ids-core";
import CoreStatusCard from "@/components/CoreStatusCard";
import SeveritySummary from "@/components/SeveritySummary";
import SimulationPanel from "@/components/SimulationPanel";
import EventTable from "@/components/EventTable";

const CORE_URL = process.env.NEXT_PUBLIC_IDS_CORE_URL || "http://127.0.0.1:8088";

export default function Home() {
  const [status, setStatus] = useState<CoreStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const s = await getStatus();
      setStatus(s);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setStatusError(msg);
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const items = await getRecentEvents(50);
      setEvents(items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setEventsError(msg);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchEvents();
  }, [fetchStatus, fetchEvents]);

  return (
    <main className="dashboard">
      <header className="header">
        <div>
          <h1>IDS OT/IT Console</h1>
          <p className="subtitle">Development MVP</p>
        </div>
        <div className="core-url">
          <span className="label">Core:</span>
          <code>{CORE_URL}</code>
        </div>
      </header>

      <CoreStatusCard status={status} error={statusError} loading={statusLoading} />

      <h2 className="section-title">Event Summary</h2>
      <SeveritySummary events={events} />

      <h2 className="section-title">Simulation</h2>
      <SimulationPanel onEventsGenerated={(items) => setEvents((prev) => [...items, ...prev])} />

      <div className="section-title-row">
        <h2 className="section-title">Recent Events</h2>
        <button className="refresh-btn" onClick={fetchEvents} disabled={eventsLoading}>
          {eventsLoading ? "Loading..." : "Refresh events"}
        </button>
      </div>

      {eventsError && <p className="error-msg">{eventsError}</p>}
      <EventTable events={events} loading={eventsLoading} />

      <footer className="footer">
        <p>Next: asset inventory, analytics scoring, Suricata EVE JSON ingest.</p>
      </footer>

      <style jsx global>{`
        :root {
          --bg: #0d1117;
          --bg-card: #161b22;
          --border: #30363d;
          --text: #c9d1d9;
          --text-dim: #8b949e;
          --accent: #58a6ff;
          --critical: #f85149;
          --high: #d29922;
          --medium: #db6d28;
          --low: #58a6ff;
          --info: #8b949e;
        }
        body {
          background: var(--bg);
          color: var(--text);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          margin: 0;
        }
        .dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.5rem;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .header h1 {
          font-size: 1.5rem;
          margin: 0;
        }
        .subtitle {
          color: var(--text-dim);
          margin: 0.25rem 0 0;
          font-size: 0.875rem;
        }
        .core-url {
          font-size: 0.8rem;
          color: var(--text-dim);
        }
        .core-url code {
          background: var(--bg-card);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .label {
          color: var(--text-dim);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .section {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .section-title {
          font-size: 1rem;
          margin: 1.5rem 0 0.75rem;
          color: var(--text);
        }
        .section-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .status-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .status-error {
          border-color: var(--critical);
        }
        .status-error h3 {
          color: var(--critical);
          margin: 0 0 0.5rem;
        }
        .status-error p {
          margin: 0.25rem 0;
          color: var(--text-dim);
        }
        .hint {
          font-size: 0.8rem;
          color: var(--text-dim);
        }
        .status-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
        }
        .status-grid > div {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .badge {
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-block;
          width: fit-content;
        }
        .badge-ok { background: #1a7f37; color: #fff; }
        .capabilities {
          margin-top: 1rem;
        }
        .cap-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.4rem;
        }
        .cap-badge {
          background: #1f2937;
          color: var(--accent);
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-family: monospace;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.75rem;
        }
        .summary-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.75rem;
          background: var(--bg);
          border-radius: 6px;
        }
        .summary-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .summary-label {
          font-size: 0.7rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.25rem;
        }
        .sev-critical { color: var(--critical); }
        .sev-high { color: var(--high); }
        .sev-medium { color: var(--medium); }
        .sev-low { color: var(--low); }
        .sev-info { color: var(--info); }
        .simulation-panel {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .sim-row {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .sim-row label {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.8rem;
          color: var(--text-dim);
        }
        .sim-row select, .sim-row input {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 4px;
          color: var(--text);
          padding: 0.4rem 0.6rem;
          font-size: 0.875rem;
        }
        .sim-row button {
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          cursor: pointer;
          white-space: nowrap;
        }
        .sim-row button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .sim-message {
          margin: 0.5rem 0 0;
          font-size: 0.85rem;
        }
        .msg-ok { color: #3fb950; }
        .msg-error { color: var(--critical); }
        .table-container {
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
        }
        th {
          text-align: left;
          padding: 0.5rem;
          border-bottom: 1px solid var(--border);
          color: var(--text-dim);
          font-weight: 600;
          white-space: nowrap;
        }
        td {
          padding: 0.5rem;
          border-bottom: 1px solid var(--border);
        }
        .cell-mono {
          font-family: monospace;
          font-size: 0.75rem;
        }
        .sev-badge {
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .sev-badge.sev-critical { background: rgba(248,81,73,0.15); color: var(--critical); }
        .sev-badge.sev-high { background: rgba(210,153,34,0.15); color: var(--high); }
        .sev-badge.sev-medium { background: rgba(219,109,40,0.15); color: var(--medium); }
        .sev-badge.sev-low { background: rgba(88,166,255,0.15); color: var(--low); }
        .sev-badge.sev-info { background: rgba(139,148,158,0.15); color: var(--info); }
        .refresh-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-msg {
          color: var(--critical);
          font-size: 0.85rem;
        }
        .empty {
          color: var(--text-dim);
          font-style: italic;
        }
        .footer {
          margin-top: 2rem;
          padding: 1rem 0;
          border-top: 1px solid var(--border);
          color: var(--text-dim);
          font-size: 0.8rem;
          text-align: center;
        }
      `}</style>
    </main>
  );
}
