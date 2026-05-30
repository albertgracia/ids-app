# ids-app Staging Deployment

This directory contains staging deployment templates for `ids-app`.

## Files

| File | Purpose |
|------|---------|
| `compose.staging.example.yaml` | Docker Compose template for staging |
| `env.staging.example` | Environment variables template |
| `deployment-checklist.md` | Pre-deployment checklist |

## Usage

```bash
# 1. Copy env template
cp env.staging.example .env

# 2. Edit .env with real secrets

# 3. Validate compose
docker compose --env-file .env -f compose.staging.example.yaml config

# 4. Deploy
docker compose --env-file .env -f compose.staging.example.yaml up -d
```

## Important

- Never commit `.env` to version control
- Generate strong passwords for POSTGRES_PASSWORD and REDIS_PASSWORD
- The compose file uses `ghcr.io/albertgracia/ids-app/*:staging` images
