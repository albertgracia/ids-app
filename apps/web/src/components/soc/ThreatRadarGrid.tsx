"use client";

import { useMemo } from "react";
import type { EventItem } from "@/lib/types";
import { L } from "@/lib/soc-labels";

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
    const external = events.filter((e) => e.direction === "inbound").length;

    return [
      { label: L.threat.scan, count: scan, color: "#db6d28" },
      { label: L.threat.auth, count: auth, color: "#d29922" },
      { label: L.threat.proto, count: proto, color: "#f85149" },
      { label: L.threat.malware, count: malware, color: "#f85149" },
      { label: L.threat.lateral, count: lateral, color: "#eab308" },
      { label: L.threat.external, count: external, color: "#58a6ff" },
    ];
  }, [events]);

  const N = axes.length;
  const maxVal = Math.max(1, ...axes.map((a) => a.count));
  const cx = 150;
  const cy = 140;
  const outerR = 110;
  const gridLevels = 5;

  const angleStep = (2 * Math.PI) / N;
  const startAngle = -Math.PI / 2;

  const getPoint = (i: number, val: number) => {
    const angle = startAngle + i * angleStep;
    const r = (val / maxVal) * outerR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const polygonPoints = axes
    .map((a, i) => {
      const pt = getPoint(i, a.count);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  // Aggregated risk score
  const totalScore = useMemo(() => {
    if (events.length === 0) return 0;
    const crit = events.filter((e) => e.severity === "critical").length;
    const high = events.filter((e) => e.severity === "high").length;
    const total = events.length;
    return Math.min(100, Math.round(((crit * 30 + high * 15) / Math.max(1, total)) * 8));
  }, [events]);

  const riskColor =
    totalScore >= 70
      ? "#f85149"
      : totalScore >= 40
        ? "#eab308"
        : totalScore >= 20
          ? "#d97706"
          : "#58a6ff";

  const svgW = 300;
  const svgH = 320;

  return (
    <div className="panel radar-panel">
      <div className="panel-header">{L.panels.threatRadar}</div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="radar-svg"
        role="img"
        aria-label="Radar de amenazas: 6 dimensiones de ataque"
        style={{ overflow: "hidden" }}
      >
        <defs>
          <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={riskColor} stopOpacity="0.08" />
            <stop offset="70%" stopColor={riskColor} stopOpacity="0.03" />
            <stop offset="100%" stopColor={riskColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background with subtle radial glow */}
        <rect x="0" y="0" width={svgW} height={svgH} fill="url(#radar-bg)" />

        {/* Radar sweep line */}
        <g className="radar-sweep" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - outerR}
            stroke={riskColor}
            strokeWidth={1}
            opacity={0.25}
          />
        </g>

        {/* Grid levels */}
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

        {/* Axes lines */}
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

        {/* Data polygon */}
        <polygon
          points={polygonPoints}
          fill={`${riskColor}18`}
          stroke={riskColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Data dots */}
        {axes.map((a, i) => {
          const angle = startAngle + i * angleStep;
          const r = (a.count / maxVal) * outerR;
          const dotX = cx + r * Math.cos(angle);
          const dotY = cy + r * Math.sin(angle);
          return (
            <g key={`dot-${i}`}>
              <circle cx={dotX} cy={dotY} r={3.5} fill={a.color} stroke="#0a0e14" strokeWidth={1} />
              <text
                x={dotX}
                y={dotY - 7}
                textAnchor="middle"
                fill="#c9d1d9"
                fontSize={8}
                fontWeight={700}
                fontFamily="JetBrains Mono, Cascadia Code, Fira Code, Consolas, monospace"
              >
                {a.count}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        {axes.map((a, i) => {
          const angle = startAngle + i * angleStep;
          const labelR = outerR + 22;
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

        {/* Center score */}
        <text x={cx} y={cy - 2} textAnchor="middle" fill={riskColor} fontSize={22} fontWeight={800} fontFamily="JetBrains Mono, Cascadia Code, Fira Code, Consolas, monospace">
          {totalScore}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#6e7b8c" fontSize={7} fontWeight={400}>
          score
        </text>
      </svg>
    </div>
  );
}
