# AI-Assisted Development Workflow

This document defines the practical workflow the `xypes-identity` workspace can adopt now.

It is intentionally grounded in the current repository state. It describes team practice that fits the existing platform architecture, repo layout, and validation scripts without pretending that all delivery rails are already enforced in automation.

For the stricter future-state model, see `./AI_ASSISTED_TARGET_STATE.md`.

For the contributor-facing entrypoint that applies this workflow in day-to-day repo use, see `../CONTRIBUTING.md`.

For a strict single-developer, two-machine, file-transfer-only operating model, see `./OFFLINE_DUAL_MACHINE_WORKFLOW.md`.

This workflow is for the `xypes-identity` platform surfaces only. In the sibling SaaS layout, `xypes-docman` should be treated as an external representative consumer unless a task explicitly includes consumer-side work.

Workspace recommendation:

- use `xypes-identity.code-workspace` for normal identity work
- use `../xypes-platform.code-workspace` only when a task intentionally spans identity and the sibling `xypes-docman` workspace

## Goal

Preserve iteration speed from AI-assisted development without sacrificing:

- platform boundary discipline
- reviewability
- auditability
- rollout safety
- operational clarity

## Current Reality

The workspace already has strong architectural context and repo boundaries through:

- per-repo agent instructions and context files
- shared design and execution docs
- schema-first API conventions
- repo and cross-repo verification scripts
- a checked-in baseline GitHub Actions verification workflow
- rollout and telemetry guidance documents

The workspace does not yet clearly show all of the following as enforced repository rails:

- CODEOWNERS
- protected path or branch rules represented in the repo
- automated security scanning gates
- completed rollout controls such as shadow-mode mismatch logging and tenant-scoped enforcement flags

Because of that, this workflow separates what the team should do now from what the platform should enforce later.

Remote-hosting note:

- the repository now includes a baseline GitHub Actions workflow definition under `.github/workflows/verify.yml`
- for a private remote, merge-blocking CI still depends on enabling Actions and requiring the `Verify` check in branch protection or rulesets
- see `docs/PRIVATE_REMOTE_BASELINE.md` for the minimum remote setup

Current workspace-scoping note:

- `xypes-docman` now lives as a sibling workspace under the shared `saas` parent
- the default identity workspace should open only the identity system by default
- the parent `../xypes-platform.code-workspace` is the explicit cross-system entrypoint when both products need to be open together
- validation may exercise representative consumer flows without making consumer code changes by default

## Adopt-Now Workflow

### 1. Start from the owned boundary

Before using an agent, identify which repo owns the change:

- engine for authorization semantics, control-plane APIs, caches, outbox, and audit shape
- admin for governance-facing API shaping and operator workflows
- sdk for client ergonomics, middleware, and integration examples
- shared for durable contracts and architecture references

Do not start with a mixed cross-repo edit unless the change truly crosses a contract or sequencing boundary.

For this workflow, the owned boundary set is:

- `xypes-identity-engine/`
- `xypes-identity-admin/`
- `xypes-identity-sdk/`
- `shared/`
- `docs/`
- root workflow and automation files that belong to the identity platform

Do not edit the sibling `xypes-docman` workspace as part of ordinary identity workflow execution unless the task explicitly calls for coordinated consumer changes.

### 2. Load the durable context first

Use the existing workspace context before making changes:

- `docs/DESIGN_GUIDELINES.md`
- `docs/EXECUTION_PLAN.md`
- `shared/ARCHITECTURE.md`
- the target repo's `.github/copilot-instructions.md`
- the target repo's `.github/agent-context.json`

This is already one of the strongest parts of the workspace and should remain mandatory.

### 3. Use one session for one bounded change slice

Keep each agent session narrow enough to review and validate cleanly.

Good examples:

- one endpoint
- one route-level contract update
- one service behavior fix
- one admin workbench response shape
- one SDK method or middleware slice
- one focused refactor
- one documentation update

Avoid mixing unrelated concerns such as semantics changes, admin shaping, and SDK ergonomics in one session.

Important exception:

When a shared contract or authorization behavior changes, a bounded cross-repo sequence is acceptable. In that case, keep the change unified by one acceptance slice rather than splitting it into arbitrary sessions.

