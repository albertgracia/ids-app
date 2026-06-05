package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/albertgracia/ids-app/services/ids-core/internal/ingest"
)

type batchBuildSummary struct {
	Batches            int
	Events             int
	FilteredDuplicates int
	SkippedUnsupported int
	Send               bool
}

type batchSendResult struct {
	StatusCode int
	Response   ingest.UniFiIngestBatchResponse
}

func buildUniFiIngestBatches(cfg config, records []outputRecord) ([]ingest.UniFiIngestBatchRequest, batchBuildSummary, error) {
	observedAt := time.Now().UTC()
	uniqueEvents := make([]ingest.UniFiIngestEvent, 0)
	seen := make(map[string]struct{})
	summary := batchBuildSummary{Send: cfg.send}

	for _, record := range records {
		if record.ParseStatus != parseStatusOK || record.Normalized == nil || record.DomainEvent == nil {
			continue
		}
		evt, supported, err := buildUniFiBatchEvent(cfg, record, observedAt)
		if err != nil {
			return nil, summary, err
		}
		if !supported {
			summary.SkippedUnsupported++
			continue
		}
		if _, ok := seen[evt.IdempotencyKey]; ok {
			summary.FilteredDuplicates++
			continue
		}
		seen[evt.IdempotencyKey] = struct{}{}
		uniqueEvents = append(uniqueEvents, evt)
	}

	batches := make([]ingest.UniFiIngestBatchRequest, 0)
	for start := 0; start < len(uniqueEvents); start += cfg.batchSize {
		end := start + cfg.batchSize
		if end > len(uniqueEvents) {
			end = len(uniqueEvents)
		}
		batchID, err := newLocalBatchID()
		if err != nil {
			return nil, summary, err
		}
		events := cloneBatchEvents(uniqueEvents[start:end], cfg.collectorID, batchID)
		batches = append(batches, ingest.UniFiIngestBatchRequest{
			Source:      "unifi",
			SourceHost:  cfg.sourceHost,
			CollectorID: cfg.collectorID,
			BatchID:     batchID,
			ObservedAt:  observedAt,
			Events:      events,
		})
	}

	summary.Batches = len(batches)
	summary.Events = len(uniqueEvents)
	return batches, summary, nil
}

func buildUniFiBatchEvent(cfg config, record outputRecord, observedAt time.Time) (ingest.UniFiIngestEvent, bool, error) {
	metadata := cloneMap(record.Normalized.Metadata)
	kind := strings.TrimSpace(metadata["unifi.event_kind"])
	if kind == "" {
		return ingest.UniFiIngestEvent{}, false, nil
	}

	sev := strings.TrimSpace(record.DomainEvent.Severity)
	if sev == "" {
		sev = "info"
	}
	ts := observedAt
	if record.DomainEvent.Timestamp != "" {
		parsed, err := time.Parse(time.RFC3339, record.DomainEvent.Timestamp)
		if err == nil {
			ts = parsed.UTC()
		}
	}
	process := strings.TrimSpace(metadata["unifi.process"])
	if process == "" {
		process = strings.TrimSpace(metadata["process"])
	}
	message := strings.TrimSpace(record.Normalized.Message)
	if message == "" {
		message = strings.TrimSpace(record.DomainEvent.Title)
	}
	safeMetadata := make(map[string]string)
	copyIfPresent(safeMetadata, metadata, "parser")
	copyIfPresent(safeMetadata, metadata, "unifi.source_type")
	copyIfPresent(safeMetadata, metadata, "unifi.process")
	copyIfPresent(safeMetadata, metadata, "unifi.event_kind")
	safeMetadata["collector_id"] = cfg.collectorID
	safeMetadata["raw_hash"] = record.RawHash
	if v := safeMetadata["unifi.source_type"]; v != "" {
		safeMetadata["source_type"] = v
		delete(safeMetadata, "unifi.source_type")
	}
	if v := safeMetadata["unifi.process"]; v != "" {
		safeMetadata["process"] = v
		delete(safeMetadata, "unifi.process")
	}
	if v := safeMetadata["unifi.event_kind"]; v != "" {
		safeMetadata["event_kind"] = v
		delete(safeMetadata, "unifi.event_kind")
	}

	return ingest.UniFiIngestEvent{
		IdempotencyKey: "unifi:" + record.RawHash,
		RawHash:        record.RawHash,
		Kind:           kind,
		EventType:      record.Normalized.EventType,
		Severity:       sev,
		Timestamp:      ts,
		Process:        process,
		Message:        message,
		Metadata:       safeMetadata,
	}, true, nil
}

