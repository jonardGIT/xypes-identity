#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./offline-bundles.sh
source "${SCRIPT_DIR}/offline-bundles.sh"

bundle_path="${1:-}"
branch_name="${2:-}"
target_branch="${3:-}"

[[ -n "${bundle_path}" ]] || fail "Usage: bash scripts/linux/import-branch-bundle.sh <bundle-path> <branch-name> [target-branch]"
[[ -n "${branch_name}" ]] || fail "Usage: bash scripts/linux/import-branch-bundle.sh <bundle-path> <branch-name> [target-branch]"
[[ -f "${bundle_path}" ]] || fail "Bundle not found: ${bundle_path}"

ensure_git_repo
ensure_clean_worktree

if [[ -z "${target_branch}" ]]; then
  target_branch="import/${branch_name}"
fi

git -C "${ROOT_DIR}" fetch "${bundle_path}" "${branch_name}:refs/heads/${target_branch}"
log "Imported ${branch_name} into local branch ${target_branch}"
