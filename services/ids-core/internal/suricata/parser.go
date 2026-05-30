package suricata

import (
	"encoding/json"
	"fmt"
	"net/netip"
	"strings"
	"time"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

func ParseEVEJSON(data []byte) (domain.Event, error) {
	var eve EVEEvent
	if err := json.Unmarshal(data, &eve); err != nil {
		return domain.Event{}, fmt.Errorf("eve json parse: %w", err)
	}
	return ParseEVEEvent(eve)
}

func ParseEVEEvent(eve EVEEvent) (domain.Event, error) {
	if eve.EventType == "" {
		return domain.Event{}, fmt.Errorf("eve event missing event_type")
	}

	now := time.Now().UTC()
	ts, err := parseTimestamp(eve.Timestamp)
	if err != nil {
		ts = now
	}

	eveType := mapEventType(eve)
	sev := mapSeverity(eve)
	proto := mapProtocol(eve)
	zone := mapZone(eve)
	dir := mapDirection(eve)
	title := buildTitle(eve)
	meta := buildMetadata(eve)

	evt := domain.Event{
		ID:        domain.NewEvent(eveType, sev, title).ID,
		Timestamp: ts,
		Type:      eveType,
		Severity:  sev,
		Protocol:  proto,
		Source:    domain.Endpoint{IP: eve.SrcIP, Port: eve.SrcPort},
		Destination: domain.Endpoint{IP: eve.DestIP, Port: eve.DestPort},
		Direction: dir,
		Zone:      zone,
		Title:     title,
		Tags:      []string{"suricata", eve.EventType},
		Metadata:  meta,
	}

	if err := evt.Validate(); err != nil {
		return domain.Event{}, fmt.Errorf("parsed event failed validation: %w", err)
	}

	return evt, nil
}

func parseTimestamp(s string) (time.Time, error) {
	layout := "2006-01-02T15:04:05.000000-0700"
	if t, err := time.Parse(layout, s); err == nil {
		return t.UTC(), nil
	}
	layout2 := "2006-01-02T15:04:05.000000+0000"
	if t, err := time.Parse(layout2, s); err == nil {
		return t.UTC(), nil
	}
	return time.Time{}, fmt.Errorf("cannot parse timestamp: %s", s)
}

func mapEventType(eve EVEEvent) domain.EventType {
	switch eve.EventType {
	case "alert":
		cat := ""
		if eve.Alert != nil {
			cat = strings.ToLower(eve.Alert.Category)
		}
		if strings.Contains(cat, "scan") || strings.Contains(cat, "recon") || strings.Contains(cat, "attempt") {
			return domain.EventTypeScanDetected
		}
		if strings.Contains(cat, "auth") || strings.Contains(cat, "login") {
			return domain.EventTypeAuthFailure
		}
		if strings.Contains(cat, "malware") || strings.Contains(cat, "trojan") || strings.Contains(cat, "botnet") {
			return domain.EventTypeMalwareIndicator
		}
		return domain.EventTypePolicyViolation
	case "modbus":
		return domain.EventTypeOTCommand
	default:
		return domain.EventTypeNetworkConnection
	}
}

func mapSeverity(eve EVEEvent) domain.Severity {
	if eve.Alert != nil {
		switch eve.Alert.Severity {
		case 1:
			return domain.SeverityCritical
		case 2:
			return domain.SeverityHigh
		case 3:
			return domain.SeverityMedium
		case 4:
			return domain.SeverityLow
		}
	}
	switch eve.EventType {
	case "alert":
		return domain.SeverityMedium
	default:
		return domain.SeverityInfo
	}
}

func mapProtocol(eve EVEEvent) domain.Protocol {
	app := strings.ToLower(eve.AppProto)
	if app != "" {
		switch app {
		case "modbus":
			return domain.ProtocolModbus
		case "dns":
			return domain.ProtocolDNS
		case "http":
			return domain.ProtocolHTTP
		case "tls":
			return domain.ProtocolHTTPS
		case "ssh":
			return domain.ProtocolSSH
		case "rdp":
			return domain.ProtocolRDP
		case "smb":
			return domain.ProtocolSMB
		}
	}
	et := eve.EventType
	switch et {
	case "modbus":
		return domain.ProtocolModbus
	case "dns":
		return domain.ProtocolDNS
	case "http":
		return domain.ProtocolHTTP
	case "tls":
		return domain.ProtocolHTTPS
	case "ssh":
		return domain.ProtocolSSH
	case "rdp":
		return domain.ProtocolRDP
	case "smb":
		return domain.ProtocolSMB
	}
	proto := strings.ToUpper(eve.Proto)
	switch proto {
	case "TCP":
		return domain.ProtocolTCP
	case "UDP":
		return domain.ProtocolUDP
	case "ICMP":
		return domain.ProtocolICMP
	}
	return domain.ProtocolUnknown
}

func mapZone(eve EVEEvent) domain.Zone {
	dst := eve.DestIP
	if ip, err := netip.ParseAddr(dst); err == nil {
		if isInPrefix(ip, "172.16.100.0/24") {
			return domain.ZoneOT
		}
		if isInPrefix(ip, "10.10.0.0/16") {
			return domain.ZoneIT
		}
	}
	src := eve.SrcIP
	if ip, err := netip.ParseAddr(src); err == nil {
		if isInPrefix(ip, "172.16.100.0/24") {
			return domain.ZoneOT
		}
		if isInPrefix(ip, "10.10.0.0/16") {
			return domain.ZoneIT
		}
	}
	return domain.ZoneUnknown
}

func isInPrefix(ip netip.Addr, cidr string) bool {
	prefix, err := netip.ParsePrefix(cidr)
	if err != nil {
		return false
	}
	return prefix.Contains(ip)
}

func mapDirection(eve EVEEvent) domain.Direction {
	_, errSrc := netip.ParseAddr(eve.SrcIP)
	_, errDst := netip.ParseAddr(eve.DestIP)
	if errSrc != nil || errDst != nil {
		return domain.DirectionUnknown
	}

	srcOT := isInPrefix(mustParse(eve.SrcIP), "172.16.100.0/24")
	dstOT := isInPrefix(mustParse(eve.DestIP), "172.16.100.0/24")
	srcIT := isInPrefix(mustParse(eve.SrcIP), "10.10.0.0/16")
	dstIT := isInPrefix(mustParse(eve.DestIP), "10.10.0.0/16")

	if srcOT && dstIT {
		return domain.DirectionLateral
	}
	if srcIT && dstOT {
		return domain.DirectionLateral
	}
	if srcIT && dstIT {
		return domain.DirectionInternal
	}
	if srcOT && dstOT {
		return domain.DirectionInternal
	}
	if isTestIP(eve.SrcIP) && (dstIT || dstOT) {
		return domain.DirectionInbound
	}
	if (srcIT || srcOT) && isTestIP(eve.DestIP) {
		return domain.DirectionOutbound
	}
	return domain.DirectionUnknown
}

func mustParse(s string) netip.Addr {
	ip, _ := netip.ParseAddr(s)
	return ip
}

func isTestIP(s string) bool {
	return strings.HasPrefix(s, "198.51.100.") || strings.HasPrefix(s, "203.0.113.") || strings.HasPrefix(s, "192.0.2.")
}

func buildTitle(eve EVEEvent) string {
	if eve.Alert != nil && eve.Alert.Signature != "" {
		return eve.Alert.Signature
	}
	if eve.DNS != nil && eve.DNS.RRNAme != "" {
		return fmt.Sprintf("DNS query: %s", eve.DNS.RRNAme)
	}
	if eve.HTTP != nil && eve.HTTP.Hostname != "" {
		return fmt.Sprintf("HTTP %s %s%s", eve.HTTP.Method, eve.HTTP.Hostname, eve.HTTP.URL)
	}
	if eve.TLS != nil && eve.TLS.SNI != "" {
		return fmt.Sprintf("TLS handshake: %s", eve.TLS.SNI)
	}
	if eve.SSH != nil {
		return fmt.Sprintf("SSH session: %s -> %s", eve.SrcIP, eve.DestIP)
	}
	if eve.RDP != nil {
		return fmt.Sprintf("RDP session: %s -> %s", eve.SrcIP, eve.DestIP)
	}
	if eve.SMB != nil {
		name := eve.SMB.Filename
		if name == "" {
			name = eve.SMB.Share
		}
		return fmt.Sprintf("SMB %s: %s", eve.SMB.Command, name)
	}
	if eve.Modbus != nil {
		return fmt.Sprintf("Modbus function %d (addr=%d count=%d)", eve.Modbus.FunctionCode, eve.Modbus.Address, eve.Modbus.Count)
	}
	return fmt.Sprintf("Suricata %s event", eve.EventType)
}

func buildMetadata(eve EVEEvent) map[string]string {
	m := make(map[string]string)
	m["suricata.event_type"] = eve.EventType
	if eve.FlowID > 0 {
		m["suricata.flow_id"] = fmt.Sprintf("%d", eve.FlowID)
	}
	if eve.InIface != "" {
		m["suricata.interface"] = eve.InIface
	}
	if eve.AppProto != "" {
		m["suricata.app_proto"] = eve.AppProto
	}
	if eve.Alert != nil {
		m["alert.signature_id"] = fmt.Sprintf("%d", eve.Alert.SignatureID)
		m["alert.category"] = eve.Alert.Category
	}
	if eve.DNS != nil {
		m["dns.rrname"] = eve.DNS.RRNAme
		m["dns.rrtype"] = eve.DNS.RRType
	}
	if eve.HTTP != nil {
		m["http.hostname"] = eve.HTTP.Hostname
		m["http.url"] = eve.HTTP.URL
	}
	if eve.TLS != nil {
		m["tls.sni"] = eve.TLS.SNI
		m["tls.version"] = eve.TLS.Version
	}
	if eve.SSH != nil {
		m["ssh.client_proto"] = eve.SSH.ClientProto
		m["ssh.server_proto"] = eve.SSH.ServerProto
	}
	if eve.RDP != nil {
		m["rdp.cookie"] = eve.RDP.Cookie
		m["rdp.client_name"] = eve.RDP.ClientName
	}
	if eve.SMB != nil {
		m["smb.command"] = eve.SMB.Command
		m["smb.share"] = eve.SMB.Share
		m["smb.filename"] = eve.SMB.Filename
	}
	if eve.Modbus != nil {
		m["modbus.function_code"] = fmt.Sprintf("%d", eve.Modbus.FunctionCode)
		m["modbus.unit_id"] = fmt.Sprintf("%d", eve.Modbus.UnitID)
	}
	return m
}
