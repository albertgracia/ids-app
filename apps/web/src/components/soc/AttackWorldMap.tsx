"use client";

import { useMemo, useState, useCallback } from "react";
import type { EventItem } from "@/lib/types";
import type { ThreatGeoPoint } from "@/lib/geoip-synthetic";
import { buildThreatPoints, lookupSyntheticGeo } from "@/lib/geoip-synthetic";
import { L } from "@/lib/soc-labels";

interface Props {
  events: EventItem[];
}

// Simplified continent SVG paths
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

// ─── SVG viewBox and projection ──────────────────────────────────────

const VB_X = -70;
const VB_Y = -25;
const VB_W = 740;
const VB_H = 350;

/** Equirectangular projection: lat/lon → SVG x/y */
function latLonToSvg(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * VB_W + VB_X;
  const y = ((90 - lat) / 180) * VB_H + VB_Y;
  return [x, y];
}

/** Target marker for "red interna" */
const TARGET_X = 180;
const TARGET_Y = 155;

// ─── Defensive action buttons (disabled) ────────────────────────────

const DEFENSIVE_ACTIONS = [
  { id: "copy-ioc", label: "Copiar IOC", icon: "📋" },
  { id: "mark-reviewed", label: "Marcar revisión", icon: "✅" },
  { id: "block-suggest", label: "Recomendar bloqueo", icon: "🚫" },
  { id: "watchlist", label: "Añadir vigilancia", icon: "👁" },
];

// ─── Tooltip state ───────────────────────────────────────────────────

interface TooltipData {
  ip: string;
  country: string;
  severity: string;
  count: number;
}

// ─── Component ───────────────────────────────────────────────────────

