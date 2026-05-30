"use client";

export default function NetworkTopologyPanel() {
  return (
    <div className="panel topology-panel">
      <div className="panel-header">OT/IT Network Topology</div>
      <div className="topology-svg">
        <svg viewBox="0 0 400 300" className="topo-svg">
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="#58a6ff" />
            </marker>
          </defs>
          <line x1="200" y1="20" x2="200" y2="60" stroke="#58a6ff" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <rect x="140" y="5" width="120" height="30" rx="6" fill="#1f2937" stroke="#58a6ff" strokeWidth="1" />
          <text x="200" y="25" textAnchor="middle" fill="#58a6ff" fontSize="10">External Network</text>

          <line x1="200" y1="60" x2="200" y2="95" stroke="#58a6ff" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <rect x="155" y="80" width="90" height="28" rx="6" fill="#1f2937" stroke="#d29922" strokeWidth="1" />
          <text x="200" y="98" textAnchor="middle" fill="#d29922" fontSize="10">DMZ</text>

          <line x1="200" y1="108" x2="200" y2="140" stroke="#58a6ff" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <rect x="145" y="125" width="110" height="28" rx="6" fill="#1f2937" stroke="#58a6ff" strokeWidth="1" />
          <text x="200" y="143" textAnchor="middle" fill="#58a6ff" fontSize="10">Corporate IT</text>

          <line x1="200" y1="153" x2="200" y2="185" stroke="#d29922" strokeWidth="2" strokeDasharray="4,3" markerEnd="url(#arrowhead)" />
          <rect x="130" y="170" width="140" height="28" rx="6" fill="#1f2937" stroke="#f85149" strokeWidth="1" />
          <text x="200" y="188" textAnchor="middle" fill="#f85149" fontSize="10">OT Boundary</text>

          <line x1="100" y1="210" x2="100" y2="245" stroke="#58a6ff" strokeWidth="1" markerEnd="url(#arrowhead)" />
          <rect x="55" y="230" width="90" height="26" rx="6" fill="#1f2937" stroke="#58a6ff" strokeWidth="1" />
          <text x="100" y="247" textAnchor="middle" fill="#58a6ff" fontSize="9">SCADA</text>

          <line x1="200" y1="210" x2="200" y2="245" stroke="#58a6ff" strokeWidth="1" markerEnd="url(#arrowhead)" />
          <rect x="155" y="230" width="90" height="26" rx="6" fill="#1f2937" stroke="#58a6ff" strokeWidth="1" />
          <text x="200" y="247" textAnchor="middle" fill="#58a6ff" fontSize="9">HMI</text>

          <line x1="300" y1="210" x2="300" y2="245" stroke="#58a6ff" strokeWidth="1" markerEnd="url(#arrowhead)" />
          <rect x="255" y="230" width="90" height="26" rx="6" fill="#1f2937" stroke="#58a6ff" strokeWidth="1" />
          <text x="300" y="247" textAnchor="middle" fill="#58a6ff" fontSize="9">PLC</text>

          <line x1="300" y1="210" x2="300" y2="278" stroke="#f85149" strokeWidth="1" strokeDasharray="3,3" />
          <rect x="260" y="265" width="80" height="24" rx="6" fill="#1f2937" stroke="#f85149" strokeWidth="1" />
          <text x="300" y="281" textAnchor="middle" fill="#f85149" fontSize="8">Sensor</text>
        </svg>
      </div>
    </div>
  );
}
