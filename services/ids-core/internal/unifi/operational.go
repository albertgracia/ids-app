package unifi

import (
	"encoding/json"
	"errors"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	ErrUnsupportedOperationalFormat = errors.New("unsupported_operational_format")
)

type OperationalEventKind string

const (
	KindDNSGatewayEvent     OperationalEventKind = "dns_gateway_event"
	KindDPIEvent            OperationalEventKind = "dpi_event"
	KindDHCPIPv6Event       OperationalEventKind = "dhcp_ipv6_event"
	KindGatewayHealthEvent  OperationalEventKind = "gateway_health_event"
	KindSyslogOperational   OperationalEventKind = "syslog_operational_event"
	KindMCAEvent            OperationalEventKind = "mca_event"
	KindDPIFlowStatsEvent   OperationalEventKind = "dpi_flow_stats_event"
	KindSystemdEvent        OperationalEventKind = "systemd_event"
	KindUnclassified        OperationalEventKind = "unclassified_unifi_syslog"
)

type OperationalSyslogMessage struct {
	Raw           string
	TimestampText string
	RsyslogHost   string
	DeviceHost    string
	Process       string
	PID           string
	Message       string
	Kind          OperationalEventKind
	HasJSON       bool
	Fields        map[string]string
	JSONFields    map[string]any
	Warnings      []string
}

var (
	envelopeWithTwoHosts = regexp.MustCompile(`^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+)\s+(\S+\[\d+\]):\s*(.*)$`)
	envelopeWithOneHost  = regexp.MustCompile(`^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+\[\d+\]):\s*(.*)$`)
	envelopeWithTwoHostsNoPID = regexp.MustCompile(`^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+)\s+(\S+):\s*(.*)$`)
	envelopeWithOneHostNoPID  = regexp.MustCompile(`^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+):\s*(.*)$`)
)

func ParseOperationalSyslog(line string) (*OperationalSyslogMessage, error) {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" {
		return nil, errors.New("empty line")
	}

	msg := &OperationalSyslogMessage{
		Raw:     trimmed,
		Fields:  make(map[string]string),
		Warnings: make([]string, 0),
	}

	if matches := envelopeWithTwoHosts.FindStringSubmatch(trimmed); matches != nil {
		msg.TimestampText = matches[1]
		msg.RsyslogHost = matches[2]
		msg.DeviceHost = matches[3]
		msg.Process = filepath.Base(matches[4])
		msg.Message = matches[5]
		extractPID(msg)

		if msg.RsyslogHost == msg.DeviceHost {
			msg.Warnings = append(msg.Warnings, "duplicated_hostname_envelope")
		}

		classifyOperational(msg)
		parseMessageContent(msg)
		return msg, nil
	}

	if matches := envelopeWithOneHost.FindStringSubmatch(trimmed); matches != nil {
		msg.TimestampText = matches[1]
		msg.RsyslogHost = matches[2]
		msg.Process = filepath.Base(matches[3])
		msg.Message = matches[4]
		extractPID(msg)
		msg.Warnings = append(msg.Warnings, "missing_second_hostname")

		classifyOperational(msg)
		parseMessageContent(msg)
		return msg, nil
	}

	if matches := envelopeWithTwoHostsNoPID.FindStringSubmatch(trimmed); matches != nil {
		msg.TimestampText = matches[1]
		msg.RsyslogHost = matches[2]
		msg.DeviceHost = matches[3]
		msg.Process = filepath.Base(matches[4])
		msg.Message = matches[5]
		msg.Warnings = append(msg.Warnings, "missing_pid")

		if msg.RsyslogHost == msg.DeviceHost {
			msg.Warnings = append(msg.Warnings, "duplicated_hostname_envelope")
		}

		classifyOperational(msg)
		parseMessageContent(msg)
		return msg, nil
	}

	if matches := envelopeWithOneHostNoPID.FindStringSubmatch(trimmed); matches != nil {
		msg.TimestampText = matches[1]
		msg.RsyslogHost = matches[2]
		msg.Process = filepath.Base(matches[3])
		msg.Message = matches[4]
		msg.Warnings = append(msg.Warnings, "missing_second_hostname", "missing_pid")

		classifyOperational(msg)
		parseMessageContent(msg)
		return msg, nil
	}

	return nil, ErrUnsupportedOperationalFormat
}

func extractPID(msg *OperationalSyslogMessage) {
	pidIdx := strings.Index(msg.Process, "[")
	if pidIdx < 0 {
		return
	}
	pidEnd := strings.Index(msg.Process, "]")
	if pidEnd > pidIdx {
		msg.PID = msg.Process[pidIdx+1 : pidEnd]
		msg.Process = msg.Process[:pidIdx]
	}
}

