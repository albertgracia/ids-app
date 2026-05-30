package storage

import (
	"context"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

type EventRepository interface {
	Save(ctx context.Context, event domain.Event) error
	Recent(ctx context.Context, limit int) ([]domain.Event, error)
	Count(ctx context.Context) (int, error)
	Close(ctx context.Context) error
}
