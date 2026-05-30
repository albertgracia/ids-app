"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { AnalyticsStatus, CoreStatus, EventItem, ScoreResponse } from "@/lib/types";
import { getStatus, getRecentEvents } from "@/lib/ids-core";
import { getAnalyticsStatus, scoreEvent } from "@/lib/analytics-api";
import { L } from "@/lib/soc-labels";
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

const SEV_KEYS = ["critical", "high", "medium", "low", "info"] as const;

export default function Home() {
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

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
    if (!mountedRef.current) return;

    // Abort any previous polling cycle's pending resolutions
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    const guard = <T,>(fn: () => Promise<T>): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
        const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
        signal.addEventListener("abort", onAbort);
        fn().then(
          (v) => { signal.removeEventListener("abort", onAbort); resolve(v); },
          (e) => { signal.removeEventListener("abort", onAbort); reject(e); }
        );
      });

    try {
      const s = await guard(() => getStatus());
      if (!mountedRef.current || signal.aborted) return;
      setCoreStatus(s);
      setCoreError(null);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!mountedRef.current) return;
      setCoreStatus(null);
      setCoreError("unavailable");
    }

    try {
      const s = await guard(() => getAnalyticsStatus());
      if (!mountedRef.current || signal.aborted) return;
      setAnalyticsStatus(s);
      setAnalyticsError(null);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!mountedRef.current) return;
      setAnalyticsStatus(null);
      setAnalyticsError("unavailable");
    }

    try {
      const items = await guard(() => getRecentEvents(50));
      if (!mountedRef.current || signal.aborted) return;
      setEvents(items);
      setEventsLoading(false);
    } catch (_) {
      /* stale abort — ignore */
    }

    if (mountedRef.current && !signal.aborted) {
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    const id = setInterval(fetchAll, 10_000);
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      clearInterval(id);
    };
  }, [fetchAll]);

  const handleScore = async () => {
    if (!selectedEvent) return;
    setScoring(true);
    setScoreError("");
    setScore(null);
    try {
      const r = await scoreEvent(selectedEvent);
      if (mountedRef.current) setScore(r);
    } catch (e: unknown) {
      if (mountedRef.current) setScoreError(e instanceof Error ? e.message : "Score failed");
    } finally {
      if (mountedRef.current) setScoring(false);
    }
  };

  const handleSelect = (evt: EventItem) => {
    if (selectedEvent?.id === evt.id) {
      setSelectedEvent(null);
      setScore(null);
    } else {
      setSelectedEvent(evt);
      setScore(null);
    }
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
          <div className="panel-header">{L.panels.severityDistribution}</div>
          {SEV_KEYS.map((s) => {
            const count = events.filter((e) => e.severity === s).length;
            const maxCount = Math.max(
              1,
              ...[...new Set(events.map((e) => e.severity))].map(
                (sv) => events.filter((e) => e.severity === sv).length
              )
            );
            return (
              <div key={s} className="sev-bar-row">
                <span className={`sev-label sev-${s}`}>
                  {L.severity[s as keyof typeof L.severity]}
                </span>
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
            <span>{L.kpi.otEvents}: {events.filter((e) => e.zone === "ot").length}</span>
            <span>{L.kpi.itEvents}: {events.filter((e) => e.zone === "it").length}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
