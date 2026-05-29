# Copilot Instructions: xypes-identity workspace

You are working in the root of the `xypes-identity` platform workspace.

## Read first

- `../CONTRIBUTING.md`
- `../docs/AI_ASSISTED_WORKFLOW.md`
- `../docs/DESIGN_GUIDELINES.md`
- `../docs/EXECUTION_PLAN.md`
- `../shared/ARCHITECTURE.md`
- `../xypes-identity-platform-orchestrator.agent.md`

## Workspace routing

- Start from the ownership boundary that directly controls the behavior.
- Use `xypes-identity-engine/` for authorization semantics, control-plane APIs, caches, outbox, and audit shape.
- Use `xypes-identity-admin/` for governance-facing API shaping and operator workflows.
- Use `xypes-identity-sdk/` for client ergonomics, middleware, and integration examples.
- Use `shared/` for durable contracts and architecture references.
- Use the platform orchestrator for cross-repo work, shared contract changes, or sequencing that spans repos.

## Required workflow expectations

- Keep each session to one bounded change slice unless a shared contract or workflow dependency requires an explicit cross-repo sequence.
- Load the target repo's `.github/copilot-instructions.md` and `.github/agent-context.json` before editing inside that repo.
- Review generated diffs before widening scope and run the narrowest relevant validation before broader checks.
- Treat branch naming, human review, and rollout checks as required team practice even when not repo-enforced.
- Treat the sibling `xypes-docman` workspace as out of scope unless the task explicitly includes consumer-side edits.

## Constraints

- Do not flatten cross-repo work into one mixed implementation plan.
- Do not claim CI, CODEOWNERS, branch protection, or rollout controls are enforced unless repository evidence shows that they are.
- Do not edit sibling `xypes-docman` files unless they are explicitly in scope.