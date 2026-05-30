package suricata

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"strings"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
	"github.com/albertgracia/ids-app/services/ids-core/internal/storage"
)

type EVEIngestor struct {
	repository storage.EventRepository
}

func NewEVEIngestor(repository storage.EventRepository) *EVEIngestor {
	return &EVEIngestor{repository: repository}
}

func (i *EVEIngestor) IngestJSON(ctx context.Context, data []byte) (domain.Event, error) {
	evt, err := ParseEVEJSON(data)
	if err != nil {
		return domain.Event{}, fmt.Errorf("suricata ingest: %w", err)
	}
	if err := i.repository.Save(ctx, evt); err != nil {
		return domain.Event{}, fmt.Errorf("suricata ingest save: %w", err)
	}
	return evt, nil
}

func (i *EVEIngestor) IngestJSONLines(ctx context.Context, data []byte) ([]domain.Event, error) {
	if len(bytes.TrimSpace(data)) == 0 {
		return nil, fmt.Errorf("empty body")
	}
	scanner := bufio.NewScanner(bytes.NewReader(data))
	var events []domain.Event
	lineNum := 0
	for scanner.Scan() {
		line := scanner.Text()
		lineNum++
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		evt, err := ParseEVEJSON([]byte(line))
		if err != nil {
			return nil, fmt.Errorf("line %d: %w", lineNum, err)
		}
		if err := i.repository.Save(ctx, evt); err != nil {
			return nil, fmt.Errorf("line %d save: %w", lineNum, err)
		}
		events = append(events, evt)
	}
	return events, scanner.Err()
}
