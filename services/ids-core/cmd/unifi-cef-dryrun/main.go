package main

import (
	"bufio"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
	"github.com/albertgracia/ids-app/services/ids-core/internal/unifi"
)

type inputList []string

func (i *inputList) String() string {
	return strings.Join(*i, ",")
}

func (i *inputList) Set(value string) error {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return errors.New("input path cannot be empty")
	}
	*i = append(*i, trimmed)
	return nil
}

type lineInput struct {
	Source string
	Line   int
	Raw    string
}

type normalizedOutput struct {
	Source         string            `json:"source"`
	SourceType     string            `json:"source_type"`
	Vendor         string            `json:"vendor"`
	Device         string            `json:"device"`
	Severity       int               `json:"severity"`
	EventType      string            `json:"event_type"`
	Category       string            `json:"category"`
	Action         string            `json:"action,omitempty"`
	SrcIP          string            `json:"src_ip,omitempty"`
	SrcPort        int               `json:"src_port,omitempty"`
	DestIP         string            `json:"dest_ip,omitempty"`
	DestPort       int               `json:"dest_port,omitempty"`
	Protocol       string            `json:"protocol,omitempty"`
	Rule           string            `json:"rule,omitempty"`
	Signature      string            `json:"signature,omitempty"`
	Message        string            `json:"message,omitempty"`
	Name           string            `json:"name,omitempty"`
	RawMessageHash string            `json:"raw_message_hash,omitempty"`
	Metadata       map[string]string `json:"metadata,omitempty"`
}

