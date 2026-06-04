# IDS-UNIFI-CEF-PARSER-01: UniFi CEF Parser Implementation

## Overview
This document describes the implementation of a UniFi Common Event Format (CEF) parser for the IDS (Intrusion Detection System) application. The parser reads synthetic CEF logs and normalizes them to domain.Event objects for further processing by the IDS engine.

## Goals
- Implement a CEF parser that correctly parses UniFi CEF formatted logs
- Normalize parsed CEF messages to the domain.Event format used by the IDS engine
- Handle various UniFi event types including threat detection, blocked connections, DNS queries, and device management events
- Ensure backward compatibility with existing IDS event processing pipeline
- Pass all unit tests for CEF parsing, normalization, and mapping

## Implementation Details

### CEF Parser (`services/ids-core/internal/unifi/cef.go`)
The CEF parser implements the following functionality:

1. **Header Parsing**: Extracts the standard CEF header fields:
   - CEF Version
   - Device Vendor
   - Device Product
   - Device Version
   - Signature ID
   - Name
   - Severity

2. **Extension Parsing**: Parses key-value pairs in the extension section, correctly handling:
   - Simple key=value pairs
   - Values containing spaces (without quotes)
   - Mixed extension types
   - Empty extensions

3. **Error Handling**: Returns appropriate errors for:
   - Empty input lines
   - Invalid CEF prefix
   - Insufficient fields in CEF message

### Mapper (`services/ids-core/internal/unifi/mapper.go`)
The mapper converts parsed CEF messages to domain.Event objects:

1. **Normalization**: Converts CEFMessage to an internal UniFiEvent format with:
   - Event type mapping based on SignatureID
   - Source and destination IP/port extraction
   - Protocol identification
   - Action determination (allowed/blocked/dropped)
   - Message and category extraction
   - Metadata population with all extension fields

2. **Domain Mapping**: Converts UniFiEvent to domain.Event with:
   - Appropriate event type mapping to IDS domain events
   - Standardized field mapping (source, destination, ports, etc.)
   - Severity translation from CEF scale (0-10) to IDS scale
   - Metadata preservation for additional context

### Supported Event Types
The parser supports the following UniFi event types:
- IDS_ALERT: Threat detection events
- BLOCKED: Firewall blocked connection events
- DNS_QUERY: DNS query monitoring events
- DEVICE_MANAGEMENT: Device connection/disconnection events

## Test Coverage
Unit tests cover:
- Valid CEF parsing for all supported event types
- Extension parsing (simple values, values with spaces, mixed extensions)
- Error handling for malformed CEF messages
- Normalization to internal UniFiEvent format
- Mapping to domain.Event objects
- Metadata preservation and field extraction

## Files Modified
1. `services/ids-core/internal/unifi/cef.go` - CEF parser implementation
2. `services/ids-core/internal/unifi/mapper.go` - CEF to domain.Event mapping
3. `services/ids-core/internal/unifi/cef_test.go` - Unit tests for CEF parser
4. `services/ids-core/internal/unifi/mapper_test.go` - Unit tests for mapper
5. `packages/contracts/unifi/samples/` - Synthetic CEF sample files for testing
6. `docs/phases/IDS-UNIFI-CEF-PARSER-01.md` - This document

## Usage
The parser is intended to be used by the UniFi syslog collector (or similar ingestion mechanism) to convert incoming CEF-formatted syslog messages into domain events that can be processed by the IDS analytics engine.

Example usage:
```go
cefMsg, err := unifi.ParseCEF(cefLine)
if err != nil {
    // Handle error
}
uniFiEvent := unifi.NormalizeCEF(cefMsg)
domainEvent := uniFiEvent.ToDomainEvent()
// domainEvent can now be sent to the IDS analytics pipeline
```

## Compliance
- No modification of server 192.168.1.40 (read-only/dry-run mode)
- Only modified files within allowed directories
- MCP server remains read-only
- No real data, PCAPs, secrets, credentials, or tokens used in implementation
- All functionality implemented within the specified constraints