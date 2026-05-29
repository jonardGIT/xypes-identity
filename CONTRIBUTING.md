# Contributing

This workspace uses a practical AI-assisted workflow that matches the platform's current repository state.

Start with [docs/AI_ASSISTED_WORKFLOW.md](docs/AI_ASSISTED_WORKFLOW.md). That document is the operative workflow for current work. The stricter future-state model remains documented separately in [docs/AI_ASSISTED_TARGET_STATE.md](docs/AI_ASSISTED_TARGET_STATE.md).

If you are working as a single developer across two separate machines with file transfer only, use [docs/OFFLINE_DUAL_MACHINE_WORKFLOW.md](docs/OFFLINE_DUAL_MACHINE_WORKFLOW.md) as the mandatory operating model.

If this repository is connected to a private GitHub remote, use [docs/PRIVATE_REMOTE_BASELINE.md](docs/PRIVATE_REMOTE_BASELINE.md) to turn the checked-in workflow files into actual branch and PR controls.

Scope note: this contributor guide applies to the identity platform surfaces in this repository root. The sibling `xypes-docman` workspace should be treated as an external representative consumer unless a task explicitly includes coordinated consumer changes.

Workspace recommendation:

- use [xypes-identity.code-workspace](xypes-identity.code-workspace) for normal identity work
- use [../xypes-platform.code-workspace](../xypes-platform.code-workspace) only for intentional cross-system coordination

## Core Rule

Work from the ownership boundary that actually controls the behavior:

- engine owns authorization semantics, decision APIs, control-plane APIs, caches, outbox, and audit shape
- admin owns governance-facing API shaping and operator workflows
- sdk owns client ergonomics, middleware, and integration examples
- shared owns durable contracts and architecture references

Do not flatten cross-repo work into one mixed change unless the acceptance slice truly crosses a contract or sequencing boundary.

Default in-scope paths for this workflow are:

- `xypes-identity-engine/`
- `xypes-identity-admin/`
- `xypes-identity-sdk/`
- `shared/`
- `docs/`
- root workflow, script, and platform metadata files for identity

The sibling `xypes-docman` workspace is out of scope by default.

## Before You Start

Read the durable context that applies to the repo you are changing:

- [docs/DESIGN_GUIDELINES.md](docs/DESIGN_GUIDELINES.md)
- [docs/EXECUTION_PLAN.md](docs/EXECUTION_PLAN.md)
- [shared/ARCHITECTURE.md](shared/ARCHITECTURE.md)
- the target repo's `.github/copilot-instructions.md`
- the target repo's `.github/agent-context.json`

Use one agent session for one bounded change slice when possible.

Preferred branch naming:

- `feat/<task>`
- `fix/<task>`
- `docs/<task>`

This is current team practice, not a repo-enforced rule.

## Expected Change Loop

1. Generate or edit a small, reviewable slice.
2. Review the diff before widening scope.
3. Run the narrowest relevant validation.
4. Run broader validation when contracts or integrations cross repo boundaries.
5. Update docs when behavior, rollout posture, or operator expectations change.

Treat generated code as draft output, not as trusted implementation.

## Validation

Use the existing verification scripts from the workspace root:

- `bash scripts/linux/verify-shared.sh`
- `bash scripts/linux/verify-engine.sh`
- `bash scripts/linux/verify-sdk.sh`
- `bash scripts/linux/verify-admin.sh`
- `bash scripts/linux/verify-all.sh`
- PowerShell equivalents under `scripts/windows/`

At a minimum, the touched repo should pass its current build and test path, plus typecheck where available.

Run cross-repo validation when the change affects:

- shared contracts
- engine endpoint shapes consumed by admin or sdk
- sdk request or response behavior consumed by admin or representative consumers
- rollout-facing auth behavior that touches engine plus consumer integrations

Use representative consumer flows for validation when needed, but do not modify consumer code unless that coordination is explicitly part of the task.

## Sensitive Areas

Human review is expected in practice for:

- authorization semantics
- shared contracts
- session resolution
- audit event shape
- cache invalidation or replay behavior
- rollout-facing degraded-mode handling

This workspace does not yet show CODEOWNERS or merge-blocking CI in repo configuration. Review discipline is therefore a team responsibility today.

The repository now includes a baseline GitHub Actions workflow definition in `.github/workflows/verify.yml`, but merge-blocking still depends on remote branch protection or rulesets.

## Rollout-Facing Changes

For changes that affect auth behavior, use the existing operational docs as gates:

- [docs/STAGING_GATE.md](docs/STAGING_GATE.md)
- [docs/TELEMETRY_BASELINE.md](docs/TELEMETRY_BASELINE.md)
- [docs/AUTH_FAILURE_RUNBOOK.md](docs/AUTH_FAILURE_RUNBOOK.md)
- [docs/PILOT_EVIDENCE_TEMPLATE.md](docs/PILOT_EVIDENCE_TEMPLATE.md)

Do not claim rollout controls as implemented unless the repository evidence supports that statement.

Current examples of still-planned or partially evidenced controls include:

- shadow mode mismatch logging
- tenant-scoped enforcement flags
- fully repeatable pilot evidence across representative consumers
- durable operator-facing telemetry evidence for all rollout signals

## Pull Requests

Use the repository PR template checklist to document:

- ownership boundary
- validation run
- whether contracts changed
- whether rollout-facing docs or evidence were updated

Call out any sibling `xypes-docman` edits explicitly. They should be absent for normal identity-platform workflow changes.

If your change crosses repos, explain the sequence clearly instead of burying it in one generic summary.
