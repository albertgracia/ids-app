package domain

import (
	"encoding/json"
	"fmt"
)

type AssetType int

const (
	AssetTypeUnknown      AssetType = 0
	AssetTypeWorkstation  AssetType = 1
	AssetTypeServer       AssetType = 2
	AssetTypeNetworkDev   AssetType = 3
	AssetTypeFirewall     AssetType = 4
	AssetTypeRouter       AssetType = 5
	AssetTypeSwitch       AssetType = 6
	AssetTypeAccessPoint  AssetType = 7
	AssetTypeCamera       AssetType = 8
	AssetTypePrinter      AssetType = 9
	AssetTypePLC          AssetType = 10
	AssetTypeHMI          AssetType = 11
	AssetTypeSCADA        AssetType = 12
	AssetTypeRTU          AssetType = 13
	AssetTypeIoT          AssetType = 14
	AssetTypeSensor       AssetType = 15
	AssetTypeController   AssetType = 16
	AssetTypeDatabase     AssetType = 17
	AssetTypeApplication  AssetType = 18
)

var assetTypeNames = map[AssetType]string{
	AssetTypeUnknown:     "unknown",
	AssetTypeWorkstation: "workstation",
	AssetTypeServer:      "server",
	AssetTypeNetworkDev:  "network_device",
	AssetTypeFirewall:    "firewall",
	AssetTypeRouter:      "router",
	AssetTypeSwitch:      "switch",
	AssetTypeAccessPoint: "access_point",
	AssetTypeCamera:      "camera",
	AssetTypePrinter:     "printer",
	AssetTypePLC:         "plc",
	AssetTypeHMI:         "hmi",
	AssetTypeSCADA:       "scada",
	AssetTypeRTU:         "rtu",
	AssetTypeIoT:         "iot",
	AssetTypeSensor:      "sensor",
	AssetTypeController:  "controller",
	AssetTypeDatabase:    "database",
	AssetTypeApplication: "application",
}

var assetTypeValues = map[string]AssetType{
	"unknown":       AssetTypeUnknown,
	"workstation":   AssetTypeWorkstation,
	"server":        AssetTypeServer,
	"network_device": AssetTypeNetworkDev,
	"firewall":      AssetTypeFirewall,
	"router":        AssetTypeRouter,
	"switch":        AssetTypeSwitch,
	"access_point":  AssetTypeAccessPoint,
	"camera":        AssetTypeCamera,
	"printer":       AssetTypePrinter,
	"plc":           AssetTypePLC,
	"hmi":           AssetTypeHMI,
	"scada":         AssetTypeSCADA,
	"rtu":           AssetTypeRTU,
	"iot":           AssetTypeIoT,
	"sensor":        AssetTypeSensor,
	"controller":    AssetTypeController,
	"database":      AssetTypeDatabase,
	"application":   AssetTypeApplication,
}

func (at AssetType) String() string {
	if name, ok := assetTypeNames[at]; ok {
		return name
	}
	return fmt.Sprintf("AssetType(%d)", int(at))
}

func (at AssetType) IsValid() bool {
	_, ok := assetTypeNames[at]
	return ok
}

func (at AssetType) MarshalJSON() ([]byte, error) {
	return []byte(`"` + at.String() + `"`), nil
}

func (at *AssetType) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}
	if v, ok := assetTypeValues[str]; ok {
		*at = v
	} else {
		*at = AssetTypeUnknown
	}
	return nil
}

func ParseAssetType(s string) (AssetType, error) {
	if v, ok := assetTypeValues[s]; ok {
		return v, nil
	}
	return AssetTypeUnknown, fmt.Errorf("unknown asset type: %s", s)
}
