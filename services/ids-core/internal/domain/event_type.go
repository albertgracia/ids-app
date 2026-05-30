package domain

import (
	"encoding/json"
	"fmt"
)

type EventType int

const (
	EventTypeNetworkConnection EventType = 0
	EventTypeScanDetected      EventType = 1
	EventTypeProtocolAnomaly   EventType = 2
	EventTypeAuthFailure       EventType = 3
	EventTypePolicyViolation   EventType = 4
	EventTypeAssetDiscovered   EventType = 5
	EventTypeOTCommand         EventType = 6
	EventTypeMalwareIndicator  EventType = 7
	EventTypeSystem            EventType = 8
)

var eventTypeNames = map[EventType]string{
	EventTypeNetworkConnection: "network_connection",
	EventTypeScanDetected:      "scan_detected",
	EventTypeProtocolAnomaly:   "protocol_anomaly",
	EventTypeAuthFailure:       "auth_failure",
	EventTypePolicyViolation:   "policy_violation",
	EventTypeAssetDiscovered:   "asset_discovered",
	EventTypeOTCommand:         "ot_command",
	EventTypeMalwareIndicator:  "malware_indicator",
	EventTypeSystem:            "system",
}

var eventTypeValues = map[string]EventType{
	"network_connection": EventTypeNetworkConnection,
	"scan_detected":      EventTypeScanDetected,
	"protocol_anomaly":   EventTypeProtocolAnomaly,
	"auth_failure":       EventTypeAuthFailure,
	"policy_violation":   EventTypePolicyViolation,
	"asset_discovered":   EventTypeAssetDiscovered,
	"ot_command":         EventTypeOTCommand,
	"malware_indicator":  EventTypeMalwareIndicator,
	"system":             EventTypeSystem,
}

func (et EventType) String() string {
	if name, ok := eventTypeNames[et]; ok {
		return name
	}
	return fmt.Sprintf("EventType(%d)", int(et))
}

func (et EventType) MarshalJSON() ([]byte, error) {
	return []byte(`"` + et.String() + `"`), nil
}

func (et *EventType) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return fmt.Errorf("invalid event type format: %w", err)
	}
	val, ok := eventTypeValues[str]
	if !ok {
		return fmt.Errorf("unknown event type: %s", str)
	}
	*et = val
	return nil
}

func ParseEventType(s string) (EventType, error) {
	val, ok := eventTypeValues[s]
	if !ok {
		return EventTypeNetworkConnection, fmt.Errorf("unknown event type: %s", s)
	}
	return val, nil
}

func ParseEventTypeSafe(s string) EventType {
	if v, ok := eventTypeValues[s]; ok {
		return v
	}
	return EventTypeNetworkConnection
}
