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
	"strconv"
	"strings"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
	"github.com/albertgracia/ids-app/services/ids-core/internal/unifi"
)

const (
	modeDryRun         = "dry-run"
	outputNDJSON       = "ndjson"
	outputJSON         = "json"
	parseStatusOK      = "ok"
	parseStatusError   = "error"
	parseStatusSkipped = "skipped"
	parseStatusDup     = "duplicate"
	maxLineBytes       = 64 * 1024

	exitOK             = 0
	exitParseError     = 1
	exitInvalidInput   = 2
	exitInvalidConfig  = 3
	exitSafetyExceeded = 4
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

type config struct {
	inputs     inputList
	useStdin   bool
	output     string
	mode       string
	dedupe     bool
	includeRaw bool
}

type lineInput struct {
	Source  string
	Line    int
	Raw     string
	Skipped bool
}

type outputRecord struct {
	Source      string             `json:"source"`
	Mode        string             `json:"mode"`
	Line        int                `json:"line"`
	RawHash     string             `json:"raw_hash,omitempty"`
	ParseStatus string             `json:"parse_status"`
	Raw         string             `json:"raw,omitempty"`
	Normalized  *normalizedOutput  `json:"normalized,omitempty"`
	DomainEvent *domainEventOutput `json:"domain_event,omitempty"`
	Warnings    []string           `json:"warnings,omitempty"`
	Error       string             `json:"error,omitempty"`
	Summary     *summaryOutput     `json:"summary,omitempty"`
}

type summaryOutput struct {
	TotalLines int            `json:"total_lines"`
	Parsed     int            `json:"parsed"`
	Skipped    int            `json:"skipped"`
	Errors     int            `json:"errors"`
	Duplicates int            `json:"duplicates"`
	EventTypes map[string]int `json:"event_types,omitempty"`
	Severities map[string]int `json:"severities,omitempty"`
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

type result struct {
	record outputRecord
	err    error
}

func main() {
	os.Exit(run(os.Args[1:], os.Stdin, os.Stdout, os.Stderr))
}

func run(args []string, stdin io.Reader, stdout, stderr io.Writer) int {
	cfg, code := parseConfig(args, stderr)
	if code != exitOK {
		return code
	}

	lines, err := collectInputs(cfg, stdin)
	if err != nil {
		fmt.Fprintf(stderr, "error: %v\n", err)
		return classifyCollectError(err)
	}

	summary := summaryOutput{
		EventTypes: make(map[string]int),
		Severities: make(map[string]int),
	}
	records := make([]outputRecord, 0, len(lines)+1)
	seen := make(map[string]struct{})
	hadParseErrors := false

	for _, entry := range lines {
		res := processLine(cfg, entry, seen)
		records = append(records, res.record)
		updateSummary(&summary, res.record)

		if len(res.record.Warnings) > 0 {
			fmt.Fprintf(stderr, "warning en %s:%d: %s\n", entry.Source, entry.Line, strings.Join(res.record.Warnings, "; "))
		}
		if res.err != nil {
			hadParseErrors = true
			fmt.Fprintf(stderr, "error en %s:%d: %v\n", entry.Source, entry.Line, res.err)
		}
	}

	summaryRecord := outputRecord{Summary: &summary}
	records = append(records, summaryRecord)

	if err := emitOutput(stdout, cfg.output, records); err != nil {
		fmt.Fprintf(stderr, "error: no se pudo serializar salida: %v\n", err)
		return exitInvalidConfig
	}

	if hadParseErrors {
		return exitParseError
	}
	return exitOK
}

func parseConfig(args []string, stderr io.Writer) (config, int) {
	var cfg config
	fs := flag.NewFlagSet("unifi-parallel-collector", flag.ContinueOnError)
	fs.SetOutput(stderr)
	fs.Var(&cfg.inputs, "input", "Ruta a archivo CEF de entrada. Repetible.")
	fs.BoolVar(&cfg.useStdin, "stdin", false, "Leer mensajes CEF desde STDIN.")
	fs.StringVar(&cfg.output, "output", outputNDJSON, "Salida: ndjson|json")
	fs.StringVar(&cfg.mode, "mode", modeDryRun, "Modo operativo. Solo se admite dry-run.")
	fs.BoolVar(&cfg.dedupe, "dedupe", true, "Activar deduplicacion por raw_hash.")
	fs.BoolVar(&cfg.includeRaw, "include-raw", false, "Incluir raw completo en la salida.")

	if err := fs.Parse(args); err != nil {
		return config{}, exitInvalidConfig
	}
	if strings.TrimSpace(cfg.mode) != modeDryRun {
		fmt.Fprintln(stderr, "error: solo se admite --mode dry-run")
		return config{}, exitInvalidConfig
	}
	if cfg.output != outputNDJSON && cfg.output != outputJSON {
		fmt.Fprintf(stderr, "error: --output invalido %q; use ndjson o json\n", cfg.output)
		return config{}, exitInvalidConfig
	}
	if len(cfg.inputs) == 0 && !cfg.useStdin {
		fmt.Fprintln(stderr, "error: debe indicar --input o --stdin")
		return config{}, exitInvalidConfig
	}
	return cfg, exitOK
}

func collectInputs(cfg config, stdin io.Reader) ([]lineInput, error) {
	lines := make([]lineInput, 0)
	for _, path := range cfg.inputs {
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
		lines = append(lines, fileLines...)
	}
	if cfg.useStdin {
		stdinLines, err := collectLines(stdin, "stdin")
		if err != nil {
			return nil, err
		}
		lines = append(lines, stdinLines...)
	}
	if len(lines) == 0 {
		return nil, errors.New("no hay lineas de entrada para procesar")
	}
	return lines, nil
}

func collectLines(reader io.Reader, source string) ([]lineInput, error) {
	scanner := bufio.NewScanner(reader)
	buf := make([]byte, 0, maxLineBytes)
	scanner.Buffer(buf, maxLineBytes)

	lines := make([]lineInput, 0)
	lineNumber := 0
	for scanner.Scan() {
		lineNumber++
		raw := strings.ReplaceAll(scanner.Text(), "\r", "")
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			lines = append(lines, lineInput{Source: source, Line: lineNumber, Skipped: true})
			continue
		}
		lines = append(lines, lineInput{Source: source, Line: lineNumber, Raw: trimmed})
	}
	if err := scanner.Err(); err != nil {
		if strings.Contains(err.Error(), "token too long") {
			return nil, fmt.Errorf("linea demasiado larga en %s: %w", source, err)
		}
		return nil, fmt.Errorf("no se pudo leer %s: %w", source, err)
	}
	return lines, nil
}

func processLine(cfg config, entry lineInput, seen map[string]struct{}) result {
	record := outputRecord{
		Source:      "unifi_parallel_collector",
		Mode:        modeDryRun,
		Line:        entry.Line,
		ParseStatus: parseStatusOK,
	}

	if entry.Skipped {
		record.ParseStatus = parseStatusSkipped
		record.Warnings = []string{"empty line"}
		return result{record: record}
	}

	rawHash := hashRaw(entry.Raw)
	record.RawHash = rawHash
	if cfg.includeRaw {
		record.Raw = entry.Raw
	}

	if cfg.dedupe {
		if _, ok := seen[rawHash]; ok {
			record.ParseStatus = parseStatusDup
			record.Warnings = []string{"duplicate raw_hash"}
			return result{record: record}
		}
		seen[rawHash] = struct{}{}
	}

	cefMessage, err := unifi.ParseCEF(entry.Raw)
	if err != nil {
		record.ParseStatus = parseStatusError
		record.Error = err.Error()
		return result{record: record, err: err}
	}

	normalized, err := unifi.NormalizeCEF(cefMessage)
	if err != nil {
		record.ParseStatus = parseStatusError
		record.Error = err.Error()
		return result{record: record, err: err}
	}
	normalized.RawMessageHash = rawHash
	if normalized.Metadata == nil {
		normalized.Metadata = make(map[string]string)
	}
	normalized.Metadata["unifi.raw_message_hash"] = rawHash

	warnings := collectWarnings(entry.Raw, cefMessage, normalized)
	record.Warnings = warnings
	normalizedCopy := projectNormalized(normalized)
	record.Normalized = &normalizedCopy

	event, err := normalized.ToDomainEvent()
	if err != nil {
		record.ParseStatus = parseStatusError
		record.Error = err.Error()
		return result{record: record, err: err}
	}
	domainCopy := projectDomain(event, normalized.EventType)
	record.DomainEvent = &domainCopy

	return result{record: record}
}

func collectWarnings(raw string, cefMessage *unifi.CEFMessage, normalized *unifi.UniFiEvent) []string {
	warnings := make([]string, 0)
	if strings.Contains(raw, `\|`) || strings.Contains(raw, `\=`) {
		warnings = append(warnings, "unsupported escape pattern")
	}
	if normalized.EventType == "unclassified_event" {
		warnings = append(warnings, "unknown signature")
	}
	if normalized.SrcIP == "" {
		warnings = append(warnings, "missing src")
	}
	if normalized.DestIP == "" {
		warnings = append(warnings, "missing dst")
	}
	if rawPort, ok := cefMessage.Extension["spt"]; ok && !isValidPort(rawPort) {
		warnings = append(warnings, "invalid src port")
	}
	if rawPort, ok := cefMessage.Extension["dpt"]; ok && !isValidPort(rawPort) {
		warnings = append(warnings, "invalid dst port")
	}
	return warnings
}

func isValidPort(value string) bool {
	port, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return false
	}
	return port >= 1 && port <= 65535
}

