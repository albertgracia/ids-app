package unifi

import (
	"strings"
	"testing"
)

func TestParseOperationalSyslog_CoreDNSJSON(t *testing.T) {
	line := `Jun  5 12:00:00 OBS-HOST Cloud-Gateway-Fiber-Labraza coredns[1234]: {"timestamp":"2026-06-05T12:00:00+02:00","type":"dnsAdBlock","category":"ADVERTISEMENT","domain":"example.com","action":"blocked","src_ip":"192.168.1.10","dst_ip":"127.0.0.1","protocol":"udp"}`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.Process != "coredns" {
		t.Errorf("expected process coredns, got %s", msg.Process)
	}
	if msg.Kind != KindDNSGatewayEvent {
		t.Errorf("expected kind dns_gateway_event, got %s", msg.Kind)
	}
	if !msg.HasJSON {
		t.Errorf("expected has_json=true")
	}
	if msg.PID != "1234" {
		t.Errorf("expected pid 1234, got %s", msg.PID)
	}
	if msg.RsyslogHost != "OBS-HOST" {
		t.Errorf("expected rsyslog_host OBS-HOST, got %s", msg.RsyslogHost)
	}
	if msg.DeviceHost != "Cloud-Gateway-Fiber-Labraza" {
		t.Errorf("expected device_host Cloud-Gateway-Fiber-Labraza, got %s", msg.DeviceHost)
	}
	if len(msg.Warnings) > 0 {
		t.Errorf("expected no warnings for different hostnames, got %v", msg.Warnings)
	}
	domain, ok := msg.JSONFields["domain"].(string)
	if !ok || domain != "example.com" {
		t.Errorf("expected domain example.com, got %v", msg.JSONFields["domain"])
	}
}

func TestParseOperationalSyslog_DPITimeout(t *testing.T) {
	line := `Jun  5 12:01:00 OBS-HOST Cloud-Gateway-Fiber-Labraza ubios-udapi-server[2036]: [error] ubnt-dpi-util: connect: The socket was closed due to a timeout`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.Process != "ubios-udapi-server" {
		t.Errorf("expected process ubios-udapi-server, got %s", msg.Process)
	}
	if msg.Kind != KindDPIEvent {
		t.Errorf("expected kind dpi_event, got %s", msg.Kind)
	}
	if msg.PID != "2036" {
		t.Errorf("expected pid 2036, got %s", msg.PID)
	}
}

func TestParseOperationalSyslog_DPIFailure(t *testing.T) {
	line := `Jun  5 12:01:30 OBS-HOST Cloud-Gateway-Fiber-Labraza ubios-udapi-server[2036]: [warn ] ubnt-dpi-util: dpi ml request failed`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.Kind != KindDPIEvent {
		t.Errorf("expected kind dpi_event, got %s", msg.Kind)
	}
}

func TestParseOperationalSyslog_ODHCP6CSolicitFailure(t *testing.T) {
	line := `Jun  5 12:02:00 OBS-HOST Cloud-Gateway-Fiber-Labraza odhcp6c[5397]: Failed to send SOLICIT message to ff02::1:2 (Cannot assign requested address)`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.Process != "odhcp6c" {
		t.Errorf("expected process odhcp6c, got %s", msg.Process)
	}
	if msg.Kind != KindDHCPIPv6Event {
		t.Errorf("expected kind dhcp_ipv6_event, got %s", msg.Kind)
	}
}

func TestParseOperationalSyslog_ODHCP6CThroughUbios(t *testing.T) {
	line := `Jun  5 12:02:00 OBS-HOST Cloud-Gateway-Fiber-Labraza ubios-udapi-server[5397]: odhcp6c[5397]: Failed to send SOLICIT message to ff02::1:2 (Cannot assign requested address)`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.Process != "ubios-udapi-server" {
		t.Errorf("expected process ubios-udapi-server, got %s", msg.Process)
	}
	if msg.Kind != KindDHCPIPv6Event {
		t.Errorf("expected kind dhcp_ipv6_event, got %s", msg.Kind)
	}
}

