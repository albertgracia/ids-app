"use client";

import { useState } from "react";
import { SCENARIOS } from "@/lib/types";
import type { Scenario, EventItem } from "@/lib/types";
import { simulateEvents } from "@/lib/ids-core";

interface Props {
  onEventsGenerated: (events: EventItem[]) => void;
}

export default function SimulationPanel({ onEventsGenerated }: Props) {
  const [scenario, setScenario] = useState<Scenario>("scan_detected");
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setMessage("");
    try {
      const items = await simulateEvents(scenario, count);
      onEventsGenerated(items);
      setMessage(`Generated ${items.length} event(s)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessage(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section simulation-panel">
      <div className="sim-row">
        <label>
          Scenario:
          <select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}>
            {SCENARIOS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label>
          Count:
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value))))}
          />
        </label>
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "Generating..." : "Generate simulated events"}
        </button>
      </div>
      {message && <p className={`sim-message ${message.startsWith("Error") ? "msg-error" : "msg-ok"}`}>{message}</p>}
    </div>
  );
}
