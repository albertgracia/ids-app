package suricata

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

func readFixture(t *testing.T, name string) []byte {
	t.Helper()
	path := filepath.Join("testdata", name)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	return data
}

func checkCommon(t *testing.T, evt domain.Event, expectedType domain.EventType) {
	t.Helper()
	if evt.ID == "" {
		t.Error("expected non-empty ID")
	}
	if evt.Type != expectedType {
		t.Errorf("expected Type %v, got %v", expectedType, evt.Type)
	}
	if evt.Title == "" {
		t.Error("expected non-empty Title")
	}
	if evt.Metadata == nil {
		t.Error("expected non-nil Metadata")
	}
	if evt.Metadata["suricata.event_type"] == "" {
		t.Error("expected suricata.event_type in metadata")
	}
	if err := evt.Validate(); err != nil {
		t.Errorf("Validate() failed: %v", err)
	}
}

func TestParseAlertScanDetected(t *testing.T) {
	data := readFixture(t, "alert-scan-detected.json")
	evt, err := ParseEVEJSON(data)
	if err != nil {
		t.Fatalf("ParseEVEJSON: %v", err)
	}
	checkCommon(t, evt, domain.EventTypeScanDetected)
	if evt.Severity != domain.SeverityHigh {
		t.Errorf("expected SeverityHigh, got %v", evt.Severity)
	}
	if evt.Source.IP != "10.10.1.10" {
		t.Errorf("expected source 10.10.1.10, got %s", evt.Source.IP)
	}
	if evt.Destination.IP != "172.16.100.20" {
		t.Errorf("expected dest 172.16.100.20, got %s", evt.Destination.IP)
	}
	if evt.Zone != domain.ZoneOT {
		t.Errorf("expected ZoneOT, got %v", evt.Zone)
	}
}

func TestParseFlowNormalIT(t *testing.T) {
	data := readFixture(t, "flow-normal-it.json")
	evt, err := ParseEVEJSON(data)
	if err != nil {
		t.Fatalf("ParseEVEJSON: %v", err)
	}
	checkCommon(t, evt, domain.EventTypeNetworkConnection)
	if evt.Protocol != domain.ProtocolHTTPS {
		t.Errorf("expected ProtocolHTTPS (app_proto=tls), got %v", evt.Protocol)
	}
	if evt.Zone != domain.ZoneIT {
		t.Errorf("expected ZoneIT, got %v", evt.Zone)
	}
}

func TestParseDNSQuery(t *testing.T) {
	data := readFixture(t, "dns-query.json")
	evt, err := ParseEVEJSON(data)
	if err != nil {
		t.Fatalf("ParseEVEJSON: %v", err)
	}
	checkCommon(t, evt, domain.EventTypeNetworkConnection)
	if evt.Protocol != domain.ProtocolDNS {
		t.Errorf("expected ProtocolDNS, got %v", evt.Protocol)
	}
}

func TestParseHTTPRequest(t *testing.T) {
	data := readFixture(t, "http-request.json")
	evt, err := ParseEVEJSON(data)
	if err != nil {
		t.Fatalf("ParseEVEJSON: %v", err)
	}
	checkCommon(t, evt, domain.EventTypeNetworkConnection)
	if evt.Protocol != domain.ProtocolHTTP {
		t.Errorf("expected ProtocolHTTP, got %v", evt.Protocol)
	}
	if evt.Zone != domain.ZoneIT {
		t.Errorf("expected ZoneIT, got %v", evt.Zone)
	}
}

func TestParseTLSHandshake(t *testing.T) {
	data := readFixture(t, "tls-handshake.json")
	evt, err := ParseEVEJSON(data)
	if err != nil {
		t.Fatalf("ParseEVEJSON: %v", err)
	}
	checkCommon(t, evt, domain.EventTypeNetworkConnection)
	if evt.Protocol != domain.ProtocolHTTPS {
		t.Errorf("expected ProtocolHTTPS, got %v", evt.Protocol)
	}
}

func TestParseSSHSession(t *testing.T) {
	data := readFixture(t, "ssh-session.json")
	evt, err := ParseEVEJSON(data)
	if err != nil {
		t.Fatalf("ParseEVEJSON: %v", err)
	}
	checkCommon(t, evt, domain.EventTypeNetworkConnection)
	if evt.Protocol != domain.ProtocolSSH {
		t.Errorf("expected ProtocolSSH, got %v", evt.Protocol)
	}
}

func TestParseRDPSession(t *testing.T) {
	data := readFixture(t, "rdp-session.json")
	evt, err := ParseEVEJSON(data)
	if err != nil {
		t.Fatalf("ParseEVEJSON: %v", err)
	}
	checkCommon(t, evt, domain.EventTypeNetworkConnection)
	if evt.Protocol != domain.ProtocolRDP {
		t.Errorf("expected ProtocolRDP, got %v", evt.Protocol)
	}
}

func TestParseSMBSession(t *testing.T) {
	data := readFixture(t, "smb-session.json")
	evt, err := ParseEVEJSON(data)
	if err != nil {
		t.Fatalf("ParseEVEJSON: %v", err)
	}
	checkCommon(t, evt, domain.EventTypeNetworkConnection)
	if evt.Protocol != domain.ProtocolSMB {
		t.Errorf("expected ProtocolSMB, got %v", evt.Protocol)
	}
}

func TestParseModbusRead(t *testing.T) {
	data := readFixture(t, "modbus-read.json")
	evt, err := ParseEVEJSON(data)
	if err != nil {
		t.Fatalf("ParseEVEJSON: %v", err)
	}
	checkCommon(t, evt, domain.EventTypeOTCommand)
	if evt.Protocol != domain.ProtocolModbus {
		t.Errorf("expected ProtocolModbus, got %v", evt.Protocol)
	}
	if evt.Zone != domain.ZoneOT {
		t.Errorf("expected ZoneOT, got %v", evt.Zone)
	}
	if evt.Destination.Port != 502 {
		t.Errorf("expected dest port 502, got %d", evt.Destination.Port)
	}
}

func TestParseInvalidJSON(t *testing.T) {
	_, err := ParseEVEJSON([]byte(`{invalid json}`))
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestParseUnknownEventType(t *testing.T) {
	_, err := ParseEVEJSON([]byte(`{"timestamp":"2026-01-01T00:00:00.000000+0000","event_type":"unknown","src_ip":"10.0.0.1","dest_ip":"10.0.0.2","proto":"TCP"}`))
	if err != nil {
		t.Fatalf("ParseEVEJSON: %v", err)
	}
}

func TestParsedEventsValidate(t *testing.T) {
	fixtures := []string{
		"alert-scan-detected.json",
		"flow-normal-it.json",
		"dns-query.json",
		"http-request.json",
		"tls-handshake.json",
		"ssh-session.json",
		"rdp-session.json",
		"smb-session.json",
		"modbus-read.json",
	}
	for _, name := range fixtures {
		data := readFixture(t, name)
		evt, err := ParseEVEJSON(data)
		if err != nil {
			t.Errorf("%s: ParseEVEJSON: %v", name, err)
			continue
		}
		if err := evt.Validate(); err != nil {
			t.Errorf("%s: Validate: %v", name, err)
		}
	}
}
