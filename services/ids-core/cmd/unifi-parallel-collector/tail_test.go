package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func writeFileForTailTest(t *testing.T, path string, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
}

func readTailStateForTest(t *testing.T, path string) tailState {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile state: %v", err)
	}
	var state tailState
	if err := json.Unmarshal(data, &state); err != nil {
		t.Fatalf("Unmarshal state: %v", err)
	}
	return state
}

func TestTailBeginningProcessesExistingCompleteLines(t *testing.T) {
	tempDir := t.TempDir()
	tailFile := filepath.Join(tempDir, "synthetic.log")
	stateFile := filepath.Join(tempDir, "state.json")
	writeFileForTailTest(t, tailFile, "Jun  5 12:06:00 OBS-HOST Cloud-Gateway-Fiber-Labraza MCA[7777]: device agent heartbeat completed successfully\nJun  5 12:07:00 OBS-HOST Cloud-Gateway-Fiber-Labraza dpi-flow-stats[8888]: flow stats batch exported successfully\n")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := run([]string{"--tail-file", tailFile, "--state-file", stateFile, "--start-position", "beginning", "--once", "--output", outputJSON}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	var payload struct {
		Events  []outputRecord `json:"events"`
		Summary summaryOutput  `json:"summary"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("Unmarshal output: %v", err)
	}
	if payload.Summary.Parsed != 2 {
		t.Fatalf("expected parsed=2, got %+v", payload.Summary)
	}
	state := readTailStateForTest(t, stateFile)
	if state.Offset <= 0 {
		t.Fatalf("expected state offset > 0, got %+v", state)
	}
	if !strings.Contains(stderr.String(), "tail summary:") {
		t.Fatalf("expected tail summary in stderr, got %s", stderr.String())
	}
}

func TestTailEndSkipsExistingLines(t *testing.T) {
	tempDir := t.TempDir()
	tailFile := filepath.Join(tempDir, "synthetic.log")
	stateFile := filepath.Join(tempDir, "state.json")
	content := "Jun  5 12:06:00 OBS-HOST Cloud-Gateway-Fiber-Labraza MCA[7777]: device agent heartbeat completed successfully\nJun  5 12:07:00 OBS-HOST Cloud-Gateway-Fiber-Labraza dpi-flow-stats[8888]: flow stats batch exported successfully\n"
	writeFileForTailTest(t, tailFile, content)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := run([]string{"--tail-file", tailFile, "--state-file", stateFile, "--start-position", "end", "--once", "--output", outputJSON}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	var payload struct {
		Events  []outputRecord `json:"events"`
		Summary summaryOutput  `json:"summary"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("Unmarshal output: %v", err)
	}
	if payload.Summary.Parsed != 0 {
		t.Fatalf("expected parsed=0, got %+v", payload.Summary)
	}
	state := readTailStateForTest(t, stateFile)
	if state.Offset != int64(len(content)) {
		t.Fatalf("expected offset at end %d, got %+v", len(content), state)
	}
}

func TestTailResumeProcessesOnlyAppendedLines(t *testing.T) {
	tempDir := t.TempDir()
	tailFile := filepath.Join(tempDir, "synthetic.log")
	stateFile := filepath.Join(tempDir, "state.json")
	first := "Jun  5 12:06:00 OBS-HOST Cloud-Gateway-Fiber-Labraza MCA[7777]: device agent heartbeat completed successfully\n"
	second := "Jun  5 12:07:00 OBS-HOST Cloud-Gateway-Fiber-Labraza dpi-flow-stats[8888]: flow stats batch exported successfully\nJun  5 12:08:00 OBS-HOST Cloud-Gateway-Fiber-Labraza systemd[1]: Started UniFi operational service\n"
	writeFileForTailTest(t, tailFile, first)

	var stdout1 bytes.Buffer
	var stderr1 bytes.Buffer
	exit1 := run([]string{"--tail-file", tailFile, "--state-file", stateFile, "--start-position", "beginning", "--once", "--output", outputJSON}, strings.NewReader(""), &stdout1, &stderr1)
	if exit1 != exitOK {
		t.Fatalf("expected first exit 0, got %d stderr=%s", exit1, stderr1.String())
	}
	if err := os.WriteFile(tailFile, []byte(first+second), 0o644); err != nil {
		t.Fatalf("append WriteFile: %v", err)
	}

	var stdout2 bytes.Buffer
	var stderr2 bytes.Buffer
	exit2 := run([]string{"--tail-file", tailFile, "--state-file", stateFile, "--start-position", "beginning", "--once", "--output", outputJSON}, strings.NewReader(""), &stdout2, &stderr2)
	if exit2 != exitOK {
		t.Fatalf("expected second exit 0, got %d stderr=%s", exit2, stderr2.String())
	}
	var payload struct {
		Events  []outputRecord `json:"events"`
		Summary summaryOutput  `json:"summary"`
	}
	if err := json.Unmarshal(stdout2.Bytes(), &payload); err != nil {
		t.Fatalf("Unmarshal output: %v", err)
	}
	if payload.Summary.Parsed != 2 {
		t.Fatalf("expected appended parsed=2, got %+v", payload.Summary)
	}
}

func TestTailPartialLineNotProcessedUntilNewline(t *testing.T) {
	tempDir := t.TempDir()
	tailFile := filepath.Join(tempDir, "synthetic.log")
	stateFile := filepath.Join(tempDir, "state.json")
	complete := "Jun  5 12:06:00 OBS-HOST Cloud-Gateway-Fiber-Labraza MCA[7777]: device agent heartbeat completed successfully\n"
	partial := "Jun  5 12:07:00 OBS-HOST Cloud-Gateway-Fiber-Labraza dpi-flow-stats[8888]: flow stats batch"
	writeFileForTailTest(t, tailFile, complete+partial)

	var stdout1 bytes.Buffer
	var stderr1 bytes.Buffer
	exit1 := run([]string{"--tail-file", tailFile, "--state-file", stateFile, "--start-position", "beginning", "--once", "--output", outputJSON}, strings.NewReader(""), &stdout1, &stderr1)
	if exit1 != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exit1, stderr1.String())
	}
	var payload1 struct {
		Events  []outputRecord `json:"events"`
		Summary summaryOutput  `json:"summary"`
	}
	if err := json.Unmarshal(stdout1.Bytes(), &payload1); err != nil {
		t.Fatalf("Unmarshal output: %v", err)
	}
	if payload1.Summary.Parsed != 1 {
		t.Fatalf("expected parsed=1, got %+v", payload1.Summary)
	}
	state1 := readTailStateForTest(t, stateFile)
	if state1.Offset >= int64(len(complete+partial)) {
		t.Fatalf("expected partial line not committed, got %+v", state1)
	}

	if err := os.WriteFile(tailFile, []byte(complete+partial+" exported successfully\n"), 0o644); err != nil {
		t.Fatalf("append partial WriteFile: %v", err)
	}
	var stdout2 bytes.Buffer
	var stderr2 bytes.Buffer
	exit2 := run([]string{"--tail-file", tailFile, "--state-file", stateFile, "--start-position", "beginning", "--once", "--output", outputJSON}, strings.NewReader(""), &stdout2, &stderr2)
	if exit2 != exitOK {
		t.Fatalf("expected second exit 0, got %d stderr=%s", exit2, stderr2.String())
	}
	var payload2 struct {
		Events  []outputRecord `json:"events"`
		Summary summaryOutput  `json:"summary"`
	}
	if err := json.Unmarshal(stdout2.Bytes(), &payload2); err != nil {
		t.Fatalf("Unmarshal output: %v", err)
	}
	if payload2.Summary.Parsed != 1 {
		t.Fatalf("expected parsed=1 for completed line, got %+v", payload2.Summary)
	}
}

