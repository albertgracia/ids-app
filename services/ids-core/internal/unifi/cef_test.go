package unifi

import (
	"testing"
	"strings"
)

func TestParseCEF_ValidIDSAlert(t *testing.T) {
	line := `CEF:0|Ubiquiti|UniFi Network|10.4.57|IDS_ALERT|Threat detected|8|src=192.168.1.50 dst=8.8.8.8 spt=51515 dpt=53 proto=UDP act=allowed msg=Suspicious DNS query cs1Label=category cs1=Malware`
	msg, err := ParseCEF(line)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if msg.Version != "0" {
		t.Errorf("Expected version '0', got '%s'", msg.Version)
	}
	if msg.DeviceVendor != "Ubiquiti" {
		t.Errorf("Expected device vendor 'Ubiquiti', got '%s'", msg.DeviceVendor)
	}
	if msg.DeviceProduct != "UniFi Network" {
		t.Errorf("Expected device product 'UniFi Network', got '%s'", msg.DeviceProduct)
	}
	if msg.DeviceVersion != "10.4.57" {
		t.Errorf("Expected device version '10.4.57', got '%s'", msg.DeviceVersion)
	}
	if msg.SignatureID != "IDS_ALERT" {
		t.Errorf("Expected signature ID 'IDS_ALERT', got '%s'", msg.SignatureID)
	}
	if msg.Name != "Threat detected" {
		t.Errorf("Expected name 'Threat detected', got '%s'", msg.Name)
	}
	if msg.Severity != 8 {
		t.Errorf("Expected severity 8, got %d", msg.Severity)
	}
	if msg.Extension["src"] != "192.168.1.50" {
		t.Errorf("Expected src '192.168.1.50', got '%s'", msg.Extension["src"])
	}
	if msg.Extension["dst"] != "8.8.8.8" {
		t.Errorf("Expected dst '8.8.8.8', got '%s'", msg.Extension["dst"])
	}
	if msg.Extension["spt"] != "51515" {
		t.Errorf("Expected spt '51515', got '%s'", msg.Extension["spt"])
	}
	if msg.Extension["dpt"] != "53" {
		t.Errorf("Expected dpt '53', got '%s'", msg.Extension["dpt"])
	}
	if msg.Extension["proto"] != "UDP" {
		t.Errorf("Expected proto 'UDP', got '%s'", msg.Extension["proto"])
	}
	if msg.Extension["act"] != "allowed" {
		t.Errorf("Expected act 'allowed', got '%s'", msg.Extension["act"])
	}
	if msg.Extension["msg"] != "Suspicious DNS query" {
		t.Errorf("Expected msg 'Suspicious DNS query', got '%s'", msg.Extension["msg"])
	}
	if msg.Extension["cs1Label"] != "category" {
		t.Errorf("Expected cs1Label 'category', got '%s'", msg.Extension["cs1Label"])
	}
	if msg.Extension["cs1"] != "Malware" {
		t.Errorf("Expected cs1 'Malware', got '%s'", msg.Extension["cs1"])
	}
}

