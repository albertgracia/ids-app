# OPENCODE.md — OpenCode Configuration Notes

## Workspace

- Root: `E:\opencode\ids-app\`
- Monorepo with multiple services
- Primary interface: `Taskfile.yml`

## Agent Behavior

- Use `task` commands for all service operations.
- Read `docs/` before making architectural decisions.
- Consult `AGENTS.md` for rules and restrictions.
- Never access `192.168.1.40` without explicit approval.

## Phase Tracking

Phase documentation lives in `docs/phases/`.
Active phase: `IDS-V2-DEV-ENV-SCAFFOLD-01`
