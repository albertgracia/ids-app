package domain

import (
	"encoding/json"
	"fmt"
)

type Direction int

const (
	DirectionInbound  Direction = 0
	DirectionOutbound Direction = 1
	DirectionLateral  Direction = 2
	DirectionInternal Direction = 3
	DirectionExternal Direction = 4
	DirectionUnknown  Direction = 5
)

var directionNames = map[Direction]string{
	DirectionInbound:  "inbound",
	DirectionOutbound: "outbound",
	DirectionLateral:  "lateral",
	DirectionInternal: "internal",
	DirectionExternal: "external",
	DirectionUnknown:  "unknown",
}

var directionValues = map[string]Direction{
	"inbound":  DirectionInbound,
	"outbound": DirectionOutbound,
	"lateral":  DirectionLateral,
	"internal": DirectionInternal,
	"external": DirectionExternal,
	"unknown":  DirectionUnknown,
}

func (d Direction) String() string {
	if name, ok := directionNames[d]; ok {
		return name
	}
	return fmt.Sprintf("Direction(%d)", int(d))
}

func (d Direction) MarshalJSON() ([]byte, error) {
	return []byte(`"` + d.String() + `"`), nil
}

func (d *Direction) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return fmt.Errorf("invalid direction format: %w", err)
	}
	val, ok := directionValues[str]
	if !ok {
		return fmt.Errorf("unknown direction: %s", str)
	}
	*d = val
	return nil
}

func ParseDirection(s string) (Direction, error) {
	val, ok := directionValues[s]
	if !ok {
		return DirectionUnknown, fmt.Errorf("unknown direction: %s", s)
	}
	return val, nil
}
