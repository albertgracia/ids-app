package eventstream

import (
	"log"
	"sync"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

const defaultBufferSize = 64

type Broadcaster struct {
	mu          sync.RWMutex
	subscribers map[chan domain.Event]struct{}
	closed      bool
}

func NewBroadcaster() *Broadcaster {
	return &Broadcaster{
		subscribers: make(map[chan domain.Event]struct{}),
	}
}

func (b *Broadcaster) Subscribe() chan domain.Event {
	ch := make(chan domain.Event, defaultBufferSize)
	b.mu.Lock()
	if b.closed {
		b.mu.Unlock()
		return nil
	}
	b.subscribers[ch] = struct{}{}
	b.mu.Unlock()
	return ch
}

func (b *Broadcaster) Unsubscribe(ch chan domain.Event) {
	b.mu.Lock()
	delete(b.subscribers, ch)
	b.mu.Unlock()
	close(ch)
}

func (b *Broadcaster) Publish(evt domain.Event) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	if b.closed {
		return
	}
	for ch := range b.subscribers {
		select {
		case ch <- evt:
		default:
			log.Printf("eventstream: subscriber channel full, dropping event %s", evt.ID)
		}
	}
}

func (b *Broadcaster) Close() {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed {
		return
	}
	b.closed = true
	for ch := range b.subscribers {
		close(ch)
	}
	b.subscribers = nil
}