func TestParseOperationalSyslog_Earlyoom(t *testing.T) {
	line := `Jun  5 12:03:00 OBS-HOST Cloud-Gateway-Fiber-Labraza earlyoom[787]: mem avail:   588 of  2891 MiB (20.36%), swap free: 1302 of 1445 MiB (90.13%)`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.Process != "earlyoom" {
		t.Errorf("expected process earlyoom, got %s", msg.Process)
	}
	if msg.Kind != KindGatewayHealthEvent {
		t.Errorf("expected kind gateway_health_event, got %s", msg.Kind)
	}
	if msg.PID != "787" {
		t.Errorf("expected pid 787, got %s", msg.PID)
	}
}

func TestParseOperationalSyslog_SyslogNg(t *testing.T) {
	line := `Jun  5 12:04:00 OBS-HOST Cloud-Gateway-Fiber-Labraza syslog-ng[6679]: syslog-ng starting up; version='4.7.0'`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.Process != "syslog-ng" {
		t.Errorf("expected process syslog-ng, got %s", msg.Process)
	}
	if msg.Kind != KindSyslogOperational {
		t.Errorf("expected kind syslog_operational_event, got %s", msg.Kind)
	}
}

func TestParseOperationalSyslog_Unclassified(t *testing.T) {
	line := `Jun  5 12:05:00 OBS-HOST Cloud-Gateway-Fiber-Labraza unknown-service[6666]: generic operational message from an unrecognized process`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.Kind != KindUnclassified {
		t.Errorf("expected kind unclassified, got %s", msg.Kind)
	}
}

func TestParseOperationalSyslog_DuplicatedHostnameEnvelope(t *testing.T) {
	line := `Jun  5 12:00:00 OBS-HOST OBS-HOST coredns[1234]: test message`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.RsyslogHost != "OBS-HOST" || msg.DeviceHost != "OBS-HOST" {
		t.Errorf("expected both hosts OBS-HOST, got %s / %s", msg.RsyslogHost, msg.DeviceHost)
	}
	if len(msg.Warnings) == 0 || msg.Warnings[0] != "duplicated_hostname_envelope" {
		t.Errorf("expected duplicated_hostname_envelope, got %v", msg.Warnings)
	}
}

func TestParseOperationalSyslog_MissingSecondHostname(t *testing.T) {
	line := `Jun  5 12:00:00 OBS-HOST coredns[1234]: test message`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.RsyslogHost != "OBS-HOST" {
		t.Errorf("expected rsyslog_host OBS-HOST, got %s", msg.RsyslogHost)
	}
	if msg.DeviceHost != "" {
		t.Errorf("expected empty device_host, got %s", msg.DeviceHost)
	}
	if len(msg.Warnings) == 0 || msg.Warnings[0] != "missing_second_hostname" {
		t.Errorf("expected missing_second_hostname, got %v", msg.Warnings)
	}
}

func TestParseOperationalSyslog_MissingPID(t *testing.T) {
	line := `Jun  5 12:00:00 OBS-HOST Cloud-Gateway-Fiber-Labraza earlyoom: mem avail: 588 of 2891 MiB (20.36%)`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.PID != "" {
		t.Errorf("expected empty pid, got %s", msg.PID)
	}
	warnFound := false
	for _, w := range msg.Warnings {
		if w == "missing_pid" {
			warnFound = true
		}
	}
	if !warnFound {
		t.Errorf("expected missing_pid warning, got %v", msg.Warnings)
	}
}

func TestParseOperationalSyslog_EmptyLine(t *testing.T) {
	_, err := ParseOperationalSyslog("")
	if err == nil {
		t.Error("expected error for empty line, got nil")
	}
}

func TestParseOperationalSyslog_InvalidFormat(t *testing.T) {
	_, err := ParseOperationalSyslog("not a syslog message at all")
	if err != ErrUnsupportedOperationalFormat {
		t.Errorf("expected ErrUnsupportedOperationalFormat, got %v", err)
	}
}

