package domain

import (
	"encoding/json"
	"fmt"
)

type Severity int

const (
	SeverityInfo     Severity = 0
	SeverityLow      Severity = 1
	SeverityMedium   Severity = 2
	SeverityHigh     Severity = 3
	SeverityCritical Severity = 4
)

var severityNames = map[Severity]string{
	SeverityInfo:     "info",
	SeverityLow:      "low",
	SeverityMedium:   "medium",
	SeverityHigh:     "high",
	SeverityCritical: "critical",
}

var severityValues = map[string]Severity{
	"info":     SeverityInfo,
	"low":      SeverityLow,
	"medium":   SeverityMedium,
	"high":     SeverityHigh,
	"critical": SeverityCritical,
}

func (s Severity) String() string {
	if name, ok := severityNames[s]; ok {
		return name
	}
	return fmt.Sprintf("Severity(%d)", int(s))
}

func (s Severity) MarshalJSON() ([]byte, error) {
	return []byte(`"` + s.String() + `"`), nil
}

func (s *Severity) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return fmt.Errorf("invalid severity format: %w", err)
	}
	val, ok := severityValues[str]
	if !ok {
		return fmt.Errorf("unknown severity: %s", str)
	}
	*s = val
	return nil
}

func ParseSeverity(s string) (Severity, error) {
	val, ok := severityValues[s]
	if !ok {
		return SeverityInfo, fmt.Errorf("unknown severity: %s", s)
	}
	return val, nil
}

func ValidSeverities() []string {
	names := make([]string, 0, len(severityValues))
	for _, s := range []Severity{SeverityInfo, SeverityLow, SeverityMedium, SeverityHigh, SeverityCritical} {
		names = append(names, s.String())
	}
	return names
}
