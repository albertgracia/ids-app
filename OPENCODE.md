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

## Remote Operations Policy

Before any remote operation (SSH, server audit, staging, deployment),
the agent MUST read and comply with:

**`docs/agent-remote-operations.md`**

If there is a conflict between the phase prompt and this policy document,
the most restrictive rule prevails.

## Phase Tracking

Phase documentation lives in `docs/phases/`.
