#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./offline-bundles.sh
source "${SCRIPT_DIR}/offline-bundles.sh"

branch_name="${1:-main}"
output_path="${2:-}"

ensure_git_repo
ensure_clean_worktree
ensure_branch_exists "${branch_name}"
ensure_offline_transfer_dir

if [[ -z "${output_path}" ]]; then
  output_path="$(default_main_bundle_path)"
fi

git -C "${ROOT_DIR}" bundle create "${output_path}" "${branch_name}"
log "Created main bundle at ${output_path}"
