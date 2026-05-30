"use client";

import type { EventItem } from "@/lib/types";
import { ZONES, SEV_COLORS, classifyEventZone, type Zone, ZONE_LABELS } from "@/lib/soc-utils";
import { L } from "@/lib/soc-labels";

interface Props {
  events: EventItem[];
}

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

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

  const CELL_W = 70;
  const CELL_H = 28;
  const GAP = 4;
  const PAD_LEFT = 80;
  const PAD_TOP = 30;
  const COL_GAP = 30;
  const svgH = PAD_TOP + SEVERITIES.length * (CELL_H + GAP) + 60;

  return (
    <div className="panel awm-panel">
      <div className="panel-header">{L.panels.attackMap}</div>
      <svg
        viewBox={`0 0 ${PAD_LEFT + ZONES.length * CELL_W + (ZONES.length - 1) * COL_GAP + 20} ${svgH}`}
        className="awm-svg"
        role="img"
        aria-label="Mapa táctico de ataques: heatmap de amenazas por zona y severidad"
        style={{ overflow: "hidden" }}
      >
        {SEVERITIES.map((sev, si) => (
          <text
            key={sev}
            x={PAD_LEFT - 8}
            y={PAD_TOP + si * (CELL_H + GAP) + CELL_H / 2 + 4}
            textAnchor="end"
            fill={SEV_COLORS[sev]}
            fontSize={9}
            fontWeight={600}
          >
            {sev.toUpperCase()}
          </text>
        ))}

        {ZONES.map((zone, zi) => {
          const colX = PAD_LEFT + zi * (CELL_W + COL_GAP);
          return (
            <g key={zone}>
              <text
                x={colX + CELL_W / 2}
                y={PAD_TOP - 8}
                textAnchor="middle"
                fill="#6e7b8c"
                fontSize={10}
                fontWeight={700}
              >
                {ZONE_LABELS[zone]}
              </text>
              {SEVERITIES.map((sev, si) => {
                const count = zoneSevCounts[zone][sev];
                const opacity = globalMax > 0 ? 0.08 + (count / globalMax) * 0.85 : 0.08;
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
                      strokeWidth={0.5}
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

        {edgePairs.map((ep, ei) => {
          const fromX = PAD_LEFT + ZONES.indexOf(ep.from) * (CELL_W + COL_GAP) + CELL_W;
          const toX = PAD_LEFT + ZONES.indexOf(ep.to) * (CELL_W + COL_GAP);
          const y = PAD_TOP + SEVERITIES.length * (CELL_H + GAP) + 10 + ei * 18;
          const midX = (fromX + toX) / 2;
          return (
            <g key={`edge-${ep.from}-${ep.to}`}>
              <line
                x1={fromX + 4}
                y1={y}
                x2={toX - 4}
                y2={y}
                stroke={SEV_COLORS[ep.sev] || "#6e7b8c"}
                strokeWidth={Math.max(1, Math.min(6, Math.log2(ep.count + 1)))}
                opacity={0.7}
              />
              <polygon
                points={`${toX - 4},${y - 3} ${toX},${y} ${toX - 4},${y + 3}`}
                fill={SEV_COLORS[ep.sev] || "#6e7b8c"}
                opacity={0.7}
              />
              <text x={midX} y={y - 4} textAnchor="middle" fill="#6e7b8c" fontSize={8}>
                {ep.count} {L.events.titleCol.toLowerCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
