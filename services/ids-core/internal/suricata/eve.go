package suricata

// EVEEvent represents a Suricata EVE JSON event with fields relevant for ids-app.
type EVEEvent struct {
	Timestamp string `json:"timestamp"`
	FlowID    uint64 `json:"flow_id,omitempty"`
	InIface   string `json:"in_iface,omitempty"`
	EventType string `json:"event_type"`
	SrcIP     string `json:"src_ip,omitempty"`
	SrcPort   int    `json:"src_port,omitempty"`
	DestIP    string `json:"dest_ip,omitempty"`
	DestPort  int    `json:"dest_port,omitempty"`
	Proto     string `json:"proto,omitempty"`
	AppProto  string `json:"app_proto,omitempty"`

	Alert  *EVEAlert  `json:"alert,omitempty"`
	DNS    *EVEDNS    `json:"dns,omitempty"`
	HTTP   *EVEHTTP   `json:"http,omitempty"`
	TLS    *EVETLS    `json:"tls,omitempty"`
	SSH    *EVESSH    `json:"ssh,omitempty"`
	RDP    *EVERDP    `json:"rdp,omitempty"`
	SMB    *EVESMB    `json:"smb,omitempty"`
	Modbus *EVEModbus `json:"modbus,omitempty"`
}

type EVEAlert struct {
	SignatureID int    `json:"signature_id"`
	Signature   string `json:"signature"`
	Category    string `json:"category"`
	Severity    int    `json:"severity"`
}

type EVEDNS struct {
	Type   string `json:"type,omitempty"`
	RRNAme string `json:"rrname,omitempty"`
	RRType string `json:"rrtype,omitempty"`
}

type EVEHTTP struct {
	Hostname string `json:"hostname,omitempty"`
	URL      string `json:"url,omitempty"`
	Method   string `json:"http_method,omitempty"`
	Status   int    `json:"status,omitempty"`
}

type EVETLS struct {
	SNI         string `json:"sni,omitempty"`
	Version     string `json:"version,omitempty"`
	Fingerprint string `json:"fingerprint,omitempty"`
	Subject     string `json:"subject,omitempty"`
}

type EVESSH struct {
	ClientProto string `json:"client_proto,omitempty"`
	ServerProto string `json:"server_proto,omitempty"`
}

type EVERDP struct {
	Cookie      string `json:"cookie,omitempty"`
	ClientBuild string `json:"client_build,omitempty"`
	ClientName  string `json:"client_name,omitempty"`
}

type EVESMB struct {
	Command  string `json:"command,omitempty"`
	Filename string `json:"filename,omitempty"`
	Share    string `json:"share,omitempty"`
}

type EVEModbus struct {
	FunctionCode int `json:"function_code,omitempty"`
	UnitID       int `json:"unit_id,omitempty"`
	Address      int `json:"address,omitempty"`
	Count        int `json:"count,omitempty"`
}
