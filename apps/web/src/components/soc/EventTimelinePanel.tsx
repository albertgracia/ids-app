"use client";

import { useMemo } from "react";
import type { EventItem } from "@/lib/types";
import { L } from "@/lib/soc-labels";

interface Props {
  events: EventItem[];
}

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
const SEV_COLORS: Record<string, string> = {
  critical: "#f85149",
  high: "#eab308",
  medium: "#d97706",
  low: "#58a6ff",
  info: "#3a4455",
};

interface Bucket {
  ts: Date;
  label: string;
  counts: Record<string, number>;
  total: number;
}

export default function EventTimelinePanel({ events }: Props) {
  const buckets = useMemo(() => {
    if (events.length === 0) return [] as Bucket[];

    const sorted = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const first = new Date(sorted[0].timestamp);
    const last = new Date(sorted[sorted.length - 1].timestamp);
    const bucketMs = 60_000;
    const firstBucket = new Date(Math.floor(first.getTime() / bucketMs) * bucketMs);
    const numBuckets = Math.min(60, Math.ceil((last.getTime() - firstBucket.getTime()) / bucketMs) + 1);

    const bucketArr: Bucket[] = [];
    for (let i = 0; i < numBuckets; i++) {
      const ts = new Date(firstBucket.getTime() + i * bucketMs);
      bucketArr.push({
        ts,
        label: ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        total: 0,
      });
    }

    for (const e of sorted) {
      const t = new Date(e.timestamp).getTime();
      const idx = Math.floor((t - firstBucket.getTime()) / bucketMs);
      if (idx >= 0 && idx < bucketArr.length) {
        bucketArr[idx].counts[e.severity] = (bucketArr[idx].counts[e.severity] || 0) + 1;
        bucketArr[idx].total++;
      }
    }

    return bucketArr;
  }, [events]);

  const maxY = Math.max(1, ...buckets.map((b) => b.total));

  const BAR_W = 10;
  const BAR_GAP = 2;
  const PAD_LEFT = 35;
  const PAD_RIGHT = 10;
  const PAD_BOTTOM = 28;
  const PAD_TOP = 10;
  const CHART_H = 140;
  const totalBarW = BAR_W + BAR_GAP;
  const svgW = PAD_LEFT + buckets.length * totalBarW + PAD_RIGHT;
  const svgH = PAD_TOP + CHART_H + PAD_BOTTOM;

  const tickCount = 5;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxY / tickCount) * i));

  const lastBucketIdx = buckets.length - 1;

  return (
    <div className="panel timeline-panel">
      <div className="panel-header">
        {L.panels.timeline}
        <span className="panel-sub">
          {buckets.length} {L.timeline.buckets} \u00b7 {L.timeline.perMin}
        </span>
      </div>
      {buckets.length === 0 ? (
        <div className="empty-state">{L.events.noEvents}</div>
      ) : (
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="timeline-svg"
          role="img"
          aria-label="L\u00EDnea temporal de eventos con barras apiladas por severidad"
          style={{ overflow: "hidden" }}
        >
          {/* Grid lines */}
          {yTicks.map((val) => {
            const y = PAD_TOP + CHART_H - (val / maxY) * CHART_H;
            return (
              <g key={`tick-${val}`}>
                <line x1={PAD_LEFT} y1={y} x2={svgW - PAD_RIGHT} y2={y} stroke="#1e2a3a" strokeWidth={0.5} strokeDasharray="2,4" />
                <text x={PAD_LEFT - 5} y={y + 3} textAnchor="end" fill="#6e7b8c" fontSize={8} fontFamily="JetBrains Mono, Cascadia Code, Fira Code, Consolas, monospace">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {buckets.map((b, bi) => {
            if (b.total === 0) return null;
            let yOffset = PAD_TOP + CHART_H;
            const els: React.ReactNode[] = [];
            for (const sev of SEVERITIES) {
              const count = b.counts[sev];
              if (count === 0) continue;
              const h = Math.max(1, (count / maxY) * CHART_H);
              yOffset -= h;
              const x = PAD_LEFT + bi * totalBarW;
              els.push(
                <rect
                  key={`${bi}-${sev}`}
                  x={x}
                  y={yOffset}
                  width={BAR_W}
                  height={h}
                  fill={SEV_COLORS[sev]}
                  rx={1}
                  className={bi >= lastBucketIdx - 2 ? "timeline-bar-new" : ""}
                >
                  <title>
                    {b.label}: {L.severity[sev]} \u00D7 {count}
                  </title>
                </rect>
              );
            }
            return <g key={`bar-${bi}`}>{els}</g>;
          })}

          {/* Horizontal labels (no rotation) */}
          {buckets
            .filter((_, i) => i % Math.max(1, Math.floor(buckets.length / 8)) === 0)
            .map((b) => {
              const bi = buckets.indexOf(b);
              if (bi < 0) return null;
              const x = PAD_LEFT + bi * totalBarW + BAR_W / 2;
              return (
                <text
                  key={`label-${bi}`}
                  x={x}
                  y={svgH - 8}
                  textAnchor="middle"
                  fill="#6e7b8c"
                  fontSize={7}
                  fontFamily="JetBrains Mono, Cascadia Code, Fira Code, Consolas, monospace"
                >
                  {b.label}
                </text>
              );
            })}

          {/* Live "now" marker on last bucket */}
          {buckets.length > 0 && (
            <line
              x1={PAD_LEFT + lastBucketIdx * totalBarW + BAR_W / 2}
              y1={PAD_TOP}
              x2={PAD_LEFT + lastBucketIdx * totalBarW + BAR_W / 2}
              y2={PAD_TOP + CHART_H}
              stroke="var(--accent)"
              strokeWidth={1.5}
              strokeDasharray="3,2"
              className="timeline-now-marker"
            />
          )}

          {buckets.length > 0 && (
            <text
              x={PAD_LEFT + lastBucketIdx * totalBarW + BAR_W / 2}
              y={PAD_TOP - 2}
              textAnchor="middle"
              fill="var(--accent)"
              fontSize={7}
              fontWeight={700}
            >
              ahora
            </text>
          )}
        </svg>
      )}

      <div className="timeline-legend">
        {SEVERITIES.map((sev) => (
          <span key={sev} className="tl-legend-item">
            <span className="tl-legend-dot" style={{ background: SEV_COLORS[sev] }} />
            {L.severity[sev]}
          </span>
        ))}
      </div>
    </div>
  );
}
