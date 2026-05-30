package domain

import (
	"encoding/json"
	"fmt"
)

type Criticality int

const (
	CriticalityUnknown  Criticality = 0
	CriticalityLow      Criticality = 1
	CriticalityMedium   Criticality = 2
	CriticalityHigh     Criticality = 3
	CriticalityCritical Criticality = 4
)

var criticalityNames = map[Criticality]string{
	CriticalityUnknown:  "unknown",
	CriticalityLow:      "low",
	CriticalityMedium:   "medium",
	CriticalityHigh:     "high",
	CriticalityCritical: "critical",
}

var criticalityValues = map[string]Criticality{
	"unknown":  CriticalityUnknown,
	"low":      CriticalityLow,
	"medium":   CriticalityMedium,
	"high":     CriticalityHigh,
	"critical": CriticalityCritical,
}

func (c Criticality) String() string {
	if name, ok := criticalityNames[c]; ok {
		return name
	}
	return fmt.Sprintf("Criticality(%d)", int(c))
}

func (c Criticality) MarshalJSON() ([]byte, error) {
	return []byte(`"` + c.String() + `"`), nil
}

func (c *Criticality) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return fmt.Errorf("invalid criticality: %w", err)
	}
	if v, ok := criticalityValues[str]; ok {
		*c = v
	} else {
		return fmt.Errorf("unknown criticality: %s", str)
	}
	return nil
}

func ParseCriticality(s string) (Criticality, error) {
	if v, ok := criticalityValues[s]; ok {
		return v, nil
	}
	return CriticalityUnknown, fmt.Errorf("unknown criticality: %s", s)
}

func ValidCriticalities() []Criticality {
	return []Criticality{CriticalityUnknown, CriticalityLow, CriticalityMedium, CriticalityHigh, CriticalityCritical}
}
