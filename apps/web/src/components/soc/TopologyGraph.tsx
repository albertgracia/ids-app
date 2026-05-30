"use client";

import { useMemo } from "react";
import type { EventItem } from "@/lib/types";
import { ZONES, ZONE_COLORS, SEV_COLORS, inferZone, L, type Zone } from "@/lib/soc-utils";

interface Props {
  events: EventItem[];
}

interface NodeInfo {
  ip: string;
  zone: string;
  eventCount: number;
  protocols: Set<string>;
  criticalCount: number;
}
interface EdgeInfo {
  from: string;
  to: string;
  count: number;
  sev: string;
}

export default function TopologyGraph({ events }: Props) {
  const { nodes, edges, nodeMap } = useMemo(() => {
    const ipSet = new Set<string>();
    for (const e of events) {
      ipSet.add(e.source.ip);
      ipSet.add(e.destination.ip);
    }

    const nodeMap = new Map<string, NodeInfo>();
    for (const ip of ipSet) {
      const zone = inferZone(ip, events);
      const related = events.filter(
        (e) => e.source.ip === ip || e.destination.ip === ip
      );
      const protocols = new Set(related.map((e) => e.protocol));
      const crit = related.filter(
        (e) => e.severity === "critical" || e.severity === "high"
      ).length;
      nodeMap.set(ip, {
        ip,
        zone,
        eventCount: related.length,
        protocols,
        criticalCount: crit,
      });
    }

    const edgeMap = new Map<string, EdgeInfo>();
    for (const e of events) {
      const key = `${e.source.ip}→${e.destination.ip}`;
      const existing = edgeMap.get(key);
      if (existing) {
        existing.count++;
        const sevOrder = ["critical", "high", "medium", "low", "info"];
        const curIdx = sevOrder.indexOf(existing.sev);
        const newIdx = sevOrder.indexOf(e.severity);
        if (newIdx < curIdx) existing.sev = e.severity;
      } else {
        edgeMap.set(key, {
          from: e.source.ip,
          to: e.destination.ip,
          count: 1,
          sev: e.severity,
        });
      }
    }

    const sortedEdges = [...edgeMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    const nodes = [...nodeMap.values()];

    return { nodes, edges: sortedEdges, nodeMap };
  }, [events]);

  const columns = useMemo(() => {
    const cols: Record<string, NodeInfo[]> = {};
    for (const z of ZONES) cols[z] = [];
    cols["unknown"] = [];
    for (const n of nodes) {
      const z = ZONES.includes(n.zone as Zone)
        ? n.zone
        : "unknown";
      if (cols[z]) cols[z].push(n);
      else cols["unknown"].push(n);
    }
    return cols;
  }, [nodes]);

  const maxEvents = Math.max(1, ...nodes.map((n) => n.eventCount));
  const maxEdges = Math.max(1, ...edges.map((e) => e.count));

  const COL_W = 110;
  const COL_GAP = 80;
  const NODE_GAP = 12;
  const PAD_LEFT = 20;
  const PAD_TOP = 30;
  const MIN_NODE_R = 8;
  const MAX_NODE_R = 22;

  const zoneColumns = [...ZONES, "unknown" as const].filter(
    (z) => columns[z]?.length > 0
  );

  const svgW = PAD_LEFT + zoneColumns.length * COL_W + Math.max(0, zoneColumns.length - 1) * COL_GAP + 20;
  let maxColH = 0;
  const colPositions: Record<string, { x: number; nodeYs: Map<string, number> }> = {};
  for (let ci = 0; ci < zoneColumns.length; ci++) {
    const z = zoneColumns[ci];
    const x = PAD_LEFT + ci * (COL_W + COL_GAP);
    const nodeYs = new Map<string, number>();
    const colNodes = columns[z] || [];
    for (let ni = 0; ni < colNodes.length; ni++) {
      const y = PAD_TOP + ni * (MAX_NODE_R * 2 + NODE_GAP) + MAX_NODE_R;
      nodeYs.set(colNodes[ni].ip, y);
    }
    colPositions[z] = { x, nodeYs };
    const colH = PAD_TOP + colNodes.length * (MAX_NODE_R * 2 + NODE_GAP) + 20;
    maxColH = Math.max(maxColH, colH);
  }

  const svgH = maxColH + 40;

  return (
    <div className="panel topo-panel">
      <div className="panel-header">
        Network Topology
        <span className="topo-stats">
          {nodes.length} {L.nodes} · {edges.length} {L.edges}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="topo-svg"
        role="img"
        aria-label="Network topology graph showing IP nodes grouped by zone with traffic edges"
      >
        <defs>
          <marker
            id="topo-arrow"
            markerWidth="5"
            markerHeight="4"
            refX="5"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 5 2, 0 4" fill="#6e7b8c" />
          </marker>
        </defs>

        {zoneColumns.map((z) => (
          <g key={`zone-bg-${z}`}>
            <rect
              x={colPositions[z].x - COL_W / 2}
              y={PAD_TOP - 20}
              width={COL_W}
              height={((columns[z]?.length || 1) * (MAX_NODE_R * 2 + NODE_GAP)) + 30}
              rx={3}
              fill="none"
              stroke={ZONE_COLORS[z] || "#1e2a3a"}
              strokeWidth={0.5}
              strokeDasharray="4,3"
              opacity={0.4}
            />
            <text
              x={colPositions[z].x}
              y={PAD_TOP - 24}
              textAnchor="middle"
              fill={ZONE_COLORS[z] || "#6e7b8c"}
              fontSize={9}
              fontWeight={700}
            >
              {z.toUpperCase()}
            </text>
          </g>
        ))}

        {edges.map((edge) => {
          const fromN = nodeMap.get(edge.from);
          const toN = nodeMap.get(edge.to);
          if (!fromN || !toN) return null;
          const fromZ = ZONES.includes(fromN.zone as Zone)
            ? fromN.zone
            : "unknown";
          const toZ = ZONES.includes(toN.zone as Zone)
            ? toN.zone
            : "unknown";
          const fromPos = colPositions[fromZ];
          const toPos = colPositions[toZ];
          if (!fromPos || !toPos) return null;
          const x1 = fromPos.x;
          const y1 = fromPos.nodeYs.get(edge.from);
          const x2 = toPos.x;
          const y2 = toPos.nodeYs.get(edge.to);
          if (y1 === undefined || y2 === undefined) return null;
          const sw = Math.max(0.5, Math.min(5, (edge.count / maxEdges) * 5));
          const color = SEV_COLORS[edge.sev] || "#6e7b8c";
          return (
            <line
              key={`edge-${edge.from}-${edge.to}`}
              x1={x1 + MAX_NODE_R + 2}
              y1={y1}
              x2={x2 - MAX_NODE_R - 2}
              y2={y2}
              stroke={color}
              strokeWidth={sw}
              opacity={0.35}
            />
          );
        })}

        {nodes.map((n) => {
          const z = ZONES.includes(n.zone as Zone)
            ? n.zone
            : "unknown";
          const pos = colPositions[z];
          if (!pos) return null;
          const cx = pos.x;
          const cy = pos.nodeYs.get(n.ip);
          if (cy === undefined) return null;
          const ratio = n.eventCount / maxEvents;
          const r = MIN_NODE_R + ratio * (MAX_NODE_R - MIN_NODE_R);
          const zoneColor = ZONE_COLORS[n.zone] || ZONE_COLORS["unknown"];
          const isCritical = n.criticalCount > 0;
          return (
            <g key={`node-${n.ip}`}>
              {isCritical && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 4}
                  fill="none"
                  stroke="#f85149"
                  strokeWidth={1}
                  opacity={0.5}
                >
                  <animate
                    attributeName="opacity"
                    values="0.5;0.1;0.5"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={zoneColor}
                opacity={0.2}
                stroke={zoneColor}
                strokeWidth={1.2}
              />
              <text
                x={cx}
                y={cy + 1}
                textAnchor="middle"
                fill="#c9d1d9"
                fontSize={Math.max(7, Math.min(10, r * 0.6))}
                fontFamily="monospace"
              >
                {n.ip.length > 11 ? n.ip.slice(0, 10) + "…" : n.ip}
              </text>
              <text
                x={cx}
                y={cy + r + 10}
                textAnchor="middle"
                fill="#6e7b8c"
                fontSize={7}
                fontFamily="monospace"
              >
                {n.eventCount}e
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
