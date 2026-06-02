"use client";

import { useEffect, useState, useCallback } from "react";
import type { AnalyticsStatus, CoreStatus, EventItem, ScoreResponse } from "@/lib/types";
import { getStatus, getRecentEvents } from "@/lib/ids-core";
import { getAnalyticsStatus, scoreEvent } from "@/lib/analytics-api";
import SocHeader from "@/components/soc/SocHeader";
import ExecutiveKpiStrip from "@/components/soc/ExecutiveKpiStrip";
import AttackWorldMap from "@/components/soc/AttackWorldMap";
import TopologyGraph from "@/components/soc/SafeTopologyPanel";
import EventTimelinePanel from "@/components/soc/SafeTimelinePanel";
import RecentEventsPanel from "@/components/soc/RecentEventsPanel";
import EventInspectorPanel from "@/components/soc/EventInspectorPanel";
import AssetIntelligencePanel from "@/components/soc/AssetIntelligencePanel";
import IocThreatPanel from "@/components/soc/IocThreatPanel";
import ThreatRadarGrid from "@/components/soc/ThreatRadarGrid";

export default function LegacyDashboard() {
  const [coreStatus, setCoreStatus] = useState<CoreStatus | null>(null);
  const [coreError, setCoreError] = useState<string | null>(null);
  const [analyticsStatus, setAnalyticsStatus] = useState<AnalyticsStatus | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAll = useCallback(async () => {
    try { const s = await getStatus(); setCoreStatus(s); setCoreError(null); } catch { setCoreStatus(null); setCoreError("unavailable"); }
    try { const s = await getAnalyticsStatus(); setAnalyticsStatus(s); setAnalyticsError(null); } catch { setAnalyticsStatus(null); setAnalyticsError("unavailable"); }
    try { const items = await getRecentEvents(50); setEvents(items); setEventsLoading(false); } catch {}
    setLastUpdated(new Date());
  }, []);

  useEffect(() => { fetchAll(); const id = setInterval(fetchAll, 15000); return () => clearInterval(id); }, [fetchAll]);

  const handleScore = async () => {
    if (!selectedEvent) return;
    setScoring(true); setScoreError(""); setScore(null);
    try { const r = await scoreEvent(selectedEvent); setScore(r); } catch (e: unknown) { setScoreError(e instanceof Error ? e.message : "Score failed"); }
    finally { setScoring(false); }
  };

  const handleSelect = (evt: EventItem) => {
    if (selectedEvent?.id === evt.id) { setSelectedEvent(null); setScore(null); }
    else { setSelectedEvent(evt); setScore(null); }
  };

  return (
    <main className="soc-dashboard">
      <div style={{ textAlign: "center", padding: "0.5rem", background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "4px", marginBottom: "0.75rem", fontSize: "0.75rem", color: "#f85149" }}>
        Dashboard legacy — reemplazado por el nuevo Analizador de Tráfico de Red en /
      </div>

      <SocHeader
        coreStatus={coreStatus}
        coreError={coreError}
        analyticsStatus={analyticsStatus}
        analyticsError={analyticsError}
        lastUpdated={lastUpdated}
      />

      <ExecutiveKpiStrip events={events} coreStatus={coreStatus} />

      <div className="soc-row">
        <AttackWorldMap events={events} />
        <TopologyGraph events={events} />
      </div>

      <div className="soc-row">
        <EventTimelinePanel events={events} />
        <ThreatRadarGrid events={events} />
      </div>

      <div className="soc-row">
        <AssetIntelligencePanel events={events} />
        <IocThreatPanel events={events} />
      </div>

      <div className="soc-row-full">
        <RecentEventsPanel events={events} selectedId={selectedEvent?.id ?? null} onSelect={handleSelect} />
      </div>

      <div className="soc-row">
        <EventInspectorPanel event={selectedEvent} score={score} scoring={scoring} onScore={handleScore} scoreError={scoreError} />
        <div className="panel sev-overview-panel">
          <div className="panel-header">Severity Distribution</div>
          {["critical", "high", "medium", "low", "info"].map((s) => {
            const count = events.filter((e) => e.severity === s).length;
            const maxCount = Math.max(1, ...[...new Set(events.map((e) => e.severity))].map((sv) => events.filter((e) => e.severity === sv).length));
            return (
              <div key={s} className="sev-bar-row">
                <span className={`sev-label sev-${s}`}>{s}</span>
                <div className="sev-bar-track">
                  <div
                    className={`sev-bar-fill sev-${s}`}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="sev-count">{count}</span>
              </div>
            );
          })}
          <div className="sev-ot-it" style={{ marginTop: "0.75rem" }}>
            <span>OT: {events.filter((e) => e.zone === "ot").length}</span>
            <span>IT: {events.filter((e) => e.zone === "it").length}</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --bg: #0a0e14; --bg-card: #111820; --border: #1e2a3a; --text: #c9d1d9; --text-dim: #6e7b8c;
          --accent: #58a6ff; --critical: #f85149; --high: #d29922; --medium: #db6d28; --low: #58a6ff; --info: #6e7b8c;
        }
        body { background: var(--bg); color: var(--text); font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif; margin: 0; }
        .soc-dashboard { max-width: 1440px; margin: 0 auto; padding: 1rem; }
        .soc-header { display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1rem; background:var(--bg-card); border:1px solid var(--border); border-radius:4px; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem; }
        .soc-header-left { display:flex; align-items:center; gap:1rem; }
        .soc-logo { display:flex; align-items:center; gap:0.6rem; }
        .soc-logo-icon { font-size:1.8rem; color:var(--accent); }
        .soc-title { font-size:1.1rem; font-weight:700; margin:0; }
        .soc-env { font-size:0.65rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.1em; }
        .soc-header-center { display:flex; gap:0.5rem; flex-wrap:wrap; }
        .soc-svc-badge { display:flex; align-items:center; gap:0.25rem; font-size:0.7rem; padding:0.15rem 0.5rem; border-radius:3px; background:var(--bg); }
        .svc-dot { width:5px; height:5px; border-radius:50%; display:inline-block; }
        .svc-ok .svc-dot { background:#3fb950; }
        .svc-down .svc-dot { background:var(--critical); }
        .soc-header-right { display:flex; align-items:center; gap:0.75rem; font-size:0.7rem; }
        .soc-label { color:var(--text-dim); text-transform:uppercase; letter-spacing:0.05em; font-size:0.6rem; }
        .soc-value { font-family:monospace; font-size:0.7rem; }
        .kpi-strip { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:0.5rem; margin-bottom:0.75rem; }
        .kpi-card { background:var(--bg-card); border:1px solid var(--border); border-radius:4px; padding:0.5rem; text-align:center; }
        .kpi-value-row { display:flex; align-items:baseline; justify-content:center; gap:0.25rem; }
        .kpi-value { font-size:1.3rem; font-weight:700; font-variant-numeric:tabular-nums; }
        .kpi-value small { font-size:0.55rem; font-weight:400; color:var(--text-dim); }
        .kpi-trend { font-size:0.65rem; }
        .kpi-trend-up { color:var(--critical); }
        .kpi-trend-down { color:#3fb950; }
        .kpi-label { font-size:0.6rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.05em; margin-top:0.1rem; }
        .soc-row { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem; }
        .soc-row-full { margin-bottom:0.75rem; }
        .panel { background:var(--bg-card); border:1px solid var(--border); border-radius:4px; padding:0.75rem; }
        .panel-header { font-size:0.8rem; font-weight:600; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center; }
        .panel-sub { font-size:0.6rem; font-weight:400; text-transform:none; color:var(--text-dim); }
        .awm-panel .awm-svg { width:100%; height:auto; }
        .topo-panel .topo-svg { width:100%; height:auto; }
        .topo-stats { font-size:0.6rem; font-weight:400; text-transform:none; }
        .timeline-panel .timeline-svg { width:100%; height:auto; }
        .timeline-panel .timeline-legend { display:flex; gap:0.75rem; margin-top:0.4rem; font-size:0.65rem; }
        .tl-legend-item { display:flex; align-items:center; gap:0.2rem; color:var(--text-dim); }
        .tl-legend-dot { width:8px; height:8px; border-radius:1px; display:inline-block; }
        .radar-panel .radar-svg { width:100%; height:auto; }
        .asset-panel .asset-table-wrap { overflow-x:auto; max-height:280px; overflow-y:auto; }
        .asset-table { width:100%; border-collapse:collapse; font-size:0.7rem; }
        .asset-table th { text-align:left; padding:0.3rem 0.4rem; border-bottom:1px solid var(--border); color:var(--text-dim); font-weight:600; white-space:nowrap; font-size:0.65rem; position:sticky; top:0; background:var(--bg-card); }
        .asset-table td { padding:0.25rem 0.4rem; border-bottom:1px solid var(--border); }
        .zone-tag { padding:0.05rem 0.3rem; border-radius:2px; font-size:0.6rem; font-weight:600; text-transform:uppercase; }
        .zone-external { background:rgba(248,81,73,0.15); color:var(--critical); }
        .zone-dmz { background:rgba(210,153,34,0.15); color:var(--high); }
        .zone-it { background:rgba(88,166,255,0.15); color:var(--low); }
        .zone-ot { background:rgba(219,109,40,0.15); color:var(--medium); }
        .zone-unknown { background:rgba(110,123,140,0.15); color:var(--info); }
        .cell-protos { max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ioc-panel .ioc-table-wrap { overflow-x:auto; max-height:280px; overflow-y:auto; }
        .ioc-table { width:100%; border-collapse:collapse; font-size:0.7rem; }
        .ioc-table th { text-align:left; padding:0.3rem 0.4rem; border-bottom:1px solid var(--border); color:var(--text-dim); font-weight:600; white-space:nowrap; font-size:0.65rem; position:sticky; top:0; background:var(--bg-card); }
        .ioc-table td { padding:0.25rem 0.4rem; border-bottom:1px solid var(--border); }
        .ioc-type-tag { font-size:0.65rem; color:var(--accent); }
        .sev-overview-panel .sev-bar-row { display:flex; align-items:center; gap:0.5rem; margin:0.2rem 0; font-size:0.7rem; }
        .sev-overview-panel .sev-bar-track { flex:1; height:8px; background:var(--bg); border-radius:2px; overflow:hidden; }
        .sev-overview-panel .sev-bar-fill { height:100%; border-radius:2px; transition:width 0.3s; }
        .sev-overview-panel .sev-bar-fill.sev-critical { background:var(--critical); }
        .sev-overview-panel .sev-bar-fill.sev-high { background:var(--high); }
        .sev-overview-panel .sev-bar-fill.sev-medium { background:var(--medium); }
        .sev-overview-panel .sev-bar-fill.sev-low { background:var(--low); }
        .sev-overview-panel .sev-bar-fill.sev-info { background:var(--info); }
        .sev-overview-panel .sev-count { min-width:18px; text-align:right; font-weight:600; font-variant-numeric:tabular-nums; }
        .sev-critical { color:var(--critical); } .sev-high { color:var(--high); } .sev-medium { color:var(--medium); } .sev-low { color:var(--low); } .sev-info { color:var(--info); }
        .sev-badge { padding:0.08rem 0.3rem; border-radius:2px; font-size:0.65rem; font-weight:700; }
        .sev-badge.sev-critical { background:rgba(248,81,73,0.2); color:var(--critical); }
        .sev-badge.sev-high { background:rgba(210,153,34,0.2); color:var(--high); }
        .sev-badge.sev-medium { background:rgba(219,109,40,0.2); color:var(--medium); }
        .sev-badge.sev-low { background:rgba(88,166,255,0.2); color:var(--low); }
        .sev-badge.sev-info { background:rgba(110,123,140,0.2); color:var(--info); }
        .sev-ot-it { display:flex; gap:1rem; font-size:0.7rem; justify-content:center; }
        .sev-label { min-width:48px; font-weight:600; font-size:0.7rem; }
        .recent-table-wrap { overflow-x:auto; }
        .recent-table { width:100%; border-collapse:collapse; font-size:0.7rem; }
        .recent-table th { text-align:left; padding:0.3rem 0.4rem; border-bottom:1px solid var(--border); color:var(--text-dim); font-weight:600; white-space:nowrap; }
        .recent-table td { padding:0.3rem 0.4rem; border-bottom:1px solid var(--border); }
        .recent-row { cursor:pointer; }
        .recent-row:hover { background:var(--bg); }
        .recent-row.selected { background:rgba(88,166,255,0.08); }
        .cell-mono { font-family:monospace; font-size:0.65rem; }
        .cell-title { max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .inspector-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:0.5rem; font-size:0.75rem; }
        .ilabel { font-size:0.6rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:0.1rem; }
        .inspector-title { grid-column:1/-1; }
        .inspector-tags { display:flex; gap:0.3rem; flex-wrap:wrap; margin-top:0.5rem; }
        .tag { padding:0.1rem 0.4rem; background:var(--bg); border-radius:3px; font-size:0.65rem; color:var(--accent); }
        .btn-score { background:var(--accent); color:#fff; border:none; border-radius:3px; padding:0.25rem 0.6rem; font-size:0.7rem; cursor:pointer; }
        .btn-score:disabled { opacity:0.5; }
        .score-section { margin-top:0.75rem; border-top:1px solid var(--border); padding-top:0.75rem; }
        .score-header { display:flex; align-items:baseline; gap:0.75rem; margin-bottom:0.5rem; }
        .score-num { font-size:1.8rem; font-weight:700; }
        .risk-level { font-size:0.9rem; font-weight:600; text-transform:uppercase; }
        .factor-row { display:flex; gap:0.4rem; font-size:0.7rem; padding:0.1rem 0; }
        .factor-row code { min-width:110px; }
        .factor-impact { color:var(--high); font-weight:600; min-width:25px; }
        .score-recs ul { margin:0.25rem 0; padding-left:1.2rem; font-size:0.7rem; }
        .score-recs li { margin:0.15rem 0; }
        .msg-error { color:var(--critical); font-size:0.7rem; margin:0.5rem 0; }
        .empty-state { color:var(--text-dim); font-style:italic; font-size:0.8rem; padding:1rem; text-align:center; }
      `}</style>
    </main>
  );
}
