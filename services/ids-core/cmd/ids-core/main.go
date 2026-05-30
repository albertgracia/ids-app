package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/albertgracia/ids-app/services/ids-core/internal/api"
	"github.com/albertgracia/ids-app/services/ids-core/internal/eventstream"
	"github.com/albertgracia/ids-app/services/ids-core/internal/ingest"
	"github.com/albertgracia/ids-app/services/ids-core/internal/storage"
	"github.com/albertgracia/ids-app/services/ids-core/internal/suricata"
)

type statusResponse struct {
	Service string `json:"service"`
	Status  string `json:"status"`
}

type readyResponse struct {
	Service string `json:"service"`
	Ready   bool   `json:"ready"`
}

type serviceStatus struct {
	Service      string   `json:"service"`
	Status       string   `json:"status"`
	Mode         string   `json:"mode"`
	Version      string   `json:"version"`
	StorageMode  string   `json:"storage_mode"`
	Capabilities []string `json:"capabilities"`
	LiveStream   string   `json:"live_stream,omitempty"`
}

func main() {
	port := os.Getenv("IDS_CORE_PORT")
	if port == "" {
		port = "8088"
	}

	storageMode := os.Getenv("IDS_STORAGE_MODE")
	if storageMode == "" {
		storageMode = "memory"
	}

	var repo storage.EventRepository
	ctx := context.Background()

	switch storageMode {
	case "postgres":
		databaseURL := os.Getenv("DATABASE_URL")
		if databaseURL == "" {
			log.Fatal("DATABASE_URL is required when IDS_STORAGE_MODE=postgres")
		}
		pgRepo, err := storage.NewPostgresEventRepository(ctx, databaseURL)
		if err != nil {
			log.Fatalf("postgres repository: %v", err)
		}
		if err := storage.MigrateEvents(ctx, pgRepo.Pool()); err != nil {
			log.Fatalf("migration: %v", err)
		}
		repo = pgRepo
		log.Printf("storage mode: postgres (%s)", databaseURL)
	default:
		repo = storage.NewMemoryEventRepository(5000)
		log.Printf("storage mode: memory (max 5000 events)")
	}

	broadcaster := eventstream.NewBroadcaster()

	simulator := ingest.NewSimulator(nil)
	handler := api.NewEventHandler(repo, simulator, broadcaster)

	eveIngestor := suricata.NewEVEIngestor(repo)
	suriHandler := api.NewSuricataHandler(eveIngestor, broadcaster)
	assetHandler := api.NewAssetHandler(repo)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", handleHealthz)
	mux.HandleFunc("/readyz", handleReadyz)
	mux.HandleFunc("/api/v1/status", handleStatus)
	mux.HandleFunc("/api/v1/events/recent", handler.HandleRecentEvents)
	mux.HandleFunc("/api/v1/simulate/events", handler.HandleSimulateEvents)
	mux.HandleFunc("/api/v1/suricata/eve", suriHandler.HandleEVE)
	mux.HandleFunc("/api/v1/suricata/eve/batch", suriHandler.HandleEVEBatch)
	mux.HandleFunc("/api/v1/events/stream", eventstream.SSEHandler(broadcaster))
	mux.HandleFunc("/api/v1/assets/classifications", assetHandler.HandleClassifications)
	mux.HandleFunc("/api/v1/assets/classification", assetHandler.HandleIPClassification)

	server := &http.Server{
		Addr:    ":" + port,
		Handler: api.CORSMiddleware(mux),
	}

	go func() {
		log.Printf("ids-core starting on :%s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down gracefully...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	server.Shutdown(shutdownCtx)
	broadcaster.Close()
	repo.Close(shutdownCtx)
}

func handleHealthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(statusResponse{Service: "ids-core", Status: "ok"})
}

func handleReadyz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(readyResponse{Service: "ids-core", Ready: true})
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	storageMode := os.Getenv("IDS_STORAGE_MODE")
	if storageMode == "" {
		storageMode = "memory"
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(serviceStatus{
		Service:     "ids-core",
		Status:      "ok",
		Mode:        "development",
		Version:     "0.1.0",
		StorageMode: storageMode,
		LiveStream:  "sse",
		Capabilities: []string{
			"event_model",
			"asset_inventory_model",
			"simulated_ingest",
			"suricata_eve_parser",
			"suricata_eve_ingest",
			"live_events_stream",
			"asset_behavior_classifier",
		},
	})
}
