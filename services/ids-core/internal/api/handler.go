package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
	"github.com/albertgracia/ids-app/services/ids-core/internal/ingest"
	"github.com/albertgracia/ids-app/services/ids-core/internal/storage"
)

type EventHandler struct {
	repo      storage.EventRepository
	simulator *ingest.Simulator
}

func NewEventHandler(repo storage.EventRepository, simulator *ingest.Simulator) *EventHandler {
	return &EventHandler{repo: repo, simulator: simulator}
}

type recentEventsResponse struct {
	Items []json.RawMessage `json:"items"`
	Count int               `json:"count"`
	Limit int               `json:"limit"`
}

func (h *EventHandler) HandleRecentEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", 405)
		return
	}
	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		v, err := strconv.Atoi(limitStr)
		if err != nil || v < 1 {
			writeJSON(w, 400, map[string]string{"error": "invalid limit"})
			return
		}
		if v > 500 {
			v = 500
		}
		limit = v
	}

	events, err := h.repo.Recent(context.Background(), limit)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	if events == nil {
		events = []domain.Event{}
	}

	items := make([]json.RawMessage, 0, len(events))
	for _, e := range events {
		data, _ := json.Marshal(e)
		items = append(items, data)
	}

	writeJSON(w, 200, recentEventsResponse{
		Items: items,
		Count: len(events),
		Limit: limit,
	})
}

type simulateRequest struct {
	Scenario string `json:"scenario"`
	Count    int    `json:"count"`
}

type simulateResponse struct {
	Items    []json.RawMessage `json:"items"`
	Count    int               `json:"count"`
	Scenario string            `json:"scenario"`
}

func (h *EventHandler) HandleSimulateEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", 405)
		return
	}

	var req simulateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid JSON body"})
		return
	}

	scenario, err := ingest.ParseScenario(req.Scenario)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}

	count := req.Count
	if count < 1 {
		count = 1
	}
	if count > 100 {
		writeJSON(w, 400, map[string]string{"error": "count must be <= 100"})
		return
	}

	events, err := h.simulator.GenerateBatch(scenario, count)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	ctx := context.Background()
	for _, e := range events {
		if err := h.repo.Save(ctx, e); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
	}

	items := make([]json.RawMessage, 0, len(events))
	for _, e := range events {
		data, _ := json.Marshal(e)
		items = append(items, data)
	}

	writeJSON(w, 200, simulateResponse{
		Items:    items,
		Count:    len(events),
		Scenario: req.Scenario,
	})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func StripPrefix(prefix string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, prefix)
		if path != r.URL.Path {
			r.URL.Path = path
		}
		next(w, r)
	}
}
