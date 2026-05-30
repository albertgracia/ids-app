package ingest

import (
	"sync"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

const defaultMaxEvents = 1000

type EventStore struct {
	mu     sync.RWMutex
	events []domain.Event
	max    int
}

func NewEventStore(max int) *EventStore {
	if max <= 0 {
		max = defaultMaxEvents
	}
	return &EventStore{
		events: make([]domain.Event, 0, max),
		max:    max,
	}
}

func (s *EventStore) Add(event domain.Event) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.events) >= s.max {
		s.events = s.events[1:]
	}
	s.events = append(s.events, event)
}

func (s *EventStore) Recent(limit int) []domain.Event {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if limit <= 0 || limit > len(s.events) {
		limit = len(s.events)
	}
	result := make([]domain.Event, limit)
	for i := 0; i < limit; i++ {
		result[i] = s.events[len(s.events)-limit+i]
	}
	return result
}

func (s *EventStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.events)
}

func (s *EventStore) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = make([]domain.Event, 0, s.max)
}
