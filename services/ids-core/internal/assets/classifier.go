package assets

import (
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

type AssetType string

const (
	TypePLC                   AssetType = "plc"
	TypeHMI                   AssetType = "hmi"
	TypeSCADA                 AssetType = "scada"
	TypeEngineeringWorkstation AssetType = "engineering_workstation"
	TypeITServer              AssetType = "it_server"
	TypeExternalHost          AssetType = "external_host"
	TypeIDSSensor             AssetType = "ids_sensor"
	TypeUnknown               AssetType = "unknown"
)

type AssetClassification struct {
	IP              string     `json:"ip"`
	AssetType       AssetType  `json:"asset_type"`
	Confidence      int        `json:"confidence"`
	Zone            string     `json:"zone"`
	Criticality     string     `json:"criticality"`
	Protocols       []string   `json:"protocols"`
	EventCount      int        `json:"event_count"`
	InboundCount    int        `json:"inbound_count"`
	OutboundCount   int        `json:"outbound_count"`
	FirstSeen       time.Time  `json:"first_seen"`
	LastSeen        time.Time  `json:"last_seen"`
	Reasons         []string   `json:"reasons"`
	LastEventID     string     `json:"last_event_id,omitempty"`
}

func ClassifyAssetsFromEvents(events []domain.Event) []AssetClassification {
	byIP := make(map[string][]domain.Event)
	for _, e := range events {
		if e.Source.IP != "" {
			byIP[e.Source.IP] = append(byIP[e.Source.IP], e)
		}
		if e.Destination.IP != "" {
			byIP[e.Destination.IP] = append(byIP[e.Destination.IP], e)
		}
	}

	var results []AssetClassification
	for ip, evts := range byIP {
		c := classifyIP(ip, evts, events)
		results = append(results, c)
	}
	return results
}

func ClassifyIP(ip string, events []domain.Event) *AssetClassification {
	var related []domain.Event
	for _, e := range events {
		if e.Source.IP == ip || e.Destination.IP == ip {
			related = append(related, e)
		}
	}
	if len(related) == 0 {
		return nil
	}
	c := classifyIP(ip, related, events)
	return &c
}

func classifyIP(ip string, ipEvents []domain.Event, allEvents []domain.Event) AssetClassification {
	c := AssetClassification{
		IP:        ip,
		AssetType: TypeUnknown,
		Zone:      "unknown",
	}

	protoSet := make(map[string]bool)
	var inbound, outbound, lateral int
	var firstT, lastT time.Time
	var sevs []string
	var targets []string
	sourceMap := make(map[string]bool)

	for _, e := range ipEvents {
		if e.Destination.IP == ip {
			if e.Direction == domain.DirectionInbound || e.Direction == domain.DirectionExternal {
				inbound++
			}
		}
		if e.Source.IP == ip {
			if e.Direction == domain.DirectionOutbound || e.Direction == domain.DirectionExternal {
				outbound++
			}
		}
		if e.Direction == domain.DirectionLateral {
			lateral++
		}
		protoSet[strings.ToLower(e.Protocol.String())] = true
		targets = append(targets, e.Destination.IP)
		sourceMap[e.Source.IP] = true
		sevs = append(sevs, e.Severity.String())
		if firstT.IsZero() || e.Timestamp.Before(firstT) {
			firstT = e.Timestamp
		}
		if e.Timestamp.After(lastT) {
			lastT = e.Timestamp
			c.LastEventID = e.ID
		}
	}

	protocols := make([]string, 0, len(protoSet))
	for p := range protoSet {
		protocols = append(protocols, p)
	}
	uniqTargets := len(targets)
	c.Protocols = protocols
	c.EventCount = len(ipEvents)
	c.InboundCount = inbound
	c.OutboundCount = outbound
	c.FirstSeen = firstT
	c.LastSeen = lastT

	isExternal := isExternalIPCheck(ip)
	isPrivate := isPrivateIPCheck(ip)
	zone := inferZone(ip, ipEvents)

	c.Zone = zone
	if isExternal && !isPrivate {
		c.AssetType = TypeExternalHost
		c.Confidence = 95
		c.Reasons = append(c.Reasons, "IP pública externa detectada — no pertenece a rangos RFC 1918")
		c.Criticality = inferCrit(inbound, outbound, sevs)
		return c
	}

	if isPrivate {
		hasModbus := protoSet["modbus"]
		hasS7 := protoSet["s7comm"]
		hasProfinet := protoSet["profinet"]
		hasOT := hasModbus || hasS7 || hasProfinet || protoSet["cip"] || protoSet["opcua"] || protoSet["dnp3"]
		hasSSH := protoSet["ssh"]
		hasRDP := protoSet["rdp"]
		hasSMB := protoSet["smb"]
		hasHTTP := protoSet["http"] || protoSet["https"]
		hasDNS := protoSet["dns"]
		hasTCP := protoSet["tcp"]

		isDestOfModbus := false
		for _, e := range ipEvents {
			if e.Destination.IP == ip && strings.ToLower(e.Protocol.String()) == "modbus" {
				isDestOfModbus = true
				break
			}
		}

		// PLC: destino Modbus/TCP en zona OT
		if isDestOfModbus && zone == "ot" {
			c.AssetType = TypePLC
			c.Confidence = 85
			c.Reasons = append(c.Reasons, "Destino frecuente de tráfico Modbus/TCP en zona OT", "Puerto 502 observado como destino")
		} else if hasOT && hasSSH && hasRDP {
			// Engineering workstation: OT + SSH/RDP
			c.AssetType = TypeEngineeringWorkstation
			c.Confidence = 75
			c.Reasons = append(c.Reasons, "Protocolos OT observados junto con acceso administrativo SSH/RDP", "Actividad de administración remota detectada")
		} else if hasOT && uniqTargets >= 3 {
			// HMI/SCADA: comunica con múltiples OT
			c.AssetType = TypeHMI
			c.Confidence = 70
			c.Reasons = append(c.Reasons, fmt.Sprintf("Comunicación con %d destinos OT distintos", uniqTargets), "Múltiples protocolos OT observados como origen")
		} else if hasOT && zone == "ot" {
			c.AssetType = TypeSCADA
			c.Confidence = 65
			c.Reasons = append(c.Reasons, "Protocolos OT detectados en zona OT")
		} else if hasHTTP || hasDNS || hasSSH || hasSMB || hasTCP {
			// IT server: protocolos IT
			c.AssetType = TypeITServer
			c.Confidence = 60
			c.Reasons = append(c.Reasons, "Protocolos IT detectados: "+strings.Join(protocols[:min(3, len(protocols))], ", "))
		}

		if c.AssetType == TypeUnknown {
			c.Confidence = 10
			c.Reasons = append(c.Reasons, "Evidencia insuficiente para clasificar — solo "+fmt.Sprintf("%d eventos", len(ipEvents)))
		}
	}

	c.Criticality = inferCrit(inbound, outbound, sevs)
	return c
}

func inferCrit(inbound, outbound int, sevs []string) string {
	highCrit := 0
	for _, s := range sevs {
		if s == "critical" || s == "high" {
			highCrit++
		}
	}
	if highCrit > 0 && inbound > 0 {
		return "critical"
	}
	if highCrit > 0 {
		return "high"
	}
	if inbound > 3 {
		return "medium"
	}
	return "low"
}

func inferZone(ip string, events []domain.Event) string {
	counts := map[string]int{}
	for _, e := range events {
		if e.Destination.IP == ip && e.Direction == domain.DirectionInbound {
			counts["external"] += 2
		}
		if e.Zone.String() != "" {
			counts[e.Zone.String()]++
		}
	}
	best, bestCount := "unknown", 0
	for z, c := range counts {
		if c > bestCount {
			best, bestCount = z, c
		}
	}
	return best
}

func isExternalIPCheck(ip string) bool {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return false
	}
	return !isPrivateIPCheck(ip) && !parsed.IsLoopback() && !parsed.IsLinkLocalUnicast()
}

func isPrivateIPCheck(ip string) bool {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return false
	}
	return parsed.IsPrivate() || parsed.IsLoopback() || parsed.IsLinkLocalUnicast()
}
