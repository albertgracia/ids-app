package domain

import (
	"encoding/json"
	"testing"
	"time"
)

func TestNewAssetDefaults(t *testing.T) {
	a := NewAsset(AssetTypePLC, "PLC-01")

	if a.ID == "" {
		t.Error("expected non-empty ID")
	}
	if a.Name != "PLC-01" {
		t.Errorf("expected 'PLC-01', got '%s'", a.Name)
	}
	if a.Type != AssetTypePLC {
		t.Errorf("expected AssetTypePLC, got %v", a.Type)
	}
	if a.Status != AssetStatusObserved {
		t.Errorf("expected AssetStatusObserved, got %v", a.Status)
	}
	if a.Criticality != CriticalityUnknown {
		t.Errorf("expected CriticalityUnknown, got %v", a.Criticality)
	}
	if a.Zone != ZoneUnknown {
		t.Errorf("expected ZoneUnknown, got %v", a.Zone)
	}
	if a.IPs == nil {
		t.Error("expected non-nil IPs")
	}
	if a.MACs == nil {
		t.Error("expected non-nil MACs")
	}
	if a.Protocols == nil {
		t.Error("expected non-nil Protocols")
	}
	if a.Tags == nil {
		t.Error("expected non-nil Tags")
	}
	if a.Metadata == nil {
		t.Error("expected non-nil Metadata")
	}
	if a.FirstSeen.IsZero() {
		t.Error("expected non-zero FirstSeen")
	}
	if a.LastSeen.IsZero() {
		t.Error("expected non-zero LastSeen")
	}
}

func TestAssetValidateValidAsset(t *testing.T) {
	a := Asset{
		ID:          "test-asset-1",
		Name:        "Switch-MDF-01",
		Type:        AssetTypeSwitch,
		Status:      AssetStatusKnown,
		Criticality: CriticalityHigh,
		Zone:        ZoneOT,
		IPs:         []string{"10.0.0.1"},
		MACs:        []string{"00:1B:44:11:3A:B7"},
		Protocols:   []Protocol{ProtocolModbus, ProtocolProfinet},
		FirstSeen:   time.Now().UTC().Add(-24 * time.Hour),
		LastSeen:    time.Now().UTC(),
	}
	if err := a.Validate(); err != nil {
		t.Errorf("expected valid asset, got: %v", err)
	}
}

func TestAssetValidateMissingID(t *testing.T) {
	a := Asset{
		Name:      "test",
		FirstSeen: time.Now().UTC(),
		LastSeen:  time.Now().UTC(),
	}
	if err := a.Validate(); err == nil {
		t.Error("expected error for missing ID")
	}
}

func TestAssetValidateMissingName(t *testing.T) {
	a := Asset{
		ID:        "test-id",
		FirstSeen: time.Now().UTC(),
		LastSeen:  time.Now().UTC(),
	}
	if err := a.Validate(); err == nil {
		t.Error("expected error for missing name")
	}
}

func TestAssetValidateInvalidType(t *testing.T) {
	a := Asset{
		ID:        "test-id",
		Name:      "test",
		Type:      AssetType(999),
		FirstSeen: time.Now().UTC(),
		LastSeen:  time.Now().UTC(),
	}
	if err := a.Validate(); err == nil {
		t.Error("expected error for invalid type")
	}
}

func TestAssetValidateInvalidStatus(t *testing.T) {
	a := Asset{
		ID:        "test-id",
		Name:      "test",
		Status:    AssetStatus(999),
		FirstSeen: time.Now().UTC(),
		LastSeen:  time.Now().UTC(),
	}
	if err := a.Validate(); err == nil {
		t.Error("expected error for invalid status")
	}
}

func TestAssetValidateInvalidCriticality(t *testing.T) {
	a := Asset{
		ID:          "test-id",
		Name:        "test",
		Criticality: Criticality(999),
		FirstSeen:   time.Now().UTC(),
		LastSeen:    time.Now().UTC(),
	}
	if err := a.Validate(); err == nil {
		t.Error("expected error for invalid criticality")
	}
}

func TestAssetValidateInvalidZone(t *testing.T) {
	a := Asset{
		ID:        "test-id",
		Name:      "test",
		Zone:      Zone(999),
		FirstSeen: time.Now().UTC(),
		LastSeen:  time.Now().UTC(),
	}
	if err := a.Validate(); err == nil {
		t.Error("expected error for invalid zone")
	}
}

func TestAssetValidateInvalidIP(t *testing.T) {
	a := Asset{
		ID:        "test-id",
		Name:      "test",
		IPs:       []string{"not-an-ip"},
		FirstSeen: time.Now().UTC(),
		LastSeen:  time.Now().UTC(),
	}
	if err := a.Validate(); err == nil {
		t.Error("expected error for invalid IP")
	}
}

func TestAssetValidateInvalidMAC(t *testing.T) {
	a := Asset{
		ID:        "test-id",
		Name:      "test",
		MACs:      []string{"not-a-mac"},
		FirstSeen: time.Now().UTC(),
		LastSeen:  time.Now().UTC(),
	}
	if err := a.Validate(); err == nil {
		t.Error("expected error for invalid MAC")
	}
}

func TestAssetValidateLastSeenBeforeFirstSeen(t *testing.T) {
	a := Asset{
		ID:        "test-id",
		Name:      "test",
		FirstSeen: time.Now().UTC(),
		LastSeen:  time.Now().UTC().Add(-1 * time.Hour),
	}
	if err := a.Validate(); err == nil {
		t.Error("expected error for last_seen before first_seen")
	}
}

