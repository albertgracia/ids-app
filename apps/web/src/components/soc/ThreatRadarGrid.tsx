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
      { label: "Scan", count: scan, color: "#db6d28" },
      { label: "Auth", count: auth, color: "#d29922" },
      { label: "Proto", count: proto, color: "#f85149" },
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

  const getPoint = (i: number, val: number) => {
    const angle = startAngle + i * angleStep;
    const r = (val / maxVal) * outerR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const polygonPoints = axes
    .map((a, i) => {
      const pt = getPoint(i, a.count);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  const svgW = 260;
  const svgH = 290;

  return (
    <div className="panel radar-panel">
      <div className="panel-header">Threat Radar</div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="radar-svg"
        role="img"
        aria-label="Threat radar chart showing 5 attack dimensions"
      >
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
          max:{maxVal}
        </text>
      </svg>
    </div>
  );
}
