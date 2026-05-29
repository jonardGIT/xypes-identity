#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./offline-bundles.sh
source "${SCRIPT_DIR}/offline-bundles.sh"

branch_name="${1:-}"
base_branch="${2:-main}"
output_path="${3:-}"

[[ -n "${branch_name}" ]] || fail "Usage: bash scripts/linux/export-branch-bundle.sh <branch-name> [base-branch] [output-path]"

ensure_git_repo
ensure_clean_worktree
ensure_branch_exists "${branch_name}"
ensure_branch_exists "${base_branch}"
ensure_offline_transfer_dir

if [[ -z "${output_path}" ]]; then
  output_path="$(default_branch_bundle_path "${branch_name}")"
fi

git -C "${ROOT_DIR}" bundle create "${output_path}" "${base_branch}..${branch_name}"
log "Created branch bundle at ${output_path}"
