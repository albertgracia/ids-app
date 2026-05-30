package storage

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/albertgracia/ids-app/services/ids-core/internal/domain"
)

type PostgresEventRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresEventRepository(ctx context.Context, databaseURL string) (*PostgresEventRepository, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect to postgres: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return &PostgresEventRepository{pool: pool}, nil
}

func (r *PostgresEventRepository) Save(ctx context.Context, event domain.Event) error {
	if err := event.Validate(); err != nil {
		return fmt.Errorf("validate before save: %w", err)
	}
	_, err := r.pool.Exec(ctx, `
		INSERT INTO events (
			id, timestamp, type, severity, protocol, direction, zone,
			source_ip, source_port, source_hostname, source_asset_id, source_mac,
			destination_ip, destination_port, destination_hostname, destination_asset_id, destination_mac,
			title, description, tags, metadata
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,
			$8,$9,$10,$11,$12,
			$13,$14,$15,$16,$17,
			$18,$19,$20,$21
		) ON CONFLICT (id) DO NOTHING`,
		event.ID, event.Timestamp, event.Type.String(), event.Severity.String(),
		event.Protocol.String(), event.Direction.String(), event.Zone.String(),
		event.Source.IP, nullablePort(event.Source.Port), nullableStr(event.Source.Hostname),
		nullableStr(event.Source.AssetID), nullableStr(event.Source.MAC),
		event.Destination.IP, nullablePort(event.Destination.Port), nullableStr(event.Destination.Hostname),
		nullableStr(event.Destination.AssetID), nullableStr(event.Destination.MAC),
		event.Title, nullableStr(event.Description),
		tagsToJSONB(event.Tags), metadataToJSONB(event.Metadata),
	)
	if err != nil {
		return fmt.Errorf("save event: %w", err)
	}
	return nil
}

func (r *PostgresEventRepository) Recent(ctx context.Context, limit int) ([]domain.Event, error) {
	if limit <= 0 || limit > 500 {
		limit = 500
	}
	rows, err := r.pool.Query(ctx, `
		SELECT
			id, timestamp, type, severity, protocol, direction, zone,
			source_ip, source_port, source_hostname, source_asset_id, source_mac,
			destination_ip, destination_port, destination_hostname, destination_asset_id, destination_mac,
			title, description, tags, metadata
		FROM events
		ORDER BY timestamp DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("query recent events: %w", err)
	}
	defer rows.Close()

	var events []domain.Event
	for rows.Next() {
		var e domain.Event
		var srcIP, srcHost, srcAssetID, srcMAC sqlNullString
		var dstIP, dstHost, dstAssetID, dstMAC sqlNullString
		var desc sqlNullString
		var srcPort, dstPort sqlNullInt
		var tagsJSON, metaJSON []byte
		var typeStr, sevStr, protoStr, dirStr, zoneStr string

		err := rows.Scan(
			&e.ID, &e.Timestamp, &typeStr, &sevStr, &protoStr, &dirStr, &zoneStr,
			&srcIP, &srcPort, &srcHost, &srcAssetID, &srcMAC,
			&dstIP, &dstPort, &dstHost, &dstAssetID, &dstMAC,
			&e.Title, &desc, &tagsJSON, &metaJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("scan event row: %w", err)
		}

		e.Type = domain.ParseEventTypeSafe(typeStr)
		e.Severity = domain.ParseSeveritySafe(sevStr)
		e.Protocol = domain.ParseProtocolSafe(protoStr)
		e.Direction = domain.ParseDirectionSafe(dirStr)
		e.Zone = domain.ParseZoneSafe(zoneStr)

		e.Source.IP = srcIP.String
		e.Source.Port = int(srcPort.Int64)
		e.Source.Hostname = srcHost.String
		e.Source.AssetID = srcAssetID.String
		e.Source.MAC = srcMAC.String
		e.Destination.IP = dstIP.String
		e.Destination.Port = int(dstPort.Int64)
		e.Destination.Hostname = dstHost.String
		e.Destination.AssetID = dstAssetID.String
		e.Destination.MAC = dstMAC.String
		e.Description = desc.String
		e.Tags = jsonBToTags(tagsJSON)
		e.Metadata = jsonBToMetadata(metaJSON)
		events = append(events, e)
	}
	if events == nil {
		events = []domain.Event{}
	}
	return events, rows.Err()
}

func (r *PostgresEventRepository) Count(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM events").Scan(&count)
	return count, err
}

func (r *PostgresEventRepository) Pool() *pgxpool.Pool {
	return r.pool
}

func (r *PostgresEventRepository) Close(_ context.Context) error {
	r.pool.Close()
	return nil
}
