#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./offline-bundles.sh
source "${SCRIPT_DIR}/offline-bundles.sh"

remote_name="${1:-origin}"
hook_path="${ROOT_DIR}/.git/hooks/pre-push"

ensure_git_repo

if git -C "${ROOT_DIR}" remote get-url "${remote_name}" >/dev/null 2>&1; then
  git -C "${ROOT_DIR}" remote remove "${remote_name}"
  log "Removed remote ${remote_name}"
else
  log "Remote ${remote_name} is already absent"
fi

mkdir -p "$(dirname "${hook_path}")"
cat >"${hook_path}" <<'EOF'
#!/usr/bin/env bash
printf 'Push disabled on this machine. Use Git bundle transfer through the main machine.\n' >&2
exit 1
EOF
chmod +x "${hook_path}"

ensure_remote_missing "${remote_name}"
log "Offline-only push lock installed at ${hook_path}"
