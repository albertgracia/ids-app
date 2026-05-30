"use client";

import { useMemo } from "react";
import type { EventItem } from "@/lib/types";
import { L } from "@/lib/soc-labels";

interface Props {
  events: EventItem[];
}

// Simplified continent SVG paths (same as design-lab mock)
const continents = [
  { d: "M 25,20 L 80,15 L 130,25 L 170,30 L 210,35 L 230,50 L 225,70 L 200,90 L 175,110 L 155,115 L 130,95 L 100,80 L 65,65 L 40,55 Z", label: "NA" },
  { d: "M 160,130 L 185,125 L 210,135 L 220,155 L 215,185 L 200,215 L 185,240 L 165,250 L 145,235 L 135,200 L 140,165 L 150,145 Z", label: "SA" },
  { d: "M 255,20 L 285,12 L 310,15 L 335,22 L 350,28 L 355,45 L 340,60 L 315,72 L 295,78 L 275,70 L 260,55 L 255,38 Z", label: "EU" },
  { d: "M 270,95 L 300,90 L 330,95 L 350,115 L 355,150 L 340,190 L 315,230 L 290,245 L 270,230 L 260,200 L 258,165 L 262,135 L 268,112 Z", label: "AF" },
  { d: "M 360,15 L 410,8 L 460,12 L 510,18 L 560,25 L 585,30 L 595,50 L 580,75 L 555,90 L 525,100 L 485,108 L 445,105 L 405,95 L 375,78 L 362,55 L 358,35 Z", label: "AS" },
  { d: "M 465,190 L 500,183 L 525,188 L 540,200 L 535,220 L 515,232 L 490,228 L 472,212 L 468,200 Z", label: "OC" },
];

const SEV_COLORS: Record<string, string> = {
  critical: "#f85149",
  high: "#eab308",
  medium: "#d97706",
  low: "#58a6ff",
  info: "#6e7b8c",
};

// Deterministic synthetic GeoIP: map IP → (x, y, countryCode)
function syntheticGeoIP(ip: string): { x: number; y: number; country: string } {
  const parts = ip.split(".");
  if (parts.length !== 4) return { x: 300, y: 20, country: "??" };

  // Use first two octets to deterministically pick a "country"
  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);
  const hash = (a * 256 + b) % 7;

  const positions = [
    { x: 520, y: 32, country: "CN" },
    { x: 330, y: 50, country: "NL" },
    { x: 280, y: 180, country: "BR" },
    { x: 460, y: 65, country: "IN" },
    { x: 220, y: 75, country: "US" },
    { x: 480, y: 215, country: "AU" },
    { x: 265, y: 108, country: "NG" },
  ];

  return positions[hash % positions.length];
}

interface AttackLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sev: string;
  label: string;
  country: string;
}

// Threat type → short label
function attackLabel(type: string): string {
  switch (type) {
    case "scan_detected": return "Escaneo";
    case "auth_failure": return "Brute SSH";
    case "malware_indicator": return "C2 Beacon";
    case "protocol_anomaly": return "Anomalía";
    case "ot_modbus_read": return "Modbus";
    case "ot_s7_command": return "S7 Cmd";
    default: return type.replace(/_/g, " ");
  }
}