func TestAssetTouchUpdatesLastSeen(t *testing.T) {
	now := time.Date(2026, 5, 30, 10, 0, 0, 0, time.UTC)
	a := NewAsset(AssetTypeServer, "srv-01")
	a.FirstSeen = now
	a.LastSeen = now

	later := now.Add(2 * time.Hour)
	a.Touch(later)

	if !a.LastSeen.Equal(later) {
		t.Errorf("expected LastSeen %v, got %v", later, a.LastSeen)
	}
}

func TestAssetAddIPDeduplicates(t *testing.T) {
	a := NewAsset(AssetTypeHMI, "hmi-01")
	if err := a.AddIP("10.0.0.10"); err != nil {
		t.Fatalf("AddIP failed: %v", err)
	}
	if err := a.AddIP("10.0.0.10"); err != nil {
		t.Fatalf("AddIP dedup failed: %v", err)
	}
	if len(a.IPs) != 1 {
		t.Errorf("expected 1 IP, got %d", len(a.IPs))
	}
}

func TestAssetAddIPInvalid(t *testing.T) {
	a := NewAsset(AssetTypeCamera, "cam-01")
	if err := a.AddIP("bad-ip"); err == nil {
		t.Error("expected error for invalid IP")
	}
}

func TestAssetAddMACDeduplicates(t *testing.T) {
	a := NewAsset(AssetTypePrinter, "prt-01")
	if err := a.AddMAC("AA:BB:CC:DD:EE:FF"); err != nil {
		t.Fatalf("AddMAC failed: %v", err)
	}
	if err := a.AddMAC("AA:BB:CC:DD:EE:FF"); err != nil {
		t.Fatalf("AddMAC dedup failed: %v", err)
	}
	if len(a.MACs) != 1 {
		t.Errorf("expected 1 MAC, got %d", len(a.MACs))
	}
}

func TestAssetAddMACInvalid(t *testing.T) {
	a := NewAsset(AssetTypeSensor, "sens-01")
	if err := a.AddMAC("not-a-mac"); err == nil {
		t.Error("expected error for invalid MAC")
	}
}

func TestAssetAddProtocolDeduplicates(t *testing.T) {
	a := NewAsset(AssetTypePLC, "plc-master")
	a.AddProtocol(ProtocolModbus)
	a.AddProtocol(ProtocolModbus)
	if len(a.Protocols) != 1 {
		t.Errorf("expected 1 protocol, got %d", len(a.Protocols))
	}
}

func TestAssetAddProtocolInvalid(t *testing.T) {
	a := NewAsset(AssetTypeSCADA, "scada-01")
	if err := a.AddProtocol(Protocol(999)); err == nil {
		t.Error("expected error for invalid protocol")
	}
}

func TestAssetJSONRoundTrip(t *testing.T) {
	original := Asset{
		ID:          "asset-json-1",
		Name:        "PLC-Master-01",
		Type:        AssetTypePLC,
		Status:      AssetStatusTrusted,
		Criticality: CriticalityCritical,
		Zone:        ZoneOT,
		IPs:         []string{"192.168.100.10"},
		MACs:        []string{"DE:AD:BE:EF:00:01"},
		Hostnames:   []string{"plc-master-01"},
		Vendor:      "Siemens",
		Model:       "S7-1500",
		Firmware:    "V3.1",
		Protocols:   []Protocol{ProtocolS7Comm, ProtocolProfinet},
		Tags:        []string{"critical", "ot"},
		FirstSeen:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		LastSeen:    time.Date(2026, 5, 30, 12, 0, 0, 0, time.UTC),
		Metadata:    map[string]string{"rack": "1", "slot": "2"},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}

	var decoded Asset
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: %s vs %s", decoded.ID, original.ID)
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: %s vs %s", decoded.Name, original.Name)
	}
	if decoded.Type != original.Type {
		t.Errorf("Type mismatch")
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch")
	}
	if decoded.Criticality != original.Criticality {
		t.Errorf("Criticality mismatch")
	}
	if decoded.Zone != original.Zone {
		t.Errorf("Zone mismatch")
	}
	if len(decoded.IPs) != 1 || decoded.IPs[0] != "192.168.100.10" {
		t.Errorf("IPs mismatch")
	}
	if len(decoded.Protocols) != 2 {
		t.Errorf("expected 2 protocols, got %d", len(decoded.Protocols))
	}
	if decoded.Vendor != "Siemens" {
		t.Errorf("Vendor mismatch")
	}
	if decoded.Metadata["rack"] != "1" {
		t.Errorf("Metadata mismatch")
	}
}

func TestAssetJSONFields(t *testing.T) {
	a := Asset{
		ID:          "test-fields",
		Name:        "test",
		Type:        AssetTypeServer,
		Status:      AssetStatusKnown,
		Criticality: CriticalityMedium,
		Zone:        ZoneIT,
		FirstSeen:   time.Now().UTC(),
		LastSeen:    time.Now().UTC(),
		Tags:        []string{"it"},
		Metadata:    map[string]string{"env": "dev"},
	}
	data, err := json.Marshal(a)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}

	expectedFields := []string{"id", "name", "type", "status", "criticality", "zone", "first_seen", "last_seen", "tags", "metadata"}
	for _, f := range expectedFields {
		if _, ok := raw[f]; !ok {
			t.Errorf("missing JSON field: %s", f)
		}
	}
}

func TestNewAssetUniqueIDs(t *testing.T) {
	a1 := NewAsset(AssetTypeRouter, "rtr-1")
	a2 := NewAsset(AssetTypeRouter, "rtr-2")
	if a1.ID == a2.ID {
		t.Error("expected unique IDs")
	}
}
