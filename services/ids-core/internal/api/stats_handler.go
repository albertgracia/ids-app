package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
	"github.com/albertgracia/ids-app/services/ids-core/internal/storage"
)

type EventStats struct {
	TotalEvents      int            `json:"total_events"`
	RecentEvents     int            `json:"recent_events"`
	EventsPerMinute  float64        `json:"events_per_minute"`
	SuspiciousEvents int            `json:"suspicious_events"`
	SeverityCounts   map[string]int `json:"severity_counts"`
	EventTypeCounts  map[string]int `json:"event_type_counts"`
	ProtocolCounts   map[string]int `json:"protocol_counts"`
	SourceCounts     map[string]int `json:"source_counts"`
	LastEventAt      string         `json:"last_event_at"`
	WindowSeconds    int            `json:"window_seconds"`
}

type StatsHandler struct {
	repo storage.EventRepository
}

func NewStatsHandler(repo storage.EventRepository) *StatsHandler {
	return &StatsHandler{repo: repo}
}

func (h *StatsHandler) HandleStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	windowSeconds := 300
	if ws := r.URL.Query().Get("window"); ws != "" {
		if v, err := strconv.Atoi(ws); err == nil && v > 0 && v <= 86400 {
			windowSeconds = v
		}
	}

	total, err := h.repo.Count(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	events, err := h.repo.Recent(r.Context(), 5000)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	now := time.Now().UTC()
	cutoff := now.Add(-time.Duration(windowSeconds) * time.Second)

	stats := EventStats{
		TotalEvents:     total,
		WindowSeconds:   windowSeconds,
		SeverityCounts:  make(map[string]int),
		EventTypeCounts: make(map[string]int),
		ProtocolCounts:  make(map[string]int),
		SourceCounts:    make(map[string]int),
	}

	var lastTimestamp time.Time

	for _, e := range events {
		s := e.Severity.String()
		stats.SeverityCounts[s]++

		et := e.Type.String()
		stats.EventTypeCounts[et]++

		p := e.Protocol.String()
		stats.ProtocolCounts[p]++

		if e.Source.IP != "" {
			stats.SourceCounts[e.Source.IP]++
		}

		if e.Timestamp.After(cutoff) {
			stats.RecentEvents++
			if e.Severity >= domain.SeverityHigh {
				stats.SuspiciousEvents++
			}
		}

		if e.Timestamp.After(lastTimestamp) {
			lastTimestamp = e.Timestamp
		}
	}

	if stats.RecentEvents > 0 && windowSeconds > 0 {
		stats.EventsPerMinute = float64(stats.RecentEvents) / (float64(windowSeconds) / 60.0)
	}

	if !lastTimestamp.IsZero() {
		stats.LastEventAt = lastTimestamp.Format(time.RFC3339)
	}

	writeJSON(w, http.StatusOK, stats)
}
