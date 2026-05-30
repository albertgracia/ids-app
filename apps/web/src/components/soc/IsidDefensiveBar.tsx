"use client";

const ACTIONS = [
  { id: "copy-ioc", label: "Copiar IOC", icon: "📋" },
  { id: "mark-reviewed", label: "Marcar revisado", icon: "✅" },
  { id: "block-suggest", label: "Recomendar bloqueo", icon: "🚫" },
  { id: "watchlist", label: "Añadir a vigilancia", icon: "👁" },
  { id: "open-case", label: "Abrir investigación", icon: "🔍" },
  { id: "gen-report", label: "Generar informe", icon: "📄" },
];

export default function IsidDefensiveBar() {
  return (
    <div className="isid-bar">
      <div className="isid-left">
        <span className="isid-title">🛡 ACCIONES DEFENSIVAS iSID</span>
        <span className="isid-note">(Simulado — pendiente de backend)</span>
      </div>
      <div className="isid-actions">
        {ACTIONS.map((a) => (
          <button key={a.id} className="isid-btn" disabled title="Simulado / pendiente de backend">
            <span className="isid-btn-icon">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
