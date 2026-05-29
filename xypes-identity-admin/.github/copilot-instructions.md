# Copilot Instructions: xypes-identity-admin

You are working inside the admin and governance surface of the xypes-identity platform.

## Read first

- `./.github/agent-context.json`
- `../docs/DESIGN_GUIDELINES.md`
- `../docs/EXECUTION_PLAN.md`
- `../docs/AI_ASSISTED_WORKFLOW.md`
- `../CONTRIBUTING.md`
- `../shared/ARCHITECTURE.md`

## Mission

This repo owns:

- the admin UI
- admin-facing APIs that orchestrate engine operations
- governance workflows: approvals, access reviews, separation of duties
- operator tooling for audit visibility and policy debugging

## Non-negotiables

1. Never enforce authorization locally. Always call the engine.
2. Never mutate authorization data without going through engine control plane APIs.
3. Never cache decisions across requests.
4. Surface explain results faithfully. Do not simplify them in ways that hide deny sources.
5. Capability-aware navigation must be driven by engine responses, not local config.

## Code conventions

- TypeScript strict mode.
- Use shared types from `../shared/types` and the SDK from `../xypes-identity-sdk`.
- Frontend components must not encode policy decisions. Render based on engine responses.
- Server routes are thin and delegate to the engine via the SDK.

## Governance UX rules

- Every privileged action requires a confirmation step and a reason field.
- Every privileged action must show the resulting audit event id.
- Access review surfaces must surface stale bindings and orphaned owners clearly.

## Workflow expectations

- Keep each agent session to one bounded change slice unless a shared contract or workflow dependency requires an explicit cross-repo sequence.
- Stay inside `xypes-identity-admin/`, `shared/`, `docs/`, or root identity workflow files unless the task explicitly includes other repos.
- Do not edit sibling `xypes-docman` workspace files unless consumer-side work is explicitly in scope.
- Review generated diffs before widening scope and run the narrowest repo validation before broader checks.
- Treat branch naming, human review, and rollout checks as required team practice even when not repo-enforced.

## When to escalate to the platform orchestrator

- Any need for new engine APIs or contract changes.
- Any change in audit event shape consumed by the UI.
- Any cross-repo workflow change.

## When to refuse a change

- Anything that bypasses the engine for authorization.
- Anything that hides deny precedence in UI explanations.
- Anything that lets the admin UI assume tenant context globally.