func cloneBatchEvents(events []ingest.UniFiIngestEvent, collectorID, batchID string) []ingest.UniFiIngestEvent {
	cloned := make([]ingest.UniFiIngestEvent, 0, len(events))
	for _, evt := range events {
		copyEvt := evt
		copyEvt.Metadata = cloneMap(evt.Metadata)
		copyEvt.Metadata["collector_id"] = collectorID
		copyEvt.Metadata["batch_id"] = batchID
		cloned = append(cloned, copyEvt)
	}
	return cloned
}

func sendUniFiIngestBatches(cfg config, batches []ingest.UniFiIngestBatchRequest) ([]batchSendResult, error) {
	token := strings.TrimSpace(os.Getenv(cfg.tokenEnv))
	if token == "" {
		return nil, fmt.Errorf("token env %s is not configured", cfg.tokenEnv)
	}
	client := &http.Client{Timeout: 5 * time.Second}
	results := make([]batchSendResult, 0, len(batches))
	for _, batch := range batches {
		payload, err := json.Marshal(batch)
		if err != nil {
			return nil, err
		}
		req, err := http.NewRequest(http.MethodPost, cfg.endpoint, bytes.NewReader(payload))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, err
		}
		var parsed ingest.UniFiIngestBatchResponse
		if len(bytes.TrimSpace(body)) > 0 {
			if err := json.Unmarshal(body, &parsed); err != nil {
				return nil, fmt.Errorf("invalid ingest response status=%d", resp.StatusCode)
			}
		}
		results = append(results, batchSendResult{StatusCode: resp.StatusCode, Response: parsed})
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return results, fmt.Errorf("ingest request failed with status %d", resp.StatusCode)
		}
	}
	return results, nil
}

func validateLocalEndpoint(raw string) error {
	endpoint := strings.TrimSpace(raw)
	if endpoint == "" {
		return fmt.Errorf("endpoint is required")
	}
	lower := strings.ToLower(endpoint)
	if strings.Contains(lower, "192.168.1.40") || strings.Contains(lower, "ids-observabilidad") {
		return fmt.Errorf("refusing to send to non-local endpoint in local dry-run mode")
	}
	parsed, err := url.Parse(endpoint)
	if err != nil {
		return fmt.Errorf("invalid endpoint: %w", err)
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "127.0.0.1" || host == "localhost" || host == "::1" {
		return nil
	}
	return fmt.Errorf("refusing to send to non-local endpoint in local dry-run mode")
}

func printBatchSummary(w io.Writer, summary batchBuildSummary) {
	fmt.Fprintf(w, "ingest batch summary: batches=%d events=%d filtered_duplicates=%d skipped_unsupported=%d send=%t\n", summary.Batches, summary.Events, summary.FilteredDuplicates, summary.SkippedUnsupported, summary.Send)
}

func printSendSummary(w io.Writer, results []batchSendResult) {
	for idx, result := range results {
		fmt.Fprintf(w, "ingest send summary: batch=%d status=%d accepted=%d rejected=%d duplicates=%d\n", idx+1, result.StatusCode, result.Response.Accepted, result.Response.Rejected, result.Response.Duplicates)
	}
}

func newLocalBatchID() (string, error) {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "batch-" + hex.EncodeToString(buf), nil
}

func copyIfPresent(dst, src map[string]string, key string) {
	if src == nil {
		return
	}
	if value := strings.TrimSpace(src[key]); value != "" {
		dst[key] = value
	}
}