func classifyOperational(msg *OperationalSyslogMessage) {
	switch msg.Process {
	case "coredns", "CoreDNS":
		msg.Kind = KindDNSGatewayEvent
	case "ubios-udapi-server":
		lower := strings.ToLower(msg.Message)
		if strings.Contains(msg.Message, "odhcp6c") {
			msg.Kind = KindDHCPIPv6Event
		} else if strings.Contains(lower, "flow stats") || strings.Contains(lower, "dpi stats") || strings.Contains(lower, "flow counters") || strings.Contains(lower, "dpi-flow-stats") {
			msg.Kind = KindDPIFlowStatsEvent
		} else if strings.Contains(msg.Message, "dpi") || strings.Contains(msg.Message, "DPI") {
			msg.Kind = KindDPIEvent
		} else {
			msg.Kind = KindUnclassified
		}
	case "odhcp6c":
		msg.Kind = KindDHCPIPv6Event
	case "earlyoom":
		msg.Kind = KindGatewayHealthEvent
	case "syslog-ng":
		msg.Kind = KindSyslogOperational
	case "unifi-mq-broker":
		msg.Kind = KindDNSGatewayEvent
	case "DPI", "dpi":
		msg.Kind = KindDPIEvent
	case "MCA", "mcad":
		msg.Kind = KindMCAEvent
	case "dpi-flow-stats":
		msg.Kind = KindDPIFlowStatsEvent
	case "systemd":
		msg.Kind = KindSystemdEvent
	default:
		msg.Kind = KindUnclassified
	}
}

func parseMessageContent(msg *OperationalSyslogMessage) {
	content := msg.Message

	if msg.Process == "coredns" {
		content = extractCoreDNSContent(msg.Message)
	}

	if len(content) > 0 && (content[0] == '{' || content[0] == '[') {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(content), &parsed); err == nil {
			msg.HasJSON = true
			msg.JSONFields = parsed

			if kind, ok := parsed["type"].(string); ok {
				msg.Fields["event_type"] = kind
			}
			if domain, ok := parsed["domain"].(string); ok {
				msg.Fields["domain"] = domain
			}
			if category, ok := parsed["category"].(string); ok {
				msg.Fields["category"] = category
			}
			if srcIP, ok := parsed["src_ip"].(string); ok {
				msg.Fields["src_ip"] = srcIP
			}
			if dstIP, ok := parsed["dst_ip"].(string); ok {
				msg.Fields["dst_ip"] = dstIP
			}
			if protocol, ok := parsed["protocol"].(string); ok {
				msg.Fields["protocol"] = protocol
			}
			return
		}
	}

	if msg.Kind == KindDPIEvent {
		contentLower := strings.ToLower(content)
		if strings.Contains(contentLower, "timeout") {
			msg.Fields["dpi_action"] = "timeout"
		} else if strings.Contains(contentLower, "failed") || strings.Contains(contentLower, "failure") {
			msg.Fields["dpi_action"] = "failed"
		} else {
			msg.Fields["dpi_action"] = "lifecycle"
		}
	} else if msg.Kind == KindDPIFlowStatsEvent {
		contentLower := strings.ToLower(content)
		if strings.Contains(contentLower, "timeout") {
			msg.Fields["dpi_action"] = "timeout"
		} else if strings.Contains(contentLower, "failed") || strings.Contains(contentLower, "failure") {
			msg.Fields["dpi_action"] = "failed"
		} else {
			msg.Fields["dpi_action"] = "lifecycle"
		}
	} else if msg.Kind == KindMCAEvent {
		contentLower := strings.ToLower(content)
		if strings.Contains(contentLower, "timeout") || strings.Contains(contentLower, "disconnected") || strings.Contains(contentLower, "unavailable") {
			msg.Fields["mca_action"] = "timeout"
		} else if strings.Contains(contentLower, "failed") || strings.Contains(contentLower, "failure") || strings.Contains(contentLower, "error") || strings.Contains(contentLower, "unable") {
			msg.Fields["mca_action"] = "failure"
		} else if strings.Contains(contentLower, "restart") || strings.Contains(contentLower, "adoption") {
			msg.Fields["mca_action"] = "lifecycle"
		} else {
			msg.Fields["mca_action"] = "heartbeat"
		}
	} else if msg.Kind == KindGatewayHealthEvent {
		contentLower := strings.ToLower(content)
		if strings.Contains(contentLower, "mem avail") {
			parts := strings.Fields(content)
			for i, part := range parts {
				if part == "avail:" && i+3 < len(parts) {
					msg.Fields["mem_avail"] = parts[i+1]
					msg.Fields["mem_total"] = parts[i+3]
				}
				if part == "free:" && i+3 < len(parts) {
					msg.Fields["swap_free"] = parts[i+1]
					msg.Fields["swap_total"] = parts[i+3]
				}
			}
		}
	}
}

func extractCoreDNSContent(msg string) string {
	idx := strings.Index(msg, "{")
	if idx >= 0 {
		return msg[idx:]
	}
	return msg
}
