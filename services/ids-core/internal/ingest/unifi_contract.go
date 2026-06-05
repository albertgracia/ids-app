package ingest

import (
	"fmt"
	"strings"
	"time"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

const (
	MaxUniFiIngestBatchEvents   = 100
	MaxUniFiIngestPayloadBytes  = 256 * 1024
	maxUniFiMessageLength       = 512
	maxUniFiProcessLength       = 128
	maxUniFiMetadataEntries     = 32
	maxUniFiMetadataKeyLength   = 64
	maxUniFiMetadataValueLength = 256
)

type UniFiIngestBatchRequest struct {
	Source      string             `json:"source"`
	SourceHost  string             `json:"source_host"`
	CollectorID string             `json:"collector_id"`
	BatchID     string             `json:"batch_id"`
	ObservedAt  time.Time          `json:"observed_at"`
	Events      []UniFiIngestEvent `json:"events"`
}

type UniFiIngestEvent struct {
	IdempotencyKey string            `json:"idempotency_key"`
	RawHash        string            `json:"raw_hash"`
	Kind           string            `json:"kind"`
	EventType      string            `json:"event_type"`
	Severity       string            `json:"severity"`
	Timestamp      time.Time         `json:"timestamp"`
	Process        string            `json:"process"`
	Message        string            `json:"message"`
	Metadata       map[string]string `json:"metadata"`
}

type UniFiIngestError struct {
	Index int    `json:"index,omitempty"`
	Field string `json:"field,omitempty"`
	Error string `json:"error"`
}

type UniFiIngestBatchResponse struct {
	Accepted   int                `json:"accepted"`
	Rejected   int                `json:"rejected"`
	Duplicates int                `json:"duplicates"`
	Errors     []UniFiIngestError `json:"errors"`
	BatchID    string             `json:"batch_id,omitempty"`
}

func (r UniFiIngestBatchRequest) ValidateTopLevel() error {
	if strings.TrimSpace(r.Source) != "unifi" {
		return fmt.Errorf("source must be \"unifi\"")
	}
	if strings.TrimSpace(r.SourceHost) == "" {
		return fmt.Errorf("source_host is required")
	}
	if strings.TrimSpace(r.CollectorID) == "" {
		return fmt.Errorf("collector_id is required")
	}
	if strings.TrimSpace(r.BatchID) == "" {
		return fmt.Errorf("batch_id is required")
	}
	if r.ObservedAt.IsZero() {
		return fmt.Errorf("observed_at is required")
	}
	if len(r.Events) == 0 {
		return fmt.Errorf("events must not be empty")
	}
	if len(r.Events) > MaxUniFiIngestBatchEvents {
		return fmt.Errorf("batch exceeds maximum of %d events", MaxUniFiIngestBatchEvents)
	}
	return nil
}

func (e UniFiIngestEvent) Validate() []UniFiIngestError {
	issues := make([]UniFiIngestError, 0)
	if strings.TrimSpace(e.IdempotencyKey) == "" {
		issues = append(issues, UniFiIngestError{Field: "idempotency_key", Error: "idempotency_key is required"})
	}
	if strings.TrimSpace(e.RawHash) == "" {
		issues = append(issues, UniFiIngestError{Field: "raw_hash", Error: "raw_hash is required"})
	}
	if strings.TrimSpace(e.Kind) == "" {
		issues = append(issues, UniFiIngestError{Field: "kind", Error: "kind is required"})
	}
	if strings.TrimSpace(e.EventType) == "" {
		issues = append(issues, UniFiIngestError{Field: "event_type", Error: "event_type is required"})
	} else if _, err := domain.ParseEventType(strings.TrimSpace(e.EventType)); err != nil {
		issues = append(issues, UniFiIngestError{Field: "event_type", Error: err.Error()})
	}
	if strings.TrimSpace(e.Severity) == "" {
		issues = append(issues, UniFiIngestError{Field: "severity", Error: "severity is required"})
	} else if _, err := domain.ParseSeverity(strings.TrimSpace(e.Severity)); err != nil {
		issues = append(issues, UniFiIngestError{Field: "severity", Error: err.Error()})
	}
	if e.Timestamp.IsZero() {
		issues = append(issues, UniFiIngestError{Field: "timestamp", Error: "timestamp is required"})
	}
	if strings.TrimSpace(e.Process) == "" {
		issues = append(issues, UniFiIngestError{Field: "process", Error: "process is required"})
	} else if len(e.Process) > maxUniFiProcessLength {
		issues = append(issues, UniFiIngestError{Field: "process", Error: "process exceeds maximum length"})
	}
	if strings.TrimSpace(e.Message) == "" {
		issues = append(issues, UniFiIngestError{Field: "message", Error: "message is required"})
	} else if len(e.Message) > maxUniFiMessageLength {
		issues = append(issues, UniFiIngestError{Field: "message", Error: "message exceeds maximum length"})
	}
	if len(e.Metadata) > maxUniFiMetadataEntries {
		issues = append(issues, UniFiIngestError{Field: "metadata", Error: "metadata exceeds maximum entries"})
	}
	for k, v := range e.Metadata {
		if strings.TrimSpace(k) == "" {
			issues = append(issues, UniFiIngestError{Field: "metadata", Error: "metadata key must not be empty"})
			break
		}
		if len(k) > maxUniFiMetadataKeyLength {
			issues = append(issues, UniFiIngestError{Field: "metadata", Error: "metadata key exceeds maximum length"})
			break
		}
		if len(v) > maxUniFiMetadataValueLength {
			issues = append(issues, UniFiIngestError{Field: "metadata", Error: "metadata value exceeds maximum length"})
			break
		}
	}
	return issues
}

func DeriveUniFiEventType(kind string) (domain.EventType, error) {
	switch strings.TrimSpace(kind) {
	case "dns_gateway_event":
		return domain.EventTypeDNSQuery, nil
	case "dpi_event", "dpi_flow_stats_event", "dhcp_ipv6_event":
		return domain.EventTypeNetworkConnection, nil
	case "gateway_health_event", "syslog_operational_event", "systemd_event", "mca_event":
		return domain.EventTypeSystem, nil
	case "unclassified_unifi_syslog":
		return domain.EventTypeUnclassifiedEvent, nil
	default:
		return domain.EventTypeNetworkConnection, fmt.Errorf("unknown UniFi kind: %s", kind)
	}
}

func BuildUniFiDomainEvent(batch UniFiIngestBatchRequest, item UniFiIngestEvent) (domain.Event, error) {
	eventType, err := domain.ParseEventType(strings.TrimSpace(item.EventType))
	if err != nil {
		return domain.Event{}, err
	}
	derivedType, err := DeriveUniFiEventType(item.Kind)
	if err != nil {
		return domain.Event{}, err
	}
	severity, err := domain.ParseSeverity(strings.TrimSpace(item.Severity))
	if err != nil {
		return domain.Event{}, err
	}
	if eventType != derivedType {
		return domain.Event{}, fmt.Errorf("event_type %q does not match kind %q", item.EventType, item.Kind)
	}

	evt := domain.NewEvent(eventType, severity, item.Message)
	evt.Timestamp = item.Timestamp.UTC()
	evt.Title = item.Message
	evt.Description = item.Message
	evt.Source.Hostname = batch.SourceHost
	evt.Tags = []string{"unifi", item.Kind, item.Process}
	evt.Metadata = cloneUniFiMetadata(item.Metadata)
	evt.Metadata["source"] = "unifi"
	evt.Metadata["source_host"] = batch.SourceHost
	evt.Metadata["collector_id"] = batch.CollectorID
	evt.Metadata["batch_id"] = batch.BatchID
	evt.Metadata["process"] = item.Process
	evt.Metadata["event_kind"] = item.Kind
	evt.Metadata["raw_hash"] = item.RawHash
	evt.Metadata["idempotency_key"] = item.IdempotencyKey

	if err := evt.Validate(); err != nil {
		return domain.Event{}, err
	}
	return evt, nil
}

func cloneUniFiMetadata(input map[string]string) map[string]string {
	cloned := make(map[string]string, len(input)+8)
	for k, v := range input {
		cloned[k] = v
	}
	return cloned
}
