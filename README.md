# xypes-identity

Multi-root workspace for a SaaS-grade identity and authorization platform.

Identity is delegated to Supabase. Authorization is owned by this platform.

## Current Status

- `xypes-identity-engine` is materially ahead across Phases 1 through 5: identity bridge, decision and explain APIs, audited control-plane mutations, outbox-backed invalidation, worker processing, access reviews, separation-of-duties blocking, and eligible versus active bindings are implemented.
- `xypes-identity-admin` is still a thin API scaffold over engine control-plane and access-review APIs. A fuller governance surface, UI, approval workflows, and operator-facing audit or debugging tools are still open work.
- `xypes-identity-sdk` has typed client APIs, Express and Fastify middleware, deny-aware errors, and copyable sample app entrypoints. It does not yet provide a standalone reference consumer app.
- Disaster recovery is documented and tabletop-complete in `docs/DISASTER_RECOVERY_PLAN.md`, but not yet operationally complete until a live non-production restore drill is executed and recorded.
- Rollout stages, pilot posture, shadow mode, and tenant-scoped enforcement controls remain planned rather than evidenced as complete in this repo.

For the durable cross-repo status assessment, see `shared/ROADMAP.md` and `docs/EXECUTION_PLAN.md`.

## Workspaces

- `xypes-identity.code-workspace`: default day-to-day identity workspace. Opens only the identity system from the sibling SaaS layout.
- `../xypes-platform.code-workspace`: parent-level cross-system workspace for identity plus representative consumer coordination. Use this only when work intentionally spans identity and the sibling `xypes-docman` workspace.

Inside the identity filesystem root, the primary owned surfaces remain:

- `xypes-identity-engine`: authorization core. Decision API, control plane APIs, caches, outbox, audit events.
- `xypes-identity-admin`: admin and governance surface for roles, groups, bindings, reviews, and audits.
- `xypes-identity-sdk`: application SDKs and framework middleware.
- `shared`: shared contracts, schemas, and durable cross-project references.
- `docs`: architecture, roadmap, and operational guidance.

## Start Here

- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Default workspace: [xypes-identity.code-workspace](xypes-identity.code-workspace)
- Parent platform workspace: [../xypes-platform.code-workspace](../xypes-platform.code-workspace)
- Platform orchestrator: [.github/agents/xypes-identity-platform-orchestrator.agent.md](.github/agents/xypes-identity-platform-orchestrator.agent.md)
- Platform context: [xypes-identity-platform-context.json](xypes-identity-platform-context.json)
- Architecture: [shared/ARCHITECTURE.md](shared/ARCHITECTURE.md)
- Roadmap: [shared/ROADMAP.md](shared/ROADMAP.md)
- Execution plan: [docs/EXECUTION_PLAN.md](docs/EXECUTION_PLAN.md)
- AI-assisted workflow now: [docs/AI_ASSISTED_WORKFLOW.md](docs/AI_ASSISTED_WORKFLOW.md)
- Offline dual-machine workflow: [docs/OFFLINE_DUAL_MACHINE_WORKFLOW.md](docs/OFFLINE_DUAL_MACHINE_WORKFLOW.md)
- AI-assisted target state later: [docs/AI_ASSISTED_TARGET_STATE.md](docs/AI_ASSISTED_TARGET_STATE.md)
- SaaS layout migration plan: [docs/SAAS_LAYOUT_MIGRATION_PLAN.md](docs/SAAS_LAYOUT_MIGRATION_PLAN.md)
- SaaS layout post-move checklist: [docs/SAAS_LAYOUT_POST_MOVE_CHECKLIST.md](docs/SAAS_LAYOUT_POST_MOVE_CHECKLIST.md)
- SaaS layout move commands: [docs/SAAS_LAYOUT_MOVE_COMMANDS.md](docs/SAAS_LAYOUT_MOVE_COMMANDS.md)
- Parent federation workspace template: [docs/xypes-platform.code-workspace.template](docs/xypes-platform.code-workspace.template)
- Design guidelines: [docs/DESIGN_GUIDELINES.md](docs/DESIGN_GUIDELINES.md)
- Agent architecture: [docs/AGENT_ARCHITECTURE.md](docs/AGENT_ARCHITECTURE.md)
- Supabase + custom RBAC hybrid: [docs/SUPABASE_HYBRID_ARCHITECTURE.md](docs/SUPABASE_HYBRID_ARCHITECTURE.md)
- Stack evaluation: [docs/TECH_STACK_EVALUATION.md](docs/TECH_STACK_EVALUATION.md)
- Roadmap critique: [docs/RBAC_ROADMAP_REVIEW.md](docs/RBAC_ROADMAP_REVIEW.md)

