package domain

import (
	"encoding/json"
	"fmt"
)

type Protocol int

const (
	ProtocolTCP         Protocol = 0
	ProtocolUDP         Protocol = 1
	ProtocolICMP        Protocol = 2
	ProtocolHTTP        Protocol = 3
	ProtocolHTTPS       Protocol = 4
	ProtocolDNS         Protocol = 5
	ProtocolSSH         Protocol = 6
	ProtocolRDP         Protocol = 7
	ProtocolSMB         Protocol = 8
	ProtocolModbus      Protocol = 9
	ProtocolS7Comm      Protocol = 10
	ProtocolProfinet    Protocol = 11
	ProtocolEthernetIP  Protocol = 12
	ProtocolCIP         Protocol = 13
	ProtocolOPCUA       Protocol = 14
	ProtocolBACnet      Protocol = 15
	ProtocolDNP3        Protocol = 16
	ProtocolIEC104      Protocol = 17
	ProtocolUnknown     Protocol = 18
)

var protocolNames = map[Protocol]string{
	ProtocolTCP:        "tcp",
	ProtocolUDP:        "udp",
	ProtocolICMP:       "icmp",
	ProtocolHTTP:       "http",
	ProtocolHTTPS:      "https",
	ProtocolDNS:        "dns",
	ProtocolSSH:        "ssh",
	ProtocolRDP:        "rdp",
	ProtocolSMB:        "smb",
	ProtocolModbus:     "modbus",
	ProtocolS7Comm:     "s7comm",
	ProtocolProfinet:   "profinet",
	ProtocolEthernetIP: "ethernet_ip",
	ProtocolCIP:        "cip",
	ProtocolOPCUA:      "opcua",
	ProtocolBACnet:     "bacnet",
	ProtocolDNP3:       "dnp3",
	ProtocolIEC104:     "iec104",
	ProtocolUnknown:    "unknown",
}

var protocolValues = map[string]Protocol{
	"tcp":         ProtocolTCP,
	"udp":         ProtocolUDP,
	"icmp":        ProtocolICMP,
	"http":        ProtocolHTTP,
	"https":       ProtocolHTTPS,
	"dns":         ProtocolDNS,
	"ssh":         ProtocolSSH,
	"rdp":         ProtocolRDP,
	"smb":         ProtocolSMB,
	"modbus":      ProtocolModbus,
	"s7comm":      ProtocolS7Comm,
	"profinet":    ProtocolProfinet,
	"ethernet_ip": ProtocolEthernetIP,
	"cip":         ProtocolCIP,
	"opcua":       ProtocolOPCUA,
	"bacnet":      ProtocolBACnet,
	"dnp3":        ProtocolDNP3,
	"iec104":      ProtocolIEC104,
	"unknown":     ProtocolUnknown,
}

func (p Protocol) String() string {
	if name, ok := protocolNames[p]; ok {
		return name
	}
	return fmt.Sprintf("Protocol(%d)", int(p))
}

func (p Protocol) MarshalJSON() ([]byte, error) {
	return []byte(`"` + p.String() + `"`), nil
}

func (p *Protocol) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return fmt.Errorf("invalid protocol format: %w", err)
	}
	val, ok := protocolValues[str]
	if !ok {
		return fmt.Errorf("unknown protocol: %s", str)
	}
	*p = val
	return nil
}

func ParseProtocol(s string) (Protocol, error) {
	val, ok := protocolValues[s]
	if !ok {
		return ProtocolUnknown, fmt.Errorf("unknown protocol: %s", s)
	}
	return val, nil
}

func ValidProtocols() []string {
	names := make([]string, 0, len(protocolValues))
	for _, p := range []Protocol{
		ProtocolTCP, ProtocolUDP, ProtocolICMP,
		ProtocolHTTP, ProtocolHTTPS, ProtocolDNS,
		ProtocolSSH, ProtocolRDP, ProtocolSMB,
		ProtocolModbus, ProtocolS7Comm, ProtocolProfinet,
		ProtocolEthernetIP, ProtocolCIP,
		ProtocolOPCUA, ProtocolBACnet, ProtocolDNP3, ProtocolIEC104,
		ProtocolUnknown,
	} {
		names = append(names, p.String())
	}
	return names
}
