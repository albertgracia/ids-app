package ingest

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

type Scenario string

const (
	ScenarioNormalIT      Scenario = "normal_it_connection"
	ScenarioOTModbusRead  Scenario = "ot_modbus_read"
	ScenarioOTS7Command   Scenario = "ot_s7_command"
	ScenarioScanDetected  Scenario = "scan_detected"
	ScenarioAuthFailure   Scenario = "auth_failure"
	ScenarioProtoAnomaly  Scenario = "protocol_anomaly"
	ScenarioMalwareInd    Scenario = "malware_indicator"
)

var ValidScenarios = []Scenario{
	ScenarioNormalIT,
	ScenarioOTModbusRead,
	ScenarioOTS7Command,
	ScenarioScanDetected,
	ScenarioAuthFailure,
	ScenarioProtoAnomaly,
	ScenarioMalwareInd,
}

var scenarioNames = map[Scenario]string{
	ScenarioNormalIT:     "normal_it_connection",
	ScenarioOTModbusRead: "ot_modbus_read",
	ScenarioOTS7Command:  "ot_s7_command",
	ScenarioScanDetected: "scan_detected",
	ScenarioAuthFailure:  "auth_failure",
	ScenarioProtoAnomaly: "protocol_anomaly",
	ScenarioMalwareInd:   "malware_indicator",
}

var scenarioValues = map[string]Scenario{
	"normal_it_connection": ScenarioNormalIT,
	"ot_modbus_read":       ScenarioOTModbusRead,
	"ot_s7_command":        ScenarioOTS7Command,
	"scan_detected":        ScenarioScanDetected,
	"auth_failure":         ScenarioAuthFailure,
	"protocol_anomaly":     ScenarioProtoAnomaly,
	"malware_indicator":    ScenarioMalwareInd,
}

func ParseScenario(s string) (Scenario, error) {
	if v, ok := scenarioValues[s]; ok {
		return v, nil
	}
	return "", fmt.Errorf("unknown scenario: %s", s)
}

var rng = rand.New(rand.NewSource(time.Now().UnixNano()))

func pick[T any](items []T) T {
	return items[rng.Intn(len(items))]
}

var internalIPs = []string{"10.0.0.10", "10.0.0.20", "192.168.1.100", "192.168.1.200", "172.16.0.5"}
var externalIPs = []string{"185.156.173.10", "91.121.87.34", "45.33.32.156", "103.235.46.90", "198.51.100.7"}

type Simulator struct {
	store *EventStore
}

func NewSimulator(store *EventStore) *Simulator {
	return &Simulator{store: store}
}

func (sim *Simulator) Generate(scenario Scenario) (domain.Event, error) {
	if _, err := ParseScenario(string(scenario)); err != nil {
		return domain.Event{}, err
	}
	evt := sim.build(scenario)
	if err := evt.Validate(); err != nil {
		return domain.Event{}, fmt.Errorf("generated invalid event: %w", err)
	}
	return evt, nil
}

func (sim *Simulator) GenerateBatch(scenario Scenario, count int) ([]domain.Event, error) {
	if count < 1 {
		return nil, fmt.Errorf("count must be >= 1")
	}
	if count > 100 {
		return nil, fmt.Errorf("count must be <= 100")
	}
	if _, err := ParseScenario(string(scenario)); err != nil {
		return nil, err
	}
	events := make([]domain.Event, 0, count)
	for i := 0; i < count; i++ {
		evt, err := sim.Generate(scenario)
		if err != nil {
			return nil, err
		}
		events = append(events, evt)
	}
	return events, nil
}

func (sim *Simulator) build(scenario Scenario) domain.Event {
	switch scenario {
	case ScenarioNormalIT:
		return sim.normalIT()
	case ScenarioOTModbusRead:
		return sim.otModbusRead()
	case ScenarioOTS7Command:
		return sim.otS7Command()
	case ScenarioScanDetected:
		return sim.scanDetected()
	case ScenarioAuthFailure:
		return sim.authFailure()
	case ScenarioProtoAnomaly:
		return sim.protocolAnomaly()
	case ScenarioMalwareInd:
		return sim.malwareIndicator()
	default:
		return sim.normalIT()
	}
}

func (sim *Simulator) normalIT() domain.Event {
	protocols := []domain.Protocol{domain.ProtocolHTTPS, domain.ProtocolDNS, domain.ProtocolHTTP}
	sev := []domain.Severity{domain.SeverityInfo, domain.SeverityLow}
	return domain.Event{
		ID:        domain.NewEvent(domain.EventTypeNetworkConnection, domain.SeverityInfo, "").ID,
		Timestamp: time.Now().UTC(),
		Type:      domain.EventTypeNetworkConnection,
		Severity:  pick(sev),
		Protocol:  pick(protocols),
		Source:    domain.Endpoint{IP: pick(internalIPs), Port: pick([]int{49152, 54321, 33456})},
		Destination: domain.Endpoint{IP: pick(externalIPs), Port: pick([]int{443, 80, 53})},
		Direction: domain.DirectionOutbound,
		Zone:      domain.ZoneIT,
		Title:     "Normal IT connection",
		Tags:      []string{"it", "normal"},
		Metadata:  map[string]string{"bytes": pick([]string{"1200", "850", "2048"})},
	}
}

