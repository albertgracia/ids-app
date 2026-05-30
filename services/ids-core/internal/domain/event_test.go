package domain

import (
	"encoding/json"
	"testing"
	"time"
)

func TestNewEventDefaults(t *testing.T) {
	e := NewEvent(EventTypeNetworkConnection, SeverityMedium, "Test event")

	if e.ID == "" {
		t.Error("expected non-empty ID")
	}
	if e.Timestamp.IsZero() {
		t.Error("expected non-zero timestamp")
	}
	if e.Timestamp.Location() != time.UTC {
		t.Error("expected UTC timestamp")
	}
	if e.Type != EventTypeNetworkConnection {
		t.Errorf("expected EventTypeNetworkConnection, got %v", e.Type)
	}
	if e.Severity != SeverityMedium {
		t.Errorf("expected SeverityMedium, got %v", e.Severity)
	}
	if e.Protocol != ProtocolUnknown {
		t.Errorf("expected ProtocolUnknown, got %v", e.Protocol)
	}
	if e.Direction != DirectionUnknown {
		t.Errorf("expected DirectionUnknown, got %v", e.Direction)
	}
	if e.Zone != ZoneUnknown {
		t.Errorf("expected ZoneUnknown, got %v", e.Zone)
	}
	if e.Title != "Test event" {
		t.Errorf("expected 'Test event', got '%s'", e.Title)
	}
	if e.Tags == nil {
		t.Error("expected non-nil Tags")
	}
	if e.Metadata == nil {
		t.Error("expected non-nil Metadata")
	}
}

func TestEventValidateValidEvent(t *testing.T) {
	e := Event{
		ID:        "test-id",
		Timestamp: time.Now().UTC(),
		Type:      EventTypeScanDetected,
		Severity:  SeverityHigh,
		Protocol:  ProtocolHTTP,
		Direction: DirectionInbound,
		Zone:      ZoneDMZ,
		Title:     "Scan detected",
		Source:    Endpoint{IP: "10.0.0.1", Port: 12345},
		Destination: Endpoint{IP: "192.168.1.100", Port: 80},
	}
	if err := e.Validate(); err != nil {
		t.Errorf("expected valid event, got: %v", err)
	}
}

func TestEventValidateMissingID(t *testing.T) {
	e := Event{
		Timestamp: time.Now().UTC(),
		Type:      EventTypeSystem,
		Severity:  SeverityInfo,
		Protocol:  ProtocolUnknown,
		Title:     "test",
	}
	if err := e.Validate(); err == nil {
		t.Error("expected error for missing ID")
	}
}

func TestEventValidateMissingTitle(t *testing.T) {
	e := Event{
		ID:        "test-id",
		Timestamp: time.Now().UTC(),
		Type:      EventTypeSystem,
		Severity:  SeverityInfo,
		Protocol:  ProtocolUnknown,
	}
	if err := e.Validate(); err == nil {
		t.Error("expected error for missing title")
	}
}

func TestEventValidateInvalidSeverity(t *testing.T) {
	e := Event{
		ID:        "test-id",
		Timestamp: time.Now().UTC(),
		Type:      EventTypeSystem,
		Severity:  Severity(-1),
		Protocol:  ProtocolUnknown,
		Title:     "test",
	}
	if err := e.Validate(); err == nil {
		t.Error("expected error for invalid severity")
	}
}

func TestEventValidateInvalidProtocol(t *testing.T) {
	e := Event{
		ID:        "test-id",
		Timestamp: time.Now().UTC(),
		Type:      EventTypeSystem,
		Severity:  SeverityInfo,
		Protocol:  Protocol(999),
		Title:     "test",
	}
	if err := e.Validate(); err == nil {
		t.Error("expected error for invalid protocol")
	}
}

func TestEventValidateInvalidSourceIP(t *testing.T) {
	e := Event{
		ID:        "test-id",
		Timestamp: time.Now().UTC(),
		Type:      EventTypeSystem,
		Severity:  SeverityInfo,
		Protocol:  ProtocolUnknown,
		Source:    Endpoint{IP: "not-an-ip"},
		Title:     "test",
	}
	if err := e.Validate(); err == nil {
		t.Error("expected error for invalid source IP")
	}
}

func TestEventValidateInvalidDestinationIP(t *testing.T) {
	e := Event{
		ID:        "test-id",
		Timestamp: time.Now().UTC(),
		Type:      EventTypeSystem,
		Severity:  SeverityInfo,
		Protocol:  ProtocolUnknown,
		Destination: Endpoint{IP: "999.999.999.999"},
		Title:       "test",
	}
	if err := e.Validate(); err == nil {
		t.Error("expected error for invalid destination IP")
	}
}

