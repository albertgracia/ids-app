import type { AnalyticsStatus, EventItem, ScoreEventsResponse, ScoreResponse } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_ANALYTICS_API_URL || "http://127.0.0.1:8090";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function getAnalyticsStatus(): Promise<AnalyticsStatus> {
  return fetchJSON(`${BASE_URL}/api/v1/status`);
}

export async function scoreEvent(event: EventItem): Promise<ScoreResponse> {
  return fetchJSON(`${BASE_URL}/api/v1/score/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
}

export async function scoreEvents(events: EventItem[]): Promise<ScoreEventsResponse> {
  return fetchJSON(`${BASE_URL}/api/v1/score/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: events }),
  });
}
