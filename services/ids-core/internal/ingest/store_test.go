package ingest

import (
	"testing"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

func TestEventStoreAddAndCount(t *testing.T) {
	s := NewEventStore(10)
	if s.Count() != 0 {
		t.Errorf("expected 0, got %d", s.Count())
	}
	e := domain.NewEvent(domain.EventTypeSystem, domain.SeverityInfo, "test")
	s.Add(e)
	if s.Count() != 1 {
		t.Errorf("expected 1, got %d", s.Count())
	}
}

func TestEventStoreRecentLimit(t *testing.T) {
	s := NewEventStore(100)
	for i := 0; i < 10; i++ {
		s.Add(domain.NewEvent(domain.EventTypeSystem, domain.SeverityInfo, "e"))
	}
	recent := s.Recent(3)
	if len(recent) != 3 {
		t.Errorf("expected 3, got %d", len(recent))
	}
	recent = s.Recent(0)
	if len(recent) != 10 {
		t.Errorf("expected 10, got %d", len(recent))
	}
}

func TestEventStoreMaxSizeEvictsOldest(t *testing.T) {
	s := NewEventStore(3)
	for i := 0; i < 5; i++ {
		e := domain.NewEvent(domain.EventTypeSystem, domain.SeverityInfo, "e")
		s.Add(e)
	}
	if s.Count() != 3 {
		t.Errorf("expected 3, got %d", s.Count())
	}
}

func TestEventStoreReturnsCopies(t *testing.T) {
	s := NewEventStore(10)
	original := domain.NewEvent(domain.EventTypeSystem, domain.SeverityInfo, "original")
	s.Add(original)

	recent := s.Recent(1)
	recent[0].Title = "modified"

	if s.Recent(1)[0].Title == "modified" {
		t.Error("store should return copies, not references")
	}
}

func TestEventStoreClear(t *testing.T) {
	s := NewEventStore(10)
	s.Add(domain.NewEvent(domain.EventTypeSystem, domain.SeverityInfo, "a"))
	s.Add(domain.NewEvent(domain.EventTypeSystem, domain.SeverityInfo, "b"))
	s.Clear()
	if s.Count() != 0 {
		t.Errorf("expected 0 after clear, got %d", s.Count())
	}
}

func TestEventStoreDefaultMax(t *testing.T) {
	s := NewEventStore(0)
	if s.max != defaultMaxEvents {
		t.Errorf("expected default max %d, got %d", defaultMaxEvents, s.max)
	}
}

func TestSimulatorGenerateKnownScenarios(t *testing.T) {
	store := NewEventStore(100)
	sim := NewSimulator(store)

	for _, scenario := range ValidScenarios {
		evt, err := sim.Generate(scenario)
		if err != nil {
			t.Errorf("Generate(%s) failed: %v", scenario, err)
		}
		if evt.ID == "" {
			t.Errorf("Generate(%s): expected non-empty ID", scenario)
		}
	}
}

func TestSimulatorRejectsUnknownScenario(t *testing.T) {
	store := NewEventStore(100)
	sim := NewSimulator(store)
	_, err := sim.Generate("invalid_scenario")
	if err == nil {
		t.Error("expected error for unknown scenario")
	}
}

func TestSimulatorGenerateBatch(t *testing.T) {
	store := NewEventStore(200)
	sim := NewSimulator(store)
	events, err := sim.GenerateBatch(ScenarioNormalIT, 5)
	if err != nil {
		t.Fatalf("GenerateBatch failed: %v", err)
	}
	if len(events) != 5 {
		t.Errorf("expected 5 events, got %d", len(events))
	}
}

func TestSimulatorRejectsInvalidBatchCount(t *testing.T) {
	store := NewEventStore(100)
	sim := NewSimulator(store)
	_, err := sim.GenerateBatch(ScenarioNormalIT, 0)
	if err == nil {
		t.Error("expected error for count=0")
	}
	_, err = sim.GenerateBatch(ScenarioNormalIT, 101)
	if err == nil {
		t.Error("expected error for count=101")
	}
}

func TestSimulatorGeneratedEventsValidate(t *testing.T) {
	store := NewEventStore(100)
	sim := NewSimulator(store)

	for _, scenario := range ValidScenarios {
		evt, err := sim.Generate(scenario)
		if err != nil {
			t.Fatalf("Generate(%s) failed: %v", scenario, err)
		}
		if err := evt.Validate(); err != nil {
			t.Errorf("generated event for %s failed validation: %v", scenario, err)
		}
	}
}

func TestSimulatorBatchStoresEvents(t *testing.T) {
	store := NewEventStore(100)
	sim := NewSimulator(store)
	events, err := sim.GenerateBatch(ScenarioScanDetected, 3)
	if err != nil {
		t.Fatalf("GenerateBatch failed: %v", err)
	}
	for _, e := range events {
		store.Add(e)
	}
	if store.Count() != 3 {
		t.Errorf("expected 3 stored, got %d", store.Count())
	}
}
