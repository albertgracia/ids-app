# GHCR Staging Publish

## Objective

Publish `ids-app` container images to GitHub Container Registry (GHCR) for staging deployment.

## Images

| Image | GHCR Path |
|-------|-----------|
| ids-core | `ghcr.io/albertgracia/ids-app/ids-core:staging` |
| ids-analytics | `ghcr.io/albertgracia/ids-app/ids-analytics:staging` |
| ids-mcp | `ghcr.io/albertgracia/ids-app/ids-mcp:staging` |
| ids-web | `ghcr.io/albertgracia/ids-app/ids-web:staging` |

Each image also receives a `:<commit-sha>` tag.

## Workflow

**File:** `.github/workflows/publish-staging-images.yml`

**Trigger:** Manual via `workflow_dispatch`

### How to run

1. Go to GitHub repository: `https://github.com/albertgracia/ids-app`
2. Navigate to Actions tab
3. Select "Publish staging container images"
4. Click "Run workflow"
5. Wait for completion (~10–15 minutes)

### Required permissions

- `contents: read`
- `packages: write`

These are provided automatically by `GITHUB_TOKEN`. No personal access token (PAT) is needed.

## Authentication

The workflow uses `GITHUB_TOKEN` to authenticate with GHCR:

```yaml
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

No local PAT, no manual login, no secret exposure.

## Verification

After the workflow completes:

1. Go to `https://github.com/albertgracia/ids-app/pkgs`
2. You should see 4 packages (ids-core, ids-analytics, ids-mcp, ids-web)
3. Each package should have `staging` and `<sha>` tags
4. Server can pull with:
   ```bash
   docker pull ghcr.io/albertgracia/ids-app/ids-core:staging
   ```

## Package Visibility

By default, GHCR packages are **private**. To make them accessible from the staging server:

- Either set packages to **public**
- Or authenticate on the server with a PAT

This is a deployment concern for the next phase.

## Out of Scope

- GitHub Actions workflow beyond publishing
- Server-side container pull
- Docker Compose deployment
- Nginx/Cloudflare configuration
- Production release