export default function AttackWorldMap({ events }: Props) {
  const attackLines = useMemo((): AttackLine[] => {
    // Target: "RED INTERNA" at center of map
    const targetX = 180;
    const targetY = 155;

    // Only use inbound / lateral events with external-looking source IPs
    // 10.x, 172.16-31.x, 192.168.x = private (internal), others = external
    const external = events.filter((e) => {
      const ip = e.source.ip;
      const oct1 = parseInt(ip.split(".")[0], 10);
      const oct2 = parseInt(ip.split(".")[1], 10);
      // Class A private: 10.x.x.x
      if (oct1 === 10) return false;
      // Class B private: 172.16-31.x.x
      if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) return false;
      // Class C private: 192.168.x.x
      if (oct1 === 192 && oct2 === 168) return false;
      return true;
    });

    // Deduplicate by source IP, keeping highest severity
    const byIP = new Map<string, EventItem>();
    const sevOrder = ["critical", "high", "medium", "low", "info"];
    for (const e of external) {
      const existing = byIP.get(e.source.ip);
      if (!existing || sevOrder.indexOf(e.severity) < sevOrder.indexOf(existing.severity)) {
        byIP.set(e.source.ip, e);
      }
    }

    const lines: AttackLine[] = [];
    let idx = 0;
    for (const e of byIP.values()) {
      const geo = syntheticGeoIP(e.source.ip);
      lines.push({
        id: `al-${idx++}`,
        x1: geo.x,
        y1: geo.y,
        x2: targetX,
        y2: targetY,
        sev: e.severity,
        label: attackLabel(e.type),
        country: geo.country,
      });
    }
    return lines.slice(0, 12); // max 12 lines for visual clarity
  }, [events]);

  const uniqueSevs = [...new Set(attackLines.map((a) => a.sev))];

  return (
    <div className="panel awm-panel">
      <div className="panel-header">
        <span>{L.panels.attackMap}</span>
        <span className="panel-sub">Tráfico entrante — última hora</span>
      </div>
      <svg
        viewBox="0 0 620 300"
        className="awm-world-svg"
        role="img"
        aria-label="Mapa mundial de amenazas: líneas de ataque desde orígenes sintéticos hacia red interna"
        style={{ display: "block" }}
      >
        <defs>
          <filter id="awm-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {Array.from({ length: 8 }, (_, i) => (
          <line
            key={`gh${i}`}
            x1={0} y1={i * 43} x2={620} y2={i * 43}
            stroke="#1a2433" strokeWidth={0.5}
          />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <line
            key={`gv${i}`}
            x1={i * 62} y1={0} x2={i * 62} y2={300}
            stroke="#1a2433" strokeWidth={0.5}
          />
        ))}

        {/* Continents */}
        {continents.map((c) => (
          <path
            key={c.label}
            d={c.d}
            fill="#151d2a"
            stroke="#1e2a3a"
            strokeWidth={0.8}
          />
        ))}

        {/* Internal network target marker */}
        <circle
          cx={180} cy={155} r={12}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 180 155"
            to="360 180 155"
            dur="20s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx={180} cy={155} r={4} fill="var(--accent)" filter="url(#awm-glow)" />
        <text x={180} y={180} textAnchor="middle" fill="var(--accent)" fontSize="7" fontFamily="monospace">
          RED INTERNA
        </text>

        {/* Attack lines from real event data */}
        {attackLines.map((a) => {
          const cx = (a.x1 + a.x2) / 2;
          const cy = Math.min(a.y1, a.y2) - 35;
          const c = SEV_COLORS[a.sev] || "#6e7b8c";
          return (
            <g key={a.id}>
              {/* Source dot */}
              <circle cx={a.x1} cy={a.y1} r={4} fill={c} opacity={0.9}>
                <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Curved line */}
              <path
                d={`M ${a.x1},${a.y1} Q ${cx},${cy} ${a.x2},${a.y2}`}
                fill="none" stroke={c} strokeWidth={1.5}
                strokeDasharray="6 4" opacity={0.8}
                className="attack-line-flow" filter="url(#awm-glow)"
              />
              {/* Data packet traveling */}
              <circle r={2.5} fill={c} opacity={0.9} className="attack-dot">
                <animateMotion
                  dur="3s" repeatCount="indefinite"
                  path={`M ${a.x1},${a.y1} Q ${cx},${cy} ${a.x2},${a.y2}`}
                />
              </circle>
              {/* Country label near source */}
              <text
                x={a.x1} y={a.y1 - 10} textAnchor="middle" fill={c}
                fontSize="6.5" fontFamily="monospace" fontWeight={700} opacity={0.9}
              >
                {a.country}
              </text>
              {/* Attack label on curve */}
              <text
                x={cx} y={cy - 6} textAnchor="middle" fill={c}
                fontSize="5.5" fontFamily="monospace" opacity={0.85}
              >
                {a.label}
              </text>
            </g>
          );
        })}

        {/* No data fallback */}
        {attackLines.length === 0 && (
          <text x={310} y={200} textAnchor="middle" fill="#6e7b8c" fontSize="10" fontFamily="monospace">
            Sin eventos externos recientes
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className="timeline-legend" style={{ marginTop: 4 }}>
        {(["critical", "high", "medium", "low"] as const).map((s) => (
          <span key={s} className="tl-legend-item" style={{ fontSize: 9 }}>
            <span className="tl-legend-dot" style={{ background: SEV_COLORS[s] }} />
            {s === "critical" ? "CRÍTICO" : s === "high" ? "ALTO" : s === "medium" ? "MEDIO" : "BAJO"}
          </span>
        ))}
      </div>
      <div className="map-geoip-legend">
        GeoIP sintético de staging — sin proveedor externo
      </div>
    </div>
  );
}
