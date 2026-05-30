package domain

import (
	"encoding/json"
	"fmt"
)

type AssetStatus int

const (
	AssetStatusUnknown    AssetStatus = 0
	AssetStatusObserved   AssetStatus = 1
	AssetStatusKnown      AssetStatus = 2
	AssetStatusTrusted    AssetStatus = 3
	AssetStatusSuspicious AssetStatus = 4
	AssetStatusRetired    AssetStatus = 5
	AssetStatusOffline    AssetStatus = 6
)

var assetStatusNames = map[AssetStatus]string{
	AssetStatusUnknown:    "unknown",
	AssetStatusObserved:   "observed",
	AssetStatusKnown:      "known",
	AssetStatusTrusted:    "trusted",
	AssetStatusSuspicious: "suspicious",
	AssetStatusRetired:    "retired",
	AssetStatusOffline:    "offline",
}

var assetStatusValues = map[string]AssetStatus{
	"unknown":    AssetStatusUnknown,
	"observed":   AssetStatusObserved,
	"known":      AssetStatusKnown,
	"trusted":    AssetStatusTrusted,
	"suspicious": AssetStatusSuspicious,
	"retired":    AssetStatusRetired,
	"offline":    AssetStatusOffline,
}

func (s AssetStatus) String() string {
	if name, ok := assetStatusNames[s]; ok {
		return name
	}
	return fmt.Sprintf("AssetStatus(%d)", int(s))
}

func (s AssetStatus) MarshalJSON() ([]byte, error) {
	return []byte(`"` + s.String() + `"`), nil
}

func (s *AssetStatus) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}
	if v, ok := assetStatusValues[str]; ok {
		*s = v
	} else {
		*s = AssetStatusUnknown
	}
	return nil
}

func ParseAssetStatus(s string) (AssetStatus, error) {
	if v, ok := assetStatusValues[s]; ok {
		return v, nil
	}
	return AssetStatusUnknown, fmt.Errorf("unknown asset status: %s", s)
}
