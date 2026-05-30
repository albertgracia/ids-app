package domain

import (
	"encoding/json"
	"fmt"
)

type Zone int

const (
	ZoneIT         Zone = 0
	ZoneOT         Zone = 1
	ZoneDMZ        Zone = 2
	ZoneManagement Zone = 3
	ZoneGuest      Zone = 4
	ZoneInternet   Zone = 5
	ZoneUnknown    Zone = 6
)

var zoneNames = map[Zone]string{
	ZoneIT:         "it",
	ZoneOT:         "ot",
	ZoneDMZ:        "dmz",
	ZoneManagement: "management",
	ZoneGuest:      "guest",
	ZoneInternet:   "internet",
	ZoneUnknown:    "unknown",
}

var zoneValues = map[string]Zone{
	"it":         ZoneIT,
	"ot":         ZoneOT,
	"dmz":        ZoneDMZ,
	"management": ZoneManagement,
	"guest":      ZoneGuest,
	"internet":   ZoneInternet,
	"unknown":    ZoneUnknown,
}

func (z Zone) String() string {
	if name, ok := zoneNames[z]; ok {
		return name
	}
	return fmt.Sprintf("Zone(%d)", int(z))
}

func (z Zone) MarshalJSON() ([]byte, error) {
	return []byte(`"` + z.String() + `"`), nil
}

func (z *Zone) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return fmt.Errorf("invalid zone format: %w", err)
	}
	val, ok := zoneValues[str]
	if !ok {
		return fmt.Errorf("unknown zone: %s", str)
	}
	*z = val
	return nil
}

func ParseZone(s string) (Zone, error) {
	val, ok := zoneValues[s]
	if !ok {
		return ZoneUnknown, fmt.Errorf("unknown zone: %s", s)
	}
	return val, nil
}
