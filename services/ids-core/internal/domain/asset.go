package domain

import (
	"crypto/rand"
	"fmt"
	"net"
	"net/netip"
	"regexp"
	"time"
)

type Asset struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Type        AssetType         `json:"type"`
	Status      AssetStatus       `json:"status"`
	Criticality Criticality       `json:"criticality"`
	Zone        Zone              `json:"zone"`
	IPs         []string          `json:"ips,omitempty"`
	MACs        []string          `json:"macs,omitempty"`
	Hostnames   []string          `json:"hostnames,omitempty"`
	Vendor      string            `json:"vendor,omitempty"`
	Model       string            `json:"model,omitempty"`
	Firmware    string            `json:"firmware,omitempty"`
	Protocols   []Protocol        `json:"protocols,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
	FirstSeen   time.Time         `json:"first_seen"`
	LastSeen    time.Time         `json:"last_seen"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

func generateAssetID() string {
	b := make([]byte, 12)
	rand.Read(b)
	return fmt.Sprintf("asset-%x-%x-%x", b[0:4], b[4:8], b[8:])
}

func NewAsset(assetType AssetType, name string) Asset {
	now := time.Now().UTC()
	return Asset{
		ID:          generateAssetID(),
		Name:        name,
		Type:        assetType,
		Status:      AssetStatusObserved,
		Criticality: CriticalityUnknown,
		Zone:        ZoneUnknown,
		IPs:         []string{},
		MACs:        []string{},
		Hostnames:   []string{},
		Protocols:   []Protocol{},
		Tags:        []string{},
		FirstSeen:   now,
		LastSeen:    now,
		Metadata:    map[string]string{},
	}
}

func (a *Asset) Touch(t time.Time) {
	a.LastSeen = t.UTC()
	if a.FirstSeen.IsZero() {
		a.FirstSeen = a.LastSeen
	}
}

func (a *Asset) AddIP(ip string) error {
	if _, err := netip.ParseAddr(ip); err != nil {
		return fmt.Errorf("invalid IP: %w", err)
	}
	for _, existing := range a.IPs {
		if existing == ip {
			return nil
		}
	}
	a.IPs = append(a.IPs, ip)
	return nil
}

var macRe = regexp.MustCompile(`^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$`)

func (a *Asset) AddMAC(mac string) error {
	if !macRe.MatchString(mac) {
		return fmt.Errorf("invalid MAC address: %s", mac)
	}
	for _, existing := range a.MACs {
		if existing == mac {
			return nil
		}
	}
	a.MACs = append(a.MACs, mac)
	return nil
}

func (a *Asset) AddProtocol(protocol Protocol) error {
	if _, err := ParseProtocol(protocol.String()); err != nil {
		return fmt.Errorf("invalid protocol: %w", err)
	}
	for _, existing := range a.Protocols {
		if existing == protocol {
			return nil
		}
	}
	a.Protocols = append(a.Protocols, protocol)
	return nil
}

func (a Asset) Validate() error {
	if a.ID == "" {
		return fmt.Errorf("asset id is required")
	}
	if a.Name == "" {
		return fmt.Errorf("asset name is required")
	}
	if !a.Type.IsValid() {
		return fmt.Errorf("invalid asset type: %v", a.Type)
	}
	if _, err := ParseAssetStatus(a.Status.String()); err != nil {
		return fmt.Errorf("invalid asset status: %w", err)
	}
	if _, err := ParseCriticality(a.Criticality.String()); err != nil {
		return fmt.Errorf("invalid criticality: %w", err)
	}
	if _, err := ParseZone(a.Zone.String()); err != nil {
		return fmt.Errorf("invalid zone: %w", err)
	}
	if a.FirstSeen.IsZero() {
		return fmt.Errorf("first_seen is required")
	}
	if a.LastSeen.IsZero() {
		return fmt.Errorf("last_seen is required")
	}
	if a.LastSeen.Before(a.FirstSeen) {
		return fmt.Errorf("last_seen must not be before first_seen")
	}
	for _, ip := range a.IPs {
		if _, err := netip.ParseAddr(ip); err != nil {
			return fmt.Errorf("invalid IP in list: %s: %w", ip, err)
		}
	}
	for _, mac := range a.MACs {
		if _, err := net.ParseMAC(mac); err != nil {
			return fmt.Errorf("invalid MAC in list: %s: %w", mac, err)
		}
	}
	for _, p := range a.Protocols {
		if _, err := ParseProtocol(p.String()); err != nil {
			return fmt.Errorf("invalid protocol in list: %w", err)
		}
	}
	return nil
}
