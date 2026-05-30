"use client";

import type { EventItem } from "@/lib/types";
import { ZONES, SEV_COLORS, classifyEventZone, type Zone, ZONE_LABELS } from "@/lib/soc-utils";
import { L } from "@/lib/soc-labels";

interface Props {
  events: EventItem[];
}

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

function zoneLabel(zone: string): string {
  return ZONE_LABELS[zone] ?? zone;
}

export default function AttackWorldMap({ events }: Props) {
  const zoneSevCounts: Record<string, Record<string, number>> = {};
  for (const z of ZONES) {
    zoneSevCounts[z] = {};
    for (const s of SEVERITIES) zoneSevCounts[z][s] = 0;
  }
  for (const e of events) {
    const z = classifyEventZone(e);
    zoneSevCounts[z][e.severity] = (zoneSevCounts[z][e.severity] || 0) + 1;
  }

  let globalMax = 0;
  for (const z of ZONES) {
    for (const s of SEVERITIES) {
      globalMax = Math.max(globalMax, zoneSevCounts[z][s]);
    }
  }

  const edgePairs: { from: Zone; to: Zone; count: number; sev: string }[] = [];
  for (let i = 0; i < ZONES.length - 1; i++) {
    const from = ZONES[i];
    const to = ZONES[i + 1];
    let count = 0;
    const sevCounts: Record<string, number> = {};
    for (const e of events) {
      const z = classifyEventZone(e);
      if (z === from || z === to) {
        if (e.direction === "lateral" || e.direction === "inbound" || (i > 0 && z === from)) {
          count++;
          sevCounts[e.severity] = (sevCounts[e.severity] || 0) + 1;
        }
      }
    }
    const topSev = Object.entries(sevCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "info";
    edgePairs.push({ from, to, count, sev: topSev });
  }

  const CELL_W = 72;
  const CELL_H = 26;
  const GAP = 3;
  const PAD_LEFT = 80;
  const PAD_TOP = 30;
  const COL_GAP = 24;
  const svgH = PAD_TOP + SEVERITIES.length * (CELL_H + GAP) + 70;

  return (
    <div className="panel awm-panel">
      <div className="panel-header">
        {L.panels.attackMap}
        <span className="map-legend">GeoIP sint\u00E9tico \u2014 staging</span>
      </div>
      <svg
        viewBox={`0 0 ${PAD_LEFT + ZONES.length * CELL_W + (ZONES.length - 1) * COL_GAP + 20} ${svgH}`}
        className="awm-svg"
        role="img"
        aria-label="Mapa t\u00E1ctico de ataques: heatmap de amenazas por zona y severidad"
        style={{ overflow: "hidden" }}
      >
        {SEVERITIES.map((sev, si) => (
          <text
            key={sev}
            x={PAD_LEFT - 6}
            y={PAD_TOP + si * (CELL_H + GAP) + CELL_H / 2 + 3}
            textAnchor="end"
            fill={SEV_COLORS[sev]}
            fontSize={8}
            fontWeight={600}
          >
            {L.severity[sev]}
          </text>
        ))}

        {ZONES.map((zone, zi) => {
          const colX = PAD_LEFT + zi * (CELL_W + COL_GAP);
          return (
            <g key={zone}>
              <text
                x={colX + CELL_W / 2}
                y={PAD_TOP - 10}
                textAnchor="middle"
                fill="#c9d1d9"
                fontSize={10}
                fontWeight={700}
              >
                {zoneLabel(zone)}
              </text>
              {SEVERITIES.map((sev, si) => {
                const count = zoneSevCounts[zone][sev];
                const opacity = globalMax > 0 ? 0.1 + (count / globalMax) * 0.85 : 0.1;
                const y = PAD_TOP + si * (CELL_H + GAP);
                return (
                  <g key={`${zone}-${sev}`}>
                    <rect
                      x={colX}
                      y={y}
                      width={CELL_W}
                      height={CELL_H}
                      rx={2}
                      fill={SEV_COLORS[sev]}
                      opacity={opacity}
                      stroke={count > 0 ? SEV_COLORS[sev] : "#1e2a3a"}
                      strokeWidth={count > 0 ? 1 : 0.5}
                    />
                    <text
                      x={colX + CELL_W / 2}
                      y={y + CELL_H / 2 + 3}
                      textAnchor="middle"
                      fill={opacity > 0.5 ? "#0a0e14" : "#c9d1d9"}
                      fontSize={10}
                      fontWeight={700}
                      fontFamily="monospace"
                    >
                      {count}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Connected arrows between zones */}
        {edgePairs.map((ep, ei) => {
          const fromIdx = ZONES.indexOf(ep.from);
          const toIdx = ZONES.indexOf(ep.to);
          const fromX = PAD_LEFT + fromIdx * (CELL_W + COL_GAP) + CELL_W;
          const toX = PAD_LEFT + toIdx * (CELL_W + COL_GAP);
          const arrowY = PAD_TOP + SEVERITIES.length * (CELL_H + GAP) + 12 + ei * 20;
          const midX = (fromX + toX) / 2;
          const color = SEV_COLORS[ep.sev] || "#6e7b8c";
          const sw = Math.max(1.2, Math.min(5, Math.log2(ep.count + 1) * 1.3));
          return (
            <g key={`edge-${ep.from}-${ep.to}`}>
              <line
                x1={fromX + 6}
                y1={arrowY}
                x2={toX - 6}
                y2={arrowY}
                stroke={color}
                strokeWidth={sw}
                opacity={0.75}
                strokeLinecap="round"
              />
              <polygon
                points={`${toX - 6},${arrowY - 4} ${toX + 2},${arrowY} ${toX - 6},${arrowY + 4}`}
                fill={color}
                opacity={0.85}
              >
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={`${fromX + 6 - toX + 6},0; 0,0`}
                  dur={`${2 + ep.count * 0.2}s`}
                  repeatCount="indefinite"
                />
              </polygon>
              <text x={midX} y={arrowY - 5} textAnchor="middle" fill="#6e7b8c" fontSize={7}>
                {ep.count} tr\u00E1fico
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