func TestTailStateFileWrittenAtomically(t *testing.T) {
	tempDir := t.TempDir()
	tailFile := filepath.Join(tempDir, "synthetic.log")
	stateFile := filepath.Join(tempDir, "state.json")
	writeFileForTailTest(t, tailFile, "Jun  5 12:06:00 OBS-HOST Cloud-Gateway-Fiber-Labraza MCA[7777]: device agent heartbeat completed successfully\n")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := run([]string{"--tail-file", tailFile, "--state-file", stateFile, "--start-position", "beginning", "--once", "--output", outputJSON}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	if _, err := os.Stat(stateFile); err != nil {
		t.Fatalf("expected state file: %v", err)
	}
	if _, err := os.Stat(stateFile + ".tmp"); !os.IsNotExist(err) {
		t.Fatalf("expected no tmp state file left behind")
	}
}

func TestTailTruncationHandledWithoutPanic(t *testing.T) {
	tempDir := t.TempDir()
	tailFile := filepath.Join(tempDir, "synthetic.log")
	stateFile := filepath.Join(tempDir, "state.json")
	writeFileForTailTest(t, tailFile, "Jun  5 12:06:00 OBS-HOST Cloud-Gateway-Fiber-Labraza MCA[7777]: device agent heartbeat completed successfully\nJun  5 12:07:00 OBS-HOST Cloud-Gateway-Fiber-Labraza dpi-flow-stats[8888]: flow stats batch exported successfully\n")

	var stdout1 bytes.Buffer
	var stderr1 bytes.Buffer
	exit1 := run([]string{"--tail-file", tailFile, "--state-file", stateFile, "--start-position", "beginning", "--once", "--output", outputJSON}, strings.NewReader(""), &stdout1, &stderr1)
	if exit1 != exitOK {
		t.Fatalf("expected first exit 0, got %d stderr=%s", exit1, stderr1.String())
	}
	writeFileForTailTest(t, tailFile, "Jun  5 12:08:00 OBS-HOST Cloud-Gateway-Fiber-Labraza systemd[1]: Started UniFi operational service\n")

	var stdout2 bytes.Buffer
	var stderr2 bytes.Buffer
	exit2 := run([]string{"--tail-file", tailFile, "--state-file", stateFile, "--start-position", "beginning", "--once", "--output", outputJSON}, strings.NewReader(""), &stdout2, &stderr2)
	if exit2 != exitOK {
		t.Fatalf("expected second exit 0, got %d stderr=%s", exit2, stderr2.String())
	}
	if !strings.Contains(stderr2.String(), "truncation detected") {
		t.Fatalf("expected truncation warning, got %s", stderr2.String())
	}
	var payload struct {
		Events  []outputRecord `json:"events"`
		Summary summaryOutput  `json:"summary"`
	}
	if err := json.Unmarshal(stdout2.Bytes(), &payload); err != nil {
		t.Fatalf("Unmarshal output: %v", err)
	}
	if payload.Summary.Parsed != 1 {
		t.Fatalf("expected parsed=1 after truncation reset, got %+v", payload.Summary)
	}
}

func TestTailIngestBatchBuildsEvents(t *testing.T) {
	tempDir := t.TempDir()
	tailFile := filepath.Join(tempDir, "synthetic.log")
	stateFile := filepath.Join(tempDir, "state.json")
	writeFileForTailTest(t, tailFile, "Jun  5 12:06:00 OBS-HOST Cloud-Gateway-Fiber-Labraza MCA[7777]: device agent heartbeat completed successfully\nJun  5 12:07:00 OBS-HOST Cloud-Gateway-Fiber-Labraza dpi-flow-stats[8888]: flow stats batch exported successfully\n")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exitCode := run([]string{"--tail-file", tailFile, "--state-file", stateFile, "--start-position", "beginning", "--once", "--output", outputJSON, "--ingest-batch", "--send=false", "--collector-id", "unifi-tail-local", "--source-host", "synthetic-gateway"}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	if !strings.Contains(stderr.String(), "ingest batch summary") {
		t.Fatalf("expected ingest batch summary, got %s", stderr.String())
	}
	if strings.Contains(stdout.String(), "heartbeat completed successfully") {
		t.Fatalf("expected no raw line in stdout, got %s", stdout.String())
	}
}
