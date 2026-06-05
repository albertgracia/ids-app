package unifi

import (
	"errors"
	"strconv"
	"strings"
)

var (
	ErrNoCEFEnvelope               = errors.New("no CEF payload found")
	ErrUnsupportedUniFiSyslogNoCEF = errors.New("unsupported_unifi_syslog_no_cef")
)

// SyslogEnvelope describes a minimal syslog prefix that wrapped a CEF payload.
type SyslogEnvelope struct {
	RawPrefix string
	Host      string
	App       string
}

// CEFMessage represents a parsed CEF event.
type CEFMessage struct {
	Version       string
	DeviceVendor  string
	DeviceProduct string
	DeviceVersion string
	SignatureID   string
	Name          string
	Severity      int
	Extension     map[string]string
	Raw           string
}

// ParseCEF parses a CEF formatted string into a CEFMessage.
// It returns an error if the string is not a valid CEF format.
func ParseCEF(line string) (*CEFMessage, error) {
	return parseCEFBody(strings.TrimSpace(line))
}

// ParseUniFiLine parses either a pure CEF line or a syslog-prefixed line that embeds CEF.
func ParseUniFiLine(line string) (*CEFMessage, SyslogEnvelope, error) {
	cefLine, envelope, found, err := ExtractCEF(line)
	if err != nil {
		return nil, envelope, err
	}
	if !found {
		return nil, envelope, ErrNoCEFEnvelope
	}
	msg, err := parseCEFBody(cefLine)
	if err != nil {
		return nil, envelope, err
	}
	return msg, envelope, nil
}

// ExtractCEF extracts a CEF payload from a pure CEF line or a syslog envelope.
func ExtractCEF(line string) (string, SyslogEnvelope, bool, error) {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" {
		return "", SyslogEnvelope{}, false, errors.New("empty line")
	}
	if strings.HasPrefix(trimmed, "CEF:") {
		return trimmed, SyslogEnvelope{}, true, nil
	}

	idx := strings.Index(trimmed, "CEF:")
	if idx >= 0 {
		prefix := strings.TrimSpace(trimmed[:idx])
		envelope := parseSyslogEnvelope(prefix)
		return strings.TrimSpace(trimmed[idx:]), envelope, true, nil
	}

	lower := strings.ToLower(trimmed)
	if strings.Contains(lower, "unifi") || strings.Contains(lower, "ubiquiti") {
		envelope := parseSyslogEnvelope(trimmed)
		return "", envelope, false, ErrUnsupportedUniFiSyslogNoCEF
	}

	return "", SyslogEnvelope{}, false, ErrNoCEFEnvelope
}

func parseCEFBody(line string) (*CEFMessage, error) {
	if line == "" {
		return nil, errors.New("empty line")
	}

	if !strings.HasPrefix(line, "CEF:") {
		return nil, errors.New("invalid CEF prefix")
	}

	// Split the line into header and extension parts
	parts := strings.SplitN(line, "|", 8)
	if len(parts) < 8 {
		return nil, errors.New("invalid CEF format: insufficient fields")
	}

	// Parse header
	msg := &CEFMessage{
		Raw: line,
	}
	msg.Version = strings.TrimPrefix(parts[0], "CEF:")
	msg.DeviceVendor = parts[1]
	msg.DeviceProduct = parts[2]
	msg.DeviceVersion = parts[3]
	msg.SignatureID = parts[4]
	msg.Name = parts[5]

	// Parse severity
	severity, err := strconv.Atoi(parts[6])
	if err != nil {
		return nil, errors.New("invalid severity: " + parts[6])
	}
	msg.Severity = severity

	// Parse extensions
	extensionStr := parts[7]
	msg.Extension = parseExtensions(extensionStr)

	return msg, nil
}

func parseSyslogEnvelope(prefix string) SyslogEnvelope {
	envelope := SyslogEnvelope{RawPrefix: strings.TrimSpace(prefix)}
	if envelope.RawPrefix == "" {
		return envelope
	}

	cleaned := envelope.RawPrefix
	if strings.HasPrefix(cleaned, "<") {
		if end := strings.Index(cleaned, ">"); end >= 0 {
			cleaned = strings.TrimSpace(cleaned[end+1:])
		}
	}
	fields := strings.Fields(cleaned)
	if len(fields) >= 4 {
		envelope.Host = fields[3]
	}
	if len(fields) >= 5 {
		envelope.App = strings.TrimSuffix(fields[4], ":")
	}
	return envelope
}

// parseExtensions parses the extension part of a CEF message.
// Extensions are key=value pairs separated by spaces.
// Values containing spaces are not quoted but are identified by the fact that
// only the first token after '=' begins the value, and subsequent tokens without
// '=' are part of the same value until the next key= pair or end of string.
func parseExtensions(s string) map[string]string {
	ext := make(map[string]string)
	if s == "" {
		return ext
	}

	// Split by spaces to get tokens
	tokens := strings.Fields(s)
	var currentKey string
	var currentValue string

	for _, token := range tokens {
		if strings.Contains(token, "=") {
			// Save previous key-value pair if exists
			if currentKey != "" {
				ext[currentKey] = currentValue
			}

			// Start new key-value pair
			parts := strings.SplitN(token, "=", 2)
			currentKey = parts[0]
			if len(parts) > 1 {
				currentValue = parts[1]
			} else {
				currentValue = ""
			}
		} else {
			// This token is part of the current value (continuation)
			if currentValue != "" {
				currentValue += " " + token
			} else {
				currentValue = token
			}
		}
	}

	// Save the last key-value pair
	if currentKey != "" {
		ext[currentKey] = currentValue
	}

	return ext
}