func TestEventValidateInvalidPort(t *testing.T) {
	e := Event{
		ID:        "test-id",
		Timestamp: time.Now().UTC(),
		Type:      EventTypeSystem,
		Severity:  SeverityInfo,
		Protocol:  ProtocolUnknown,
		Source:    Endpoint{Port: 99999},
		Title:     "test",
	}
	if err := e.Validate(); err == nil {
		t.Error("expected error for invalid port")
	}
}

func TestEventJSONRoundTrip(t *testing.T) {
	original := Event{
		ID:        "json-test-1",
		Timestamp: time.Date(2026, 5, 30, 12, 0, 0, 0, time.UTC),
		Type:      EventTypeAuthFailure,
		Severity:  SeverityCritical,
		Protocol:  ProtocolSSH,
		Direction: DirectionExternal,
		Zone:      ZoneDMZ,
		Title:     "SSH brute force",
		Description: "Multiple failed SSH login attempts",
		Source:    Endpoint{IP: "185.156.173.10", Port: 54321, Hostname: "attacker.example.com"},
		Destination: Endpoint{IP: "10.0.0.5", Port: 22, Hostname: "server.internal"},
		Tags:      []string{"ssh", "brute-force", "external"},
		Metadata:  map[string]string{"country": "RU", "asn": "AS12345"},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}

	var decoded Event
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: %s vs %s", decoded.ID, original.ID)
	}
	if decoded.Type != original.Type {
		t.Errorf("Type mismatch: %v vs %v", decoded.Type, original.Type)
	}
	if decoded.Severity != original.Severity {
		t.Errorf("Severity mismatch: %v vs %v", decoded.Severity, original.Severity)
	}
	if decoded.Protocol != original.Protocol {
		t.Errorf("Protocol mismatch: %v vs %v", decoded.Protocol, original.Protocol)
	}
	if decoded.Direction != original.Direction {
		t.Errorf("Direction mismatch: %v vs %v", decoded.Direction, original.Direction)
	}
	if decoded.Zone != original.Zone {
		t.Errorf("Zone mismatch: %v vs %v", decoded.Zone, original.Zone)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: %s vs %s", decoded.Title, original.Title)
	}
	if !decoded.Timestamp.Equal(original.Timestamp) {
		t.Errorf("Timestamp mismatch: %v vs %v", decoded.Timestamp, original.Timestamp)
	}
	if decoded.Source.IP != original.Source.IP {
		t.Errorf("Source IP mismatch: %s vs %s", decoded.Source.IP, original.Source.IP)
	}
	if decoded.Destination.Port != original.Destination.Port {
		t.Errorf("Dest port mismatch: %d vs %d", decoded.Destination.Port, original.Destination.Port)
	}
	if len(decoded.Tags) != len(original.Tags) {
		t.Errorf("Tags length mismatch: %d vs %d", len(decoded.Tags), len(original.Tags))
	}
	if decoded.Metadata["country"] != "RU" {
		t.Errorf("Metadata country mismatch: %s", decoded.Metadata["country"])
	}
}

func TestEventJSONFields(t *testing.T) {
	e := Event{
		ID:        "json-fields-test",
		Timestamp: time.Now().UTC(),
		Type:      EventTypeAssetDiscovered,
		Severity:  SeverityLow,
		Protocol:  ProtocolUnknown,
		Direction: DirectionUnknown,
		Zone:      ZoneUnknown,
		Title:     "New asset",
		Tags:      []string{"ot"},
		Metadata:  map[string]string{"vendor": "siemens"},
	}
	data, err := json.Marshal(e)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("unmarshal to map error: %v", err)
	}

	expectedFields := []string{"id", "timestamp", "type", "severity", "protocol", "source", "destination", "direction", "zone", "title", "tags", "metadata"}
	for _, field := range expectedFields {
		if _, ok := raw[field]; !ok {
			t.Errorf("missing JSON field: %s", field)
		}
	}
}

func TestNewEventUniqueIDs(t *testing.T) {
	e1 := NewEvent(EventTypeSystem, SeverityInfo, "event 1")
	e2 := NewEvent(EventTypeSystem, SeverityInfo, "event 2")
	if e1.ID == e2.ID {
		t.Error("expected unique IDs")
	}
}

func TestEventSeverityOrder(t *testing.T) {
	if SeverityInfo >= SeverityLow {
		t.Error("expected Info < Low")
	}
	if SeverityLow >= SeverityMedium {
		t.Error("expected Low < Medium")
	}
	if SeverityMedium >= SeverityHigh {
		t.Error("expected Medium < High")
	}
	if SeverityHigh >= SeverityCritical {
		t.Error("expected High < Critical")
	}
}
