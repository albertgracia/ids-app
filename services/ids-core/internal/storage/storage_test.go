package storage

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

func TestMemoryEventRepositorySaveAndRecent(t *testing.T) {
	ctx := context.Background()
	repo := NewMemoryEventRepository(10)

	e := domain.NewEvent(domain.EventTypeSystem, domain.SeverityInfo, "mem-test")
	if err := repo.Save(ctx, e); err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	events, err := repo.Recent(ctx, 10)
	if err != nil {
		t.Fatalf("Recent failed: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].ID != e.ID {
		t.Errorf("ID mismatch")
	}
}

func TestMemoryEventRepositoryCount(t *testing.T) {
	ctx := context.Background()
	repo := NewMemoryEventRepository(10)
	for i := 0; i < 5; i++ {
		repo.Save(ctx, domain.NewEvent(domain.EventTypeSystem, domain.SeverityInfo, "cnt"))
	}
	count, err := repo.Count(ctx)
	if err != nil {
		t.Fatalf("Count failed: %v", err)
	}
	if count != 5 {
		t.Errorf("expected 5, got %d", count)
	}
}

func TestMemoryEventRepositoryLimit(t *testing.T) {
	ctx := context.Background()
	repo := NewMemoryEventRepository(5)
	for i := 0; i < 10; i++ {
		repo.Save(ctx, domain.NewEvent(domain.EventTypeSystem, domain.SeverityInfo, "lim"))
	}
	count, _ := repo.Count(ctx)
	if count != 5 {
		t.Errorf("expected 5 (evicted), got %d", count)
	}
	events, _ := repo.Recent(ctx, 100)
	if len(events) != 5 {
		t.Errorf("expected 5 recent, got %d", len(events))
	}
}

func TestMemoryEventRepositoryCloseNoop(t *testing.T) {
	repo := NewMemoryEventRepository(10)
	if err := repo.Close(context.Background()); err != nil {
		t.Errorf("Close should be noop: %v", err)
	}
}

func TestMemoryEventRepositoryRecentLimit(t *testing.T) {
	ctx := context.Background()
	repo := NewMemoryEventRepository(100)
	for i := 0; i < 10; i++ {
		repo.Save(ctx, domain.NewEvent(domain.EventTypeSystem, domain.SeverityInfo, "lim"))
	}
	events, _ := repo.Recent(ctx, 3)
	if len(events) != 3 {
		t.Errorf("expected 3, got %d", len(events))
	}
	events2, _ := repo.Recent(ctx, 0)
	if len(events2) != 10 {
		t.Errorf("expected 10, got %d", len(events2))
	}
}

func TestMemoryEventRepositoryReturnsCopies(t *testing.T) {
	ctx := context.Background()
	repo := NewMemoryEventRepository(10)
	e := domain.NewEvent(domain.EventTypeSystem, domain.SeverityInfo, "original")
	repo.Save(ctx, e)

	events, _ := repo.Recent(ctx, 1)
	events[0].Title = "modified"

	events2, _ := repo.Recent(ctx, 1)
	if events2[0].Title == "modified" {
		t.Error("expected copy, not reference")
	}
}

func TestPostgresSchemaSQLIsValid(t *testing.T) {
	e := domain.NewEvent(domain.EventTypeScanDetected, domain.SeverityHigh, "schema-test")
	if err := e.Validate(); err != nil {
		t.Fatalf("event should be valid: %v", err)
	}
	e.Timestamp = time.Now().UTC()
	data, err := json.Marshal(e)
	if err != nil {
		t.Fatalf("marshal should work: %v", err)
	}
	var decoded domain.Event
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal should work: %v", err)
	}
}

func TestPostgresEventRepositoryIntegration(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set — skipping postgres integration test")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	if err := MigrateEvents(ctx, pool); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	repo := &PostgresEventRepository{pool: pool}

	e := domain.NewEvent(domain.EventTypeAuthFailure, domain.SeverityMedium, "pg-integration-test")
	e.Source = domain.Endpoint{IP: "10.0.0.1", Port: 12345}
	e.Tags = []string{"test", "integration"}
	e.Metadata = map[string]string{"key": "value"}

	if err := repo.Save(ctx, e); err != nil {
		t.Fatalf("Save: %v", err)
	}

	events, err := repo.Recent(ctx, 10)
	if err != nil {
		t.Fatalf("Recent: %v", err)
	}
	if len(events) < 1 {
		t.Fatal("expected at least 1 event")
	}

	found := false
	for _, ev := range events {
		if ev.ID == e.ID {
			found = true
			if ev.Title != e.Title {
				t.Errorf("Title mismatch: %s vs %s", ev.Title, e.Title)
			}
			if len(ev.Tags) != 2 {
				t.Errorf("expected 2 tags, got %d", len(ev.Tags))
			}
			if ev.Metadata["key"] != "value" {
				t.Errorf("metadata key mismatch")
			}
			break
		}
	}
	if !found {
		t.Error("saved event not found in recent")
	}

	_ = pool.QueryRow(ctx, "DELETE FROM events WHERE id = $1", e.ID)
}
