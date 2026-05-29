# Private Remote Baseline

This document describes the minimum remote-host setup that turns the checked-in workflow files into actual repository controls for a private GitHub repository.

## What the repository now provides

- a GitHub Actions verification workflow at `./.github/workflows/verify.yml`
- a PR template at `./.github/pull_request_template.md`
- repo-local and workspace-level Copilot instruction surfaces for ownership and validation guidance

Those files are necessary, but they are not sufficient on their own. The remote host must still be configured to require them.

## Minimum private GitHub setup

1. Add the remote and push the default branch.
2. Confirm GitHub Actions is enabled for the private repository.
3. Set the intended default branch, typically `main`.
4. Add a branch protection ruleset for the default branch.
5. Require pull requests before merge.
6. Require the `Verify` status check before merge.
7. Prevent direct pushes to the protected branch except for explicitly trusted maintainers if needed.
8. Enable conversation resolution before merge if the team wants review threads treated as blockers.

## Recommended next controls

1. Add a real `CODEOWNERS` file once the owning users or teams are known.
2. Require at least one human review for sensitive paths such as engine authorization semantics, shared contracts, session resolution, audit shape, and cache invalidation.
3. Enable secret scanning and dependency alerting if the hosting plan supports them.
4. Add a release or deployment gate only after rollout evidence expectations are executable and not merely documented.

## Important limits

- The checked-in workflow creates executable CI, but it does not become merge-blocking until the remote branch protection or ruleset requires it.
- A private remote does not automatically create CODEOWNERS enforcement, review routing, or protected branches.
- If GitHub Actions is disabled for the private repository or unavailable on the current plan, the workflow file remains inert until Actions is enabled.

## Expected result after setup

Once the default branch requires pull requests and the `Verify` check, the repository moves from honor-system validation to baseline remote enforcement:

- pull requests will run the workspace verification workflow
- direct merges can be blocked when verification fails
- the PR template becomes part of the normal review path
- review discipline becomes easier to standardize

That still does not make every workflow rule fully enforced. Human review rules, ownership routing, and rollout evidence checks remain partially procedural until additional repository settings or automation are added.