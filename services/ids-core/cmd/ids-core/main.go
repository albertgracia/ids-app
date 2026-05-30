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
	"github.com/albertgracia/ids-app/services/ids-core/internal/ingest"
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
	Capabilities []string `json:"capabilities"`
}

func main() {
	port := os.Getenv("IDS_CORE_PORT")
	if port == "" {
		port = "8088"
	}

	store := ingest.NewEventStore(5000)
	simulator := ingest.NewSimulator(store)
	handler := api.NewEventHandler(store, simulator)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", handleHealthz)
	mux.HandleFunc("/readyz", handleReadyz)
	mux.HandleFunc("/api/v1/status", handleStatus)
	mux.HandleFunc("/api/v1/events/recent", handler.HandleRecentEvents)
	mux.HandleFunc("/api/v1/simulate/events", handler.HandleSimulateEvents)

	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
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
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	server.Shutdown(ctx)
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
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(serviceStatus{
		Service:      "ids-core",
		Status:       "ok",
		Mode:         "development",
		Version:      "0.1.0",
		Capabilities: []string{"event_model", "asset_inventory_model", "simulated_ingest"},
	})
}