func updateSummary(summary *summaryOutput, record outputRecord) {
	if summary == nil {
		return
	}
	summary.TotalLines++
	switch record.ParseStatus {
	case parseStatusOK:
		summary.Parsed++
		if record.Normalized != nil {
			summary.EventTypes[record.Normalized.EventType]++
		}
		if record.DomainEvent != nil {
			summary.Severities[record.DomainEvent.Severity]++
		}
	case parseStatusSkipped:
		summary.Skipped++
	case parseStatusDup:
		summary.Duplicates++
	case parseStatusError:
		summary.Errors++
	}
}

func emitOutput(stdout io.Writer, output string, records []outputRecord) error {
	if output == outputJSON {
		payload := struct {
			Events  []outputRecord `json:"events"`
			Summary *summaryOutput `json:"summary,omitempty"`
		}{
			Events: records[:len(records)-1],
		}
		payload.Summary = records[len(records)-1].Summary
		encoder := json.NewEncoder(stdout)
		encoder.SetIndent("", "  ")
		return encoder.Encode(payload)
	}
	encoder := json.NewEncoder(stdout)
	for _, record := range records {
		if err := encoder.Encode(record); err != nil {
			return err
		}
	}
	return nil
}

func classifyCollectError(err error) int {
	if err == nil {
		return exitOK
	}
	msg := err.Error()
	if strings.Contains(msg, "demasiado larga") || strings.Contains(msg, "token too long") {
		return exitSafetyExceeded
	}
	if strings.Contains(msg, "no se pudo abrir") || strings.Contains(msg, "no hay lineas") {
		return exitInvalidInput
	}
	return exitInvalidInput
}

func hashRaw(raw string) string {
	canonical := strings.TrimSpace(strings.ReplaceAll(raw, "\r\n", "\n"))
	sum := sha256.Sum256([]byte(canonical))
	return "sha256:" + hex.EncodeToString(sum[:])
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
