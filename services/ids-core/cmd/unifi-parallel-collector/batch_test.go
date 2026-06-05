package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/albertgracia/ids-app/services/ids-core/internal/ingest"
)

func collectRecordsForTest(t *testing.T, inputs ...string) []outputRecord {
	t.Helper()
	cfg := config{inputs: inputs, dedupe: true, operational: true}
	lines, err := collectInputs(cfg, strings.NewReader(""))
	if err != nil {
		t.Fatalf("collectInputs: %v", err)
	}
	seen := make(map[string]struct{})
	records := make([]outputRecord, 0, len(lines))
	for _, entry := range lines {
		res := processLine(cfg, entry, seen)
		records = append(records, res.record)
	}
	return records
}

func TestBuildBatchFromCoreDNSSample(t *testing.T) {
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational", "coredns.json.log")
	records := collectRecordsForTest(t, path)
	batches, summary, err := buildUniFiIngestBatches(config{collectorID: "unifi-collector-local", sourceHost: "synthetic-gateway", batchSize: 50}, records)
	if err != nil {
		t.Fatalf("buildUniFiIngestBatches: %v", err)
	}
	if len(batches) != 1 {
		t.Fatalf("expected 1 batch, got %d", len(batches))
	}
	if batches[0].Source != "unifi" {
		t.Fatalf("expected source unifi, got %s", batches[0].Source)
	}
	if len(batches[0].Events) == 0 {
		t.Fatal("expected events in batch")
	}
	if !strings.HasPrefix(batches[0].Events[0].IdempotencyKey, "unifi:sha256:") {
		t.Fatalf("expected idempotency_key prefix, got %s", batches[0].Events[0].IdempotencyKey)
	}
	if batches[0].Events[0].RawHash == "" {
		t.Fatal("expected raw_hash")
	}
	data, err := json.Marshal(batches[0])
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	if strings.Contains(string(data), `"raw"`) {
		t.Fatalf("raw field should not be included: %s", string(data))
	}
	if summary.Events != 2 {
		t.Fatalf("expected 2 batch events, got %+v", summary)
	}
}

func TestBuildBatchFromMixedOperationalSamplesRespectsBatchSize(t *testing.T) {
	base := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational")
	records := collectRecordsForTest(t,
		filepath.Join(base, "coredns.json.log"),
		filepath.Join(base, "mca.log"),
		filepath.Join(base, "dpi-flow-stats.log"),
		filepath.Join(base, "systemd.log"),
	)
	batches, summary, err := buildUniFiIngestBatches(config{collectorID: "unifi-collector-local", sourceHost: "synthetic-gateway", batchSize: 3}, records)
	if err != nil {
		t.Fatalf("buildUniFiIngestBatches: %v", err)
	}
	if len(batches) != 3 {
		t.Fatalf("expected 3 batches for 8 events size 3, got %d", len(batches))
	}
	for _, batch := range batches {
		if len(batch.Events) > 3 {
			t.Fatalf("batch size exceeded: %d", len(batch.Events))
		}
	}
	if summary.Events != 8 {
		t.Fatalf("expected 8 events, got %+v", summary)
	}
}

func TestBuildBatchDedupesSameIdempotencyKey(t *testing.T) {
	records := []outputRecord{
		{ParseStatus: parseStatusOK, RawHash: "sha256:dup", Normalized: &normalizedOutput{EventType: "dns_query", Message: "x", Metadata: map[string]string{"unifi.event_kind": "dns_gateway_event", "unifi.process": "coredns", "parser": "unifi_operational", "unifi.source_type": "operational_syslog"}}, DomainEvent: &domainEventOutput{Severity: "info", Timestamp: "2026-06-05T12:00:00Z", Title: "x"}},
		{ParseStatus: parseStatusOK, RawHash: "sha256:dup", Normalized: &normalizedOutput{EventType: "dns_query", Message: "x", Metadata: map[string]string{"unifi.event_kind": "dns_gateway_event", "unifi.process": "coredns", "parser": "unifi_operational", "unifi.source_type": "operational_syslog"}}, DomainEvent: &domainEventOutput{Severity: "info", Timestamp: "2026-06-05T12:00:01Z", Title: "x"}},
	}
	batches, summary, err := buildUniFiIngestBatches(config{collectorID: "unifi-collector-local", sourceHost: "synthetic-gateway", batchSize: 50}, records)
	if err != nil {
		t.Fatalf("buildUniFiIngestBatches: %v", err)
	}
	if len(batches) != 1 || len(batches[0].Events) != 1 {
		t.Fatalf("expected one deduped event, got %d batches %+v", len(batches), batches)
	}
	if summary.FilteredDuplicates != 1 {
		t.Fatalf("expected 1 filtered duplicate, got %+v", summary)
	}
}