func TestParseCEF_ValidFirewallBlocked(t *testing.T) {
	line := `CEF:0|Ubiquiti|UniFi Network|10.4.57|FIREWALL_BLOCK|Blocked connection|6|src=192.168.1.100 dst=203.0.113.10 spt=44321 dpt=22 proto=TCP act=blocked msg=Blocked WAN SSH attempt`
	msg, err := ParseCEF(line)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if msg.Version != "0" {
		t.Errorf("Expected version '0', got '%s'", msg.Version)
	}
	if msg.DeviceVendor != "Ubiquiti" {
		t.Errorf("Expected device vendor 'Ubiquiti', got '%s'", msg.DeviceVendor)
	}
	if msg.DeviceProduct != "UniFi Network" {
		t.Errorf("Expected device product 'UniFi Network', got '%s'", msg.DeviceProduct)
	}
	if msg.DeviceVersion != "10.4.57" {
		t.Errorf("Expected device version '10.4.57', got '%s'", msg.DeviceVersion)
	}
	if msg.SignatureID != "FIREWALL_BLOCK" {
		t.Errorf("Expected signature ID 'FIREWALL_BLOCK', got '%s'", msg.SignatureID)
	}
	if msg.Name != "Blocked connection" {
		t.Errorf("Expected name 'Blocked connection', got '%s'", msg.Name)
	}
	if msg.Severity != 6 {
		t.Errorf("Expected severity 6, got %d", msg.Severity)
	}
	if msg.Extension["src"] != "192.168.1.100" {
		t.Errorf("Expected src '192.168.1.100', got '%s'", msg.Extension["src"])
	}
	if msg.Extension["dst"] != "203.0.113.10" {
		t.Errorf("Expected dst '203.0.113.10', got '%s'", msg.Extension["dst"])
	}
	if msg.Extension["spt"] != "44321" {
		t.Errorf("Expected spt '44321', got '%s'", msg.Extension["spt"])
	}
	if msg.Extension["dpt"] != "22" {
		t.Errorf("Expected dpt '22', got '%s'", msg.Extension["dpt"])
	}
	if msg.Extension["proto"] != "TCP" {
		t.Errorf("Expected proto 'TCP', got '%s'", msg.Extension["proto"])
	}
	if msg.Extension["act"] != "blocked" {
		t.Errorf("Expected act 'blocked', got '%s'", msg.Extension["act"])
	}
	if msg.Extension["msg"] != "Blocked WAN SSH attempt" {
		t.Errorf("Expected msg 'Blocked WAN SSH attempt', got '%s'", msg.Extension["msg"])
	}
}

func TestParseCEF_ValidDNSQuery(t *testing.T) {
	line := `CEF:0|Ubiquiti|UniFi Network|10.4.57|DNS_QUERY|Gateway DNS query|3|src=192.168.1.20 dst=192.168.1.1 proto=UDP request=example.com msg=Gateway DNS query`
	msg, err := ParseCEF(line)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if msg.Version != "0" {
		t.Errorf("Expected version '0', got '%s'", msg.Version)
	}
	if msg.DeviceVendor != "Ubiquiti" {
		t.Errorf("Expected device vendor 'Ubiquiti', got '%s'", msg.DeviceVendor)
	}
	if msg.DeviceProduct != "UniFi Network" {
		t.Errorf("Expected device product 'UniFi Network', got '%s'", msg.DeviceProduct)
	}
	if msg.DeviceVersion != "10.4.57" {
		t.Errorf("Expected device version '10.4.57', got '%s'", msg.DeviceVersion)
	}
	if msg.SignatureID != "DNS_QUERY" {
		t.Errorf("Expected signature ID 'DNS_QUERY', got '%s'", msg.SignatureID)
	}
	if msg.Name != "Gateway DNS query" {
		t.Errorf("Expected name 'Gateway DNS query', got '%s'", msg.Name)
	}
	if msg.Severity != 3 {
		t.Errorf("Expected severity 3, got %d", msg.Severity)
	}
	if msg.Extension["src"] != "192.168.1.20" {
		t.Errorf("Expected src '192.168.1.20', got '%s'", msg.Extension["src"])
	}
	if msg.Extension["dst"] != "192.168.1.1" {
		t.Errorf("Expected dst '192.168.1.1', got '%s'", msg.Extension["dst"])
	}
	if msg.Extension["proto"] != "UDP" {
		t.Errorf("Expected proto 'UDP', got '%s'", msg.Extension["proto"])
	}
	if msg.Extension["request"] != "example.com" {
		t.Errorf("Expected request 'example.com', got '%s'", msg.Extension["request"])
	}
	if msg.Extension["msg"] != "Gateway DNS query" {
		t.Errorf("Expected msg 'Gateway DNS query', got '%s'", msg.Extension["msg"])
	}
}

