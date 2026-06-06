package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
	"github.com/albertgracia/ids-app/services/ids-core/internal/storage"
)

func TestStatsHandler_Empty(t *testing.T) {
	repo := storage.NewMemoryEventRepository(5000)
	statsHandler := NewStatsHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats", nil)
	rec := httptest.NewRecorder()
	statsHandler.HandleStats(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var stats EventStats
	if err := json.NewDecoder(rec.Body).Decode(&stats); err != nil {
		t.Fatalf("decode: %v", err)
	}

	if stats.TotalEvents != 0 {
		t.Errorf("expected 0 total, got %d", stats.TotalEvents)
	}
	if stats.RecentEvents != 0 {
		t.Errorf("expected 0 recent, got %d", stats.RecentEvents)
	}
	if len(stats.SeverityCounts) != 0 {
		t.Errorf("expected empty severity, got %v", stats.SeverityCounts)
	}
	if stats.LastEventAt != "" {
		t.Errorf("expected empty last_event_at, got %s", stats.LastEventAt)
	}
	if stats.WindowSeconds != 300 {
		t.Errorf("expected default window 300, got %d", stats.WindowSeconds)
	}
}

func TestStatsHandler_WithEvents(t *testing.T) {
	repo := storage.NewMemoryEventRepository(5000)
	for i := 0; i < 10; i++ {
		evt := domain.NewEvent(domain.EventTypeDNSQuery, domain.SeverityInfo, "test event")
		evt.Source.IP = "192.168.1.1"
		if err := repo.Save(context.Background(), evt); err != nil {
			t.Fatalf("save: %v", err)
		}
	}
	for i := 0; i < 3; i++ {
		evt := domain.NewEvent(domain.EventTypeNetworkConnection, domain.SeverityHigh, "suspicious event")
		evt.Source.IP = "10.0.0.1"
		if err := repo.Save(context.Background(), evt); err != nil {
			t.Fatalf("save: %v", err)
		}
	}
	for i := 0; i < 2; i++ {
		evt := domain.NewEvent(domain.EventTypeSystem, domain.SeverityMedium, "system event")
		evt.Source.IP = ""
		if err := repo.Save(context.Background(), evt); err != nil {
			t.Fatalf("save: %v", err)
		}
	}

	statsHandler := NewStatsHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats?window=3600", nil)
	rec := httptest.NewRecorder()
	statsHandler.HandleStats(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var stats EventStats
	if err := json.NewDecoder(rec.Body).Decode(&stats); err != nil {
		t.Fatalf("decode: %v", err)
	}

	if stats.TotalEvents != 15 {
		t.Errorf("expected 15 total, got %d", stats.TotalEvents)
	}
	if stats.RecentEvents != 15 {
		t.Errorf("expected 15 recent (within 1h window), got %d", stats.RecentEvents)
	}
	if stats.SuspiciousEvents != 3 {
		t.Errorf("expected 3 suspicious (high+critical), got %d", stats.SuspiciousEvents)
	}
	if stats.EventsPerMinute <= 0 {
		t.Errorf("expected positive events/min, got %f", stats.EventsPerMinute)
	}
	if stats.SeverityCounts["info"] != 10 {
		t.Errorf("expected 10 info, got %d", stats.SeverityCounts["info"])
	}
	if stats.SeverityCounts["high"] != 3 {
		t.Errorf("expected 3 high, got %d", stats.SeverityCounts["high"])
	}
	if stats.SeverityCounts["medium"] != 2 {
		t.Errorf("expected 2 medium, got %d", stats.SeverityCounts["medium"])
	}
	if stats.EventTypeCounts["dns_query"] != 10 {
		t.Errorf("expected 10 dns_query, got %d", stats.EventTypeCounts["dns_query"])
	}
	if stats.EventTypeCounts["network_connection"] != 3 {
		t.Errorf("expected 3 network_connection, got %d", stats.EventTypeCounts["network_connection"])
	}
	if stats.SourceCounts["192.168.1.1"] != 10 {
		t.Errorf("expected 10 for 192.168.1.1, got %d", stats.SourceCounts["192.168.1.1"])
	}
	if stats.SourceCounts["10.0.0.1"] != 3 {
		t.Errorf("expected 3 for 10.0.0.1, got %d", stats.SourceCounts["10.0.0.1"])
	}
	if _, exists := stats.SourceCounts[""]; exists {
		t.Error("should not have empty string as source key")
	}
	if stats.WindowSeconds != 3600 {
		t.Errorf("expected window 3600, got %d", stats.WindowSeconds)
	}
	if stats.LastEventAt == "" {
		t.Error("expected last_event_at to be set")
	}
}

func TestStatsHandler_NoSourceIP(t *testing.T) {
	repo := storage.NewMemoryEventRepository(5000)
	evt := domain.NewEvent(domain.EventTypeDNSQuery, domain.SeverityInfo, "no-ip event")
	if err := repo.Save(context.Background(), evt); err != nil {
		t.Fatalf("save: %v", err)
	}

	statsHandler := NewStatsHandler(repo)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats", nil)
	rec := httptest.NewRecorder()
	statsHandler.HandleStats(rec, req)

	var stats EventStats
	json.NewDecoder(rec.Body).Decode(&stats)

	if stats.TotalEvents != 1 {
		t.Errorf("expected 1 total, got %d", stats.TotalEvents)
	}
	if len(stats.SourceCounts) != 0 {
		t.Errorf("expected 0 sources (no IP), got %d", len(stats.SourceCounts))
	}
}

func TestStatsHandler_OldEventsOutsideWindow(t *testing.T) {
	repo := storage.NewMemoryEventRepository(5000)
	evt := domain.NewEvent(domain.EventTypeDNSQuery, domain.SeverityInfo, "old event")
	evt.Timestamp = time.Now().UTC().Add(-2 * time.Hour)
	if err := repo.Save(context.Background(), evt); err != nil {
		t.Fatalf("save: %v", err)
	}

	statsHandler := NewStatsHandler(repo)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats?window=60", nil)
	rec := httptest.NewRecorder()
	statsHandler.HandleStats(rec, req)

	var stats EventStats
	json.NewDecoder(rec.Body).Decode(&stats)

	if stats.TotalEvents != 1 {
		t.Errorf("expected 1 total, got %d", stats.TotalEvents)
	}
	if stats.RecentEvents != 0 {
		t.Errorf("expected 0 recent (event outside window), got %d", stats.RecentEvents)
	}
	if stats.LastEventAt == "" {
		t.Error("expected last_event_at to be set (event exists)")
	}
}

func TestStatsHandler_MethodNotAllowed(t *testing.T) {
	repo := storage.NewMemoryEventRepository(5000)
	statsHandler := NewStatsHandler(repo)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/stats", nil)
	rec := httptest.NewRecorder()
	statsHandler.HandleStats(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", rec.Code)
	}
}
