"use client";

import { useState, useEffect } from "react";

// ============================================================
// MOCK DATA
// ============================================================

interface MockEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  protocol: string;
  source: { ip: string; port: number };
  destination: { ip: string; port: number };
  direction: string;
  zone: string;
  title: string;
}

const mockEvents: MockEvent[] = [
  {
    id: "e1",
    timestamp: new Date().toISOString(),
    type: "scan_detected",
    severity: "high",
    protocol: "tcp",
    source: { ip: "198.51.100.42", port: 45678 },
    destination: { ip: "172.16.100.20", port: 502 },
    direction: "inbound",
    zone: "ot",
    title: "Escaneo TCP contra PLC OT",
  },
  {
    id: "e2",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    type: "malware_indicator",
    severity: "critical",
    protocol: "http",
    source: { ip: "10.10.1.10", port: 49152 },
    destination: { ip: "198.51.100.90", port: 443 },
    direction: "outbound",
    zone: "it",
    title: "Conexión C2 detectada",
  },
  {
    id: "e3",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    type: "auth_failure",
    severity: "medium",
    protocol: "ssh",
    source: { ip: "203.0.113.77", port: 40000 },
    destination: { ip: "10.10.1.5", port: 22 },
    direction: "inbound",
    zone: "dmz",
    title: "Fallo autenticación SSH",
  },
  {
    id: "e4",
    timestamp: new Date(Date.now() - 180000).toISOString(),
    type: "ot_command",
    severity: "high",
    protocol: "modbus",
    source: { ip: "172.16.100.5", port: 502 },
    destination: { ip: "10.10.1.50", port: 502 },
    direction: "lateral",
    zone: "ot",
    title: "Comando Modbus inesperado",
  },
  {
    id: "e5",
    timestamp: new Date(Date.now() - 240000).toISOString(),
    type: "protocol_anomaly",
    severity: "medium",
    protocol: "s7comm",
    source: { ip: "10.10.1.3", port: 102 },
    destination: { ip: "10.10.1.70", port: 102 },
    direction: "internal",
    zone: "ot",
    title: "Anomalía protocolo S7",
  },
];

// --- Asset map for Inspector "Activo afectado" ---
const assetMap: Record<string, { name: string; zone: string; type: string }> = {
  "172.16.100.20": { name: "PLC-1", zone: "ot", type: "Controlador Lógico Programable (Modbus)" },
  "198.51.100.90": { name: "C2-EXTERNAL", zone: "external", type: "Servidor de Comando y Control externo" },
  "10.10.1.5": { name: "DC-01", zone: "it", type: "Controlador de Dominio (Active Directory)" },
  "10.10.1.50": { name: "IT-GW", zone: "it", type: "Gateway IT / Enrutador interno" },
  "10.10.1.70": { name: "S7-DEVICE", zone: "ot", type: "Dispositivo Siemens S7-1200" },
};

const kpiData = [
  { label: "Total Eventos", value: "3,847", trend: "+12%", trendUp: true, color: "accent" },
  { label: "Críticos", value: "12", trend: "+3", trendUp: true, color: "critical" },
  { label: "Altos", value: "47", trend: "-8%", trendUp: false, color: "high" },
  { label: "Activos", value: "156", trend: "+5", trendUp: true, color: "accent" },
  { label: "IPs Externas", value: "89", trend: "+2", trendUp: true, color: "medium" },
  { label: "Riesgo", value: "73", sub: "/ 100", trend: "MEDIO-ALTO", trendUp: true, color: "high" },
];

const timelineBuckets = [
  { time: "14:55", critical: 2, high: 3, medium: 5, low: 8 },
  { time: "14:50", critical: 1, high: 4, medium: 6, low: 10 },
  { time: "14:45", critical: 0, high: 2, medium: 4, low: 12 },
  { time: "14:40", critical: 3, high: 5, medium: 3, low: 7 },
  { time: "14:35", critical: 1, high: 3, medium: 7, low: 9 },
  { time: "14:30", critical: 0, high: 1, medium: 5, low: 6 },
  { time: "14:25", critical: 2, high: 2, medium: 4, low: 11 },
  { time: "14:20", critical: 0, high: 3, medium: 5, low: 8 },
  { time: "14:15", critical: 1, high: 1, medium: 6, low: 7 },
  { time: "14:10", critical: 0, high: 2, medium: 3, low: 5 },
];

const attackLines = [
  { id: "a1", x1: 530, y1: 55, x2: 180, y2: 155, sev: "critical", label: "C2 Beacon", country: "CN" },
  { id: "a2", x1: 350, y1: 30, x2: 180, y2: 155, sev: "high", label: "SSH Bruteforce", country: "NL" },
  { id: "a3", x1: 300, y1: 105, x2: 180, y2: 155, sev: "medium", label: "Recon Scan", country: "BR" },
  { id: "a4", x1: 470, y1: 80, x2: 180, y2: 155, sev: "high", label: "Exploit Attempt", country: "IN" },
  { id: "a5", x1: 210, y1: 50, x2: 180, y2: 155, sev: "medium", label: "Phishing Origin", country: "US" },
  { id: "a6", x1: 520, y1: 205, x2: 180, y2: 155, sev: "low", label: "Port Scan", country: "AU" },
];

// ============================================================
// COLOR CONSTANTS
// ============================================================

const COLORS = {
  bg: "#0a0e14",
  panel: "#111820",
  border: "#1e2a3a",
  text: "#c9d1d9",
  dim: "#6e7b8c",
  accent: "#58a6ff",
  critical: "#f85149",
  high: "#eab308",
  medium: "#d97706",
  low: "#58a6ff",
  info: "#6e7b8c",
  green: "#3fb950",
  ot: "#db6d28",
} as const;

const sevColor = (s: string): string =>
  s === "critical" ? COLORS.critical :
  s === "high" ? COLORS.high :
  s === "medium" ? COLORS.medium :
  s === "low" ? COLORS.low : COLORS.info;

// ============================================================
// WORLD THREAT MAP SVG
// ============================================================

