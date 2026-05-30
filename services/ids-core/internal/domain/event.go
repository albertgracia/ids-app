package domain

import (
	"crypto/rand"
	"fmt"
	"net/netip"
	"time"
)

type Endpoint struct {
	IP       string `json:"ip"`
	Port     int    `json:"port,omitempty"`
	Hostname string `json:"hostname,omitempty"`
	AssetID  string `json:"asset_id,omitempty"`
	MAC      string `json:"mac,omitempty"`
}

type Event struct {
	ID          string            `json:"id"`
	Timestamp   time.Time         `json:"timestamp"`
	Type        EventType         `json:"type"`
	Severity    Severity          `json:"severity"`
	Protocol    Protocol          `json:"protocol"`
	Source      Endpoint          `json:"source"`
	Destination Endpoint          `json:"destination"`
	Direction   Direction         `json:"direction"`
	Zone        Zone              `json:"zone"`
	Title       string            `json:"title"`
	Description string            `json:"description,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

func generateID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func NewEvent(eventType EventType, severity Severity, title string) Event {
	return Event{
		ID:        generateID(),
		Timestamp: time.Now().UTC(),
		Type:      eventType,
		Severity:  severity,
		Protocol:  ProtocolUnknown,
		Direction: DirectionUnknown,
		Zone:      ZoneUnknown,
		Title:     title,
		Tags:      []string{},
		Metadata:  map[string]string{},
	}
}

func (e Event) Validate() error {
	if e.ID == "" {
		return fmt.Errorf("event id is required")
	}
	if e.Timestamp.IsZero() {
		return fmt.Errorf("event timestamp is required")
	}
	if _, err := ParseEventType(e.Type.String()); err != nil {
		return fmt.Errorf("invalid event type: %w", err)
	}
	if _, err := ParseSeverity(e.Severity.String()); err != nil {
		return fmt.Errorf("invalid severity: %w", err)
	}
	if _, err := ParseProtocol(e.Protocol.String()); err != nil {
		return fmt.Errorf("invalid protocol: %w", err)
	}
	if e.Source.IP != "" {
		if _, err := netip.ParseAddr(e.Source.IP); err != nil {
			return fmt.Errorf("invalid source IP: %w", err)
		}
	}
	if e.Destination.IP != "" {
		if _, err := netip.ParseAddr(e.Destination.IP); err != nil {
			return fmt.Errorf("invalid destination IP: %w", err)
		}
	}
	if e.Source.Port < 0 || e.Source.Port > 65535 {
		return fmt.Errorf("source port out of range: %d", e.Source.Port)
	}
	if e.Destination.Port < 0 || e.Destination.Port > 65535 {
		return fmt.Errorf("destination port out of range: %d", e.Destination.Port)
	}
	if e.Title == "" {
		return fmt.Errorf("event title is required")
	}
	return nil
}
