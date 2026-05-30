import type { CoreStatus, EventItem, RecentEventsResponse, SimulateEventsResponse, Scenario } from "./types";

const BASE_URL = "/api/core";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getHealth(): Promise<{ service: string; status: string }> {
  return fetchJSON(`${BASE_URL}/healthz`);
}

export async function getStatus(): Promise<CoreStatus> {
  return fetchJSON(`${BASE_URL}/api/v1/status`);
}

export async function getRecentEvents(limit = 50): Promise<EventItem[]> {
  const res = await fetchJSON<RecentEventsResponse>(
    `${BASE_URL}/api/v1/events/recent?limit=${limit}`
  );
  return res.items;
}

export async function simulateEvents(
  scenario: Scenario,
  count: number
): Promise<EventItem[]> {
  const res = await fetchJSON<SimulateEventsResponse>(
    `${BASE_URL}/api/v1/simulate/events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, count }),
    }
  );
  return res.items;
}
