package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCollectLinesSkipsBlankLines(t *testing.T) {
	reader := strings.NewReader("\nCEF:0|A|B|1|SIG|Name|3|msg=one\n\r\nCEF:0|A|B|1|SIG|Name|3|msg=two\n")
	lines, err := collectLines(reader, "stdin")
	if err != nil {
		t.Fatalf("collectLines() error = %v", err)
	}
	if len(lines) != 2 {
		t.Fatalf("expected 2 lines, got %d", len(lines))
	}
	if lines[0].Line != 2 || lines[1].Line != 4 {
		t.Fatalf("unexpected line numbers: %+v", lines)
	}
}

func TestRunWithRepeatedInputAndBothOutput(t *testing.T) {
	tempDir := t.TempDir()
	fileOne := filepath.Join(tempDir, "one.cef")
	fileTwo := filepath.Join(tempDir, "two.cef")
	if err := os.WriteFile(fileOne, []byte("CEF:0|Ubiquiti|UniFi Network|10.4.57|IDS_ALERT|Threat detected|8|src=192.168.1.50 dst=8.8.8.8 spt=51515 dpt=53 proto=UDP act=allowed msg=Suspicious DNS query\n"), 0o644); err != nil {
		t.Fatalf("WriteFile(one) error = %v", err)
	}
	if err := os.WriteFile(fileTwo, []byte("CEF:0|Ubiquiti|UniFi Network|10.4.57|DNS_QUERY|Gateway DNS query|3|src=192.168.1.20 dst=192.168.1.1 proto=UDP request=example.com msg=Gateway DNS query\n"), 0o644); err != nil {
		t.Fatalf("WriteFile(two) error = %v", err)
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := run([]string{"--input", fileOne, "--input", fileTwo, "--output", "both"}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	output := stdout.String()
	if !strings.Contains(output, `"normalized"`) || !strings.Contains(output, `"domain_event"`) {
		t.Fatalf("unexpected output: %s", output)
	}
	if !strings.Contains(output, `"event_type": "threat_detected"`) {
		t.Fatalf("missing normalized event type: %s", output)
	}
	if !strings.Contains(output, `"type": "dns_query"`) {
		t.Fatalf("missing domain event type: %s", output)
	}
	if !strings.Contains(output, `"protocol": "udp"`) {
		t.Fatalf("missing mapped domain protocol: %s", output)
	}
}

func TestRunWithStdinOnly(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	stdin := strings.NewReader("CEF:0|Ubiquiti|UniFi Network|10.4.57|DEVICE_MGMT|UniFi device management event|3|src=192.168.1.2 msg=Switch configuration changed\n")
	exitCode := run([]string{"--stdin", "--output", "normalized"}, stdin, &stdout, &stderr)
	if exitCode != 0 {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	output := stdout.String()
	if !strings.Contains(output, `"source": "stdin"`) {
		t.Fatalf("expected stdin source in output: %s", output)
	}
	if !strings.Contains(output, `"event_type": "management_event"`) {
		t.Fatalf("expected management_event in output: %s", output)
	}
	if strings.Contains(output, `"domain_event"`) {
		t.Fatalf("did not expect domain_event in normalized-only output: %s", output)
	}
	if stderr.Len() != 0 {
		t.Fatalf("expected empty stderr, got %s", stderr.String())
	}
}

func TestRunWithInvalidInputReturnsError(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := run([]string{"--stdin", "--output", "both"}, strings.NewReader("not-cef\n"), &stdout, &stderr)
	if exitCode != 1 {
		t.Fatalf("expected exit 1, got %d", exitCode)
	}
	if stdout.Len() != 0 {
		t.Fatalf("expected empty stdout, got %s", stdout.String())
	}
	if !strings.Contains(stderr.String(), "invalid CEF prefix") {
		t.Fatalf("expected invalid prefix error, got %s", stderr.String())
	}
}
