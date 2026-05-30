"use client";

import { useEffect, useState, useCallback } from "react";
import type { AnalyticsStatus, CoreStatus, EventItem, ScoreResponse } from "@/lib/types";
import { getStatus, getRecentEvents } from "@/lib/ids-core";
import { getAnalyticsStatus, scoreEvent } from "@/lib/analytics-api";
import SocHeader from "@/components/soc/SocHeader";
import ExecutiveKpiStrip from "@/components/soc/ExecutiveKpiStrip";
import AttackWorldMap from "@/components/soc/AttackWorldMap";
import TopologyGraph from "@/components/soc/TopologyGraph";
import EventTimelinePanel from "@/components/soc/EventTimelinePanel";
import RecentEventsPanel from "@/components/soc/RecentEventsPanel";
import EventInspectorPanel from "@/components/soc/EventInspectorPanel";
import AssetIntelligencePanel from "@/components/soc/AssetIntelligencePanel";
import IocThreatPanel from "@/components/soc/IocThreatPanel";
import ThreatRadarGrid from "@/components/soc/ThreatRadarGrid";

const SEV_LABELS: Record<string, string> = {
  critical: "crítico",
  high: "alto",
  medium: "medio",
  low: "bajo",
  info: "info",
};
const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

const ZONE_EMOJI: Record<string, string> = {
  external: "\u{1F310} Externo",
  dmz: "\u{1F6E1} DMZ",
  it: "\u{1F4BB} IT",
  ot: "\u{2699} OT",
};

export default function Home() {
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
    try { const s = await getStatus(); setCoreStatus(s); setCoreError(null); }
    catch { setCoreStatus(null); setCoreError("no disponible"); }
    try { const s = await getAnalyticsStatus(); setAnalyticsStatus(s); setAnalyticsError(null); }
    catch { setAnalyticsStatus(null); setAnalyticsError("no disponible"); }
    try { const items = await getRecentEvents(50); setEvents(items); setEventsLoading(false); }
    catch { /* keep existing events */ }
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 15000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const handleScore = async () => {
    if (!selectedEvent) return;
    setScoring(true); setScoreError(""); setScore(null);
    try { const r = await scoreEvent(selectedEvent); setScore(r); }
    catch (e: unknown) { setScoreError(e instanceof Error ? e.message : "Error al analizar"); }
    finally { setScoring(false); }
  };

  const handleSelect = (evt: EventItem) => {
    if (selectedEvent?.id === evt.id) { setSelectedEvent(null); setScore(null); }
    else { setSelectedEvent(evt); setScore(null); }
  };

  return (
    <main className="soc-dashboard">
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
        <EventInspectorPanel
          event={selectedEvent}
          score={score}
          scoring={scoring}
          onScore={handleScore}
          scoreError={scoreError}
        />
        <div className="panel sev-overview-panel">
          <div className="panel-header">Distribución de severidad</div>
          {SEVERITIES.map((s) => {
            const count = events.filter((e) => e.severity === s).length;
            const counts = SEVERITIES.map((sv) => events.filter((e) => e.severity === sv).length);
            const maxCount = Math.max(1, ...counts);
            return (
              <div key={s} className="sev-bar-row">
                <span className={`sev-label sev-${s}`}>{SEV_LABELS[s]}</span>
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
            {Object.entries(ZONE_EMOJI).map(([zone, label]) => {
              const count = events.filter((e) => e.zone === zone).length;
              return <span key={zone}>{label}: {count}</span>;
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
