package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/albertgracia/ids-app/services/ids-core/internal/ingest"
)

type EventHandler struct {
	store     *ingest.EventStore
	simulator *ingest.Simulator
}

func NewEventHandler(store *ingest.EventStore, simulator *ingest.Simulator) *EventHandler {
	return &EventHandler{store: store, simulator: simulator}
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

	events := h.store.Recent(limit)
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

	for _, e := range events {
		h.store.Add(e)
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

// StripPrefix is a helper to strip path prefix for routing.
func StripPrefix(prefix string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, prefix)
		if path != r.URL.Path {
			r.URL.Path = path
		}
		next(w, r)
	}
}