## Per-Repo Agents

- Workspace: [.github/agents/xypes-identity-platform-orchestrator.agent.md](.github/agents/xypes-identity-platform-orchestrator.agent.md)
- Engine: [xypes-identity-engine/.github/agents/engine-orchestrator.agent.md](xypes-identity-engine/.github/agents/engine-orchestrator.agent.md)
- Admin: [xypes-identity-admin/.github/agents/admin-orchestrator.agent.md](xypes-identity-admin/.github/agents/admin-orchestrator.agent.md)
- SDK: [xypes-identity-sdk/.github/agents/sdk-orchestrator.agent.md](xypes-identity-sdk/.github/agents/sdk-orchestrator.agent.md)

## Automation scripts

The workspace root now includes Linux and PowerShell automation under `scripts/linux` and `scripts/windows`.

- Per-repo verify scripts install dependencies automatically, use `npm ci` only when a `package-lock.json` exists, and then run each repo's build and verification commands. Use `bash scripts/linux/verify-shared.sh`, `bash scripts/linux/verify-engine.sh`, `bash scripts/linux/verify-sdk.sh`, `bash scripts/linux/verify-admin.sh`, or `pwsh -File scripts/windows/verify-shared.ps1`, `verify-engine.ps1`, `verify-sdk.ps1`, `verify-admin.ps1`.
- Cross-repo verification runs the repos in dependency order with `bash scripts/linux/verify-all.sh` or `pwsh -File scripts/windows/verify-all.ps1`.
- Local Docker startup scripts use the workspace-root `docker-compose.yml`, optionally reset volumes first, and smoke-test the engine and admin stack. Use `bash scripts/linux/start-local-stack.sh --fresh all` or `pwsh -File scripts/windows/start-local-stack.ps1 -Fresh -Services all`. You can also target `engine` or `admin`.
- Dynamic orchestration prompt helpers can now generate a reusable parallel-work bundle by default for any platform root. Use `bash scripts/linux/render-platform-parallel-prompt.sh --root /home/nhad/saas/xypes-identity --sessions 3` to emit a bundle directory, `bash scripts/linux/render-platform-parallel-prompt.sh --no-auto` to print only the manager prompt, or `bash scripts/linux/render-platform-parallel-prompt.sh --execute --goal 'your bounded objective here'` to execute the manager and worker packets through Copilot CLI. The PowerShell variant still renders prompts with `pwsh -File scripts/windows/render-platform-parallel-prompt.ps1 -Root /home/nhad/saas/xypes-docman -Sessions 3`.
- Offline transfer helpers support the two-machine bundle workflow documented in [docs/OFFLINE_DUAL_MACHINE_WORKFLOW.md](docs/OFFLINE_DUAL_MACHINE_WORKFLOW.md). Use the `export-main-bundle`, `import-main-bundle`, `export-branch-bundle`, `import-branch-bundle`, and `lock-offline-work-machine` scripts under `scripts/linux/` or `scripts/windows/`.

## Docker local testing

For a minimal local stack, start Postgres, Redis, a static JWKS mock, the engine, and the current admin scaffold from the workspace root:

```bash
docker compose up --build
```

The compose file mounts `xypes-identity-engine/sql` into Postgres initialization, adds a local-only resolve-session seed file, starts a local Redis instance for engine cache and tenant-version state, builds the engine image with the workspace root as context so `file:../shared` resolves, builds the admin image from `xypes-identity-admin/Dockerfile` with the same root context so the local `shared -> sdk -> admin` dependency chain resolves during image build, and serves `docker/jwks-mock/jwks.json` through a tiny static container. To reduce collisions with already-running local services, Postgres is published on host port `55432` by default and Redis on host port `56379`, while containers still use `5432` and `6379` internally.

If you have already initialized the Postgres volume once, run `docker compose down -v` before bringing the stack back up so the seed SQL runs again.

## Resolve-session local exercises

After `docker compose up --build`, mint a local test token with the one-off helper service:

```bash
docker compose --profile tools run --rm \
	-e TOKEN_SUBJECT=local-active-member \
	-e TOKEN_EMAIL=active.member@example.test \
	token-mint
```

The local seed data supports these three `POST /v1/auth/resolve-session` exercises, and the startup scripts now smoke-test the admin access review console against the seeded tenant id `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1` as part of the same boot path:

1. Success: subject `local-active-member` with tenant `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1`
2. Missing membership: subject `local-active-member` with tenant `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2`
3. Suspended membership: subject `local-suspended-member` with tenant `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2`

The detailed curl walkthrough and expected outcomes live in `xypes-identity-engine/README.md`.