### 4. Use short-lived branches as team practice

Create a short-lived working branch before substantial changes:

- `feat/<task>`
- `fix/<task>`
- `docs/<task>`

This is recommended team discipline now, even though branch naming and protection are not currently evidenced as enforced in repo configuration.

### 5. Review generated changes before widening scope

Treat generated code as a draft, not as trusted output.

Preferred loop:

1. generate a small change
2. review the diff locally
3. run the narrowest relevant validation
4. make the next adjacent change only after the first slice is understood

Prefer small logical commits over large generated diffs.

### 6. Validate at the repo boundary first

Use the narrowest repo-scoped validation that matches the change.

Current local validation rails already available in this workspace include:

- `bash scripts/linux/verify-shared.sh`
- `bash scripts/linux/verify-engine.sh`
- `bash scripts/linux/verify-sdk.sh`
- `bash scripts/linux/verify-admin.sh`
- `bash scripts/linux/verify-all.sh`
- PowerShell equivalents under `scripts/windows/`

At a minimum, changes should pass the touched repo's existing build, typecheck where available, and tests.

### 7. Use cross-repo validation when behavior crosses boundaries

Run broader validation when the change affects:

- shared contracts
- engine endpoint shapes consumed by sdk or admin
- sdk request or response shaping used by admin or consumers
- rollout-facing auth behavior that touches engine plus consumer integrations

In those cases, prefer the existing cross-repo verification path and representative local integration or smoke flows.

Representative consumer validation does not by itself make consumer code part of the default edit scope.

### 8. Treat contract discipline as required even when automation is partial

This workspace already expects:

- JSON Schema at external boundaries
- typed shared contracts from `shared/`
- route and service tests for changed behavior
- deterministic error behavior for external surfaces

Even where contract testing is not yet presented as a dedicated CI gate, contributors should behave as if contract drift is a merge blocker.

### 9. Require human review for sensitive areas

Human review should be mandatory in practice for:

- authorization semantics
- shared contracts
- session resolution
- audit event shape
- cache invalidation or replay behavior
- rollout-facing degraded-mode handling

Today this is a team rule rather than a visibly enforced CODEOWNERS rule.

### 10. Use rollout docs as release gates for auth-facing changes

For rollout-facing changes, use the existing operational docs rather than ad hoc confidence:

- `docs/STAGING_GATE.md`
- `docs/TELEMETRY_BASELINE.md`
- `docs/AUTH_FAILURE_RUNBOOK.md`
- `docs/PILOT_EVIDENCE_TEMPLATE.md`

If a change affects session resolution, decision behavior, invalidation, or consumer enforcement guidance, it is not enough to rely only on unit tests.

### 11. Do not claim rollout controls that are still planned

The current workspace documentation is explicit that these remain planned or only partially evidenced:

- shadow mode mismatch logging workflow
- tenant-scoped enforcement flags
- repeatable pilot evidence across representative consumers
- durable operator-facing telemetry evidence for all rollout signals

Use the docs as the source of intended posture, but do not describe those controls as already complete unless the repo evidence changes.

## Minimum Expected Review Checklist

Before merging an AI-assisted change, confirm:

- the change stayed inside the correct ownership boundary or used an explicit cross-repo sequence
- the sibling `xypes-docman` workspace was untouched unless consumer work was explicitly in scope
- the generated diff was reviewed by a human
- the touched repo's build and tests passed
- cross-repo validation ran when contracts or integrations changed
- docs were updated when behavior or rollout posture changed
- rollout-facing auth changes were checked against staging, telemetry, and failure-mode guidance

## Where This Workflow Is Strongest

This workflow is especially well suited for this workspace because:

- repo boundaries are explicit
- authorization semantics are sensitive and centralized
- admin and sdk are intentionally thin over engine truth
- the platform already distinguishes architecture intent from operational evidence

## Known Limitations

This document does not claim that the repository already enforces:

- branch protection
- CODEOWNERS review routing
- security scanning gates
- published machine-readable API reference as a normal contract rail

The repository does now include a baseline CI workflow definition, but merge-blocking still depends on remote-host configuration.

Those belong in the future-state model documented separately.
