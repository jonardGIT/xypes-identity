#!/usr/bin/env bash

set -euo pipefail

COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${COMMON_DIR}/../.." && pwd)"
SHARED_DIR="${ROOT_DIR}/shared"
ENGINE_DIR="${ROOT_DIR}/xypes-identity-engine"
SDK_DIR="${ROOT_DIR}/xypes-identity-sdk"
ADMIN_DIR="${ROOT_DIR}/xypes-identity-admin"
ENGINE_URL="http://localhost:3000"
ADMIN_URL="http://localhost:3001"
LOCAL_ACTIVE_TENANT_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"
LOCAL_MISSING_TENANT_ID="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2"

log() {
  printf '[xypes] %s\n' "$*"
}

fail() {
  printf '[xypes] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    fail "Missing required command: ${command_name}"
  fi
}

repo_dir() {
  case "$1" in
    shared)
      printf '%s\n' "${SHARED_DIR}"
      ;;
    engine)
      printf '%s\n' "${ENGINE_DIR}"
      ;;
    sdk)
      printf '%s\n' "${SDK_DIR}"
      ;;
    admin)
      printf '%s\n' "${ADMIN_DIR}"
      ;;
    *)
      fail "Unknown repo: $1"
      ;;
  esac
}

install_repo_dependencies() {
  local repo_name="$1"
  local target_dir

  target_dir="$(repo_dir "${repo_name}")"
  log "Installing dependencies for ${repo_name}"

  if [[ -f "${target_dir}/package-lock.json" ]]; then
    (
      cd "${target_dir}"
      npm ci
    )
  else
    (
      cd "${target_dir}"
      npm install
    )
  fi
}

run_repo_script() {
  local repo_name="$1"
  local script_name="$2"
  local target_dir

  target_dir="$(repo_dir "${repo_name}")"
  log "Running ${repo_name}:${script_name}"

  (
    cd "${target_dir}"
    npm run "${script_name}"
  )
}

ensure_shared_built() {
  install_repo_dependencies shared
  run_repo_script shared build
}

ensure_sdk_built() {
  ensure_shared_built
  install_repo_dependencies sdk
  run_repo_script sdk build
}

verify_shared_repo() {
  require_command npm
  install_repo_dependencies shared
  run_repo_script shared build
  run_repo_script shared typecheck
}

verify_engine_repo() {
  require_command npm
  ensure_shared_built
  install_repo_dependencies engine
  run_repo_script engine build
  run_repo_script engine test
}

verify_sdk_repo() {
  require_command npm
  ensure_shared_built
  install_repo_dependencies sdk
  run_repo_script sdk build
  run_repo_script sdk typecheck
  run_repo_script sdk test
}

verify_admin_repo() {
  require_command npm
  ensure_sdk_built
  install_repo_dependencies admin
  run_repo_script admin build
  run_repo_script admin typecheck
  run_repo_script admin test
}

docker_compose() {
  require_command docker
  (
    cd "${ROOT_DIR}"
    docker compose "$@"
  )
}

wait_for_http() {
  local service_name="$1"
  local url="$2"
  local attempts="${3:-60}"
  local sleep_seconds="${4:-2}"
  local attempt=1

  require_command curl
  log "Waiting for ${service_name} at ${url}"

  while (( attempt <= attempts )); do
    local status_code
    status_code="$(curl -sS -o /dev/null -w '%{http_code}' "${url}" || true)"

    if [[ -n "${status_code}" && "${status_code}" != "000" ]]; then
      log "${service_name} is responding with HTTP ${status_code}"
      return 0
    fi

    sleep "${sleep_seconds}"
    attempt=$((attempt + 1))
  done

  fail "Timed out waiting for ${service_name} at ${url}"
}

mint_local_token() {
  local subject="$1"
  local email="$2"
  local token

  token="$(docker_compose --profile tools run --rm -T \
    -e TOKEN_SUBJECT="${subject}" \
    -e TOKEN_EMAIL="${email}" \
    token-mint)"
  printf '%s' "${token}" | tr -d '\r\n'
}

assert_json_post() {
  local description="$1"
  local url="$2"
  local payload="$3"
  local expected_status="$4"
  local expected_substring="${5:-}"
  local body_file
  local status_code
  local body

  require_command curl
  body_file="$(mktemp)"

  status_code="$(curl -sS -o "${body_file}" -w '%{http_code}' \
    -X POST \
    -H 'content-type: application/json' \
    --data "${payload}" \
    "${url}" || true)"
  body="$(cat "${body_file}")"
  rm -f "${body_file}"

  if [[ "${status_code}" != "${expected_status}" ]]; then
    fail "${description} expected HTTP ${expected_status}, got ${status_code}. Body: ${body}"
  fi

  if [[ -n "${expected_substring}" && "${body}" != *"${expected_substring}"* ]]; then
    fail "${description} response body did not include '${expected_substring}'. Body: ${body}"
  fi

  log "${description} passed"
}

run_resolve_session_smoke_tests() {
  local active_token
  local suspended_token

  active_token="$(mint_local_token 'local-active-member' 'active.member@example.test')"
  suspended_token="$(mint_local_token 'local-suspended-member' 'suspended.member@example.test')"

  assert_json_post \
    'resolve-session success' \
    "${ENGINE_URL}/v1/auth/resolve-session" \
    "{\"token\":\"${active_token}\",\"tenant_id\":\"${LOCAL_ACTIVE_TENANT_ID}\"}" \
    '200' \
    '"membership_status":"active"'

  assert_json_post \
    'resolve-session missing membership' \
    "${ENGINE_URL}/v1/auth/resolve-session" \
    "{\"token\":\"${active_token}\",\"tenant_id\":\"${LOCAL_MISSING_TENANT_ID}\"}" \
    '403' \
    'AUTH_TENANT_MEMBERSHIP_NOT_FOUND'

  assert_json_post \
    'resolve-session suspended membership' \
    "${ENGINE_URL}/v1/auth/resolve-session" \
    "{\"token\":\"${suspended_token}\",\"tenant_id\":\"${LOCAL_MISSING_TENANT_ID}\"}" \
    '403' \
    'AUTH_TENANT_MEMBERSHIP_SUSPENDED'
}

run_admin_smoke_test() {
  local slug
  local payload

  slug="admin-smoke-$(date +%Y%m%d%H%M%S)-${RANDOM}"
  payload="{\"tenant_id\":\"${LOCAL_ACTIVE_TENANT_ID}\",\"slug\":\"${slug}\",\"display_name\":\"Admin Smoke ${slug}\",\"actor_principal_id\":\"11111111-1111-1111-1111-111111111111\",\"actor_subject\":\"local-admin@example.test\",\"reason\":\"Local automation smoke test\"}"

  assert_json_post \
    'admin create application smoke test' \
    "${ADMIN_URL}/admin/applications" \
    "${payload}" \
    '201' \
    '"audit_event_id":"'
}

normalize_service_selection() {
  if [[ "$#" -eq 0 ]]; then
    printf 'all\n'
    return 0
  fi

  local item
  for item in "$@"; do
    IFS=',' read -r -a split_items <<< "${item}"
    local split_item
    for split_item in "${split_items[@]}"; do
      case "${split_item}" in
        all|stack|engine|admin)
          printf '%s\n' "${split_item}"
          ;;
        '')
          ;;
        *)
          fail "Unsupported service selection: ${split_item}"
          ;;
      esac
    done
  done
}