export default function AttackWorldMap({ events }: Props) {
  const [tooltip, setTooltip] = useState<{ data: TooltipData; x: number; y: number } | null>(null);

  const handlePointerEnter = useCallback(
    (tp: ThreatGeoPoint) => (e: React.PointerEvent<SVGCircleElement>) => {
      const svg = (e.target as SVGCircleElement).closest("svg");
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      setTooltip({
        data: {
          ip: tp.ip,
          country: tp.country_code,
          severity: tp.severity_max,
          count: tp.event_count,
        },
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [],
  );

  const handlePointerLeave = useCallback(() => setTooltip(null), []);

  // ── Aggregate threat points ─────────────────────────────────────

  const threatPoints = useMemo(() => buildThreatPoints(events), [events]);

  // Count external threats (for header subtitle)
  const externalCount = useMemo(
    () => events.filter((e) => {
      const geo = lookupSyntheticGeo(e.source.ip);
      return geo && (geo.is_external || geo.is_documentation_ip);
    }).length,
    [events],
  );

  const uniqueSevs = [...new Set(threatPoints.map((t) => t.severity_max))];

  return (
    <div className="panel awm-panel">
      {/* ─── Header ─── */}
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span>{L.panels.attackMap}</span>
          <span
            className="awm-confidence-badge"
            title="GeoIP sintético de staging — sin proveedor externo"
          >
            SYNTHETIC
          </span>
        </div>
        <span className="panel-sub">
          {threatPoints.length > 0
            ? `${threatPoints.length} ${threatPoints.length === 1 ? "origen activo" : "orígenes activos"} — ${externalCount} eventos`
            : "Sin amenazas externas"}
        </span>
      </div>

      {/* ─── SVG Map ─── */}
      <div style={{ position: "relative" }}>
        <svg
          viewBox="-70 -25 740 350"
          preserveAspectRatio="xMidYMid meet"
          className="awm-world-svg"
          role="img"
          aria-label="Mapa mundial de amenazas: puntos y líneas desde orígenes sintéticos hacia red interna"
          style={{ display: "block" }}
        >
          <defs>
            <filter id="awm-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="awm-glow-strong">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: 9 }, (_, i) => (
            <line
              key={`gh${i}`}
              x1={-70} y1={-20 + i * 45} x2={670} y2={-20 + i * 45}
              stroke="#1a2433" strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: 14 }, (_, i) => (
            <line
              key={`gv${i}`}
              x1={-60 + i * 65} y1={-25} x2={-60 + i * 65} y2={325}
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
            cx={TARGET_X} cy={TARGET_Y} r={18}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="4 3"
            opacity={0.7}
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
          <circle cx={TARGET_X} cy={TARGET_Y} r={6} fill="var(--accent)" filter="url(#awm-glow-strong)" />
          <text x={TARGET_X} y={TARGET_Y + 30} textAnchor="middle" fill="var(--accent)" fontSize="9" fontWeight={700} fontFamily="monospace">
            RED INTERNA
          </text>

          {/* ── Threat lines + dots from geoip-synthetic ── */}
          {threatPoints.map((tp, idx) => {
            const [x1, y1] = latLonToSvg(tp.latitude, tp.longitude);
            // Curved line control point (above the line)
            const cx = (x1 + TARGET_X) / 2;
            const cy = Math.min(y1, TARGET_Y) - 38;
            const color = SEV_COLORS[tp.severity_max] || "#6e7b8c";
            const radius = Math.min(4 + tp.event_count * 1.2, 10);

            return (
              <g key={`tp-${idx}`}>
                {/* Glow underlay */}
                <path
                  d={`M ${x1},${y1} Q ${cx},${cy} ${TARGET_X},${TARGET_Y}`}
                  fill="none" stroke={color} strokeWidth={4}
                  opacity={0.18} filter="url(#awm-glow)"
                />
                {/* Curved attack line */}
                <path
                  d={`M ${x1},${y1} Q ${cx},${cy} ${TARGET_X},${TARGET_Y}`}
                  fill="none" stroke={color} strokeWidth={2}
                  strokeDasharray="8 5" opacity={0.85}
                  className="attack-line-flow" filter="url(#awm-glow)"
                />
                {/* Animated data packet */}
                <circle r={3} fill={color} opacity={0.95} className="attack-dot" filter="url(#awm-glow)">
                  <animateMotion
                    dur="3s" repeatCount="indefinite"
                    path={`M ${x1},${y1} Q ${cx},${cy} ${TARGET_X},${TARGET_Y}`}
                  />
                </circle>
                {/* Threat point dot (with tooltip) */}
                <circle
                  cx={x1} cy={y1} r={radius}
                  fill={color} opacity={0.95}
                  filter="url(#awm-glow)"
                  onPointerEnter={handlePointerEnter(tp)}
                  onPointerMove={handlePointerEnter(tp)}
                  onPointerLeave={handlePointerLeave}
                  style={{ cursor: "pointer" }}
                >
                  <animate attributeName="r" values={`${radius - 1};${radius + 1};${radius - 1}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
                </circle>
                {/* Country label near source */}
                <rect
                  x={x1 - 14} y={y1 - 24} width={28} height={12}
                  rx={2} fill="rgba(10,14,20,0.8)"
                />
                <text
                  x={x1} y={y1 - 15} textAnchor="middle" fill={color}
                  fontSize="8" fontFamily="monospace" fontWeight={700} opacity={0.95}
                >
                  {tp.country_code}
                </text>
              </g>
            );
          })}

          {/* No data fallback */}
          {threatPoints.length === 0 && (
            <text x={340} y={210} textAnchor="middle" fill="#6e7b8c" fontSize="11" fontFamily="monospace">
              Sin eventos externos recientes
            </text>
          )}
        </svg>

        {/* ── Tooltip overlay ── */}
        {tooltip && (
          <div
            className="awm-tooltip"
            style={{
              left: tooltip.x + 16,
              top: tooltip.y - 10,
            }}
          >
            <div className="awm-tooltip-row">
              <span className="awm-tooltip-label">IP</span>
              <span className="awm-tooltip-val">{tooltip.data.ip}</span>
            </div>
            <div className="awm-tooltip-row">
              <span className="awm-tooltip-label">País</span>
              <span className="awm-tooltip-val">{tooltip.data.country}</span>
            </div>
            <div className="awm-tooltip-row">
              <span className="awm-tooltip-label">Severidad</span>
              <span className="awm-tooltip-val">{tooltip.data.severity}</span>
            </div>
            <div className="awm-tooltip-row">
              <span className="awm-tooltip-label">Eventos</span>
              <span className="awm-tooltip-val">{tooltip.data.count}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="timeline-legend" style={{ marginTop: 5 }}>
        {(["critical", "high", "medium", "low"] as const).map((s) => (
          <span key={s} className="tl-legend-item" style={{ fontSize: 10 }}>
            <span className="tl-legend-dot" style={{ background: SEV_COLORS[s], width: 10, height: 10 }} />
            {s === "critical" ? "CRÍTICO" : s === "high" ? "ALTO" : s === "medium" ? "MEDIO" : "BAJO"}
          </span>
        ))}
      </div>
      <div className="map-geoip-legend">
        GeoIP sintético de staging — sin proveedor externo
      </div>

      {/* ── Defensive action buttons ── */}
      <div className="awm-defensive-bar">
        <span className="awm-defensive-label">Acciones defensivas</span>
        {DEFENSIVE_ACTIONS.map((a) => (
          <button
            key={a.id}
            className="awm-defensive-btn"
            disabled
            title="Pendiente backend"
          >
            <span className="awm-defensive-icon">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
