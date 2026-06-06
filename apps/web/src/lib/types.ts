export interface CoreStatus {
  service: string;
  status: string;
  mode: string;
  version: string;
  storage_mode: string;
  capabilities: string[];
}

export interface EventItem {
  id: string;
  timestamp: string;
  type: string;
  severity: string;
  protocol: string;
  source: Endpoint;
  destination: Endpoint;
  direction: string;
  zone: string;
  title: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface Endpoint {
  ip: string;
  port?: number;
  hostname?: string;
  asset_id?: string;
  mac?: string;
}

export interface RecentEventsResponse {
  items: EventItem[];
  count: number;
  limit: number;
}

export interface SimulateEventsResponse {
  items: EventItem[];
  count: number;
  scenario: string;
}

export type Scenario =
  | "normal_it_connection"
  | "ot_modbus_read"
  | "ot_s7_command"
  | "scan_detected"
  | "auth_failure"
  | "protocol_anomaly"
  | "malware_indicator";

export const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: "normal_it_connection", label: "Normal IT Connection" },
  { value: "ot_modbus_read", label: "OT Modbus Read" },
  { value: "ot_s7_command", label: "OT S7 Command" },
  { value: "scan_detected", label: "Scan Detected" },
  { value: "auth_failure", label: "Auth Failure" },
  { value: "protocol_anomaly", label: "Protocol Anomaly" },
  { value: "malware_indicator", label: "Malware Indicator" },
];

// Stats types

export interface EventStats {
  total_events: number;
  recent_events: number;
  events_per_minute: number;
  suspicious_events: number;
  severity_counts: Record<string, number>;
  event_type_counts: Record<string, number>;
  protocol_counts: Record<string, number>;
  source_counts: Record<string, number>;
  last_event_at: string;
  window_seconds: number;
}

// Analytics types

export type RiskLevel = "info" | "low" | "medium" | "high" | "critical";

export interface AnalyticsStatus {
  service: string;
  status: string;
  mode: string;
  version: string;
  capabilities: string[];
}

export interface ScoreFactor {
  name: string;
  impact: number;
  reason: string;
}

export interface ScoreResponse {
  event_id: string;
  score: number;
  risk_level: RiskLevel;
  factors: ScoreFactor[];
  recommendations: string[];
}

export interface ScoreEventsResponse {
  items: ScoreResponse[];
  count: number;
}
