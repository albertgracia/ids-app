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
	"time"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
	"github.com/albertgracia/ids-app/services/ids-core/internal/ingest"
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
	inputs              inputList
	useStdin            bool
	tailFile            string
	stateFile           string
	startPosition       string
	once                bool
	pollInterval        time.Duration
	dryRun              bool
	output              string
	mode                string
	dedupe              bool
	includeRaw          bool
	operational         bool
	ingestBatch         bool
	send                bool
	endpoint            string
	tokenEnv            string
	collectorID         string
	sourceHost          string
	batchSize           int
	printPayloadSummary bool
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
	if cfg.tailFile != "" {
		return runTailMode(cfg, stdout, stderr)
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

	if cfg.ingestBatch {
		batches, batchSummary, err := buildUniFiIngestBatches(cfg, records[:len(records)-1])
		if err != nil {
			fmt.Fprintf(stderr, "error: no se pudo construir batch ingest: %v\n", err)
			return exitInvalidConfig
		}
		if cfg.printPayloadSummary {
			printBatchSummary(stderr, batchSummary)
		}
		if cfg.send {
			responses, err := sendUniFiIngestBatches(cfg, batches)
			if err != nil {
				fmt.Fprintf(stderr, "error: no se pudo enviar batch ingest: %v\n", err)
				return exitInvalidConfig
			}
			if cfg.printPayloadSummary {
				printSendSummary(stderr, responses)
			}
		}
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
	fs.StringVar(&cfg.tailFile, "tail-file", "", "Archivo local a leer incrementalmente en modo tail.")
	fs.StringVar(&cfg.stateFile, "state-file", "", "Archivo JSON para persistir offset del modo tail.")
	fs.StringVar(&cfg.startPosition, "start-position", "end", "Posicion inicial para modo tail: beginning|end")
	fs.BoolVar(&cfg.once, "once", false, "En modo tail, procesa lo disponible y sale.")
	fs.DurationVar(&cfg.pollInterval, "poll-interval", time.Second, "Intervalo de polling para modo tail futuro.")
	fs.BoolVar(&cfg.dryRun, "dry-run", false, "Alias explicito de modo local sin envio; fuerza send=false.")
	fs.StringVar(&cfg.output, "output", outputNDJSON, "Salida: ndjson|json")
	fs.StringVar(&cfg.mode, "mode", modeDryRun, "Modo operativo. Solo se admite dry-run.")
	fs.BoolVar(&cfg.dedupe, "dedupe", true, "Activar deduplicacion por raw_hash.")
	fs.BoolVar(&cfg.includeRaw, "include-raw", false, "Incluir raw completo en la salida.")
	fs.BoolVar(&cfg.operational, "operational", true, "Parser de syslog operacional UniFi como fallback.")
	fs.BoolVar(&cfg.ingestBatch, "ingest-batch", false, "Construir batch compatible con ingest interno UniFi.")
	fs.BoolVar(&cfg.send, "send", false, "Enviar batch por HTTP. Requiere endpoint local y token.")
	fs.StringVar(&cfg.endpoint, "endpoint", "", "Endpoint destino para envio local del batch UniFi.")
	fs.StringVar(&cfg.tokenEnv, "token-env", "IDS_UNIFI_INGEST_TOKEN", "Nombre de env var que contiene el Bearer token.")
	fs.StringVar(&cfg.collectorID, "collector-id", "unifi-parallel-collector-local", "Identificador del collector para el batch UniFi.")
	fs.StringVar(&cfg.sourceHost, "source-host", "unifi-gateway", "Source host sintetico para el batch UniFi.")
	fs.IntVar(&cfg.batchSize, "batch-size", 50, "Tamano maximo de batch UniFi para dry-run local.")
	fs.BoolVar(&cfg.printPayloadSummary, "print-payload-summary", true, "Imprimir resumen seguro del payload batch en stderr.")

	if err := fs.Parse(args); err != nil {
		return config{}, exitInvalidConfig
	}
	if cfg.dryRun {
		cfg.send = false
	}
	if strings.TrimSpace(cfg.mode) != modeDryRun {
		fmt.Fprintln(stderr, "error: solo se admite --mode dry-run")
		return config{}, exitInvalidConfig
	}
	if cfg.output != outputNDJSON && cfg.output != outputJSON {
		fmt.Fprintf(stderr, "error: --output invalido %q; use ndjson o json\n", cfg.output)
		return config{}, exitInvalidConfig
	}
	if cfg.tailFile == "" && len(cfg.inputs) == 0 && !cfg.useStdin {
		fmt.Fprintln(stderr, "error: debe indicar --input o --stdin")
		return config{}, exitInvalidConfig
	}
	if cfg.tailFile != "" && (len(cfg.inputs) > 0 || cfg.useStdin) {
		fmt.Fprintln(stderr, "error: --tail-file no se puede combinar con --input o --stdin")
		return config{}, exitInvalidConfig
	}
	if cfg.startPosition != "beginning" && cfg.startPosition != "end" {
		fmt.Fprintln(stderr, "error: --start-position debe ser beginning o end")
		return config{}, exitInvalidConfig
	}
	if cfg.tailFile != "" && !cfg.once {
		fmt.Fprintln(stderr, "error: modo tail sin --once aun no implementado en esta fase")
		return config{}, exitInvalidConfig
	}
	if cfg.tailFile != "" && cfg.stateFile == "" && !cfg.once {
		fmt.Fprintln(stderr, "error: --state-file es obligatorio en modo tail sin --once")
		return config{}, exitInvalidConfig
	}
	if cfg.batchSize < 1 || cfg.batchSize > ingest.MaxUniFiIngestBatchEvents {
		fmt.Fprintf(stderr, "error: --batch-size debe estar entre 1 y %d\n", ingest.MaxUniFiIngestBatchEvents)
		return config{}, exitInvalidConfig
	}
	if cfg.send && !cfg.ingestBatch {
		fmt.Fprintln(stderr, "error: --send requiere --ingest-batch")
		return config{}, exitInvalidConfig
	}
	if cfg.send && strings.TrimSpace(cfg.endpoint) == "" {
		fmt.Fprintln(stderr, "error: --send requiere --endpoint")
		return config{}, exitInvalidConfig
	}
	if cfg.send {
		if err := validateLocalEndpoint(cfg.endpoint); err != nil {
			fmt.Fprintf(stderr, "error: %v\n", err)
			return config{}, exitInvalidConfig
		}
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

	cefMessage, envelope, err := unifi.ParseUniFiLine(entry.Raw)
	if err != nil {
		switch {
		case errors.Is(err, unifi.ErrUnsupportedUniFiSyslogNoCEF):
			if cfg.operational {
				if opRes := tryParseOperational(entry, cfg, rawHash, seen, record); opRes.record.ParseStatus != parseStatusError {
					return opRes
				}
			}
			record.ParseStatus = parseStatusSkipped
			record.Warnings = append(record.Warnings, "unsupported_unifi_syslog_no_cef")
			return result{record: record}
		case errors.Is(err, unifi.ErrNoCEFEnvelope):
			return tryParseOperational(entry, cfg, rawHash, seen, record)
		default:
			record.ParseStatus = parseStatusError
			record.Error = err.Error()
			return result{record: record, err: err}
		}
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

	warnings := collectWarnings(entry.Raw, envelope, cefMessage, normalized)
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

func tryParseOperational(entry lineInput, cfg config, rawHash string, seen map[string]struct{}, record outputRecord) result {
	// Dedupe already checked by processLine before calling this function.

	operational, parseErr := unifi.ParseOperationalSyslog(entry.Raw)
	if parseErr != nil {
		record.ParseStatus = parseStatusError
		record.Error = "no CEF payload found"
		return result{record: record, err: unifi.ErrNoCEFEnvelope}
	}

	if len(operational.Warnings) > 0 {
		record.Warnings = append(record.Warnings, operational.Warnings...)
	}

	normalized := unifi.NormalizeOperational(operational)
	normalized.RawMessageHash = rawHash
	if normalized.Metadata == nil {
		normalized.Metadata = make(map[string]string)
	}
	normalized.Metadata["unifi.raw_message_hash"] = rawHash

	normalizedCopy := projectNormalized(normalized)
	record.Normalized = &normalizedCopy

	event, domainErr := normalized.ToDomainEvent()
	if domainErr != nil {
		record.ParseStatus = parseStatusError
		record.Error = domainErr.Error()
		return result{record: record, err: domainErr}
	}
	domainCopy := projectDomain(event, normalized.EventType)
	record.DomainEvent = &domainCopy

	if operational.Kind == unifi.KindUnclassified {
		record.Warnings = append(record.Warnings, "unsupported_operational_format")
	}

	return result{record: record}
}

func collectWarnings(raw string, envelope unifi.SyslogEnvelope, cefMessage *unifi.CEFMessage, normalized *unifi.UniFiEvent) []string {
	warnings := make([]string, 0)
	if envelope.RawPrefix != "" {
		warnings = append(warnings, "syslog_envelope_detected", "embedded_cef_extracted")
	}
	if strings.Contains(raw, `\|`) || strings.Contains(raw, `\=`) {
		warnings = append(warnings, "unsupported_cef_escape_pattern")
	}
	if normalized.EventType == "unclassified_event" {
		warnings = append(warnings, "unknown_signature")
	}
	if normalized.SrcIP == "" {
		warnings = append(warnings, "missing_src")
	}
	if normalized.DestIP == "" {
		warnings = append(warnings, "missing_dst")
	}
	if rawPort, ok := cefMessage.Extension["spt"]; ok && !isValidPort(rawPort) {
		warnings = append(warnings, "invalid_src_port")
	}
	if rawPort, ok := cefMessage.Extension["dpt"]; ok && !isValidPort(rawPort) {
		warnings = append(warnings, "invalid_dst_port")
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
