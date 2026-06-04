package unifi

import (
	"testing"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

func TestNormalizeCEF_IDSAlert(t *testing.T) {
	cef := &CEFMessage{
		Version:         "0",
		DeviceVendor:    "Ubiquiti",
		DeviceProduct:   "UniFi Network",
		DeviceVersion:   "10.4.57",
		SignatureID:     "IDS_ALERT",
		Name:            "Threat detected",
		Severity:        8,
		Extension: map[string]string{
			"src":      "192.168.1.50",
			"dst":      "8.8.8.8",
			"spt":      "51515",
			"dpt":      "53",
			"proto":    "UDP",
			"act":      "allowed",
			"msg":      "Suspicious DNS query",
			"cs1Label": "category",
			"cs1":      "Malware",
		},
	}

	uniFiEvent, err := NormalizeCEF(cef)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if uniFiEvent.Source != "unifi_gateway" {
		t.Errorf("Expected source 'unifi_gateway', got '%s'", uniFiEvent.Source)
	}
	if uniFiEvent.SourceType != "syslog_cef" {
		t.Errorf("Expected source_type 'syslog_cef', got '%s'", uniFiEvent.SourceType)
	}
	if uniFiEvent.Vendor != "Ubiquiti" {
		t.Errorf("Expected vendor 'Ubiquiti', got '%s'", uniFiEvent.Vendor)
	}
	if uniFiEvent.Device != "UniFi Network" {
		t.Errorf("Expected device 'UniFi Network', got '%s'", uniFiEvent.Device)
	}
	if uniFiEvent.Severity != 8 {
		t.Errorf("Expected severity 8, got %d", uniFiEvent.Severity)
	}
	if uniFiEvent.EventType != "threat_detected" {
		t.Errorf("Expected event_type 'threat_detected', got '%s'", uniFiEvent.EventType)
	}
	if uniFiEvent.Category != "Malware" {
		t.Errorf("Expected category 'Malware', got '%s'", uniFiEvent.Category)
	}
	if uniFiEvent.Action != "allowed" {
		t.Errorf("Expected action 'allowed', got '%s'", uniFiEvent.Action)
	}
	if uniFiEvent.SrcIP != "192.168.1.50" {
		t.Errorf("Expected src_ip '192.168.1.50', got '%s'", uniFiEvent.SrcIP)
	}
	if uniFiEvent.SrcPort != 51515 {
		t.Errorf("Expected src_port 51515, got %d", uniFiEvent.SrcPort)
	}
	if uniFiEvent.DestIP != "8.8.8.8" {
		t.Errorf("Expected dest_ip '8.8.8.8', got '%s'", uniFiEvent.DestIP)
	}
	if uniFiEvent.DestPort != 53 {
		t.Errorf("Expected dest_port 53, got %d", uniFiEvent.DestPort)
	}
	if uniFiEvent.Protocol != "UDP" {
		t.Errorf("Expected protocol 'UDP', got '%s'", uniFiEvent.Protocol)
	}
	if uniFiEvent.Message != "Suspicious DNS query" {
		t.Errorf("Expected message 'Suspicious DNS query', got '%s'", uniFiEvent.Message)
	}
	// Check metadata
	if uniFiEvent.Metadata["unifi.signature"] != "IDS_ALERT" {
		t.Errorf("Expected metadata unifi.signature 'IDS_ALERT', got '%s'", uniFiEvent.Metadata["unifi.signature"])
	}
	if uniFiEvent.Metadata["unifi.category"] != "Malware" {
		t.Errorf("Expected metadata unifi.category 'Malware', got '%s'", uniFiEvent.Metadata["unifi.category"])
	}
	if uniFiEvent.Metadata["unifi.action"] != "allowed" {
		t.Errorf("Expected metadata unifi.action 'allowed', got '%s'", uniFiEvent.Metadata["unifi.action"])
	}
	// Check that tags include unifi/cef and event type
	tagFound := false
	for _, tag := range uniFiEvent.Metadata {
		if tag == "unifi" || tag == "cef" || tag == "threat_detected" {
			tagFound = true
			break
		}
	}
	if !tagFound {
		t.Error("Expected to find unifi/cef/threat_detected in tags or metadata")
	}
}

func TestNormalizeCEF_FirewallBlocked(t *testing.T) {
	cef := &CEFMessage{
		Version:         "0",
		DeviceVendor:    "Ubiquiti",
		DeviceProduct:   "UniFi Network",
		DeviceVersion:   "10.4.57",
		SignatureID:     "FIREWALL_BLOCK",
		Name:            "Blocked connection",
		Severity:        6,
		Extension: map[string]string{
			"src":      "192.168.1.100",
			"dst":      "203.0.113.10",
			"spt":      "44321",
			"dpt":      "22",
			"proto":    "TCP",
			"act":      "blocked",
			"msg":      "Blocked WAN SSH attempt",
		},
	}

	uniFiEvent, err := NormalizeCEF(cef)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if uniFiEvent.EventType != "blocked_connection" {
		t.Errorf("Expected event_type 'blocked_connection', got '%s'", uniFiEvent.EventType)
	}
	if uniFiEvent.Category != "Firewall" {
		t.Errorf("Expected category 'Firewall', got '%s'", uniFiEvent.Category)
	}
	if uniFiEvent.Action != "blocked" {
		t.Errorf("Expected action 'blocked', got '%s'", uniFiEvent.Action)
	}
	if uniFiEvent.SrcIP != "192.168.1.100" {
		t.Errorf("Expected src_ip '192.168.1.100', got '%s'", uniFiEvent.SrcIP)
	}
	if uniFiEvent.DestIP != "203.0.113.10" {
		t.Errorf("Expected dest_ip '203.0.113.10', got '%s'", uniFiEvent.DestIP)
	}
	if uniFiEvent.SrcPort != 44321 {
		t.Errorf("Expected src_port 44321, got %d", uniFiEvent.SrcPort)
	}
	if uniFiEvent.DestPort != 22 {
		t.Errorf("Expected dest_port 22, got %d", uniFiEvent.DestPort)
	}
	if uniFiEvent.Protocol != "TCP" {
		t.Errorf("Expected protocol 'TCP', got '%s'", uniFiEvent.Protocol)
	}
}

func TestNormalizeCEF_DNSQuery(t *testing.T) {
	cef := &CEFMessage{
		Version:         "0",
		DeviceVendor:    "Ubiquiti",
		DeviceProduct:   "UniFi Network",
		DeviceVersion:   "10.4.57",
		SignatureID:     "DNS_QUERY",
		Name:            "Gateway DNS query",
		Severity:        3,
		Extension: map[string]string{
			"src":      "192.168.1.20",
			"dst":      "192.168.1.1",
			"proto":    "UDP",
			"request":  "example.com",
			"msg":      "Gateway DNS query",
		},
	}

	uniFiEvent, err := NormalizeCEF(cef)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if uniFiEvent.EventType != "dns_query" {
		t.Errorf("Expected event_type 'dns_query', got '%s'", uniFiEvent.EventType)
	}
	if uniFiEvent.Category != "DNS" {
		t.Errorf("Expected category 'DNS', got '%s'", uniFiEvent.Category)
	}
	if uniFiEvent.Message != "example.com" {
		t.Errorf("Expected message 'example.com', got '%s'", uniFiEvent.Message)
	}
	if uniFiEvent.SrcIP != "192.168.1.20" {
		t.Errorf("Expected src_ip '192.168.1.20', got '%s'", uniFiEvent.SrcIP)
	}
	if uniFiEvent.DestIP != "192.168.1.1" {
		t.Errorf("Expected dest_ip '192.168.1.1', got '%s'", uniFiEvent.DestIP)
	}
	if uniFiEvent.Protocol != "UDP" {
		t.Errorf("Expected protocol 'UDP', got '%s'", uniFiEvent.Protocol)
	}
}

func TestNormalizeCEF_DeviceManagement(t *testing.T) {
	cef := &CEFMessage{
		Version:         "0",
		DeviceVendor:    "Ubiquiti",
		DeviceProduct:   "UniFi Network",
		DeviceVersion:   "10.4.57",
		SignatureID:     "DEVICE_MGMT",
		Name:            "UniFi device management event",
		Severity:        3,
		Extension: map[string]string{
			"src":  "192.168.1.2",
			"msg":  "Switch configuration changed",
		},
	}

	uniFiEvent, err := NormalizeCEF(cef)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if uniFiEvent.EventType != "management_event" {
		t.Errorf("Expected event_type 'management_event', got '%s'", uniFiEvent.EventType)
	}
	if uniFiEvent.Category != "Management" {
		t.Errorf("Expected category 'Management', got '%s'", uniFiEvent.Category)
	}
	if uniFiEvent.Message != "Switch configuration changed" {
		t.Errorf("Expected message 'Switch configuration changed', got '%s'", uniFiEvent.Message)
	}
	if uniFiEvent.SrcIP != "192.168.1.2" {
		t.Errorf("Expected src_ip '192.168.1.2', got '%s'", uniFiEvent.SrcIP)
	}
}

func TestUniFiEvent_ToDomainEvent(t *testing.T) {
	uniFiEvent := &UniFiEvent{
		Source:           "unifi_gateway",
		SourceType:       "syslog_cef",
		Vendor:           "Ubiquiti",
		Device:           "UniFi Network",
		Severity:         8,
		EventType:        "threat_detected",
		Category:         "Malware",
		Action:           "allowed",
		SrcIP:            "192.168.1.50",
		SrcPort:          51515,
		DestIP:           "8.8.8.8",
		DestPort:         53,
		Protocol:         "UDP",
		Message:          "Suspicious DNS query",
		RawMessageHash:   "abc123",
		Metadata: map[string]string{
			"unifi.signature": "IDS_ALERT",
			"unifi.category":  "Malware",
			"unifi.action":    "allowed",
		},
	}

	event, err := uniFiEvent.ToDomainEvent()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if event.Title != "Suspicious DNS query" {
		t.Errorf("Expected title 'Suspicious DNS query', got '%s'", event.Title)
	}
	if event.Severity != domain.SeverityCritical {
		t.Errorf("Expected severity Critical, got %d", event.Severity)
	}
	if event.Type.String() != "threat_detected" {
		t.Errorf("Expected event_type 'threat_detected', got '%s'", event.Type.String())
	}
	// Check that tags include unifi/cef
	tagFound := false
	for _, tag := range event.Tags {
		if tag == "unifi" || tag == "cef" {
			tagFound = true
			break
		}
	}
	if !tagFound {
		t.Error("Expected to find unifi/cef in tags")
	}
	// Check metadata
	if event.Metadata["unifi.signature"] != "IDS_ALERT" {
		t.Errorf("Expected metadata unifi.signature 'IDS_ALERT', got '%s'", event.Metadata["unifi.signature"])
	}
	if event.Metadata["unifi.category"] != "Malware" {
		t.Errorf("Expected metadata unifi.category 'Malware', got '%s'", event.Metadata["unifi.category"])
	}
	if event.Metadata["unifi.action"] != "allowed" {
		t.Errorf("Expected metadata unifi.action 'allowed', got '%s'", event.Metadata["unifi.action"])
	}
	if event.Metadata["unifi.raw_message_hash"] != "abc123" {
		t.Errorf("Expected metadata unifi.raw_message_hash 'abc123', got '%s'", event.Metadata["unifi.raw_message_hash"])
	}
}