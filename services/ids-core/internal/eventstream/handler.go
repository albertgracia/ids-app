package eventstream

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

func SSEHandler(broadcaster *Broadcaster) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming not supported", 500)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.WriteHeader(http.StatusOK)

		ch := broadcaster.Subscribe()
		if ch == nil {
			fmt.Fprint(w, "data: {\"error\":\"broadcaster closed\"}\n\n")
			flusher.Flush()
			return
		}
		defer broadcaster.Unsubscribe(ch)

		fmt.Fprint(w, "event: connected\ndata: {\"status\":\"connected\"}\n\n")
		flusher.Flush()

		heartbeat := time.NewTicker(25 * time.Second)
		defer heartbeat.Stop()

		for {
			select {
			case evt, ok := <-ch:
				if !ok {
					return
				}
				data, err := json.Marshal(evt)
				if err != nil {
					log.Printf("eventstream: marshal error: %v", err)
					continue
				}
				fmt.Fprintf(w, "event: ids_event\ndata: %s\n\n", data)
				flusher.Flush()
			case <-heartbeat.C:
				fmt.Fprint(w, "event: heartbeat\ndata: {\"status\":\"ok\"}\n\n")
				flusher.Flush()
			case <-r.Context().Done():
				return
			}
		}
	}
}

func PublishAfterSave(broadcaster *Broadcaster, evt domain.Event, saveErr error) {
	if saveErr != nil {
		return
	}
	broadcaster.Publish(evt)
}
