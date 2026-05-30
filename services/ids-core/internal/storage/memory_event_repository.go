package storage

import (
	"context"
	"sync"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

const defaultMaxEvents = 5000

type MemoryEventRepository struct {
	mu     sync.RWMutex
	events []domain.Event
	max    int
}

func NewMemoryEventRepository(max int) *MemoryEventRepository {
	if max <= 0 {
		max = defaultMaxEvents
	}
	return &MemoryEventRepository{
		events: make([]domain.Event, 0, max),
		max:    max,
	}
}

func (r *MemoryEventRepository) Save(_ context.Context, event domain.Event) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.events) >= r.max {
		r.events = r.events[1:]
	}
	r.events = append(r.events, event)
	return nil
}

func (r *MemoryEventRepository) Recent(_ context.Context, limit int) ([]domain.Event, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if limit <= 0 || limit > len(r.events) {
		limit = len(r.events)
	}
	result := make([]domain.Event, limit)
	for i := 0; i < limit; i++ {
		result[i] = r.events[len(r.events)-limit+i]
	}
	return result, nil
}

func (r *MemoryEventRepository) Count(_ context.Context) (int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.events), nil
}

func (r *MemoryEventRepository) Close(_ context.Context) error {
	return nil
}
