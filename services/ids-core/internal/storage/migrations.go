package storage

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

func MigrateEvents(ctx context.Context, pool *pgxpool.Pool) error {
	schema := `
	CREATE TABLE IF NOT EXISTS events (
		id TEXT PRIMARY KEY,
		timestamp TIMESTAMPTZ NOT NULL,
		type TEXT NOT NULL,
		severity TEXT NOT NULL,
		protocol TEXT NOT NULL,
		direction TEXT NOT NULL,
		zone TEXT NOT NULL,

		source_ip TEXT,
		source_port INTEGER,
		source_hostname TEXT,
		source_asset_id TEXT,
		source_mac TEXT,

		destination_ip TEXT,
		destination_port INTEGER,
		destination_hostname TEXT,
		destination_asset_id TEXT,
		destination_mac TEXT,

		title TEXT NOT NULL,
		description TEXT,
		tags JSONB NOT NULL DEFAULT '[]'::jsonb,
		metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

		created_at TIMESTAMPTZ NOT NULL DEFAULT now()
	);

	CREATE INDEX IF NOT EXISTS idx_events_timestamp_desc ON events (timestamp DESC);
	CREATE INDEX IF NOT EXISTS idx_events_type ON events (type);
	CREATE INDEX IF NOT EXISTS idx_events_severity ON events (severity);
	CREATE INDEX IF NOT EXISTS idx_events_protocol ON events (protocol);
	CREATE INDEX IF NOT EXISTS idx_events_source_ip ON events (source_ip);
	CREATE INDEX IF NOT EXISTS idx_events_destination_ip ON events (destination_ip);
	`
	_, err := pool.Exec(ctx, schema)
	if err != nil {
		return fmt.Errorf("migrate events schema: %w", err)
	}
	return nil
}
