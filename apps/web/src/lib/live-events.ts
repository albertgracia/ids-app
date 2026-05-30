import type { EventItem } from "./types";

type LiveEventCallback = (event: EventItem) => void;
type StatusCallback = (status: "connected" | "disconnected" | "reconnecting" | "error") => void;

let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let onEventCallback: LiveEventCallback | null = null;
let onStatusCallback: StatusCallback | null = null;

const BASE_URL = "/api/core";

export function connectLiveStream(
  onEvent: LiveEventCallback,
  onStatus: StatusCallback,
): () => void {
  onEventCallback = onEvent;
  onStatusCallback = onStatus;
  doConnect();
  return disconnect;
}

function doConnect() {
  disconnect();

  onStatusCallback?.("reconnecting");
  const url = `${BASE_URL}/api/v1/events/stream`;

  eventSource = new EventSource(url);
  eventSource.addEventListener("ids_event", (e: MessageEvent) => {
    try {
      const evt: EventItem = JSON.parse(e.data);
      onEventCallback?.(evt);
    } catch {
      // ignore malformed
    }
  });

  eventSource.addEventListener("connected", () => {
    onStatusCallback?.("connected");
  });

  eventSource.addEventListener("heartbeat", () => {
    // silent
  });

  eventSource.onerror = () => {
    onStatusCallback?.("error");
    disconnect();
    reconnectTimer = setTimeout(doConnect, 3000);
  };
}

export function disconnect() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  onStatusCallback?.("disconnected");
}