func TestParseCEF_ValidDeviceManagement(t *testing.T) {
	line := `CEF:0|Ubiquiti|UniFi Network|10.4.57|DEVICE_MGMT|UniFi device management event|3|src=192.168.1.2 msg=Switch configuration changed`
	msg, err := ParseCEF(line)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if msg.Version != "0" {
		t.Errorf("Expected version '0', got '%s'", msg.Version)
	}
	if msg.DeviceVendor != "Ubiquiti" {
		t.Errorf("Expected device vendor 'Ubiquiti', got '%s'", msg.DeviceVendor)
	}
	if msg.DeviceProduct != "UniFi Network" {
		t.Errorf("Expected device product 'UniFi Network', got '%s'", msg.DeviceProduct)
	}
	if msg.DeviceVersion != "10.4.57" {
		t.Errorf("Expected device version '10.4.57', got '%s'", msg.DeviceVersion)
	}
	if msg.SignatureID != "DEVICE_MGMT" {
		t.Errorf("Expected signature ID 'DEVICE_MGMT', got '%s'", msg.SignatureID)
	}
	if msg.Name != "UniFi device management event" {
		t.Errorf("Expected name 'UniFi device management event', got '%s'", msg.Name)
	}
	if msg.Severity != 3 {
		t.Errorf("Expected severity 3, got %d", msg.Severity)
	}
	if msg.Extension["src"] != "192.168.1.2" {
		t.Errorf("Expected src '192.168.1.2', got '%s'", msg.Extension["src"])
	}
	if msg.Extension["msg"] != "Switch configuration changed" {
		t.Errorf("Expected msg 'Switch configuration changed', got '%s'", msg.Extension["msg"])
	}
}

func TestParseCEF_EmptyLine(t *testing.T) {
	_, err := ParseCEF("")
	if err == nil {
		t.Error("Expected error for empty line, got nil")
	}
	// Just check that we got an error
	if err == nil {
		t.Errorf("Expected error for empty line, got nil")
	}
}

func TestParseCEF_InvalidPrefix(t *testing.T) {
	line := `CEEF:0|Ubiquiti|UniFi Network|10.4.57|IDS_ALERT|Threat detected|8|src=192.168.1.50 dst=8.8.8.8 spt=51515 dpt=53 proto=UDP act=allowed msg=Suspicious DNS query`
	_, err := ParseCEF(line)
	if err == nil {
		t.Error("Expected error for invalid CEF prefix, got nil")
	}
	if !strings.Contains(err.Error(), "invalid CEF prefix") {
		t.Errorf("Expected error about invalid CEF prefix, got %v", err)
	}
}

func TestParseCEF_InsufficientFields(t *testing.T) {
	line := `CEF:0|Ubiquiti|UniFi Network|10.4.57|IDS_ALERT|Threat detected|8` // Only 7 parts, missing extension
	_, err := ParseCEF(line)
	if err == nil {
		t.Error("Expected error for insufficient fields, got nil")
	}
	if !strings.Contains(err.Error(), "invalid CEF format") {
		t.Errorf("Expected error about insufficient fields, got %v", err)
	}
}

func TestParseExtensions_Simple(t *testing.T) {
	ext := parseExtensions(`src=192.168.1.1 dst=192.168.1.2`)
	if ext["src"] != "192.168.1.1" {
		t.Errorf("Expected src '192.168.1.1', got '%s'", ext["src"])
	}
	if ext["dst"] != "192.168.1.2" {
		t.Errorf("Expected dst '192.168.1.2', got '%s'", ext["dst"])
	}
	if len(ext) != 2 {
		t.Errorf("Expected 2 extensions, got %d", len(ext))
	}
}

func TestParseExtensions_WithSpacesInValue(t *testing.T) {
	ext := parseExtensions(`msg=Hello World test`)
	if ext["msg"] != "Hello World test" {
		t.Errorf("Expected msg 'Hello World test', got '%s'", ext["msg"])
	}
	if len(ext) != 1 {
		t.Errorf("Expected 1 extension, got %d", len(ext))
	}
}

func TestParseExtensions_Mixed(t *testing.T) {
	ext := parseExtensions(`src=192.168.1.1 msg=Hello World test dst=10.0.0.1`)
	if ext["src"] != "192.168.1.1" {
		t.Errorf("Expected src '192.168.1.1', got '%s'", ext["src"])
	}
	if ext["msg"] != "Hello World test" {
		t.Errorf("Expected msg 'Hello World test', got '%s'", ext["msg"])
	}
	if ext["dst"] != "10.0.0.1" {
		t.Errorf("Expected dst '10.0.0.1', got '%s'", ext["dst"])
	}
	if len(ext) != 3 {
		t.Errorf("Expected 3 extensions, got %d", len(ext))
	}
}

func TestParseExtensions_Empty(t *testing.T) {
	ext := parseExtensions(``)
	if len(ext) != 0 {
		t.Errorf("Expected 0 extensions, got %d", len(ext))
	}
}