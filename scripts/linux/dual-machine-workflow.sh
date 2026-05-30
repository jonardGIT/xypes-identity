#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./offline-bundles.sh
source "${SCRIPT_DIR}/offline-bundles.sh"

usage() {
  cat <<'EOF'
Usage: bash scripts/linux/dual-machine-workflow.sh <command> [args]

Commands:
  status [remote-name]
      Print the current branch, remote presence, and machine-role guess.

  setup-work [remote-name]
      Remove the named remote and lock the repo into offline-only work-machine mode.

  export-main [branch-name] [output-path]
      Export the current mainline bundle on the main machine.

  import-main <bundle-path> [branch-name] [transfer-ref]
      Import the transferred mainline bundle on the work machine.

  export-branch <branch-name> [base-branch] [output-path]
      Export a bounded work branch bundle on the work machine.

  import-branch <bundle-path> <branch-name> [target-branch]
      Import the work-machine branch bundle on the main machine.

    review-import <target-branch> [base-branch]
      Print the exact diff, log, validation, and merge commands for a previously imported branch.

Examples:
  bash scripts/linux/dual-machine-workflow.sh status
  bash scripts/linux/dual-machine-workflow.sh setup-work
  bash scripts/linux/dual-machine-workflow.sh export-main
  bash scripts/linux/dual-machine-workflow.sh import-main /path/to/xypes-identity-main.bundle
  bash scripts/linux/dual-machine-workflow.sh export-branch feat/offline-helper
  bash scripts/linux/dual-machine-workflow.sh import-branch /path/to/xypes-identity-feat-offline-helper.bundle feat/offline-helper
  bash scripts/linux/dual-machine-workflow.sh review-import import/feat/offline-helper
EOF
}

print_next_step() {
  local command_name="$1"
  shift

  case "${command_name}" in
    setup-work)
      log "Next: import the latest accepted main bundle before starting work"
      ;;
    export-main)
      log "Next: transfer the bundle to the work machine, then run import-main there"
      ;;
    import-main)
      log "Next: create a short-lived branch and make one bounded change slice"
      ;;
    export-branch)
      log "Next: transfer the branch bundle to the main machine, then run import-branch there"
      ;;
    import-branch)
      local imported_branch="$1"
      local target_branch="$2"
      log "Next: run review-import for the imported branch"
      printf '  bash scripts/linux/dual-machine-workflow.sh review-import %s\n' "${target_branch}"
      ;;
  esac
}

ensure_local_branch_exists() {
  local branch_name="$1"

  if ! git -C "${ROOT_DIR}" show-ref --verify --quiet "refs/heads/${branch_name}"; then
    fail "Local branch not found: ${branch_name}"
  fi
}

status_command() {
  local remote_name="${1:-origin}"
  local current_branch remote_url role_guess worktree_state

  ensure_git_repo

  current_branch="$(git -C "${ROOT_DIR}" branch --show-current)"
  worktree_state="clean"
  if [[ -n "$(git -C "${ROOT_DIR}" status --short)" ]]; then
    worktree_state="dirty"
  fi

  remote_url=""
  if git -C "${ROOT_DIR}" remote get-url "${remote_name}" >/dev/null 2>&1; then
    remote_url="$(git -C "${ROOT_DIR}" remote get-url "${remote_name}")"
    role_guess="main-machine"
  else
    role_guess="work-machine"
  fi

  log "Repository: ${ROOT_DIR}"
  log "Current branch: ${current_branch:-detached}"
  log "Working tree: ${worktree_state}"
  log "Role guess: ${role_guess}"
  if [[ -n "${remote_url}" ]]; then
    log "Remote ${remote_name}: ${remote_url}"
  else
    log "Remote ${remote_name}: not configured"
  fi
}

setup_work_command() {
  local remote_name="${1:-origin}"

  "${SCRIPT_DIR}/lock-offline-work-machine.sh" "${remote_name}"
  print_next_step setup-work
}

export_main_command() {
  local branch_name="${1:-main}"
  local output_path="${2:-}"

  if [[ -n "${output_path}" ]]; then
    "${SCRIPT_DIR}/export-main-bundle.sh" "${branch_name}" "${output_path}"
  else
    "${SCRIPT_DIR}/export-main-bundle.sh" "${branch_name}"
  fi

  print_next_step export-main
}

import_main_command() {
  local bundle_path="${1:-}"
  local branch_name="${2:-main}"
  local transfer_ref="${3:-transfer/${branch_name}}"

  [[ -n "${bundle_path}" ]] || fail "Usage: bash scripts/linux/dual-machine-workflow.sh import-main <bundle-path> [branch-name] [transfer-ref]"
  "${SCRIPT_DIR}/import-main-bundle.sh" "${bundle_path}" "${branch_name}" "${transfer_ref}"

  print_next_step import-main
}

export_branch_command() {
  local branch_name="${1:-}"
  local base_branch="${2:-main}"
  local output_path="${3:-}"

  [[ -n "${branch_name}" ]] || fail "Usage: bash scripts/linux/dual-machine-workflow.sh export-branch <branch-name> [base-branch] [output-path]"

  if [[ -n "${output_path}" ]]; then
    "${SCRIPT_DIR}/export-branch-bundle.sh" "${branch_name}" "${base_branch}" "${output_path}"
  else
    "${SCRIPT_DIR}/export-branch-bundle.sh" "${branch_name}" "${base_branch}"
  fi

  print_next_step export-branch
}

import_branch_command() {
  local bundle_path="${1:-}"
  local branch_name="${2:-}"
  local target_branch="${3:-import/${branch_name}}"

  [[ -n "${bundle_path}" ]] || fail "Usage: bash scripts/linux/dual-machine-workflow.sh import-branch <bundle-path> <branch-name> [target-branch]"
  [[ -n "${branch_name}" ]] || fail "Usage: bash scripts/linux/dual-machine-workflow.sh import-branch <bundle-path> <branch-name> [target-branch]"

  "${SCRIPT_DIR}/import-branch-bundle.sh" "${bundle_path}" "${branch_name}" "${target_branch}"

  print_next_step import-branch "${branch_name}" "${target_branch}"
}

review_import_command() {
  local target_branch="${1:-}"
  local base_branch="${2:-main}"

  [[ -n "${target_branch}" ]] || fail "Usage: bash scripts/linux/dual-machine-workflow.sh review-import <target-branch> [base-branch]"

  ensure_git_repo
  ensure_local_branch_exists "${target_branch}"
  ensure_local_branch_exists "${base_branch}"

  log "Review commands for imported branch ${target_branch} against ${base_branch}:"
  printf '  git diff %s...%s\n' "${base_branch}" "${target_branch}"
  printf '  git log --oneline %s..%s\n' "${base_branch}" "${target_branch}"
  printf '  bash scripts/linux/verify-all.sh  # or the narrowest verify script for the owned boundary\n'
  printf '  git switch %s && git merge --ff-only %s\n' "${base_branch}" "${target_branch}"
}

main() {
  local command_name="${1:-}"
  shift || true

  case "${command_name}" in
    status)
      status_command "$@"
      ;;
    setup-work)
      setup_work_command "$@"
      ;;
    export-main)
      export_main_command "$@"
      ;;
    import-main)
      import_main_command "$@"
      ;;
    export-branch)
      export_branch_command "$@"
      ;;
    import-branch)
      import_branch_command "$@"
      ;;
    review-import)
      review_import_command "$@"
      ;;
    help|-h|--help|"")
      usage
      ;;
    *)
      fail "Unknown command: ${command_name}"
      ;;
  esac
}

main "$@"