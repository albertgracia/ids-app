package api

import (
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/albertgracia/ids-app/services/ids-core/internal/eventstream"
	"github.com/albertgracia/ids-app/services/ids-core/internal/ingest"
	"github.com/albertgracia/ids-app/services/ids-core/internal/storage"
)

const uniFiIngestDedupeWindow = 5 * time.Minute

type UniFiIngestHandler struct {
	repo        storage.EventRepository
	broadcaster *eventstream.Broadcaster

	mu   sync.Mutex
	seen map[string]time.Time
}

func NewUniFiIngestHandler(repo storage.EventRepository, broadcaster *eventstream.Broadcaster) *UniFiIngestHandler {
	return &UniFiIngestHandler{
		repo:        repo,
		broadcaster: broadcaster,
		seen:        make(map[string]time.Time),
	}
}

func (h *UniFiIngestHandler) HandleBatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := os.Getenv("IDS_UNIFI_INGEST_TOKEN")
	if strings.TrimSpace(token) == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "IDS_UNIFI_INGEST_TOKEN not configured"})
		return
	}

	authz := strings.TrimSpace(r.Header.Get("Authorization"))
	if authz == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing Authorization header"})
		return
	}
	if authz != "Bearer "+token {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "invalid bearer token"})
		return
	}

	if !isJSONContentType(r.Header.Get("Content-Type")) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Content-Type must be application/json"})
		return
	}

	body := http.MaxBytesReader(w, r.Body, ingest.MaxUniFiIngestPayloadBytes)
	defer body.Close()

	decoder := json.NewDecoder(body)
	decoder.DisallowUnknownFields()

	var req ingest.UniFiIngestBatchRequest
	if err := decoder.Decode(&req); err != nil {
		status := http.StatusBadRequest
		if strings.Contains(err.Error(), "http: request body too large") {
			status = http.StatusRequestEntityTooLarge
		}
		writeJSON(w, status, map[string]string{"error": "invalid JSON body"})
		return
	}
	if err := ensureSingleJSONObject(decoder); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON body"})
		return
	}

	if err := req.ValidateTopLevel(); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	resp := ingest.UniFiIngestBatchResponse{
		BatchID: req.BatchID,
		Errors:  make([]ingest.UniFiIngestError, 0),
	}
	batchSeen := make(map[string]struct{}, len(req.Events))

	for idx, item := range req.Events {
		issues := item.Validate()
		if len(issues) > 0 {
			resp.Rejected++
			for _, issue := range issues {
				issue.Index = idx
				resp.Errors = append(resp.Errors, issue)
			}
			continue
		}

		if _, ok := batchSeen[item.IdempotencyKey]; ok {
			resp.Duplicates++
			continue
		}
		batchSeen[item.IdempotencyKey] = struct{}{}

		if h.isDuplicate(item.IdempotencyKey, item.Timestamp) {
			resp.Duplicates++
			continue
		}

		evt, err := ingest.BuildUniFiDomainEvent(req, item)
		if err != nil {
			resp.Rejected++
			resp.Errors = append(resp.Errors, ingest.UniFiIngestError{Index: idx, Error: err.Error()})
			continue
		}

		if err := h.repo.Save(r.Context(), evt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		h.broadcaster.Publish(evt)
		resp.Accepted++
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *UniFiIngestHandler) isDuplicate(idempotencyKey string, ts time.Time) bool {
	now := ts.UTC()
	if now.IsZero() {
		now = time.Now().UTC()
	}
	cutoff := now.Add(-uniFiIngestDedupeWindow)

	h.mu.Lock()
	defer h.mu.Unlock()
	for key, seenAt := range h.seen {
		if seenAt.Before(cutoff) {
			delete(h.seen, key)
		}
	}
	if seenAt, ok := h.seen[idempotencyKey]; ok && !seenAt.Before(cutoff) {
		return true
	}
	h.seen[idempotencyKey] = now
	return false
}

func ensureSingleJSONObject(decoder *json.Decoder) error {
	var extra any
	if err := decoder.Decode(&extra); err != nil {
		if errors.Is(err, io.EOF) {
			return nil
		}
		return err
	}
	return errors.New("unexpected extra JSON value")
}

func isJSONContentType(contentType string) bool {
	if strings.TrimSpace(contentType) == "" {
		return false
	}
	mediaType, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		return false
	}
	return mediaType == "application/json"
}