function WorldThreatMap() {
  return (
    <div className="panel awm-panel">
      <div className="panel-header">
        <span>🌍 MAPA DE AMENAZAS GLOBAL</span>
        <span className="panel-sub">Tráfico entrante — última hora</span>
      </div>
      <svg viewBox="0 0 620 300" className="awm-svg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 43} x2={620} y2={i * 43}
            stroke="#1a2433" strokeWidth={0.5} />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <line key={`v${i}`} x1={i * 62} y1={0} x2={i * 62} y2={300}
            stroke="#1a2433" strokeWidth={0.5} />
        ))}

        {/* Continents — simplified silhouettes */}
        <path d="M 25,20 L 80,15 L 130,25 L 170,30 L 210,35 L 230,50 L 225,70 L 200,90 L 175,110 L 155,115 L 130,95 L 100,80 L 65,65 L 40,55 Z"
          fill="#151d2a" stroke="#1e2a3a" strokeWidth={0.8} />
        <path d="M 160,130 L 185,125 L 210,135 L 220,155 L 215,185 L 200,215 L 185,240 L 165,250 L 145,235 L 135,200 L 140,165 L 150,145 Z"
          fill="#151d2a" stroke="#1e2a3a" strokeWidth={0.8} />
        <path d="M 255,20 L 285,12 L 310,15 L 335,22 L 350,28 L 355,45 L 340,60 L 315,72 L 295,78 L 275,70 L 260,55 L 255,38 Z"
          fill="#151d2a" stroke="#1e2a3a" strokeWidth={0.8} />
        <path d="M 270,95 L 300,90 L 330,95 L 350,115 L 355,150 L 340,190 L 315,230 L 290,245 L 270,230 L 260,200 L 258,165 L 262,135 L 268,112 Z"
          fill="#151d2a" stroke="#1e2a3a" strokeWidth={0.8} />
        <path d="M 360,15 L 410,8 L 460,12 L 510,18 L 560,25 L 585,30 L 595,50 L 580,75 L 555,90 L 525,100 L 485,108 L 445,105 L 405,95 L 375,78 L 362,55 L 358,35 Z"
          fill="#151d2a" stroke="#1e2a3a" strokeWidth={0.8} />
        <path d="M 465,190 L 500,183 L 525,188 L 540,200 L 535,220 L 515,232 L 490,228 L 472,212 L 468,200 Z"
          fill="#151d2a" stroke="#1e2a3a" strokeWidth={0.8} />

        {/* Internal network target marker */}
        <circle cx={180} cy={155} r={12} fill="none" stroke={COLORS.accent} strokeWidth={1.5} strokeDasharray="3 2">
          <animateTransform attributeName="transform" type="rotate" from="0 180 155" to="360 180 155" dur="20s" repeatCount="indefinite" />
        </circle>
        <circle cx={180} cy={155} r={4} fill={COLORS.accent} filter="url(#glow)" />
        <text x={180} y={180} textAnchor="middle" fill={COLORS.accent} fontSize="7" fontFamily="monospace">RED INTERNA</text>

        {/* Attack lines — thicker, higher contrast */}
        {attackLines.map((a) => {
          const cx = (a.x1 + a.x2) / 2;
          const cy = Math.min(a.y1, a.y2) - 35;
          const c = sevColor(a.sev);
          return (
            <g key={a.id}>
              {/* Source dot */}
              <circle cx={a.x1} cy={a.y1} r={4} fill={c} className="attack-dot" opacity={0.9}>
                <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Curved line — brighter, 1.5px thickness */}
              <path d={`M ${a.x1},${a.y1} Q ${cx},${cy} ${a.x2},${a.y2}`}
                fill="none" stroke={c} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.8}
                className="attack-line" filter="url(#glow)" />
              {/* Data packet traveling */}
              <circle r={2.5} fill={c} opacity={0.9} className="packet">
                <animateMotion dur="3s" repeatCount="indefinite"
                  path={`M ${a.x1},${a.y1} Q ${cx},${cy} ${a.x2},${a.y2}`} />
              </circle>
              {/* Country label near source */}
              <text x={a.x1} y={a.y1 - 10} textAnchor="middle" fill={c} fontSize="6.5"
                fontFamily="monospace" fontWeight={700} opacity={0.9}>{a.country}</text>
              {/* Attack label on curve */}
              <text x={cx} y={cy - 6} textAnchor="middle" fill={c} fontSize="5.5"
                fontFamily="monospace" opacity={0.85}>{a.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="map-legend">
        {(["critical", "high", "medium", "low"] as const).map((s) => (
          <span key={s} style={{ color: sevColor(s), marginRight: 12, fontSize: 10 }}>
            ● {s === "critical" ? "CRÍTICO" : s === "high" ? "ALTO" : s === "medium" ? "MEDIO" : "BAJO"}
          </span>
        ))}
      </div>
      <div className="map-geoip-legend">
        GeoIP sintético de staging — sin proveedor externo
      </div>
      <style jsx>{`
        .attack-line {
          animation: dash-flow 1.5s linear infinite;
        }
        @keyframes dash-flow {
          to { stroke-dashoffset: -20; }
        }
        .packet {
          filter: drop-shadow(0 0 3px currentColor);
        }
        .map-geoip-legend {
          margin-top: 2px;
          font-size: 7.5px;
          color: ${COLORS.dim};
          font-style: italic;
          text-align: right;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// TOPOLOGY GRAPH SVG
// ============================================================

function TopologyGraph() {
  return (
    <div className="panel topo-panel">
      <div className="panel-header">
        <span>🔗 TOPOLOGÍA DE RED OT/IT</span>
        <span className="topo-stats">13 nodos · 4 zonas · 1 sensor IDS</span>
      </div>
      <svg viewBox="0 0 390 270" className="topo-svg" style={{ display: "block", marginTop: 4 }}>
        <defs>
          <filter id="node-glow-critical">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill={COLORS.border} />
          </marker>
          <marker id="arrowhead-obs" markerWidth="5" markerHeight="3" refX="5" refY="1.5" orient="auto">
            <polygon points="0 0, 5 1.5, 0 3" fill={COLORS.accent} />
          </marker>
        </defs>

        {/* Zone backgrounds with clearer labels */}
        {[
          { x: 2, w: 78, color: "#f8514922", label: "🌐 EXTERNA", sub: "Internet / WAN" },
          { x: 82, w: 78, color: "#d2992222", label: "🛡 DMZ", sub: "Perímetro" },
          { x: 162, w: 78, color: "#58a6ff22", label: "💻 IT", sub: "Corporativa" },
          { x: 242, w: 146, color: "#db6d2822", label: "⚙ OT", sub: "Industrial" },
        ].map((z) => (
          <g key={z.label}>
            <rect x={z.x} y={0} width={z.w} height={270} rx={2} fill={z.color} stroke={COLORS.border} strokeWidth={0.5} />
            <text x={z.x + z.w / 2} y={13} textAnchor="middle" fill={COLORS.dim} fontSize="8"
              fontWeight={600} fontFamily="system-ui">{z.label}</text>
            <text x={z.x + z.w / 2} y={23} textAnchor="middle" fill={COLORS.dim} fontSize="6"
              fontFamily="system-ui" opacity={0.6}>{z.sub}</text>
          </g>
        ))}

        {/* Node definitions */}
        {[
          { x: 40, y: 55, label: "EXT-1", ip: "198.51.100.x", zone: "external" },
          { x: 40, y: 120, label: "EXT-2", ip: "203.0.113.x", zone: "external" },
          { x: 40, y: 195, label: "EXT-3", ip: "192.0.2.x", zone: "external", pulse: true },
          { x: 120, y: 40, label: "FW-PRI", ip: "10.10.0.1", zone: "dmz" },
          { x: 120, y: 105, label: "PROXY", ip: "10.10.0.10", zone: "dmz", pulse: true },
          { x: 120, y: 180, label: "WEB-DMZ", ip: "10.10.0.20", zone: "dmz" },
          { x: 200, y: 40, label: "IT-CORE", ip: "10.10.1.1", zone: "it" },
          { x: 200, y: 105, label: "DC-01", ip: "10.10.1.5", zone: "it", pulse: true },
          { x: 200, y: 180, label: "WS-ADMIN", ip: "10.10.1.10", zone: "it" },
          { x: 300, y: 40, label: "PLC-1", ip: "172.16.100.20", zone: "ot", pulse: true },
          { x: 300, y: 110, label: "SCADA", ip: "172.16.100.10", zone: "ot" },
          { x: 300, y: 185, label: "HMI", ip: "172.16.100.30", zone: "ot" },
          { x: 345, y: 240, label: "S7-1200", ip: "172.16.100.50", zone: "ot", pulse: true },
          // NEW: IDS Sensor — observer node bridging IT ↔ OT
          { x: 250, y: 258, label: "IDS", ip: "sensor ids", zone: "it", isSensor: true },
        ].map((n) => {
          const zc = n.zone === "external" ? COLORS.critical :
                     n.zone === "dmz" ? COLORS.high :
                     n.zone === "it" ? COLORS.accent : COLORS.ot;
          const isSensor = (n as { isSensor?: boolean }).isSensor;
          return (
            <g key={n.label}>
              {/* Pulse ring — subtle (opacity 0.3) */}
              {n.pulse && (
                <circle cx={n.x} cy={n.y} r={9} fill="none" stroke={zc} strokeWidth={1} opacity={0.3}
                  className="node-pulse-ring" />
              )}
              {/* Node circle */}
              <circle cx={n.x} cy={n.y} r={isSensor ? 7 : 6} fill={COLORS.panel}
                stroke={isSensor ? COLORS.accent : zc} strokeWidth={isSensor ? 2 : 1.8}
                strokeDasharray={isSensor ? "3 2" : "none"} />
              <circle cx={n.x} cy={n.y} r={isSensor ? 3.5 : 2.5} fill={isSensor ? COLORS.accent : zc} />
              {/* Label */}
              <text x={n.x} y={n.y + 16} textAnchor="middle" fill={isSensor ? COLORS.accent : COLORS.text}
                fontSize="7.5" fontWeight={600} fontFamily="system-ui">{n.label}</text>
              <text x={n.x} y={n.y + 26} textAnchor="middle" fill={COLORS.dim} fontSize="6"
                fontFamily="monospace">{n.ip}</text>
            </g>
          );
        })}

        {/* Connection lines */}
        <line x1={46} y1={55} x2={114} y2={40} stroke={COLORS.border} strokeWidth={0.8} markerEnd="url(#arrowhead)" />
        <line x1={46} y1={120} x2={114} y2={105} stroke={COLORS.border} strokeWidth={0.8} markerEnd="url(#arrowhead)" />
        <line x1={46} y1={195} x2={114} y2={180} stroke={COLORS.border} strokeWidth={0.8} markerEnd="url(#arrowhead)" />
        <line x1={126} y1={40} x2={194} y2={40} stroke={COLORS.border} strokeWidth={0.8} markerEnd="url(#arrowhead)" />
        <line x1={126} y1={105} x2={194} y2={105} stroke={COLORS.border} strokeWidth={0.8} markerEnd="url(#arrowhead)" />
        <line x1={126} y1={180} x2={194} y2={180} stroke={COLORS.border} strokeWidth={0.8} markerEnd="url(#arrowhead)" />
        <line x1={206} y1={40} x2={294} y2={40} stroke={COLORS.ot} strokeWidth={1} markerEnd="url(#arrowhead)" />
        <line x1={206} y1={105} x2={294} y2={110} stroke={COLORS.ot} strokeWidth={1} markerEnd="url(#arrowhead)" />
        <line x1={206} y1={180} x2={294} y2={185} stroke={COLORS.ot} strokeWidth={1} markerEnd="url(#arrowhead)" />
        {/* OT internal connections */}
        <line x1={306} y1={46} x2={339} y2={234} stroke={COLORS.border} strokeWidth={0.5} strokeDasharray="3 2" />
        <line x1={306} y1={116} x2={339} y2={234} stroke={COLORS.border} strokeWidth={0.5} strokeDasharray="3 2" />
        <line x1={306} y1={191} x2={339} y2={234} stroke={COLORS.border} strokeWidth={0.5} strokeDasharray="3 2" />

        {/* IDS Sensor observation lines (dashed, to IT-CORE and PLC-1) */}
        <line x1={250} y1={252} x2={206} y2={46} stroke={COLORS.accent} strokeWidth={0.8}
          strokeDasharray="4 3" opacity={0.5} markerEnd="url(#arrowhead-obs)" />
        <line x1={250} y1={252} x2={306} y2={46} stroke={COLORS.accent} strokeWidth={0.8}
          strokeDasharray="4 3" opacity={0.5} markerEnd="url(#arrowhead-obs)" />
        {/* IDS to DC-01 and SCADA observation */}
        <line x1={250} y1={258} x2={206} y2={111} stroke={COLORS.accent} strokeWidth={0.6}
          strokeDasharray="4 3" opacity={0.35} />
        <line x1={250} y1={258} x2={306} y2={116} stroke={COLORS.accent} strokeWidth={0.6}
          strokeDasharray="4 3" opacity={0.35} />

        <style jsx>{`
          .node-pulse-ring {
            transform-origin: center;
            animation: nodePulse 2.5s ease-out infinite;
          }
          @keyframes nodePulse {
            0% { r: 6; opacity: 0.4; }
            100% { r: 16; opacity: 0; }
          }
        `}</style>
      </svg>
    </div>
  );
}

// ============================================================
// TIMELINE CHART SVG
// ============================================================

const BAR_W = 50;
const BAR_GAP = 12;
const BAR_SLOT = BAR_W + BAR_GAP;
const TL_W = 10 * BAR_SLOT + 30;
const TL_H = 140;
const BAR_BASE = TL_H - 20;
const MAX_TOTAL = 24;

const sevFill: Record<string, string> = {
  critical: COLORS.critical,
  high: COLORS.high,
  medium: COLORS.medium,
  low: COLORS.low,
};

const sevOrder = ["low", "medium", "high", "critical"] as const;

function TimelineChart() {
  return (
    <div className="panel timeline-panel">
      <div className="panel-header">
        <span>📊 LÍNEA TEMPORAL DE EVENTOS (últimos 50 min)</span>
        <span className="panel-sub">Barras apiladas por severidad</span>
      </div>
      <svg viewBox={`0 0 ${TL_W} ${TL_H}`} className="timeline-svg">
        {/* Y-axis guide lines */}
        {[0, 6, 12, 18, 24].map((v) => {
          const y = BAR_BASE - (v / MAX_TOTAL) * (TL_H - 40);
          return (
            <g key={`gl-${v}`}>
              <line x1={15} y1={y} x2={TL_W - 5} y2={y} stroke="#1a2433" strokeWidth={0.5} />
              <text x={12} y={y + 3} textAnchor="end" fill={COLORS.dim} fontSize="8" fontFamily="monospace">{v}</text>
            </g>
          );
        })}

        {timelineBuckets.map((b, i) => {
          const x = 25 + i * BAR_SLOT;
          let currentTop = BAR_BASE;
          return (
            <g key={b.time}>
              {sevOrder.map((sev) => {
                const val = b[sev];
                if (val === 0) return null;
                const h = (val / MAX_TOTAL) * (TL_H - 40);
                const y = currentTop - h;
                currentTop = y;
                return (
                  <rect key={sev} x={x} y={y} width={BAR_W} height={h}
                    fill={sevFill[sev]} opacity={0.85} rx={1}
                    className="timeline-bar-new">
                    <animate attributeName="opacity" from="0" to="0.85" dur="0.4s" begin={`${i * 0.05}s`} fill="freeze" />
                  </rect>
                );
              })}
              {/* Time label */}
              <text x={x + BAR_W / 2} y={BAR_BASE + 14} textAnchor="middle" fill={COLORS.dim}
                fontSize="8.5" fontFamily="monospace">{b.time}</text>
              {/* Now marker */}
              {i === timelineBuckets.length - 1 && (
                <line x1={x + BAR_W + 2} y1={BAR_BASE - (TL_H - 40)} y2={BAR_BASE}
                  stroke={COLORS.accent} strokeWidth={1} strokeDasharray="3 3"
                  className="timeline-now-marker" />
              )}
            </g>
          );
        })}
      </svg>
      <div className="timeline-legend">
        {sevOrder.map((s) => (
          <span key={s} className="tl-legend-item">
            <span className="tl-legend-dot" style={{ background: sevFill[s] }} />
            {s === "critical" ? "CRÍTICO" : s === "high" ? "ALTO" : s === "medium" ? "MEDIO" : "BAJO"}
          </span>
        ))}
      </div>
      <style jsx>{`
        .timeline-now-marker {
          animation: nowPulse 1.5s ease-in-out infinite;
        }
        @keyframes nowPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .timeline-legend {
          display: flex; gap: 14px; margin-top: 4px; font-size: 10px; flex-wrap: wrap;
        }
        .tl-legend-item { display: flex; align-items: center; gap: 4px; color: ${COLORS.dim}; }
        .tl-legend-dot { width: 8px; height: 8px; border-radius: 1px; display: inline-block; }
      `}</style>
    </div>
  );
}

// ============================================================
// INSPECTOR PANEL
// ============================================================

function InspectorPanel({ event }: { event: MockEvent | null }) {
  const [scoring, setScoring] = useState(false);

  if (!event) {
    return (
      <div className="panel inspector-panel">
        <div className="panel-header">
          <span>🔍 INVESTIGACIÓN DE EVENTOS</span>
        </div>
        <div className="empty-state">Seleccione un evento para investigar</div>
      </div>
    );
  }

  const time = new Date(event.timestamp);
  const timeStr = time.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const asset = assetMap[event.destination.ip] ?? {
    name: event.destination.ip,
    zone: event.zone,
    type: "Activo no catalogado",
  };

  // Mock scoring data
  const factors = [
    { factor: "src_reputation", label: "Reputación IP origen", impact: event.severity === "critical" ? 9 : event.severity === "high" ? 7 : 4 },
    { factor: "dest_criticality", label: "Criticidad del destino", impact: event.zone === "ot" ? 9 : event.zone === "dmz" ? 6 : 3 },
    { factor: "protocol_risk", label: "Riesgo del protocolo", impact: event.protocol === "modbus" || event.protocol === "s7comm" ? 8 : 5 },
    { factor: "time_context", label: "Contexto temporal", impact: 4 },
    { factor: "anomaly_score", label: "Score de anomalía", impact: event.severity === "critical" ? 9 : event.severity === "high" ? 7 : 5 },
  ];

  const totalScore = Math.round(factors.reduce((s, f) => s + f.impact, 0) * 2.2);
  const riskLevel = totalScore >= 80 ? "CRÍTICO" : totalScore >= 60 ? "ALTO" : totalScore >= 40 ? "MEDIO" : "BAJO";

  return (
    <div className="panel inspector-panel">
      <div className="panel-header">
        <span>🔍 INVESTIGACIÓN DE EVENTOS</span>
        <span className="panel-sub">{event.id}</span>
      </div>

      <div className="inspector-grid">
        {/* Title */}
        <div className="inspector-title">
          <span className="ilabel">Título</span>
          <span style={{ fontWeight: 600, color: sevColor(event.severity) }}>{event.title}</span>
        </div>

        {/* Timestamp */}
        <div>
          <span className="ilabel">Timestamp</span>
          <span className="mono">{timeStr} — {time.toLocaleDateString("es-ES")}</span>
        </div>

        {/* Severity */}
        <div>
          <span className="ilabel">Severidad</span>
          <span className={`sev-badge-expanded sev-${event.severity}`}>
            {event.severity === "critical" ? "CRÍTICO" : event.severity === "high" ? "ALTO" : event.severity === "medium" ? "MEDIO" : "BAJO"}
          </span>
        </div>

        {/* Type */}
        <div>
          <span className="ilabel">Tipo</span>
          <span className="mono">{event.type}</span>
        </div>

        {/* Protocol */}
        <div>
          <span className="ilabel">Protocolo</span>
          <span className="mono">{event.protocol.toUpperCase()}</span>
        </div>

        {/* Direction */}
        <div>
          <span className="ilabel">Dirección</span>
          <span>{event.direction === "inbound" ? "Entrante" : event.direction === "outbound" ? "Saliente" : event.direction === "lateral" ? "Lateral" : "Interna"}</span>
        </div>

        {/* Zone */}
        <div>
          <span className="ilabel">Zona</span>
          <span className={`zone-tag zone-${event.zone}`}>{event.zone.toUpperCase()}</span>
        </div>

        {/* Source */}
        <div>
          <span className="ilabel">Origen</span>
          <span className="mono">{event.source.ip}:{event.source.port}</span>
        </div>

        {/* Destination */}
        <div>
          <span className="ilabel">Destino</span>
          <span className="mono">{event.destination.ip}:{event.destination.port}</span>
        </div>
      </div>

      {/* Tags */}
      <div className="inspector-tags">
        <span className="tag">{event.type}</span>
        <span className="tag">{event.protocol.toUpperCase()}</span>
        <span className="tag">{event.direction}</span>
        <span className="tag">zona:{event.zone}</span>
      </div>

      {/* --- NEW: Activo Afectado --- */}
      <div className="asset-section">
        <span className="section-label">🎯 Activo Afectado</span>
        <div className="asset-card">
          <div className="asset-row">
            <span className="ilabel">Nombre</span>
            <span style={{ fontWeight: 600, color: COLORS.accent }}>{asset.name}</span>
          </div>
          <div className="asset-row">
            <span className="ilabel">IP</span>
            <span className="mono">{event.destination.ip}</span>
          </div>
          <div className="asset-row">
            <span className="ilabel">Zona</span>
            <span className={`zone-tag zone-${asset.zone}`}>{asset.zone.toUpperCase()}</span>
          </div>
          <div className="asset-row">
            <span className="ilabel">Tipo</span>
            <span style={{ fontSize: 10, color: COLORS.dim }}>{asset.type}</span>
          </div>
        </div>
      </div>

      {/* --- NEW: Ruta de Ataque --- */}
      <div className="attack-route-section">
        <span className="section-label">🗺 Ruta de Ataque</span>
        <div className="attack-route-viz">
          <div className="route-node route-src">
            <span className="route-label">ORIGEN</span>
            <span className="mono" style={{ fontSize: 9 }}>{event.source.ip}:{event.source.port}</span>
            <span className={`zone-tag zone-${event.direction === "outbound" ? event.zone : "external"}`}
              style={{ marginTop: 2 }}>
              {event.direction === "outbound" ? event.zone.toUpperCase() : "EXT"}
            </span>
          </div>
          <div className="route-arrow">
            <svg width="60" height="24" viewBox="0 0 60 24">
              <line x1={0} y1={12} x2={42} y2={12} stroke={COLORS.critical} strokeWidth={1.5}
                strokeDasharray="4 2" opacity={0.7} />
              <polygon points="42,6 54,12 42,18" fill={COLORS.critical} opacity={0.9} />
              <text x={22} y={10} textAnchor="middle" fill={COLORS.dim} fontSize="6"
                fontFamily="monospace">{event.protocol.toUpperCase()}</text>
            </svg>
          </div>
          <div className="route-node route-dst">
            <span className="route-label">DESTINO</span>
            <span className="mono" style={{ fontSize: 9 }}>{event.destination.ip}:{event.destination.port}</span>
            <span className={`zone-tag zone-${event.zone}`} style={{ marginTop: 2 }}>
              {event.zone.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Scoring section */}
      <div className="score-section">
        <div className="score-header">
          <span className="score-num" style={{ color: riskLevel === "CRÍTICO" ? COLORS.critical : riskLevel === "ALTO" ? COLORS.high : COLORS.accent }}>
            {totalScore}
          </span>
          <span className="risk-level" style={{ color: riskLevel === "CRÍTICO" ? COLORS.critical : riskLevel === "ALTO" ? COLORS.high : COLORS.accent }}>
            Riesgo {riskLevel}
          </span>
          <button className="btn-score" disabled={scoring} onClick={() => setScoring(true)}>
            {scoring ? "Calculando..." : "Recalcular Score"}
          </button>
        </div>

        {scoring && (
          <div style={{ marginTop: 8 }}>
            {factors.map((f) => (
              <div key={f.factor} className="factor-row">
                <code>{f.factor}</code>
                <span>{f.label}</span>
                <span className="factor-impact">{f.impact}/10</span>
              </div>
            ))}
            <div className="score-recs">
              <strong style={{ fontSize: 11, color: COLORS.dim }}>Recomendaciones:</strong>
              <ul>
                {event.zone === "ot" && (
                  <li>Aislar segmento OT y verificar PLC-1 — posible Modbus malicioso</li>
                )}
                {event.severity === "critical" && (
                  <li>Bloquear IP origen {event.source.ip} y activar respuesta a incidentes</li>
                )}
                <li>Revisar logs de firewall para el protocolo {event.protocol.toUpperCase()}</li>
                <li>Correlacionar con eventos de la misma IP origen en las últimas 24h</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .inspector-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 8px;
          font-size: 11px;
        }
        .ilabel {
          font-size: 8px;
          color: ${COLORS.dim};
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: 2px;
        }
        .inspector-title { grid-column: 1 / -1; }
        .mono {
          font-family: "JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, monospace;
          font-size: 10px;
        }
        .inspector-tags {
          display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;
        }
        .tag {
          padding: 2px 6px; background: ${COLORS.bg}; border-radius: 2px;
          font-size: 9px; color: ${COLORS.accent}; font-family: monospace;
        }
        /* --- Asset Section --- */
        .asset-section {
          margin-top: 10px;
          border-top: 1px solid ${COLORS.border};
          padding-top: 8px;
        }
        .section-label {
          font-size: 9px;
          font-weight: 600;
          color: ${COLORS.dim};
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: 6px;
        }
        .asset-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 12px;
          background: ${COLORS.bg};
          padding: 6px 8px;
          border-radius: 2px;
          border: 1px solid ${COLORS.border};
        }
        .asset-row {
          font-size: 10px;
        }
        /* --- Attack Route --- */
        .attack-route-section {
          margin-top: 8px;
          border-top: 1px solid ${COLORS.border};
          padding-top: 8px;
        }
        .attack-route-viz {
          display: flex;
          align-items: center;
          gap: 6px;
          background: ${COLORS.bg};
          padding: 8px;
          border-radius: 2px;
          border: 1px solid ${COLORS.border};
          justify-content: center;
        }
        .route-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          text-align: center;
        }
        .route-label {
          font-size: 7px;
          color: ${COLORS.dim};
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .route-arrow {
          flex-shrink: 0;
        }
        /* --- Score Section --- */
        .score-section {
          margin-top: 12px; border-top: 1px solid ${COLORS.border}; padding-top: 10px;
        }
        .score-header {
          display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px;
        }
        .score-num { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .risk-level { font-size: 13px; font-weight: 600; text-transform: uppercase; }
        .btn-score {
          background: ${COLORS.accent}; color: #fff; border: none; border-radius: 2px;
          padding: 3px 10px; font-size: 10px; cursor: pointer; font-family: inherit;
        }
        .btn-score:disabled { opacity: 0.5; cursor: default; }
        .factor-row { display: flex; gap: 8px; font-size: 10px; padding: 1px 0; align-items: center; }
        .factor-row code { min-width: 100px; font-size: 10px; color: ${COLORS.dim}; }
        .factor-impact { color: ${COLORS.high}; font-weight: 600; min-width: 25px; }
        .score-recs { margin-top: 8px; }
        .score-recs ul { margin: 4px 0; padding-left: 16px; font-size: 10px; line-height: 1.5; }
        .empty-state {
          color: ${COLORS.dim}; font-style: italic; font-size: 12px; padding: 20px; text-align: center;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// iSID DEFENSIVE ACTIONS PANEL
// ============================================================

function ISIDPanel() {
  const actions = [
    { id: "copy-ioc", label: "Copiar IOC", icon: "📋" },
    { id: "mark-reviewed", label: "Marcar revisado", icon: "✅" },
    { id: "block-suggest", label: "Recomendar bloqueo", icon: "🚫" },
    { id: "watchlist", label: "Añadir a vigilancia", icon: "👁" },
    { id: "open-case", label: "Abrir investigación", icon: "🔍" },
    { id: "gen-report", label: "Generar informe", icon: "📄" },
  ];

  return (
    <div className="isid-bar">
      <div className="isid-left">
        <span className="isid-title">🛡 ACCIONES DEFENSIVAS iSID</span>
        <span className="isid-note">(Simulado — pendiente de backend)</span>
      </div>
      <div className="isid-actions">
        {actions.map((a) => (
          <button key={a.id} className="isid-btn" disabled title="Simulado / pendiente de backend">
            <span className="isid-btn-icon">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
      <style jsx>{`
        .isid-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 5px 10px;
          background: ${COLORS.panel};
          border: 1px solid ${COLORS.border};
          border-radius: 2px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .isid-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .isid-title {
          font-size: 10px;
          font-weight: 700;
          color: ${COLORS.accent};
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .isid-note {
          font-size: 8px;
          color: ${COLORS.dim};
          font-style: italic;
          white-space: nowrap;
        }
        .isid-actions {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }
        .isid-btn {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px 8px;
          font-size: 9px;
          font-family: inherit;
          color: ${COLORS.dim};
          background: ${COLORS.bg};
          border: 1px solid ${COLORS.border};
          border-radius: 2px;
          cursor: not-allowed;
          opacity: 0.6;
          white-space: nowrap;
          transition: opacity 0.15s;
        }
        .isid-btn:hover {
          opacity: 0.8;
        }
        .isid-btn-icon {
          font-size: 10px;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// HEADER
// ============================================================

function Header({ seconds }: { seconds: number }) {
  return (
    <header className="soc-header">
      {/* Row 1: Main header bar */}
      <div className="soc-header-row1">
        <div className="soc-header-left">
          <div className="soc-logo">
            <span className="soc-logo-icon">🛡</span>
            <div>
              <h1 className="soc-title">Centro de Mando IDS OT/IT</h1>
              <span className="soc-env">SOC Staging · v2.4.1</span>
            </div>
          </div>
        </div>

        <div className="soc-header-center">
          {["ids-core", "analytics", "mcp-server", "postgres", "redis"].map((svc) => (
            <span key={svc} className="soc-svc-badge svc-ok">
              <span className="svc-dot" />
              {svc}
            </span>
          ))}
        </div>

        <div className="soc-header-right">
          <div className="health-led-group">
            <span className="soc-label">Estado</span>
            <span className="health-led healthy" />
            <span style={{ color: COLORS.green, fontSize: 11, fontWeight: 600 }}>OPERATIVO</span>
          </div>

          <span className="alarm-badge" style={{ margin: "0 10px" }}>
            ⚠ {12 + (seconds % 5)} Alarmas
          </span>

          <span className="updated-ago">Actualizado hace {seconds}s</span>
          <span style={{ fontSize: 11, color: COLORS.dim }}>
            {new Date().toLocaleTimeString("es-ES")}
          </span>
        </div>
      </div>

      {/* Row 2: Tech capability badges */}
      <div className="soc-header-row2">
        <span className="cap-badge cap-suricata">🛡 Suricata: parser EVE JSON preparado</span>
        <span className="cap-badge cap-mcp">📡 MCP: read-only activo</span>
        <span className="cap-badge cap-analytics">📊 Analytics: scoring disponible</span>
      </div>

      <style jsx>{`
        .soc-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 6px 14px;
          background: ${COLORS.panel};
          border: 1px solid ${COLORS.border};
          border-radius: 2px;
        }
        .soc-header-row1 {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          min-height: 40px;
        }
        .soc-header-row2 {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          padding: 3px 0 2px;
          border-top: 1px solid ${COLORS.border};
        }
        .soc-header-left { display: flex; align-items: center; gap: 14px; }
        .soc-logo { display: flex; align-items: center; gap: 10px; }
        .soc-logo-icon { font-size: 22px; }
        .soc-title { font-size: 17px; font-weight: 700; margin: 0; color: ${COLORS.text}; line-height: 1.1; }
        .soc-env { font-size: 9px; color: ${COLORS.dim}; text-transform: uppercase; letter-spacing: 0.12em; }
        .soc-header-center { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
        .soc-svc-badge {
          display: flex; align-items: center; gap: 4px; font-size: 9px;
          padding: 2px 8px; border-radius: 2px; background: ${COLORS.bg}; color: ${COLORS.text};
        }
        .svc-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; background: ${COLORS.green}; }
        .soc-header-right { display: flex; align-items: center; gap: 12px; font-size: 10px; }
        .health-led-group { display: flex; align-items: center; gap: 5px; }
        .health-led {
          width: 9px; height: 9px; border-radius: 50%; background: ${COLORS.green};
          box-shadow: 0 0 6px ${COLORS.green}; animation: ledPulse 3s ease-in-out infinite;
        }
        @keyframes ledPulse {
          0%, 100% { opacity: 1; } 50% { opacity: 0.5; }
        }
        .soc-label { color: ${COLORS.dim}; text-transform: uppercase; letter-spacing: 0.05em; font-size: 8px; }
        .alarm-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; border-radius: 2px; font-size: 10px; font-weight: 600;
          font-variant-numeric: tabular-nums; background: rgba(248,81,73,0.18); color: ${COLORS.critical};
          white-space: nowrap;
        }
        .updated-ago {
          font-family: "JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, monospace;
          font-size: 10px; color: ${COLORS.dim}; white-space: nowrap;
        }
        /* Tech capability badges */
        .cap-badge {
          font-size: 8.5px;
          font-family: "JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, monospace;
          padding: 1px 7px;
          border-radius: 2px;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }
        .cap-suricata {
          background: rgba(219,109,40,0.12);
          color: ${COLORS.ot};
          border: 1px solid rgba(219,109,40,0.25);
        }
        .cap-mcp {
          background: rgba(63,185,80,0.12);
          color: ${COLORS.green};
          border: 1px solid rgba(63,185,80,0.25);
        }
        .cap-analytics {
          background: rgba(88,166,255,0.12);
          color: ${COLORS.accent};
          border: 1px solid rgba(88,166,255,0.25);
        }
      `}</style>
    </header>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function DesignLabPage() {
  const [seconds, setSeconds] = useState(3);
  const [selectedEventId, setSelectedEventId] = useState<string>("e1");

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Responsive: prevent horizontal overflow on body
  useEffect(() => {
    const prev = document.body.style.overflowX;
    document.body.style.overflowX = "hidden";
    return () => { document.body.style.overflowX = prev; };
  }, []);

  const selectedEvent = mockEvents.find((e) => e.id === selectedEventId) ?? null;

  return (
    <div className="design-lab-root">
      <Header seconds={seconds} />

      {/* Row 2: KPIs | Map | Topology */}
      <div className="row-top">
        {/* KPI Column */}
        <aside className="kpi-col">
          {kpiData.map((k) => (
            <div key={k.label} className="kpi-card">
              <span className="kpi-label">{k.label}</span>
              <div className="kpi-value-row">
                <span className={`kpi-value kpi-${k.color}`}>{k.value}</span>
                {k.sub && <span style={{ fontSize: 12, color: COLORS.dim }}>{k.sub}</span>}
              </div>
              <span className={`kpi-trend ${k.trendUp ? "kpi-trend-up" : "kpi-trend-down"}`}>
                {k.trendUp ? "▲" : "▼"} {k.trend}
              </span>
            </div>
          ))}
        </aside>

        {/* Map */}
        <WorldThreatMap />

        {/* Topology */}
        <TopologyGraph />
      </div>

      {/* iSID Defensive Actions Bar */}
      <ISIDPanel />

      {/* Row 3: Timeline full width */}
      <TimelineChart />

      {/* Row 4: Events | Inspector */}
      <div className="row-bottom">
        {/* Events Table */}
        <section className="panel events-panel">
          <div className="panel-header">
            <span>📋 EVENTOS RECIENTES</span>
            <span className="panel-sub">{mockEvents.length} eventos</span>
          </div>
          <div className="recent-table-wrap">
            <table className="recent-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Hora</th>
                  <th style={{ width: 70 }}>Severidad</th>
                  <th>Título</th>
                  <th style={{ width: 80 }}>Tipo</th>
                  <th style={{ width: 80 }}>Protocolo</th>
                  <th style={{ width: 170 }}>Origen</th>
                  <th style={{ width: 170 }}>Destino</th>
                  <th style={{ width: 55 }}>Zona</th>
                </tr>
              </thead>
              <tbody>
                {mockEvents.map((e) => {
                  const t = new Date(e.timestamp);
                  const isSel = e.id === selectedEventId;
                  const sevLabel = e.severity === "critical" ? "CRÍTICO" : e.severity === "high" ? "ALTO" : e.severity === "medium" ? "MEDIO" : "BAJO";
                  return (
                    <tr key={e.id}
                      className={`event-row sev-${e.severity}-row ${isSel ? "selected" : ""}`}
                      onClick={() => setSelectedEventId(e.id)}>
                      <td className="cell-mono">
                        {t.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td>
                        <span className={`sev-badge-expanded sev-${e.severity}`}>{sevLabel}</span>
                      </td>
                      <td className="cell-title">{e.title}</td>
                      <td className="cell-mono" style={{ fontSize: 9 }}>{e.type}</td>
                      <td className="cell-mono">{e.protocol.toUpperCase()}</td>
                      <td className="cell-mono">{e.source.ip}:{e.source.port}</td>
                      <td className="cell-mono">{e.destination.ip}:{e.destination.port}</td>
                      <td><span className={`zone-tag zone-${e.zone}`}>{e.zone.toUpperCase()}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Inspector */}
        <InspectorPanel event={selectedEvent} />
      </div>

      <style jsx>{`
        /* ============================================================
           DESIGN LAB — SOC Command Center Mock
           ============================================================ */

        .design-lab-root {
          max-width: 100vw;
          height: 100vh;
          margin: 0 auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: ${COLORS.bg};
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          color: ${COLORS.text};
          font-size: 13px;
          line-height: 1.4;
          -webkit-font-smoothing: antialiased;
        }

        /* === Panels === */
        .panel {
          background: ${COLORS.panel};
          border: 1px solid ${COLORS.border};
          border-radius: 2px;
          padding: 10px;
          overflow: hidden;
        }
        .panel-header {
          font-size: 10px;
          font-weight: 600;
          color: ${COLORS.dim};
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .panel-sub {
          font-size: 8px; font-weight: 400; text-transform: none; color: ${COLORS.dim};
        }

        /* === Row 2: KPIs + Map + Topology === */
        .row-top {
          display: grid;
          grid-template-columns: 200px 1fr 390px;
          gap: 8px;
          flex: 2;
          min-height: 0;
        }

        /* === KPI Column === */
        .kpi-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .kpi-card {
          background: ${COLORS.panel};
          border: 1px solid ${COLORS.border};
          border-radius: 2px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          flex: 1;
          transition: background 0.3s;
        }
        .kpi-label {
          font-size: 8px;
          color: ${COLORS.dim};
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .kpi-value-row {
          display: flex;
          align-items: baseline;
          gap: 3px;
          margin: 2px 0;
        }
        .kpi-value {
          font-size: 28px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          color: ${COLORS.text};
          line-height: 1;
        }
        .kpi-value.kpi-critical { color: ${COLORS.critical}; }
        .kpi-value.kpi-high { color: ${COLORS.high}; }
        .kpi-value.kpi-medium { color: ${COLORS.medium}; }
        .kpi-value.kpi-accent { color: ${COLORS.accent}; }
        .kpi-trend {
          font-size: 9px; margin-top: auto;
        }
        .kpi-trend-up { color: ${COLORS.critical}; }
        .kpi-trend-down { color: ${COLORS.green}; }

        /* === Map & Topo SVG containers === */
        .awm-svg, .topo-svg {
          display: block;
          width: 100%;
          height: auto;
          max-height: calc(100% - 30px);
        }
        .map-legend {
          margin-top: 4px; display: flex; gap: 10px; flex-wrap: wrap;
        }

        /* === Row 3: Timeline === */
        .timeline-panel {
          flex: 1;
          min-height: 0;
        }
        .timeline-svg {
          display: block;
          width: 100%;
          height: auto;
          max-height: 150px;
        }

        /* === Row 4: Events + Inspector === */
        .row-bottom {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 8px;
          flex: 2;
          min-height: 0;
        }

        /* === Events Table === */
        .recent-table-wrap { overflow-x: auto; max-height: 100%; overflow-y: auto; }
        .recent-table {
          width: 100%; border-collapse: collapse; font-size: 10px;
        }
        .recent-table th {
          text-align: left; padding: 4px 5px; border-bottom: 1px solid ${COLORS.border};
          color: ${COLORS.dim}; font-weight: 600; white-space: nowrap; font-size: 8.5px;
          position: sticky; top: 0; background: ${COLORS.panel}; z-index: 1;
        }
        .recent-table td { padding: 4px 5px; border-bottom: 1px solid ${COLORS.border}; }

        .event-row { cursor: pointer; transition: background 0.15s; }
        .event-row.sev-critical-row { border-left: 3px solid ${COLORS.critical}; }
        .event-row.sev-high-row { border-left: 3px solid ${COLORS.high}; }
        .event-row.sev-medium-row { border-left: 3px solid ${COLORS.medium}; }
        .event-row.sev-low-row { border-left: 3px solid ${COLORS.low}; }
        .event-row:hover { background: rgba(88,166,255,0.06); }
        .event-row.selected { background: rgba(88,166,255,0.1); }
        .event-row.sev-critical-row:hover, .event-row.sev-critical-row.selected { background: rgba(248,81,73,0.08); }

        .cell-mono {
          font-family: "JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, monospace;
          font-size: 9px;
        }
        .cell-title { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* === Severity badges === */
        .sev-badge-expanded {
          display: inline-block; padding: 1px 6px; border-radius: 2px;
          font-size: 8px; font-weight: 700; white-space: nowrap; letter-spacing: 0.03em;
        }
        .sev-badge-expanded.sev-critical { background: rgba(248,81,73,0.2); color: ${COLORS.critical}; }
        .sev-badge-expanded.sev-high { background: rgba(234,179,8,0.2); color: ${COLORS.high}; }
        .sev-badge-expanded.sev-medium { background: rgba(217,119,6,0.2); color: ${COLORS.medium}; }
        .sev-badge-expanded.sev-low { background: rgba(88,166,255,0.2); color: ${COLORS.low}; }

        /* === Zone tags === */
        .zone-tag {
          padding: 1px 5px; border-radius: 2px; font-size: 8px; font-weight: 600; text-transform: uppercase;
        }
        .zone-external { background: rgba(248,81,73,0.15); color: ${COLORS.critical}; }
        .zone-dmz { background: rgba(210,153,34,0.15); color: ${COLORS.high}; }
        .zone-it { background: rgba(88,166,255,0.15); color: ${COLORS.accent}; }
        .zone-ot { background: rgba(219,109,40,0.15); color: ${COLORS.ot}; }

        /* === Responsive adjustments === */
        @media (max-width: 1100px) {
          .row-top {
            grid-template-columns: 1fr;
          }
          .kpi-col {
            flex-direction: row;
            flex-wrap: wrap;
          }
          .kpi-card {
            flex: 1 1 100px;
            min-width: 100px;
          }
          .row-bottom {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 700px) {
          .design-lab-root {
            padding: 4px;
            gap: 4px;
          }
          .kpi-card {
            padding: 4px 6px;
          }
          .kpi-value {
            font-size: 20px;
          }
          .row-top {
            grid-template-columns: 1fr;
          }
          .row-bottom {
            grid-template-columns: 1fr;
          }
          .soc-header-row1 {
            flex-direction: column;
            align-items: flex-start;
          }
          .soc-header-row2 {
            flex-direction: column;
            align-items: flex-start;
          }
          .inspector-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
