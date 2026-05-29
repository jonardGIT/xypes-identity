#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "${SCRIPT_DIR}/common.sh"

OFFLINE_TRANSFER_DIR="${ROOT_DIR}/.git/offline-transfer"

ensure_git_repo() {
  require_command git

  if ! git -C "${ROOT_DIR}" rev-parse --git-dir >/dev/null 2>&1; then
    fail "${ROOT_DIR} is not a Git repository"
  fi
}

ensure_clean_worktree() {
  if [[ -n "$(git -C "${ROOT_DIR}" status --short)" ]]; then
    fail "Working tree must be clean before running offline transfer commands"
  fi
}

ensure_branch_exists() {
  local branch_name="$1"

  if ! git -C "${ROOT_DIR}" show-ref --verify --quiet "refs/heads/${branch_name}"; then
    fail "Branch not found: ${branch_name}"
  fi
}

ensure_remote_missing() {
  local remote_name="${1:-origin}"

  if git -C "${ROOT_DIR}" remote get-url "${remote_name}" >/dev/null 2>&1; then
    fail "Remote '${remote_name}' is configured. Remove it on the work machine before enabling offline-only mode"
  fi
}

ensure_offline_transfer_dir() {
  mkdir -p "${OFFLINE_TRANSFER_DIR}"
}

timestamp_utc() {
  date -u +"%Y%m%dT%H%M%SZ"
}

default_main_bundle_path() {
  printf '%s/%s-main-%s.bundle\n' "${OFFLINE_TRANSFER_DIR}" "$(basename "${ROOT_DIR}")" "$(timestamp_utc)"
}

default_branch_bundle_path() {
  local branch_name="$1"
  local safe_branch_name

  safe_branch_name="${branch_name//\//-}"
  printf '%s/%s-%s-%s.bundle\n' "${OFFLINE_TRANSFER_DIR}" "$(basename "${ROOT_DIR}")" "${safe_branch_name}" "$(timestamp_utc)"
}