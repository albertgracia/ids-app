package unifi

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

func NormalizeOperational(msg *OperationalSyslogMessage) *UniFiEvent {
	rawHash := hashOperational(msg.Raw)

	event := &UniFiEvent{
		Source:         "unifi_gateway",
		SourceType:     "operational_syslog",
		Vendor:         "Ubiquiti",
		Device:         "UniFi Gateway",
		EventType:      mapKindToEventType(msg.Kind),
		Category:       mapKindToCategory(msg.Kind),
		Message:        buildSafeMessage(msg),
		RawMessageHash: rawHash,
		Metadata:       make(map[string]string),
	}

	event.Severity = mapKindToSeverityNum(msg)
	event.Metadata["unifi.process"] = msg.Process
	event.Metadata["unifi.event_kind"] = string(msg.Kind)
	event.Metadata["unifi.source_type"] = "operational_syslog"
	event.Metadata["unifi.raw_message_hash"] = rawHash
	event.Metadata["parser"] = "unifi_operational"
	event.Metadata["tag_unifi"] = "unifi"
	event.Metadata["tag_operational"] = "operational"

	if msg.HasJSON {
		event.Metadata["has_json"] = "true"
	}
	if msg.PID != "" {
		event.Metadata["unifi.pid"] = msg.PID
	}
	if msg.DeviceHost != "" {
		event.Metadata["unifi.device_host"] = msg.DeviceHost
	}

	for k, v := range msg.Fields {
		safeKey := "unifi." + k
		event.Metadata[safeKey] = v
	}

	for k, v := range msg.JSONFields {
		switch val := v.(type) {
		case string:
			if k == "domain" {
				event.Metadata["unifi.query_domain"] = val
			} else if k == "src_ip" || k == "dst_ip" {
				event.Metadata["unifi."+k] = val
			} else if k == "protocol" {
				event.Protocol = strings.ToUpper(val)
			} else {
				event.Metadata["unifi.json."+k] = val
			}
		case float64:
			event.Metadata["unifi.json."+k] = fmt.Sprintf("%v", val)
		}
	}

	return event
}

func mapKindToEventType(kind OperationalEventKind) string {
	switch kind {
	case KindDNSGatewayEvent:
		return "dns_query"
	case KindDPIEvent:
		return "network_connection"
	case KindDHCPIPv6Event:
		return "network_connection"
	case KindGatewayHealthEvent:
		return "system"
	case KindSyslogOperational:
		return "system"
	default:
		return "unclassified_event"
	}
}

func mapKindToCategory(kind OperationalEventKind) string {
	switch kind {
	case KindDNSGatewayEvent:
		return "DNS"
	case KindDPIEvent:
		return "DPI"
	case KindDHCPIPv6Event:
		return "DHCP"
	case KindGatewayHealthEvent:
		return "Health"
	case KindSyslogOperational:
		return "Operational"
	default:
		return "Unclassified"
	}
}

func mapKindToSeverityNum(msg *OperationalSyslogMessage) int {
	contentLower := strings.ToLower(msg.Message)

	switch msg.Kind {
	case KindDNSGatewayEvent:
		if msg.HasJSON {
			if cat, ok := msg.JSONFields["category"]; ok {
				catStr := strings.ToLower(fmt.Sprintf("%v", cat))
				if catStr == "malware" || catStr == "phishing" || catStr == "suspicious" {
					return 3
				}
			}
			if action, ok := msg.JSONFields["action"]; ok {
				actionStr := strings.ToLower(fmt.Sprintf("%v", action))
				if strings.Contains(actionStr, "block") || strings.Contains(actionStr, "deny") {
					return 3
				}
			}
		}
		if strings.Contains(contentLower, "error") || strings.Contains(contentLower, "fail") {
			return 3
		}
		return 0

	case KindDPIEvent:
		if strings.Contains(contentLower, "timeout") || strings.Contains(contentLower, "connect") {
			return 3
		}
		if strings.Contains(contentLower, "fail") {
			return 3
		}
		return 0

	case KindDHCPIPv6Event:
		if strings.Contains(contentLower, "fail") || strings.Contains(contentLower, "timeout") || strings.Contains(contentLower, "no reply") {
			return 3
		}
		return 0

	case KindGatewayHealthEvent:
		if strings.Contains(contentLower, "mem avail") {
			msg.Fields["health_action"] = "report"
		}
		if strings.Contains(contentLower, "kill") || strings.Contains(contentLower, "oom") {
			return 8
		}
		if strings.Contains(contentLower, "pressure") || strings.Contains(contentLower, "low memory") || strings.Contains(contentLower, "high swap") {
			return 6
		}
		return 0

	case KindSyslogOperational:
		if strings.Contains(contentLower, "warn") || strings.Contains(contentLower, "error") || strings.Contains(contentLower, "fail") {
			return 3
		}
		return 0

	default:
		return 0
	}
}

func buildSafeMessage(msg *OperationalSyslogMessage) string {
	msgText := msg.Message

	if msg.Kind == KindDNSGatewayEvent {
		if msg.HasJSON {
			if domain, ok := msg.JSONFields["domain"].(string); ok {
				return fmt.Sprintf("DNS %s for %s", getJSONField(msg.JSONFields, "type", "query"), domain)
			}
		}
		if strings.Contains(msgText, "coredns") {
			return "coredns communication error"
		}
	}

	if msg.Kind == KindDPIEvent {
		if strings.Contains(msgText, "timeout") {
			return "DPI socket timeout"
		}
		if strings.Contains(msgText, "fail") {
			return "DPI ML request failed"
		}
		return "DPI lifecycle event"
	}

	if msg.Kind == KindDHCPIPv6Event {
		msgLower := strings.ToLower(msgText)
		if strings.Contains(msgLower, "solicit") {
			return "DHCPv6 SOLICIT failure"
		}
		if strings.Contains(msgLower, "rs ") || strings.Contains(msgLower, "router solicitation") {
			return "DHCPv6 Router Solicitation failure"
		}
		return "DHCPv6 event"
	}

	if msg.Kind == KindGatewayHealthEvent {
		if strings.Contains(msgText, "mem avail") {
			return "Gateway memory status report"
		}
		return "Gateway health event"
	}

	if msg.Kind == KindSyslogOperational {
		return "Syslog-ng lifecycle event"
	}

	first := strings.SplitN(msgText, " ", 2)
	if len(first) > 0 && len(first[0]) > 60 {
		return msg.Process + " operational event"
	}
	if len(msgText) > 120 {
		return msgText[:120] + "..."
	}
	if msgText == "" {
		return msg.Process + " operational event"
	}
	return msgText
}

func hashOperational(raw string) string {
	canonical := strings.TrimSpace(strings.ReplaceAll(raw, "\r\n", "\n"))
	sum := sha256.Sum256([]byte(canonical))
	return "sha256:" + hex.EncodeToString(sum[:])
}

func getJSONField(fields map[string]any, key, fallback string) string {
	if v, ok := fields[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return fallback
}
