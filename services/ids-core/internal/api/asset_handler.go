package api

import (
	"net/http"
	"strconv"

	"github.com/albertgracia/ids-app/services/ids-core/internal/assets"
	"github.com/albertgracia/ids-app/services/ids-core/internal/storage"
)

type AssetHandler struct {
	repo storage.EventRepository
}

func NewAssetHandler(repo storage.EventRepository) *AssetHandler {
	return &AssetHandler{repo: repo}
}

func (h *AssetHandler) HandleClassifications(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", 405)
		return
	}

	limitQ := r.URL.Query().Get("limit")
	limit := 50
	if limitQ != "" {
		if v, err := strconv.Atoi(limitQ); err == nil && v > 0 && v <= 200 {
			limit = v
		}
	}

	events, err := h.repo.Recent(r.Context(), limit)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	filterType := r.URL.Query().Get("type")
	filterZone := r.URL.Query().Get("zone")

	classifications := assets.ClassifyAssetsFromEvents(events)
	var filtered []assets.AssetClassification
	for _, c := range classifications {
		if filterType != "" && string(c.AssetType) != filterType {
			continue
		}
		if filterZone != "" && c.Zone != filterZone {
			continue
		}
		filtered = append(filtered, c)
	}

	writeJSON(w, 200, map[string]interface{}{
		"items": filtered,
		"count": len(filtered),
	})
}

func (h *AssetHandler) HandleIPClassification(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", 405)
		return
	}

	ip := r.URL.Query().Get("ip")
	if ip == "" {
		writeJSON(w, 400, map[string]string{"error": "ip parameter required"})
		return
	}

	events, err := h.repo.Recent(r.Context(), 100)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	c := assets.ClassifyIP(ip, events)
	if c == nil {
		writeJSON(w, 200, map[string]string{"error": "no events for IP"})
		return
	}

	writeJSON(w, 200, c)
}
