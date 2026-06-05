package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestHashRawAddsPrefix(t *testing.T) {
	hash := hashRaw("  CEF:0|A|B|1|SIG|Name|3|msg=test\r\n")
	if !strings.HasPrefix(hash, "sha256:") {
		t.Fatalf("expected sha256 prefix, got %s", hash)
	}
}

func TestRunSampleProducesEventAndSummary(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "ids-alert.cef")
	exitCode := run([]string{"--input", path}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	if len(lines) != 2 {
		t.Fatalf("expected 2 ndjson records, got %d", len(lines))
	}
	if lines[0].ParseStatus != parseStatusOK {
		t.Fatalf("expected parse status ok, got %s", lines[0].ParseStatus)
	}
	if lines[0].Normalized == nil || lines[0].DomainEvent == nil {
		t.Fatalf("expected normalized and domain_event records")
	}
	if lines[1].Summary == nil || lines[1].Summary.Parsed != 1 {
		t.Fatalf("expected summary parsed=1, got %+v", lines[1].Summary)
	}
	if strings.Contains(stdout.String(), "CEF:0|") {
		t.Fatalf("raw should not be included by default: %s", stdout.String())
	}
}

func TestRunMultipleSamplesParsedFour(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	base := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples")
	args := []string{
		"--input", filepath.Join(base, "ids-alert.cef"),
		"--input", filepath.Join(base, "firewall-blocked.cef"),
		"--input", filepath.Join(base, "dns-query.cef"),
		"--input", filepath.Join(base, "device-management.cef"),
	}
	exitCode := run(args, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	if lines[len(lines)-1].Summary.Parsed != 4 {
		t.Fatalf("expected summary parsed=4, got %+v", lines[len(lines)-1].Summary)
	}
}

func TestRunStdinWorks(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	stdin := strings.NewReader("CEF:0|Ubiquiti|UniFi Network|10.4.57|DEVICE_MGMT|UniFi device management event|3|src=192.168.1.2 msg=Switch configuration changed\n")
	exitCode := run([]string{"--stdin"}, stdin, &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	if lines[0].Normalized == nil || lines[0].Normalized.EventType != "management_event" {
		t.Fatalf("expected management_event, got %+v", lines[0].Normalized)
	}
}

func TestRunDuplicateIncrementsDuplicates(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	stdin := strings.NewReader(strings.Join([]string{
		"CEF:0|Ubiquiti|UniFi Network|10.4.57|IDS_ALERT|Threat detected|8|src=192.168.1.50 dst=8.8.8.8 spt=51515 dpt=53 proto=UDP act=allowed msg=Suspicious DNS query",
		"CEF:0|Ubiquiti|UniFi Network|10.4.57|IDS_ALERT|Threat detected|8|src=192.168.1.50 dst=8.8.8.8 spt=51515 dpt=53 proto=UDP act=allowed msg=Suspicious DNS query",
	}, "\n"))
	exitCode := run([]string{"--stdin"}, stdin, &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	if lines[1].ParseStatus != parseStatusDup {
		t.Fatalf("expected duplicate status, got %s", lines[1].ParseStatus)
	}
	if lines[len(lines)-1].Summary.Duplicates != 1 {
		t.Fatalf("expected summary duplicates=1, got %+v", lines[len(lines)-1].Summary)
	}
}

func TestRunInvalidCEFReturnsExitOne(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := run([]string{"--stdin"}, strings.NewReader("not-cef\n"), &stdout, &stderr)
	if exitCode != exitParseError {
		t.Fatalf("expected exit 1, got %d", exitCode)
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	if lines[0].ParseStatus != parseStatusError {
		t.Fatalf("expected error status, got %s", lines[0].ParseStatus)
	}
	if !strings.Contains(lines[0].Error, "no CEF payload found") {
		t.Fatalf("expected no CEF payload found error, got %+v", lines[0])
	}
}

func TestRunMissingFileReturnsExitTwo(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := run([]string{"--input", "does-not-exist.cef"}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitInvalidInput {
		t.Fatalf("expected exit 2, got %d", exitCode)
	}
}

func TestRunOutputJSONIsValid(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "ids-alert.cef")
	exitCode := run([]string{"--input", path, "--output", outputJSON}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	var payload struct {
		Events  []outputRecord `json:"events"`
		Summary summaryOutput  `json:"summary"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid json output, got %v", err)
	}
	if len(payload.Events) != 1 || payload.Summary.Parsed != 1 {
		t.Fatalf("unexpected payload: %+v", payload)
	}
}

func TestRunSyslogEmbeddedCEFParsed(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "syslog-embedded-cef-ids-alert.log")
	exitCode := run([]string{"--input", path}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	if lines[0].ParseStatus != parseStatusOK {
		t.Fatalf("expected parse status ok, got %s", lines[0].ParseStatus)
	}
	if !contains(lines[0].Warnings, "syslog_envelope_detected") || !contains(lines[0].Warnings, "embedded_cef_extracted") {
		t.Fatalf("expected syslog extraction warnings, got %+v", lines[0].Warnings)
	}
	if lines[len(lines)-1].Summary.Parsed != 1 {
		t.Fatalf("expected summary parsed=1, got %+v", lines[len(lines)-1].Summary)
	}
}

func TestRunSyslogUniFiNoCEFSkipped(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "syslog-unifi-no-cef.log")
	exitCode := run([]string{"--input", path}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	if lines[0].ParseStatus != parseStatusSkipped {
		t.Fatalf("expected skipped status, got %s", lines[0].ParseStatus)
	}
	if !contains(lines[0].Warnings, "unsupported_unifi_syslog_no_cef") {
		t.Fatalf("expected unsupported_unifi_syslog_no_cef warning, got %+v", lines[0].Warnings)
	}
	if lines[len(lines)-1].Summary.Skipped != 1 {
		t.Fatalf("expected summary skipped=1, got %+v", lines[len(lines)-1].Summary)
	}
}

func TestRunNoiseWithoutCEFReturnsExitOne(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := run([]string{"--stdin"}, strings.NewReader("random daemon message\n"), &stdout, &stderr)
	if exitCode != exitParseError {
		t.Fatalf("expected exit 1, got %d", exitCode)
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	if lines[0].ParseStatus != parseStatusError {
		t.Fatalf("expected error status, got %s", lines[0].ParseStatus)
	}
	if lines[len(lines)-1].Summary.Errors != 1 {
		t.Fatalf("expected summary errors=1, got %+v", lines[len(lines)-1].Summary)
	}
}

func TestCollectLinesTracksEmptyLineAsSkipped(t *testing.T) {
	lines, err := collectLines(strings.NewReader("\nCEF:0|A|B|1|SIG|Name|3|msg=x\n"), "stdin")
	if err != nil {
		t.Fatalf("collectLines error = %v", err)
	}
	if len(lines) != 2 {
		t.Fatalf("expected 2 line entries, got %d", len(lines))
	}
	if !lines[0].Skipped || lines[1].Skipped {
		t.Fatalf("unexpected skipped flags: %+v", lines)
	}
}

func TestMainExitDoesNotWriteRawByDefaultForRealisticPath(t *testing.T) {
	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "sample.cef")
	content := "CEF:0|Ubiquiti|UniFi Network|10.4.57|DNS_QUERY|Gateway DNS query|3|src=192.168.1.20 dst=192.168.1.1 proto=UDP request=example.com msg=Gateway DNS query\n"
	if err := os.WriteFile(filePath, []byte(content), 0o644); err != nil {
		t.Fatalf("WriteFile error = %v", err)
	}
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := run([]string{"--input", filePath}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	if strings.Contains(stdout.String(), content) {
		t.Fatalf("expected raw not to be printed by default")
	}
}

func decodeNDJSONRecords(t *testing.T, output string) []outputRecord {
	t.Helper()
	scanner := bufio.NewScanner(strings.NewReader(output))
	records := make([]outputRecord, 0)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var record outputRecord
		if err := json.Unmarshal([]byte(line), &record); err != nil {
			t.Fatalf("failed to decode ndjson line %q: %v", line, err)
		}
		records = append(records, record)
	}
	if err := scanner.Err(); err != nil {
		t.Fatalf("scanner error: %v", err)
	}
	return records
}

func TestRunCoreDNSSampleParsedAsOperational(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational", "coredns.json.log")
	exitCode := run([]string{"--input", path}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	if lines[len(lines)-1].Summary.Parsed != 2 {
		t.Fatalf("expected summary parsed=2 (coredns + broker), got %+v", lines[len(lines)-1].Summary)
	}
	if lines[0].Normalized == nil {
		t.Fatalf("expected normalized output for first line")
	}
	if lines[0].Normalized.EventType != "dns_query" {
		t.Fatalf("expected event_type dns_query, got %s", lines[0].Normalized.EventType)
	}
}

func TestRunDPISampleParsedAsOperational(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational", "dpi.log")
	exitCode := run([]string{"--input", path}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	summary := lines[len(lines)-1].Summary
	if summary.Parsed != 4 {
		t.Fatalf("expected parsed=4, got %+v", summary)
	}
}

func TestRunODHCP6CSampleParsedAsOperational(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational", "odhcp6c.log")
	exitCode := run([]string{"--input", path}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	summary := lines[len(lines)-1].Summary
	if summary.Parsed != 3 {
		t.Fatalf("expected parsed=3, got %+v", summary)
	}
}

func TestRunEarlyoomSampleParsedAsOperational(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational", "earlyoom.log")
	exitCode := run([]string{"--input", path}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	summary := lines[len(lines)-1].Summary
	if summary.Parsed != 3 {
		t.Fatalf("expected parsed=3, got %+v", summary)
	}
}

func TestRunSyslogNgSampleParsedAsOperational(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational", "syslog-ng.log")
	exitCode := run([]string{"--input", path}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	summary := lines[len(lines)-1].Summary
	if summary.Parsed != 2 {
		t.Fatalf("expected parsed=2, got %+v", summary)
	}
}

func TestRunAllOperationalSamplesParsed(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	base := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational")
	args := []string{
		"--input", filepath.Join(base, "coredns.json.log"),
		"--input", filepath.Join(base, "dpi.log"),
		"--input", filepath.Join(base, "odhcp6c.log"),
		"--input", filepath.Join(base, "earlyoom.log"),
		"--input", filepath.Join(base, "syslog-ng.log"),
		"--input", filepath.Join(base, "unclassified.log"),
	}
	exitCode := run(args, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	summary := lines[len(lines)-1].Summary
	if summary.Parsed != 16 {
		t.Fatalf("expected parsed=16 (2+4+3+3+2+2), got %+v", summary)
	}
}

func TestRunCEFStillWorksAfterOperationalIntegration(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "ids-alert.cef")
	exitCode := run([]string{"--input", path}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	if lines[0].Normalized == nil || lines[0].Normalized.EventType != "threat_detected" {
		t.Fatalf("expected threat_detected, got %+v", lines[0].Normalized)
	}
	if lines[len(lines)-1].Summary.Parsed != 1 {
		t.Fatalf("expected parsed=1, got %+v", lines[len(lines)-1].Summary)
	}
}

func TestRunSyslogEmbeddedCEFStillWorksAfterOperationalIntegration(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "syslog-embedded-cef-ids-alert.log")
	exitCode := run([]string{"--input", path}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	lines := decodeNDJSONRecords(t, stdout.String())
	if lines[0].Normalized == nil || lines[0].Normalized.EventType != "threat_detected" {
		t.Fatalf("expected threat_detected, got %+v", lines[0].Normalized)
	}
	if lines[len(lines)-1].Summary.Parsed != 1 {
		t.Fatalf("expected parsed=1, got %+v", lines[len(lines)-1].Summary)
	}
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
