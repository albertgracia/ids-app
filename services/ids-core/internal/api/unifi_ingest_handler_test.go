package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/albertgracia/ids-app/services/ids-core/internal/eventstream"
	"github.com/albertgracia/ids-app/services/ids-core/internal/ingest"
	"github.com/albertgracia/ids-app/services/ids-core/internal/storage"
)

func newUniFiIngestHandlerTest(t *testing.T) (*UniFiIngestHandler, *storage.MemoryEventRepository, *eventstream.Broadcaster) {
	t.Helper()
	repo := storage.NewMemoryEventRepository(1000)
	broadcaster := eventstream.NewBroadcaster()
	handler := NewUniFiIngestHandler(repo, broadcaster)
	t.Cleanup(func() {
		broadcaster.Close()
	})
	return handler, repo, broadcaster
}

func validUniFiBatch() ingest.UniFiIngestBatchRequest {
	return ingest.UniFiIngestBatchRequest{
		Source:      "unifi",
		SourceHost:  "Cloud-Gateway-Fiber-Labraza",
		CollectorID: "unifi-collector-local",
		BatchID:     "batch-001",
		ObservedAt:  time.Date(2026, 6, 5, 12, 0, 0, 0, time.UTC),
		Events: []ingest.UniFiIngestEvent{
			{
				IdempotencyKey: "unifi:sha256:test-dns-001",
				RawHash:        "sha256:test-dns-001",
				Kind:           "dns_gateway_event",
				EventType:      "dns_query",
				Severity:       "info",
				Timestamp:      time.Date(2026, 6, 5, 12, 0, 0, 0, time.UTC),
				Process:        "coredns",
				Message:        "synthetic DNS gateway event",
				Metadata: map[string]string{
					"parser":      "unifi_operational",
					"source_type": "operational_syslog",
				},
			},
		},
	}
}

func postUniFiBatch(t *testing.T, handler *UniFiIngestHandler, token string, body any) *httptest.ResponseRecorder {
	t.Helper()
	data, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/internal/v1/ingest/events/unifi", bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rr := httptest.NewRecorder()
	handler.HandleBatch(rr, req)
	return rr
}

func decodeUniFiResponse(t *testing.T, rr *httptest.ResponseRecorder) ingest.UniFiIngestBatchResponse {
	t.Helper()
	var resp ingest.UniFiIngestBatchResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json.Unmarshal response: %v body=%s", err, rr.Body.String())
	}
	return resp
}

func testRepoCount(t *testing.T, repo *storage.MemoryEventRepository) int {
	t.Helper()
	count, err := repo.Count(context.Background())
	if err != nil {
		t.Fatalf("repo.Count: %v", err)
	}
	return count
}

