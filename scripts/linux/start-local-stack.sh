#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

print_usage() {
  cat <<'EOF'
Usage: bash scripts/linux/start-local-stack.sh [--fresh] [engine|admin|all|stack]...

Examples:
  bash scripts/linux/start-local-stack.sh --fresh all
  bash scripts/linux/start-local-stack.sh engine
  bash scripts/linux/start-local-stack.sh admin
EOF
}

fresh=false
service_args=()

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --fresh)
      fresh=true
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      service_args+=("$1")
      ;;
  esac

  shift
done

mapfile -t selected_services < <(normalize_service_selection "${service_args[@]}")

start_all=false
include_engine=false
include_admin=false

for selected in "${selected_services[@]}"; do
  case "${selected}" in
    all|stack)
      start_all=true
      include_engine=true
      include_admin=true
      ;;
    engine)
      include_engine=true
      ;;
    admin)
      include_admin=true
      ;;
  esac
done

compose_targets=()

if [[ "${start_all}" == true ]]; then
  compose_targets=(engine admin)
else
  if [[ "${include_engine}" == true ]]; then
    compose_targets+=(engine)
  fi

  if [[ "${include_admin}" == true ]]; then
    compose_targets+=(admin)
  fi
fi

if [[ "${#compose_targets[@]}" -eq 0 ]]; then
  fail 'No supported services selected.'
fi

if [[ "${fresh}" == true ]]; then
  log 'Running docker compose down -v before startup'
  docker_compose down -v
fi

log "Starting compose services: ${compose_targets[*]}"
docker_compose up --build -d "${compose_targets[@]}"

if [[ "${include_engine}" == true || "${include_admin}" == true ]]; then
  wait_for_http 'engine' "${ENGINE_URL}/"
  run_resolve_session_smoke_tests
fi

if [[ "${include_admin}" == true ]]; then
  wait_for_http 'admin' "${ADMIN_URL}/"
  run_admin_smoke_test
fi

log 'Local stack startup and smoke tests completed successfully'