func (sim *Simulator) otModbusRead() domain.Event {
	sev := []domain.Severity{domain.SeverityLow, domain.SeverityMedium}
	return domain.Event{
		ID:        domain.NewEvent(domain.EventTypeOTCommand, domain.SeverityLow, "").ID,
		Timestamp: time.Now().UTC(),
		Type:      domain.EventTypeOTCommand,
		Severity:  pick(sev),
		Protocol:  domain.ProtocolModbus,
		Source:    domain.Endpoint{IP: "10.0.0.10", Port: pick([]int{502, 49152})},
		Destination: domain.Endpoint{IP: pick([]string{"10.0.0.50", "10.0.0.60"}), Port: 502},
		Direction: domain.DirectionLateral,
		Zone:      domain.ZoneOT,
		Title:     "Modbus read request",
		Tags:      []string{"ot", "modbus"},
		Metadata:  map[string]string{"function_code": "03", "register": pick([]string{"100", "200", "300"})},
	}
}

func (sim *Simulator) otS7Command() domain.Event {
	sev := []domain.Severity{domain.SeverityMedium, domain.SeverityHigh}
	return domain.Event{
		ID:        domain.NewEvent(domain.EventTypeOTCommand, domain.SeverityMedium, "").ID,
		Timestamp: time.Now().UTC(),
		Type:      domain.EventTypeOTCommand,
		Severity:  pick(sev),
		Protocol:  domain.ProtocolS7Comm,
		Source:    domain.Endpoint{IP: "10.0.0.10", Port: 49153},
		Destination: domain.Endpoint{IP: pick([]string{"10.0.0.70", "10.0.0.80"}), Port: 102},
		Direction: domain.DirectionLateral,
		Zone:      domain.ZoneOT,
		Title:     "S7 PLC command",
		Tags:      []string{"ot", "s7", "plc"},
		Metadata:  map[string]string{"function": pick([]string{"write_db", "read_db", "start"})},
	}
}

func (sim *Simulator) scanDetected() domain.Event {
	return domain.Event{
		ID:        domain.NewEvent(domain.EventTypeScanDetected, domain.SeverityMedium, "").ID,
		Timestamp: time.Now().UTC(),
		Type:      domain.EventTypeScanDetected,
		Severity:  domain.SeverityHigh,
		Protocol:  domain.ProtocolTCP,
		Source:    domain.Endpoint{IP: pick(externalIPs), Port: pick([]int{34567, 45678, 56789})},
		Destination: domain.Endpoint{IP: pick(internalIPs), Port: pick([]int{22, 80, 443, 8080})},
		Direction: domain.DirectionInbound,
		Zone:      domain.ZoneDMZ,
		Title:     "Port scan detected",
		Tags:      []string{"scan", "recon"},
		Metadata:  map[string]string{"ports": "22,80,443,8080", "type": "syn"},
	}
}

func (sim *Simulator) authFailure() domain.Event {
	protocols := []domain.Protocol{domain.ProtocolSSH, domain.ProtocolRDP, domain.ProtocolSMB}
	return domain.Event{
		ID:        domain.NewEvent(domain.EventTypeAuthFailure, domain.SeverityMedium, "").ID,
		Timestamp: time.Now().UTC(),
		Type:      domain.EventTypeAuthFailure,
		Severity:  domain.SeverityMedium,
		Protocol:  pick(protocols),
		Source:    domain.Endpoint{IP: pick(externalIPs), Port: pick([]int{40000, 50000})},
		Destination: domain.Endpoint{IP: pick(internalIPs), Port: pick([]int{22, 3389, 445})},
		Direction: domain.DirectionInbound,
		Zone:      domain.ZoneDMZ,
		Title:     "Authentication failure",
		Tags:      []string{"auth", "failure"},
		Metadata:  map[string]string{"attempts": pick([]string{"5", "12", "34"})},
	}
}

func (sim *Simulator) protocolAnomaly() domain.Event {
	protocols := []domain.Protocol{domain.ProtocolModbus, domain.ProtocolS7Comm, domain.ProtocolProfinet}
	sev := []domain.Severity{domain.SeverityHigh, domain.SeverityCritical}
	return domain.Event{
		ID:        domain.NewEvent(domain.EventTypeProtocolAnomaly, domain.SeverityHigh, "").ID,
		Timestamp: time.Now().UTC(),
		Type:      domain.EventTypeProtocolAnomaly,
		Severity:  pick(sev),
		Protocol:  pick(protocols),
		Source:    domain.Endpoint{IP: pick(externalIPs), Port: pick([]int{30000, 40000})},
		Destination: domain.Endpoint{IP: pick(internalIPs), Port: pick([]int{502, 102, 34964})},
		Direction: domain.DirectionInbound,
		Zone:      domain.ZoneOT,
		Title:     "Protocol anomaly detected",
		Tags:      []string{"ot", "anomaly"},
		Metadata:  map[string]string{"reason": pick([]string{"invalid_pdu", "wrong_length", "unexpected_function"})},
	}
}

func (sim *Simulator) malwareIndicator() domain.Event {
	sev := []domain.Severity{domain.SeverityHigh, domain.SeverityCritical}
	return domain.Event{
		ID:        domain.NewEvent(domain.EventTypeMalwareIndicator, domain.SeverityHigh, "").ID,
		Timestamp: time.Now().UTC(),
		Type:      domain.EventTypeMalwareIndicator,
		Severity:  pick(sev),
		Protocol:  domain.ProtocolHTTP,
		Source:    domain.Endpoint{IP: pick(internalIPs), Port: 49152},
		Destination: domain.Endpoint{IP: pick(externalIPs), Port: 443},
		Direction: domain.DirectionOutbound,
		Zone:      domain.ZoneIT,
		Title:     "Malware indicator detected",
		Tags:      []string{"malware", "ioc"},
		Metadata:  map[string]string{"ioc": pick([]string{"evil.com", "malware.org", "c2.example.net"}), "signature": pick([]string{"ET_TROJAN", "ET_MALWARE"})},
	}
}