func TestUniFiIngestUnauthorizedWithoutHeader(t *testing.T) {
	handler, _, _ := newUniFiIngestHandlerTest(t)
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	rr := postUniFiBatch(t, handler, "", validUniFiBatch())
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestUniFiIngestForbiddenInvalidToken(t *testing.T) {
	handler, _, _ := newUniFiIngestHandlerTest(t)
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	rr := postUniFiBatch(t, handler, "wrong-token", validUniFiBatch())
	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestUniFiIngestMissingEnvToken(t *testing.T) {
	handler, _, _ := newUniFiIngestHandlerTest(t)
	rr := postUniFiBatch(t, handler, "local-test-token", validUniFiBatch())
	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestUniFiIngestValidBatchSingleEvent(t *testing.T) {
	handler, repo, _ := newUniFiIngestHandlerTest(t)
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	rr := postUniFiBatch(t, handler, "local-test-token", validUniFiBatch())
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
	resp := decodeUniFiResponse(t, rr)
	if resp.Accepted != 1 || resp.Rejected != 0 || resp.Duplicates != 0 {
		t.Fatalf("unexpected response: %+v", resp)
	}
	if testRepoCount(t, repo) != 1 {
		t.Fatalf("expected repo count 1, got %d", testRepoCount(t, repo))
	}
	events, err := repo.Recent(context.Background(), 10)
	if err != nil {
		t.Fatalf("repo.Recent: %v", err)
	}
	if len(events) != 1 || events[0].Type.String() != "dns_query" {
		t.Fatalf("expected dns_query event, got %+v", events)
	}
}

func TestUniFiIngestDuplicateIdempotencyKeySameBatch(t *testing.T) {
	handler, repo, _ := newUniFiIngestHandlerTest(t)
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	batch := validUniFiBatch()
	dup := batch.Events[0]
	batch.Events = append(batch.Events, dup)
	rr := postUniFiBatch(t, handler, "local-test-token", batch)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
	resp := decodeUniFiResponse(t, rr)
	if resp.Accepted != 1 || resp.Duplicates != 1 || resp.Rejected != 0 {
		t.Fatalf("unexpected response: %+v", resp)
	}
	if testRepoCount(t, repo) != 1 {
		t.Fatalf("expected repo count 1, got %d", testRepoCount(t, repo))
	}
}

func TestUniFiIngestInvalidSourceReturnsBadRequest(t *testing.T) {
	handler, repo, _ := newUniFiIngestHandlerTest(t)
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	batch := validUniFiBatch()
	batch.Source = "not-unifi"
	rr := postUniFiBatch(t, handler, "local-test-token", batch)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
	}
	if testRepoCount(t, repo) != 0 {
		t.Fatalf("expected empty repo, got %d", testRepoCount(t, repo))
	}
}

func TestUniFiIngestEmptyEventsReturnsBadRequest(t *testing.T) {
	handler, _, _ := newUniFiIngestHandlerTest(t)
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	batch := validUniFiBatch()
	batch.Events = nil
	rr := postUniFiBatch(t, handler, "local-test-token", batch)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestUniFiIngestTooManyEventsReturnsBadRequest(t *testing.T) {
	handler, _, _ := newUniFiIngestHandlerTest(t)
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	batch := validUniFiBatch()
	batch.Events = make([]ingest.UniFiIngestEvent, ingest.MaxUniFiIngestBatchEvents+1)
	for i := range batch.Events {
		batch.Events[i] = validUniFiBatch().Events[0]
		batch.Events[i].IdempotencyKey = batch.Events[i].IdempotencyKey + string(rune('a'+(i%26)))
		batch.Events[i].RawHash = batch.Events[i].RawHash + string(rune('a'+(i%26)))
	}
	rr := postUniFiBatch(t, handler, "local-test-token", batch)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestUniFiIngestInvalidSeverityRejected(t *testing.T) {
	handler, repo, _ := newUniFiIngestHandlerTest(t)
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	batch := validUniFiBatch()
	batch.Events[0].Severity = "broken"
	rr := postUniFiBatch(t, handler, "local-test-token", batch)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
	resp := decodeUniFiResponse(t, rr)
	if resp.Rejected != 1 || resp.Accepted != 0 {
		t.Fatalf("unexpected response: %+v", resp)
	}
	if testRepoCount(t, repo) != 0 {
		t.Fatalf("expected empty repo, got %d", testRepoCount(t, repo))
	}
}

func TestUniFiIngestMissingIdempotencyKeyRejected(t *testing.T) {
	handler, repo, _ := newUniFiIngestHandlerTest(t)
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	batch := validUniFiBatch()
	batch.Events[0].IdempotencyKey = ""
	rr := postUniFiBatch(t, handler, "local-test-token", batch)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
	resp := decodeUniFiResponse(t, rr)
	if resp.Rejected != 1 || resp.Accepted != 0 {
		t.Fatalf("unexpected response: %+v", resp)
	}
	if testRepoCount(t, repo) != 0 {
		t.Fatalf("expected empty repo, got %d", testRepoCount(t, repo))
	}
}

func TestUniFiIngestMappingDNSGatewayEvent(t *testing.T) {
	handler, repo, _ := newUniFiIngestHandlerTest(t)
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	rr := postUniFiBatch(t, handler, "local-test-token", validUniFiBatch())
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
	events, err := repo.Recent(context.Background(), 10)
	if err != nil {
		t.Fatalf("repo.Recent: %v", err)
	}
	if len(events) != 1 || events[0].Type.String() != "dns_query" {
		t.Fatalf("expected dns_query mapping, got %+v", events)
	}
}

func TestUniFiIngestMappingMCAEvent(t *testing.T) {
	handler, repo, _ := newUniFiIngestHandlerTest(t)
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	batch := validUniFiBatch()
	batch.Events[0].IdempotencyKey = "unifi:sha256:test-mca-001"
	batch.Events[0].RawHash = "sha256:test-mca-001"
	batch.Events[0].Kind = "mca_event"
	batch.Events[0].EventType = "system"
	batch.Events[0].Process = "MCA"
	batch.Events[0].Message = "synthetic MCA event"
	rr := postUniFiBatch(t, handler, "local-test-token", batch)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
	events, err := repo.Recent(context.Background(), 10)
	if err != nil {
		t.Fatalf("repo.Recent: %v", err)
	}
	if len(events) != 1 || events[0].Type.String() != "system" {
		t.Fatalf("expected system mapping, got %+v", events)
	}
}

func TestUniFiIngestCrossRequestDuplicateInMemory(t *testing.T) {
	handler, repo, _ := newUniFiIngestHandlerTest(t)
	t.Setenv("IDS_UNIFI_INGEST_TOKEN", "local-test-token")
	batch := validUniFiBatch()
	rr1 := postUniFiBatch(t, handler, "local-test-token", batch)
	if rr1.Code != http.StatusOK {
		t.Fatalf("expected first 200, got %d body=%s", rr1.Code, rr1.Body.String())
	}
	rr2 := postUniFiBatch(t, handler, "local-test-token", batch)
	if rr2.Code != http.StatusOK {
		t.Fatalf("expected second 200, got %d body=%s", rr2.Code, rr2.Body.String())
	}
	resp := decodeUniFiResponse(t, rr2)
	if resp.Duplicates != 1 || resp.Accepted != 0 {
		t.Fatalf("unexpected duplicate response: %+v", resp)
	}
	if testRepoCount(t, repo) != 1 {
		t.Fatalf("expected repo count 1, got %d", testRepoCount(t, repo))
	}
}
