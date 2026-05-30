package suricata

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
	"github.com/albertgracia/ids-app/services/ids-core/internal/storage"
)

func TestEVEIngestorIngestJSON(t *testing.T) {
	ctx := context.Background()
	repo := storage.NewMemoryEventRepository(100)
	ing := NewEVEIngestor(repo)

	data, err := os.ReadFile(filepath.Join("testdata", "alert-scan-detected.json"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	evt, err := ing.IngestJSON(ctx, data)
	if err != nil {
		t.Fatalf("IngestJSON: %v", err)
	}
	if evt.ID == "" {
		t.Error("expected non-empty event ID")
	}
	count, _ := repo.Count(ctx)
	if count != 1 {
		t.Errorf("expected 1 event in repo, got %d", count)
	}
}

func TestEVEIngestorRejectsInvalidJSON(t *testing.T) {
	ctx := context.Background()
	repo := storage.NewMemoryEventRepository(10)
	ing := NewEVEIngestor(repo)

	_, err := ing.IngestJSON(ctx, []byte(`{invalid json}`))
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestEVEIngestorIngestJSONLines(t *testing.T) {
	ctx := context.Background()
	repo := storage.NewMemoryEventRepository(100)
	ing := NewEVEIngestor(repo)

	// Build proper JSON Lines: each event as a compact single line
	line1 := `{"timestamp":"2026-05-30T12:00:00.000000+0000","event_type":"flow","src_ip":"10.10.1.10","dest_ip":"203.0.113.42","proto":"TCP","flow_id":1}`
	line2 := `{"timestamp":"2026-05-30T12:01:00.000000+0000","event_type":"dns","src_ip":"10.10.1.5","dest_ip":"203.0.113.53","proto":"UDP","dns":{"rrname":"test.example.com"},"flow_id":2}`
	lines := line1 + "\n" + line2 + "\n"

	events, err := ing.IngestJSONLines(ctx, []byte(lines))
	if err != nil {
		t.Fatalf("IngestJSONLines: %v", err)
	}
	if len(events) != 2 {
		t.Errorf("expected 2 events, got %d", len(events))
	}
	count, _ := repo.Count(ctx)
	if count != 2 {
		t.Errorf("expected 2 in repo, got %d", count)
	}
}

func TestEVEIngestorJSONLinesReportsLineError(t *testing.T) {
	ctx := context.Background()
	repo := storage.NewMemoryEventRepository(10)
	ing := NewEVEIngestor(repo)

	lines := `{"timestamp":"2026-01-01T00:00:00.000000+0000","event_type":"flow","src_ip":"10.0.0.1","dest_ip":"10.0.0.2","proto":"TCP"}` + "\n" + `{invalid}` + "\n"

	_, err := ing.IngestJSONLines(ctx, []byte(lines))
	if err == nil {
		t.Error("expected error for invalid line")
	} else if !strings.Contains(err.Error(), "line 2") {
		t.Errorf("expected line 2 error, got: %v", err)
	}
}

func TestEVEIngestorStoresAllSyntheticSamples(t *testing.T) {
	ctx := context.Background()
	repo := storage.NewMemoryEventRepository(100)
	ing := NewEVEIngestor(repo)

	samples := []string{
		"alert-scan-detected.json",
		"flow-normal-it.json",
		"dns-query.json",
		"http-request.json",
		"tls-handshake.json",
		"ssh-session.json",
		"rdp-session.json",
		"smb-session.json",
		"modbus-read.json",
	}

	for _, name := range samples {
		data, err := os.ReadFile(filepath.Join("testdata", name))
		if err != nil {
			t.Fatalf("read %s: %v", name, err)
		}
		evt, err := ing.IngestJSON(ctx, data)
		if err != nil {
			t.Errorf("%s: IngestJSON failed: %v", name, err)
			continue
		}
		if err := evt.Validate(); err != nil {
			t.Errorf("%s: Validate failed: %v", name, err)
		}
	}
	count, _ := repo.Count(ctx)
	if count != 9 {
		t.Errorf("expected 9 events stored, got %d", count)
	}
}

func TestEVEIngestorRecentEventsAfterIngest(t *testing.T) {
	ctx := context.Background()
	repo := storage.NewMemoryEventRepository(100)
	ing := NewEVEIngestor(repo)

	data, _ := os.ReadFile(filepath.Join("testdata", "dns-query.json"))
	ing.IngestJSON(ctx, data)

	events, err := repo.Recent(ctx, 10)
	if err != nil {
		t.Fatalf("Recent: %v", err)
	}
	if len(events) < 1 {
		t.Fatal("expected at least 1 event")
	}
	if events[0].Type != domain.EventTypeNetworkConnection {
		t.Errorf("expected network_connection, got %v", events[0].Type)
	}
}

func TestEVEIngestorRejectsEmptyBody(t *testing.T) {
	ctx := context.Background()
	repo := storage.NewMemoryEventRepository(10)
	ing := NewEVEIngestor(repo)

	_, err := ing.IngestJSONLines(ctx, []byte{})
	if err == nil {
		t.Error("expected error for empty body")
	}
}
