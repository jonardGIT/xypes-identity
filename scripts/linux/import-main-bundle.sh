#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./offline-bundles.sh
source "${SCRIPT_DIR}/offline-bundles.sh"

bundle_path="${1:-}"
branch_name="${2:-main}"
transfer_ref="${3:-transfer/${branch_name}}"

[[ -n "${bundle_path}" ]] || fail "Usage: bash scripts/linux/import-main-bundle.sh <bundle-path> [branch-name] [transfer-ref]"
[[ -f "${bundle_path}" ]] || fail "Bundle not found: ${bundle_path}"

ensure_git_repo
ensure_clean_worktree
ensure_branch_exists "${branch_name}"

git -C "${ROOT_DIR}" fetch "${bundle_path}" "${branch_name}:refs/remotes/${transfer_ref}"
git -C "${ROOT_DIR}" switch "${branch_name}"
git -C "${ROOT_DIR}" merge --ff-only "refs/remotes/${transfer_ref}"
log "Imported ${branch_name} from ${bundle_path}"