func TestRunIngestBatchSendFalseDoesNotMakeHTTPRequest(t *testing.T) {
	var hits int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational", "coredns.json.log")
	exitCode := run([]string{"--input", path, "--ingest-batch", "--send=false", "--endpoint", server.URL}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	if atomic.LoadInt32(&hits) != 0 {
		t.Fatalf("expected no HTTP request, got %d", hits)
	}
	if !strings.Contains(stderr.String(), "ingest batch summary") {
		t.Fatalf("expected payload summary in stderr, got %s", stderr.String())
	}
}

func TestRunSendTrueMissingEndpointReturnsInvalidConfig(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational", "coredns.json.log")
	exitCode := run([]string{"--input", path, "--ingest-batch", "--send=true"}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitInvalidConfig {
		t.Fatalf("expected exitInvalidConfig, got %d stderr=%s", exitCode, stderr.String())
	}
}

func TestRunSendTrueMissingTokenReturnsInvalidConfig(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational", "coredns.json.log")
	exitCode := run([]string{"--input", path, "--ingest-batch", "--send=true", "--endpoint", server.URL}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitInvalidConfig {
		t.Fatalf("expected exitInvalidConfig, got %d stderr=%s", exitCode, stderr.String())
	}
}

func TestRunSendTrueHTTPOKParsesResponse(t *testing.T) {
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer local-test-token" {
			t.Fatalf("unexpected auth header: %s", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ingest.UniFiIngestBatchResponse{Accepted: 2, Rejected: 0, Duplicates: 0, BatchID: "server-batch"})
	}))
	defer server.Close()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational", "coredns.json.log")
	exitCode := run([]string{"--input", path, "--ingest-batch", "--send=true", "--endpoint", server.URL}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitOK {
		t.Fatalf("expected exit 0, got %d stderr=%s", exitCode, stderr.String())
	}
	if !strings.Contains(stderr.String(), "accepted=2") {
		t.Fatalf("expected send summary in stderr, got %s", stderr.String())
	}
}

func TestRunSendTrueHTTP401ReturnsInvalidConfig(t *testing.T) {
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ingest.UniFiIngestBatchResponse{Accepted: 0, Rejected: 1, Duplicates: 0})
	}))
	defer server.Close()

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational", "coredns.json.log")
	exitCode := run([]string{"--input", path, "--ingest-batch", "--send=true", "--endpoint", server.URL}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitInvalidConfig {
		t.Fatalf("expected exitInvalidConfig, got %d stderr=%s", exitCode, stderr.String())
	}
}

func TestGuardrailRejectsNonLocalEndpoint(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	path := filepath.Join("..", "..", "..", "..", "packages", "contracts", "unifi", "samples", "operational", "coredns.json.log")
	exitCode := run([]string{"--input", path, "--ingest-batch", "--send=true", "--endpoint", "http://192.168.1.40:8088/api/internal/v1/ingest/events/unifi"}, strings.NewReader(""), &stdout, &stderr)
	if exitCode != exitInvalidConfig {
		t.Fatalf("expected exitInvalidConfig, got %d stderr=%s", exitCode, stderr.String())
	}
	if !strings.Contains(stderr.String(), "refusing to send") {
		t.Fatalf("expected guardrail error, got %s", stderr.String())
	}
}
