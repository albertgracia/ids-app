"use client";

import { useMemo } from "react";
import type { EventItem } from "@/lib/types";

interface Props {
  events: EventItem[];
}

interface AxisData {
  label: string;
  count: number;
  color: string;
}

export default function ThreatRadarGrid({ events }: Props) {
  const axes = useMemo((): AxisData[] => {
    const scan = events.filter((e) => e.type === "scan_detected").length;
    const auth = events.filter((e) => e.type === "auth_failure").length;
    const proto = events.filter((e) => e.type === "protocol_anomaly").length;
    const malware = events.filter((e) => e.type === "malware_indicator").length;
    const lateral = events.filter((e) => e.direction === "lateral").length;

    return [
      { label: "Escaneo", count: scan, color: "#db6d28" },
      { label: "Autenticación", count: auth, color: "#d29922" },
      { label: "Protocolo", count: proto, color: "#f85149" },
      { label: "Malware", count: malware, color: "#f85149" },
      { label: "Lateral", count: lateral, color: "#d29922" },
    ];
  }, [events]);

  const N = axes.length;
  const maxVal = Math.max(1, ...axes.map((a) => a.count));
  const cx = 130;
  const cy = 130;
  const outerR = 100;
  const gridLevels = 4;

  const angleStep = (2 * Math.PI) / N;
  const startAngle = -Math.PI / 2;

  const polygonPoints = axes
    .map((a, i) => {
      const angle = startAngle + i * angleStep;
      const r = (a.count / maxVal) * outerR;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(" ");

  const svgW = 260;
  const svgH = 300;

  return (
    <div className="panel radar-panel">
      <div className="panel-header">Radar de amenazas</div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="radar-svg"
        role="img"
        aria-label="Radar de amenazas con 5 dimensiones de ataque"
      >
        <defs>
          <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#58a6ff" stopOpacity="0.12" />
            <stop offset="95%" stopColor="#58a6ff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#58a6ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {Array.from({ length: gridLevels }, (_, level) => {
          const r = (outerR / gridLevels) * (level + 1);
          const pts = axes
            .map((_, i) => {
              const angle = startAngle + i * angleStep;
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            })
            .join(" ");
          return (
            <polygon
              key={`grid-${level}`}
              points={pts}
              fill="none"
              stroke="#1e2a3a"
              strokeWidth={0.5}
            />
          );
        })}

        {axes.map((_, i) => {
          const angle = startAngle + i * angleStep;
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={cx + outerR * Math.cos(angle)}
              y2={cy + outerR * Math.sin(angle)}
              stroke="#1e2a3a"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Radar sweep effect */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="url(#radarSweep)"
          opacity={0.6}
        />

        <polygon
          points={polygonPoints}
          fill="rgba(88,166,255,0.15)"
          stroke="#58a6ff"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {axes.map((a, i) => {
          const angle = startAngle + i * angleStep;
          const px = a.count / maxVal;
          const r = px * outerR;
          const dotX = cx + r * Math.cos(angle);
          const dotY = cy + r * Math.sin(angle);
          return (
            <g key={`dot-${i}`}>
              <circle
                cx={dotX}
                cy={dotY}
                r={4}
                fill={a.color}
                stroke="#0a0e14"
                strokeWidth={1}
              />
              <text
                x={dotX}
                y={dotY - 8}
                textAnchor="middle"
                fill="#c9d1d9"
                fontSize={9}
                fontWeight={700}
                fontFamily="monospace"
              >
                {a.count}
              </text>
            </g>
          );
        })}

        {axes.map((a, i) => {
          const angle = startAngle + i * angleStep;
          const labelR = outerR + 20;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy + labelR * Math.sin(angle);
          return (
            <text
              key={`label-${i}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={a.color}
              fontSize={9}
              fontWeight={600}
            >
              {a.label}
            </text>
          );
        })}

        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill="#6e7b8c"
          fontSize={8}
          fontFamily="monospace"
        >
          máx: {maxVal}
        </text>
      </svg>
    </div>
  );
}
