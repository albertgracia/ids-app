package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/albertgracia/ids-app/services/ids-core/internal/suricata"
)

type SuricataHandler struct {
	ingestor *suricata.EVEIngestor
}

func NewSuricataHandler(ingestor *suricata.EVEIngestor) *SuricataHandler {
	return &SuricataHandler{ingestor: ingestor}
}

type suricataEveResponse struct {
	Item   json.RawMessage `json:"item"`
	Source string          `json:"source"`
	Count  int             `json:"count"`
}

type suricataEveBatchResponse struct {
	Items  []json.RawMessage `json:"items"`
	Source string            `json:"source"`
	Count  int               `json:"count"`
}

func (h *SuricataHandler) HandleEVE(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", 405)
		return
	}

	if ct := r.Header.Get("Content-Type"); ct != "" && ct != "application/json" {
		writeJSON(w, 400, map[string]string{"error": "Content-Type must be application/json"})
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": "cannot read body"})
		return
	}

	if len(body) == 0 {
		writeJSON(w, 400, map[string]string{"error": "empty body"})
		return
	}

	evt, err := h.ingestor.IngestJSON(r.Context(), body)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}

	data, _ := json.Marshal(evt)
	writeJSON(w, 200, suricataEveResponse{
		Item:   data,
		Source: "suricata_eve",
		Count:  1,
	})
}

func (h *SuricataHandler) HandleEVEBatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", 405)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": "cannot read body"})
		return
	}

	if len(body) == 0 {
		writeJSON(w, 400, map[string]string{"error": "empty body"})
		return
	}

	events, err := h.ingestor.IngestJSONLines(r.Context(), body)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}

	if len(events) > 100 {
		writeJSON(w, 400, map[string]string{"error": "batch exceeds maximum of 100 events"})
		return
	}

	items := make([]json.RawMessage, 0, len(events))
	for _, evt := range events {
		data, _ := json.Marshal(evt)
		items = append(items, data)
	}

	writeJSON(w, 200, suricataEveBatchResponse{
		Items:  items,
		Source: "suricata_eve",
		Count:  len(events),
	})
}
