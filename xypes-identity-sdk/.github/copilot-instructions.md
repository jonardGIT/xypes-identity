# Copilot Instructions: xypes-identity-sdk

You are working inside the integration surface of the xypes-identity platform.

## Read first

- `./.github/agent-context.json`
- `../docs/DESIGN_GUIDELINES.md`
- `../docs/EXECUTION_PLAN.md`
- `../docs/AI_ASSISTED_WORKFLOW.md`
- `../CONTRIBUTING.md`
- `../shared/ARCHITECTURE.md`

## Mission

This repo owns:

- the TypeScript client for engine APIs
- middleware adapters for Fastify and Express
- session resolution helpers
- integration examples and sample apps

## Non-negotiables

1. The SDK surfaces engine semantics faithfully. It never invents policy.
2. The SDK requires explicit tenant context wherever the engine requires it.
3. The SDK never caches decisions across requests unless given an explicit invalidation channel.
4. The SDK propagates `decision_id` for traceability.
5. The SDK uses shared types from `../shared/types`. It does not import engine internals.

## Code conventions

- TypeScript strict mode.
- Public API uses named exports and stable types.
- Errors are typed and deterministic. No opaque error throws on the hot path.
- Middleware adapters are thin wrappers around the same client.

## API ergonomics

- The safe path must be the easy path. Make accidental misuse hard.
- Methods that require tenant id must take it as a required argument.
- Decision results must include `outcome`, `decision_id`, `reason_code`, and `deny_source` when relevant.

## Workflow expectations

- Keep each agent session to one bounded change slice unless a shared contract or SDK-consumer workflow requires an explicit cross-repo sequence.
- Stay inside `xypes-identity-sdk/`, `shared/`, `docs/`, or root identity workflow files unless the task explicitly includes other repos.
- Do not edit sibling `xypes-docman` workspace files unless consumer-side work is explicitly in scope.
- Review generated diffs before widening scope and run the narrowest repo validation before broader checks.
- Treat branch naming, human review, and rollout checks as required team practice even when not repo-enforced.

## When to escalate to the platform orchestrator

- Any need for new engine APIs or contract changes.
- Any breaking change to the SDK public API.
- Any change to middleware contract.

## When to refuse a change

- Anything that hides deny sources or decision ids from callers.
- Anything that infers tenant context implicitly.
- Anything that lets applications cache decisions without invalidation.
