package storage

import "encoding/json"

type sqlNullString struct {
	String string
	Valid  bool
}

func (n *sqlNullString) Scan(value interface{}) error {
	if value == nil {
		n.String, n.Valid = "", false
		return nil
	}
	n.Valid = true
	switch v := value.(type) {
	case []byte:
		n.String = string(v)
	case string:
		n.String = v
	default:
		n.String = ""
	}
	return nil
}

type sqlNullInt struct {
	Int64 int64
	Valid bool
}

func (n *sqlNullInt) Scan(value interface{}) error {
	if value == nil {
		n.Int64, n.Valid = 0, false
		return nil
	}
	n.Valid = true
	switch v := value.(type) {
	case int64:
		n.Int64 = v
	case float64:
		n.Int64 = int64(v)
	default:
		n.Int64 = 0
	}
	return nil
}

func nullableStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func nullablePort(p int) interface{} {
	if p == 0 {
		return nil
	}
	return p
}

func tagsToJSONB(tags []string) []byte {
	if tags == nil {
		tags = []string{}
	}
	data, _ := json.Marshal(tags)
	return data
}

func metadataToJSONB(meta map[string]string) []byte {
	if meta == nil {
		meta = map[string]string{}
	}
	data, _ := json.Marshal(meta)
	return data
}

func jsonBToTags(data []byte) []string {
	if data == nil {
		return []string{}
	}
	var tags []string
	if err := json.Unmarshal(data, &tags); err != nil {
		return []string{}
	}
	if tags == nil {
		return []string{}
	}
	return tags
}

func jsonBToMetadata(data []byte) map[string]string {
	if data == nil {
		return map[string]string{}
	}
	var meta map[string]string
	if err := json.Unmarshal(data, &meta); err != nil {
		return map[string]string{}
	}
	if meta == nil {
		return map[string]string{}
	}
	return meta
}
