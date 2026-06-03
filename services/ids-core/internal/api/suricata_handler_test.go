package api

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/albertgracia/ids-app/services/ids-core/internal/eventstream"
	"github.com/albertgracia/ids-app/services/ids-core/internal/storage"
	"github.com/albertgracia/ids-app/services/ids-core/internal/suricata"
)

func newSuricataHandlerTest(t *testing.T) (*SuricataHandler, *storage.MemoryEventRepository, *eventstream.Broadcaster, chan struct{}) {
	t.Helper()
	repo := storage.NewMemoryEventRepository(1000)
	broadcaster := eventstream.NewBroadcaster()
	handler := NewSuricataHandler(suricata.NewEVEIngestor(repo), broadcaster)
	cleanup := make(chan struct{})
	t.Cleanup(func() {
		broadcaster.Close()
		close(cleanup)
	})
	return handler, repo, broadcaster, cleanup
}

func eveLine(flowID int, eventType string) string {
	switch eventType {
	case "dns":
		return fmt.Sprintf(`{"timestamp":"2026-05-30T12:02:00.000000+0000","flow_id":%d,"in_iface":"eth1","event_type":"dns","src_ip":"10.10.1.5","src_port":33456,"dest_ip":"203.0.113.53","dest_port":53,"proto":"UDP","dns":{"type":"query","rrname":"updates.example.com","rrtype":"A"}}`, flowID)
	case "tls":
		return fmt.Sprintf(`{"timestamp":"2026-05-30T12:04:00.000000+0000","flow_id":%d,"in_iface":"eth1","event_type":"tls","src_ip":"10.10.1.10","src_port":49154,"dest_ip":"198.51.100.90","dest_port":443,"proto":"TCP","tls":{"version":"TLS 1.3","sni":"secure.example.com"}}`, flowID)
	default:
		return fmt.Sprintf(`{"timestamp":"2026-05-30T12:00:00.000000+0000","flow_id":%d,"in_iface":"eth1","event_type":"alert","src_ip":"10.10.1.10","src_port":49152,"dest_ip":"172.16.100.20","dest_port":502,"proto":"TCP","app_proto":"modbus","alert":{"signature_id":1000001,"signature":"IDS-APP Synthetic TCP scan against OT host","category":"Attempted Information Leak","severity":2}}`, flowID)
	}
}

func postBatch(handler *SuricataHandler, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/suricata/eve/batch", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/x-ndjson")
	rr := httptest.NewRecorder()
	handler.HandleEVEBatch(rr, req)
	return rr
}

func repoCount(t *testing.T, repo *storage.MemoryEventRepository) int {
	t.Helper()
	count, err := repo.Count(context.Background())
	if err != nil {
		t.Fatalf("repo.Count: %v", err)
	}
	return count
}

func TestSuricataHandleEVEBatchValidStoresAndPublishes(t *testing.T) {
	handler, repo, broadcaster, _ := newSuricataHandlerTest(t)
	sub := broadcaster.Subscribe()

	body := strings.Join([]string{
		eveLine(1000001, "alert"),
		eveLine(3000001, "dns"),
		eveLine(5000001, "tls"),
	}, "\n")

	rr := postBatch(handler, body)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
	if repoCount(t, repo) != 3 {
		t.Fatalf("expected 3 events in repo, got %d", repoCount(t, repo))
	}
	if len(sub) != 3 {
		t.Fatalf("expected 3 published events, got %d", len(sub))
	}
}

func TestSuricataHandleEVEBatchEmptyBodyDoesNotWriteOrPublish(t *testing.T) {
	handler, repo, broadcaster, _ := newSuricataHandlerTest(t)
	sub := broadcaster.Subscribe()

	rr := postBatch(handler, "")
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
	}
	if repoCount(t, repo) != 0 {
		t.Fatalf("expected empty repo, got %d", repoCount(t, repo))
	}
	select {
	case evt := <-sub:
		t.Fatalf("expected no publish, got %v", evt)
	default:
	}
}

func TestSuricataHandleEVEBatchInvalidJSONDoesNotWriteOrPublish(t *testing.T) {
	handler, repo, broadcaster, _ := newSuricataHandlerTest(t)
	sub := broadcaster.Subscribe()

	rr := postBatch(handler, "not-json")
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "line 1") {
		t.Fatalf("expected line number in error, got %s", rr.Body.String())
	}
	if repoCount(t, repo) != 0 {
		t.Fatalf("expected empty repo, got %d", repoCount(t, repo))
	}
	select {
	case evt := <-sub:
		t.Fatalf("expected no publish, got %v", evt)
	default:
	}
}

func TestSuricataHandleEVEBatchRejectsOverLimitBeforeWriteOrPublish(t *testing.T) {
	handler, repo, broadcaster, _ := newSuricataHandlerTest(t)
	sub := broadcaster.Subscribe()

	lines := make([]string, 0, maxSuricataEVEBatchEvents+1)
	for i := 0; i < maxSuricataEVEBatchEvents+1; i++ {
		lines = append(lines, eveLine(9000000+i, "dns"))
	}

	rr := postBatch(handler, strings.Join(lines, "\n"))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
	}
	if repoCount(t, repo) != 0 {
		t.Fatalf("expected empty repo, got %d", repoCount(t, repo))
	}
	select {
	case evt := <-sub:
		t.Fatalf("expected no publish, got %v", evt)
	default:
	}
}

func TestSuricataHandleEVEBatchValidThenInvalidDoesNotWriteOrPublish(t *testing.T) {
	handler, repo, broadcaster, _ := newSuricataHandlerTest(t)
	sub := broadcaster.Subscribe()

	body := eveLine(1000001, "alert") + "\n" + "not-json"
	rr := postBatch(handler, body)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "line 2") {
		t.Fatalf("expected line 2 in error, got %s", rr.Body.String())
	}
	if repoCount(t, repo) != 0 {
		t.Fatalf("expected empty repo, got %d", repoCount(t, repo))
	}
	select {
	case evt := <-sub:
		t.Fatalf("expected no publish, got %v", evt)
	default:
	}
}