func TestNormalizeOperational_CoreDNSJSON(t *testing.T) {
	line := `Jun  5 12:00:00 OBS-HOST Cloud-Gateway-Fiber-Labraza coredns[1234]: {"timestamp":"2026-06-05T12:00:00+02:00","type":"dnsAdBlock","category":"ADVERTISEMENT","domain":"example.com","action":"blocked"}`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	event := NormalizeOperational(msg)
	if event.Source != "unifi_gateway" {
		t.Errorf("expected source unifi_gateway, got %s", event.Source)
	}
	if event.SourceType != "operational_syslog" {
		t.Errorf("expected source_type operational_syslog, got %s", event.SourceType)
	}
	if event.EventType != "dns_query" {
		t.Errorf("expected event_type dns_query, got %s", event.EventType)
	}
	if event.Severity != 3 {
		t.Errorf("expected severity 3 (blocked action), got %d", event.Severity)
	}
	if event.Metadata["unifi.event_kind"] != "dns_gateway_event" {
		t.Errorf("expected metadata event_kind dns_gateway_event, got %s", event.Metadata["unifi.event_kind"])
	}
	if event.Metadata["parser"] != "unifi_operational" {
		t.Errorf("expected parser unifi_operational, got %s", event.Metadata["parser"])
	}
	if strings.HasPrefix(event.RawMessageHash, "sha256:") != true {
		t.Errorf("expected raw_message_hash sha256: prefix, got %s", event.RawMessageHash)
	}

	domainEvent, err := event.ToDomainEvent()
	if err != nil {
		t.Fatalf("expected no error from ToDomainEvent, got %v", err)
	}
	if domainEvent.Title == "" {
		t.Error("expected non-empty title")
	}
}

func TestNormalizeOperational_DPI(t *testing.T) {
	line := `Jun  5 12:01:00 OBS-HOST Cloud-Gateway-Fiber-Labraza ubios-udapi-server[2036]: [error] ubnt-dpi-util: connect: The socket was closed due to a timeout`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	event := NormalizeOperational(msg)
	if event.EventType != "network_connection" {
		t.Errorf("expected event_type network_connection, got %s", event.EventType)
	}
	if event.Severity != 3 {
		t.Errorf("expected severity 3, got %d", event.Severity)
	}
	if event.Metadata["unifi.event_kind"] != "dpi_event" {
		t.Errorf("expected event_kind dpi_event, got %s", event.Metadata["unifi.event_kind"])
	}
}

func TestNormalizeOperational_GatewayHealthMemory(t *testing.T) {
	line := `Jun  5 12:03:00 OBS-HOST Cloud-Gateway-Fiber-Labraza earlyoom[787]: mem avail:   588 of  2891 MiB (20.36%), swap free: 1302 of 1445 MiB (90.13%)`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	event := NormalizeOperational(msg)
	if event.EventType != "system" {
		t.Errorf("expected event_type system, got %s", event.EventType)
	}
	if event.Severity != 0 {
		t.Errorf("expected severity 0 (info - no pressure), got %d", event.Severity)
	}
}

func TestParseOperationalSyslog_UniFiMQBroker(t *testing.T) {
	line := `Jun  5 12:00:05 OBS-HOST Cloud-Gateway-Fiber-Labraza unifi-mq-broker[2236]: Failed to send request to coredns: Post "http://localhost/api/get_domain_by_ip": dial unix /run/utm/.cd_example.com: connect: resource temporarily unavailable`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.Process != "unifi-mq-broker" {
		t.Errorf("expected process unifi-mq-broker, got %s", msg.Process)
	}
	if msg.Kind != KindDNSGatewayEvent {
		t.Errorf("expected kind dns_gateway_event, got %s", msg.Kind)
	}
}

func TestParseOperationalSyslog_WithPathInProcess(t *testing.T) {
	line := `Jun  5 12:06:00 OBS-HOST Cloud-Gateway-Fiber-Labraza /usr/bin/coredns[5926]: test message`
	msg, err := ParseOperationalSyslog(line)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if msg.Process != "coredns" {
		t.Errorf("expected process coredns (not /usr/bin/coredns), got %s", msg.Process)
	}
}