type domainEventOutput struct {
	ID          string            `json:"id"`
	Timestamp   string            `json:"timestamp"`
	Type        string            `json:"type"`
	Severity    string            `json:"severity"`
	Protocol    string            `json:"protocol"`
	Source      domain.Endpoint   `json:"source"`
	Destination domain.Endpoint   `json:"destination"`
	Direction   string            `json:"direction"`
	Zone        string            `json:"zone"`
	Title       string            `json:"title"`
	Description string            `json:"description,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

type resultRecord struct {
	Source      string             `json:"source"`
	Line        int                `json:"line"`
	RawHash     string             `json:"raw_hash"`
	Normalized  *normalizedOutput  `json:"normalized,omitempty"`
	DomainEvent *domainEventOutput `json:"domain_event,omitempty"`
}

func main() {
	os.Exit(run(os.Args[1:], os.Stdin, os.Stdout, os.Stderr))
}

func run(args []string, stdin io.Reader, stdout, stderr io.Writer) int {
	var inputs inputList
	fs := flag.NewFlagSet("unifi-cef-dryrun", flag.ContinueOnError)
	fs.SetOutput(stderr)
	fs.Var(&inputs, "input", "Ruta a archivo CEF de entrada. Repetible.")
	useStdin := fs.Bool("stdin", false, "Leer mensajes CEF desde STDIN.")
	outputMode := fs.String("output", "both", "Salida: normalized | domain | both")

	if err := fs.Parse(args); err != nil {
		return 1
	}

	if len(inputs) == 0 && !*useStdin {
		fmt.Fprintln(stderr, "error: debe indicar --input o --stdin")
		return 1
	}

	mode := strings.ToLower(strings.TrimSpace(*outputMode))
	if mode != "normalized" && mode != "domain" && mode != "both" {
		fmt.Fprintf(stderr, "error: --output invalido %q; use normalized, domain o both\n", *outputMode)
		return 1
	}

	lines, err := collectInputs(inputs, *useStdin, stdin)
	if err != nil {
		fmt.Fprintf(stderr, "error: %v\n", err)
		return 1
	}

	records := make([]resultRecord, 0, len(lines))
	for _, entry := range lines {
		record, err := processLine(entry, mode)
		if err != nil {
			fmt.Fprintf(stderr, "error en %s:%d: %v\n", entry.Source, entry.Line, err)
			return 1
		}
		records = append(records, record)
	}

	encoder := json.NewEncoder(stdout)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(records); err != nil {
		fmt.Fprintf(stderr, "error: no se pudo serializar JSON: %v\n", err)
		return 1
	}

	return 0
}

func collectInputs(paths []string, useStdin bool, stdin io.Reader) ([]lineInput, error) {
	lines := make([]lineInput, 0)

	for _, path := range paths {
		file, err := os.Open(path)
		if err != nil {
			return nil, fmt.Errorf("no se pudo abrir %q: %w", path, err)
		}

		fileLines, readErr := collectLines(file, path)
		closeErr := file.Close()
		if readErr != nil {
			return nil, readErr
		}
		if closeErr != nil {
			return nil, fmt.Errorf("no se pudo cerrar %q: %w", path, closeErr)
		}
		if len(fileLines) == 0 {
			return nil, fmt.Errorf("%q no contiene lineas CEF no vacias", path)
		}
		lines = append(lines, fileLines...)
	}

	if useStdin {
		stdinLines, err := collectLines(stdin, "stdin")
		if err != nil {
			return nil, err
		}
		if len(stdinLines) == 0 {
			return nil, errors.New("stdin no contiene lineas CEF no vacias")
		}
		lines = append(lines, stdinLines...)
	}

	return lines, nil
}

func collectLines(reader io.Reader, source string) ([]lineInput, error) {
	scanner := bufio.NewScanner(reader)
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	lines := make([]lineInput, 0)
	lineNumber := 0
	for scanner.Scan() {
		lineNumber++
		trimmed := strings.TrimSpace(scanner.Text())
		if trimmed == "" {
			continue
		}
		lines = append(lines, lineInput{Source: source, Line: lineNumber, Raw: trimmed})
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("no se pudo leer %s: %w", source, err)
	}

	return lines, nil
}

func processLine(entry lineInput, mode string) (resultRecord, error) {
	cefMessage, err := unifi.ParseCEF(entry.Raw)
	if err != nil {
		return resultRecord{}, err
	}

	normalized, err := unifi.NormalizeCEF(cefMessage)
	if err != nil {
		return resultRecord{}, err
	}

	rawHash := hashRaw(entry.Raw)
	normalized.RawMessageHash = rawHash
	if normalized.Metadata == nil {
		normalized.Metadata = make(map[string]string)
	}
	normalized.Metadata["unifi.raw_message_hash"] = rawHash

	record := resultRecord{
		Source:  entry.Source,
		Line:    entry.Line,
		RawHash: rawHash,
	}

	if mode == "normalized" || mode == "both" {
		normalizedCopy := projectNormalized(normalized)
		record.Normalized = &normalizedCopy
	}

	if mode == "domain" || mode == "both" {
		event, err := normalized.ToDomainEvent()
		if err != nil {
			return resultRecord{}, err
		}
		domainCopy := projectDomain(event, normalized.EventType)
		record.DomainEvent = &domainCopy
	}

	return record, nil
}

func hashRaw(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func projectNormalized(event *unifi.UniFiEvent) normalizedOutput {
	metadata := cloneMap(event.Metadata)
	return normalizedOutput{
		Source:         event.Source,
		SourceType:     event.SourceType,
		Vendor:         event.Vendor,
		Device:         event.Device,
		Severity:       event.Severity,
		EventType:      event.EventType,
		Category:       event.Category,
		Action:         event.Action,
		SrcIP:          event.SrcIP,
		SrcPort:        event.SrcPort,
		DestIP:         event.DestIP,
		DestPort:       event.DestPort,
		Protocol:       event.Protocol,
		Rule:           event.Rule,
		Signature:      event.Signature,
		Message:        event.Message,
		Name:           event.Name,
		RawMessageHash: event.RawMessageHash,
		Metadata:       metadata,
	}
}

func projectDomain(event *domain.Event, eventType string) domainEventOutput {
	metadata := cloneMap(event.Metadata)
	tags := append([]string(nil), event.Tags...)
	return domainEventOutput{
		ID:          event.ID,
		Timestamp:   event.Timestamp.UTC().Format("2006-01-02T15:04:05Z07:00"),
		Type:        eventType,
		Severity:    event.Severity.String(),
		Protocol:    event.Protocol.String(),
		Source:      event.Source,
		Destination: event.Destination,
		Direction:   event.Direction.String(),
		Zone:        event.Zone.String(),
		Title:       event.Title,
		Description: event.Description,
		Tags:        tags,
		Metadata:    metadata,
	}
}

func cloneMap(input map[string]string) map[string]string {
	if len(input) == 0 {
		return nil
	}
	cloned := make(map[string]string, len(input))
	for k, v := range input {
		cloned[k] = v
	}
	return cloned
}
