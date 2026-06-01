#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

print_usage() {
  cat <<'EOF'
Usage: bash scripts/linux/render-platform-parallel-prompt.sh [--root <platform-root>] [--sessions <count>] [--goal <text>] [--no-auto] [--bundle-dir <dir>] [--execute]

Examples:
  bash scripts/linux/render-platform-parallel-prompt.sh
  bash scripts/linux/render-platform-parallel-prompt.sh --root /home/nhad/saas/xypes-identity
  bash scripts/linux/render-platform-parallel-prompt.sh --sessions 3
  bash scripts/linux/render-platform-parallel-prompt.sh --no-auto
  bash scripts/linux/render-platform-parallel-prompt.sh --bundle-dir /tmp/xypes-identity-prompts
  bash scripts/linux/render-platform-parallel-prompt.sh --execute --goal 'Analyze each owned repo and report one bounded next-step slice without editing files.'
EOF
}

fail() {
  printf '[platform-prompt] ERROR: %s\n' "$*" >&2
  exit 1
}

relative_to_root() {
  local root="$1"
  local target="$2"

  if [[ "$target" == "$root" ]]; then
    printf '.\n'
  elif [[ "$target" == "$root"/* ]]; then
    printf './%s\n' "${target#"$root"/}"
  else
    printf '%s\n' "$target"
  fi
}

relative_to_base() {
  local base="$1"
  local target="$2"

  if [[ "$target" == "$base" ]]; then
    printf '.\n'
  elif [[ "$target" == "$base"/* ]]; then
    printf './%s\n' "${target#"$base"/}"
  else
    printf '%s\n' "$target"
  fi
}

sanitize_name() {
  local value="$1"

  value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
  value="$(printf '%s' "$value" | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+//; s/-+$//; s/-+/-/g')"

  if [[ -z "$value" ]]; then
    value="platform"
  fi

  printf '%s\n' "$value"
}

resolve_copilot_cli() {
  if command -v copilot >/dev/null 2>&1; then
    command -v copilot
    return 0
  fi

  if [[ -x "$HOME/.config/Code/User/globalStorage/github.copilot-chat/copilotCli/copilot" ]]; then
    printf '%s\n' "$HOME/.config/Code/User/globalStorage/github.copilot-chat/copilotCli/copilot"
    return 0
  fi

  fail "GitHub Copilot CLI is required for --execute. Install it first or run without --execute."
}

detect_owned_roots() {
  local root="$1"

  find "$root" -mindepth 1 -maxdepth 1 -type d \
    ! -name '.git' \
    ! -name '.github' \
    ! -name 'docs' \
    ! -name 'shared' \
    ! -name 'scripts' \
    ! -name 'docker' \
    ! -name 'node_modules' \
    ! -name 'dist' \
    | sort
}

contains_boundary() {
  local needle="$1"
  local existing

  for existing in "${BOUNDARY_PATHS[@]}"; do
    if [[ "$existing" == "$needle" ]]; then
      return 0
    fi
  done

  return 1
}

detect_verify_script() {
  local platform_root="$1"
  local boundary_path="$2"
  local platform_base
  local repo_base
  local suffix
  local verify_path

  platform_base="$(basename "$platform_root")"
  repo_base="$(basename "$boundary_path")"
  suffix="$repo_base"

  if [[ "$suffix" == "$platform_base"* ]]; then
    suffix="${suffix#"$platform_base"}"
  fi

  while [[ "$suffix" == -* ]]; do
    suffix="${suffix#-}"
  done

  if [[ -z "$suffix" ]]; then
    suffix="$repo_base"
  fi

  verify_path="$platform_root/scripts/linux/verify-$suffix.sh"
  if [[ -f "$verify_path" ]]; then
    printf '%s\n' "$verify_path"
  fi
}

detect_agent_id() {
  printf '\n'
}

collect_boundaries() {
  local orchestrator
  local repo_root
  local repo_context
  local verify_script
  local owned_root

  mapfile -t REPO_ORCHESTRATORS < <(
    find "$ROOT" -mindepth 3 -maxdepth 4 -type f -path '*/.github/agents/*-orchestrator.agent.md' ! -name '*platform-orchestrator.agent.md' | sort
  )

  for orchestrator in "${REPO_ORCHESTRATORS[@]}"; do
    repo_root="$(dirname "$(dirname "$(dirname "$orchestrator")")")"
    if contains_boundary "$repo_root"; then
      continue
    fi

    repo_context=""
    if [[ -f "$repo_root/.github/agent-context.json" ]]; then
      repo_context="$repo_root/.github/agent-context.json"
    fi
    verify_script="$(detect_verify_script "$ROOT" "$repo_root" || true)"

    BOUNDARY_PATHS+=("$repo_root")
    BOUNDARY_OWNER_KINDS+=("repo-local orchestrator")
    BOUNDARY_OWNER_REFS+=("$orchestrator")
    BOUNDARY_CONTEXT_REFS+=("$repo_context")
    BOUNDARY_VERIFY_SCRIPTS+=("$verify_script")
  done

  mapfile -t OWNED_ROOTS < <(detect_owned_roots "$ROOT")

  for owned_root in "${OWNED_ROOTS[@]}"; do
    if contains_boundary "$owned_root"; then
      continue
    fi

    repo_context=""
    if [[ -f "$owned_root/.github/agent-context.json" ]]; then
      repo_context="$owned_root/.github/agent-context.json"
    fi
    verify_script="$(detect_verify_script "$ROOT" "$owned_root" || true)"

    BOUNDARY_PATHS+=("$owned_root")
    BOUNDARY_OWNER_KINDS+=("owned root fallback")
    BOUNDARY_OWNER_REFS+=("$owned_root")
    BOUNDARY_CONTEXT_REFS+=("$repo_context")
    BOUNDARY_VERIFY_SCRIPTS+=("$verify_script")
  done
}

render_detected_assets() {
  local orchestrator
  local repo_root
  local repo_context
  local owned_root

  printf 'Detected platform assets:\n'
  if [[ -n "$PLATFORM_ORCHESTRATOR" ]]; then
    printf -- '- Platform orchestrator: %s\n' "$(relative_to_root "$ROOT" "$PLATFORM_ORCHESTRATOR")"
  else
    printf -- '- Platform orchestrator: none detected; operate in fallback planning mode\n'
  fi

  if [[ -n "$PLATFORM_CONTEXT" ]]; then
    printf -- '- Platform context: %s\n' "$(relative_to_root "$ROOT" "$PLATFORM_CONTEXT")"
  else
    printf -- '- Platform context: none detected\n'
  fi

  if [[ "${#REPO_ORCHESTRATORS[@]}" -gt 0 ]]; then
    printf -- '- Repo-local orchestrators:\n'
    for orchestrator in "${REPO_ORCHESTRATORS[@]}"; do
      repo_root="$(dirname "$(dirname "$(dirname "$orchestrator")")")"
      repo_context="${repo_root}/.github/agent-context.json"
      printf '  - repo: %s\n' "$(relative_to_root "$ROOT" "$repo_root")"
      printf '    orchestrator: %s\n' "$(relative_to_root "$ROOT" "$orchestrator")"
      if [[ -f "$repo_context" ]]; then
        printf '    agent context: %s\n' "$(relative_to_root "$ROOT" "$repo_context")"
      else
        printf '    agent context: none\n'
      fi
    done
  else
    printf -- '- Repo-local orchestrators: none detected\n'
  fi

  if [[ "${#OWNED_ROOTS[@]}" -gt 0 ]]; then
    printf -- '- Candidate owned roots when falling back:\n'
    for owned_root in "${OWNED_ROOTS[@]}"; do
      printf '  - %s\n' "$(relative_to_root "$ROOT" "$owned_root")"
    done
  fi
}

render_auto_packet_summary() {
  local index
  local packet_id
  local boundary_rel
  local owner_rel
  local verify_rel

  printf '\nAuto-derived worker packets:\n'
  printf -- '- Requested packet count: %s\n' "$SESSIONS"
  printf -- '- Available boundaries: %s\n' "$AVAILABLE_BOUNDARIES"
  printf -- '- Effective packet count: %s\n' "$EFFECTIVE_PACKETS"

  if [[ -n "$CAPPED_NOTE" ]]; then
    printf -- '- Note: %s\n' "$CAPPED_NOTE"
  fi

  if [[ -n "$UNUSED_NOTE" ]]; then
    printf -- '- Remaining available boundaries not packetized in this auto pass: %s\n' "$UNUSED_NOTE"
  fi

  for ((index = 0; index < EFFECTIVE_PACKETS; index++)); do
    printf -v packet_id '%02d' $((index + 1))
    boundary_rel="$(relative_to_root "$ROOT" "${BOUNDARY_PATHS[$index]}")"
    owner_rel="$(relative_to_root "$ROOT" "${BOUNDARY_OWNER_REFS[$index]}")"

    if [[ -n "${BOUNDARY_VERIFY_SCRIPTS[$index]}" ]]; then
      verify_rel="bash $(relative_to_root "$ROOT" "${BOUNDARY_VERIFY_SCRIPTS[$index]}")"
    else
      verify_rel='no repo-specific verify script detected'
    fi

    printf '  - Packet %s\n' "$packet_id"
    printf '    root: %s\n' "$boundary_rel"
    printf '    owner: %s: %s\n' "${BOUNDARY_OWNER_KINDS[$index]}" "$owner_rel"
    printf '    validation: %s\n' "$verify_rel"
  done
}

render_manager_prompt() {
  printf 'Use the platform orchestration prompt below for the platform rooted at "%s".\n\n' "$ROOT"
  printf 'Platform label: %s\n' "$PLATFORM_NAME"

  if [[ -n "$PLATFORM_ORCHESTRATOR" ]]; then
    printf 'Detected platform orchestrator: %s\n' "$(relative_to_root "$ROOT" "$PLATFORM_ORCHESTRATOR")"
  else
    printf 'Detected platform orchestrator: none\n'
  fi

  if [[ -n "$PLATFORM_CONTEXT" ]]; then
    printf 'Detected platform context: %s\n' "$(relative_to_root "$ROOT" "$PLATFORM_CONTEXT")"
  else
    printf 'Detected platform context: none\n'
  fi

  printf '\nPrompt:\n\n'
  printf 'Use the platform orchestrator or fallback planning mode for the platform rooted at: %s\n' "$ROOT"
  printf 'Goal: %s\n\n' "$GOAL"

  render_detected_assets

  if [[ "$AUTO_MODE" == "1" ]]; then
    render_auto_packet_summary
  fi

  printf '\nInstructions:\n'
  if [[ "$AUTO_MODE" == "1" ]]; then
    printf '1. Produce %s parallel work packets only when their allowed files do not overlap.\n' "$EFFECTIVE_PACKETS"
    printf '2. Prefer one owned boundary per packet.\n'
    printf '3. Start from the auto-derived packet boundaries above. Do not invent extra packets unless you explicitly merge, drop, or resequence a boundary and explain why.\n'
    printf '4. If shared contracts, platform context, roadmap, or architecture files must change, mark that packet as the sequential lead and make dependent packets wait for it.\n'
    printf '5. If a repo-local orchestrator exists for a packet, use it as the planning source for that boundary. If not, fall back to the owned root.\n'
    printf '6. Do not assign the same file or folder to more than one packet.\n'
    printf '7. Require every worker session to report back with exact changed files, validation run, blockers, and merge risk.\n'
  else
    printf '1. Produce %s parallel work packets only when their allowed files do not overlap.\n' "$SESSIONS"
    printf '2. Prefer one owned boundary per packet.\n'
    printf '3. If shared contracts, platform context, roadmap, or architecture files must change, mark that packet as the sequential lead and make dependent packets wait for it.\n'
    printf '4. If a platform or repo-local orchestrator exists, use it as the planning source for that boundary. If not, fall back to the nearest owned root.\n'
    printf '5. Do not assign the same file or folder to more than one packet.\n'
    printf '6. Require every worker session to report back with exact changed files, validation run, blockers, and merge risk.\n'
  fi

  printf '\nFor each packet, return:\n'
  printf -- '- Packet id\n'
  printf -- '- Repo or root path\n'
  printf -- '- Owning orchestrator or fallback owner\n'
  printf -- '- Allowed files or folders\n'
  printf -- '- Explicit out-of-scope files or folders\n'
  printf -- '- Acceptance target\n'
  printf -- '- Validation commands\n'
  printf -- '- Dependency order or wait conditions\n'
  printf -- '- Report-back template:\n'
  printf '  - Scope\n'
  printf '  - Files changed\n'
  printf '  - Summary\n'
  printf '  - Validation run\n'
  printf '  - Blockers for other packets\n'
  printf '  - Merge risk\n'

  printf '\nFinish with:\n'
  printf -- '- Execution order constraints\n'
  printf -- '- Cross-packet conflict risks\n'
  if [[ -n "$VERIFY_ALL_LINUX" || -n "$VERIFY_ALL_WINDOWS" ]]; then
    printf -- '- Final integration validation suggestion:\n'
    if [[ -n "$VERIFY_ALL_LINUX" ]]; then
      printf '  - Linux: bash %s\n' "$(relative_to_root "$ROOT" "$VERIFY_ALL_LINUX")"
    fi
    if [[ -n "$VERIFY_ALL_WINDOWS" ]]; then
      printf '  - Windows: pwsh -File %s\n' "$(relative_to_root "$ROOT" "$VERIFY_ALL_WINDOWS")"
    fi
  else
    printf -- '- Final integration validation command or checklist\n'
  fi
}

render_worker_prompt() {
  local index="$1"
  local packet_id
  local boundary_path
  local boundary_rel
  local owner_kind
  local owner_ref
  local owner_rel
  local verify_script
  local verify_rel
  local out_of_scope=()
  local peer_index
  local common_root
  local owner_display

  printf -v packet_id '%02d' $((index + 1))
  boundary_path="${BOUNDARY_PATHS[$index]}"
  boundary_rel="$boundary_path"
  owner_kind="${BOUNDARY_OWNER_KINDS[$index]}"
  owner_ref="${BOUNDARY_OWNER_REFS[$index]}"
  verify_script="${BOUNDARY_VERIFY_SCRIPTS[$index]}"

  owner_display="$owner_ref"
  if [[ "$owner_ref" == "$boundary_path" || "$owner_ref" == "$boundary_path"/* ]]; then
    owner_display="$(relative_to_base "$boundary_path" "$owner_ref")"
  fi

  if [[ -n "$verify_script" ]]; then
    verify_rel="bash $verify_script"
  else
    verify_rel='No repo-specific verify script detected under ./scripts/linux. Run the narrowest build, test, and typecheck commands inside the allowed root and report the exact commands you used.'
  fi

  for ((peer_index = 0; peer_index < AVAILABLE_BOUNDARIES; peer_index++)); do
    if [[ "$peer_index" -eq "$index" ]]; then
      continue
    fi
    out_of_scope+=("$(relative_to_root "$ROOT" "${BOUNDARY_PATHS[$peer_index]}")")
  done

  for common_root in shared docs scripts docker .github; do
    if [[ -d "$ROOT/$common_root" ]]; then
      out_of_scope+=("./$common_root")
    fi
  done

  printf 'Worker prompt for packet %s\n\n' "$packet_id"
  printf 'Packet id: %s\n' "$packet_id"
  printf 'Goal: %s\n' "$GOAL"
  printf 'Platform root: %s\n' "$ROOT"
  printf 'Repo/root path: %s\n' "$boundary_rel"
  printf 'Owner: %s: %s\n' "$owner_kind" "$owner_display"
  printf 'Allowed path: .\n'
  printf 'Out-of-scope roots:\n'
  if [[ "${#out_of_scope[@]}" -gt 0 ]]; then
    for common_root in "${out_of_scope[@]}"; do
      printf -- '- %s\n' "$common_root"
    done
  else
    printf -- '- none\n'
  fi

  printf 'Bounded acceptance target:\n'
  printf -- '- Work toward this platform goal: %s\n' "$GOAL"
  printf -- '- Complete one bounded, reviewable change slice fully inside %s.\n' "$boundary_rel"
  printf -- '- Do not edit files outside %s.\n' "$boundary_rel"
  printf -- '- If the task requires shared contracts, platform context, or root-level workflow files, stop and report that dependency back to the manager instead of widening scope.\n'

  printf 'Validation commands:\n'
  printf -- '- %s\n' "$verify_rel"

  printf 'Report-back template:\n'
  printf 'Scope:\n'
  printf 'Files changed:\n'
  printf 'Summary:\n'
  printf 'Validation run:\n'
  printf 'Blockers for other packets:\n'
  printf 'Merge risk:\n'
}

render_manifest() {
  local index
  local packet_id

  printf 'Platform root: %s\n' "$ROOT"
  printf 'Goal: %s\n' "$GOAL"
  printf 'Requested packet count: %s\n' "$SESSIONS"
  printf 'Available boundaries: %s\n' "$AVAILABLE_BOUNDARIES"
  printf 'Effective packet count: %s\n' "$EFFECTIVE_PACKETS"

  if [[ -n "$CAPPED_NOTE" ]]; then
    printf 'Note: %s\n' "$CAPPED_NOTE"
  fi

  if [[ -n "$UNUSED_NOTE" ]]; then
    printf 'Remaining available boundaries not packetized in this auto pass: %s\n' "$UNUSED_NOTE"
  fi

  printf '\nGenerated files:\n'
  printf -- '- manager-prompt.txt\n'
  printf -- '- manifest.txt\n'
  if [[ "$EXECUTE_MODE" == "1" ]]; then
    printf -- '- manager-response.txt\n'
    printf -- '- manager-session.md\n'
  fi
  for ((index = 0; index < EFFECTIVE_PACKETS; index++)); do
    printf -v packet_id '%02d' $((index + 1))
    printf -- '- worker-prompt-%s.txt\n' "$packet_id"
    if [[ "$EXECUTE_MODE" == "1" ]]; then
      printf -- '- worker-report-%s.txt\n' "$packet_id"
      printf -- '- worker-session-%s.md\n' "$packet_id"
    fi
  done

  if [[ "$EFFECTIVE_PACKETS" -gt 0 ]]; then
    printf '\nPacket mapping:\n'
    for ((index = 0; index < EFFECTIVE_PACKETS; index++)); do
      printf -v packet_id '%02d' $((index + 1))
      printf -- '- Packet %s -> %s (%s)\n' \
        "$packet_id" \
        "$(relative_to_root "$ROOT" "${BOUNDARY_PATHS[$index]}")" \
        "${BOUNDARY_OWNER_KINDS[$index]}"
    done
  fi
}

write_bundle() {
  local packet_id
  local index
  local worker_file

  mkdir -p "$BUNDLE_DIR"
  BUNDLE_DIR="$(cd "$BUNDLE_DIR" && pwd)"

  render_manager_prompt >"$BUNDLE_DIR/manager-prompt.txt"
  render_manifest >"$BUNDLE_DIR/manifest.txt"

  for ((index = 0; index < EFFECTIVE_PACKETS; index++)); do
    printf -v packet_id '%02d' $((index + 1))
    worker_file="$BUNDLE_DIR/worker-prompt-${packet_id}.txt"
    render_worker_prompt "$index" >"$worker_file"
  done

  printf '%s\n' "$BUNDLE_DIR"
}

run_copilot_prompt() {
  local cwd="$1"
  local agent_id="$2"
  local prompt_file="$3"
  local response_file="$4"
  local share_file="$5"
  shift 5
  local attachment
  local -a attachments=("$@")
  local -a cmd

  cmd=(
    "$COPILOT_BIN"
    -C "$cwd"
    --autopilot
    --yolo
    --no-ask-user
    --stream off
    --silent
    --output-format text
    --prompt "$(cat "$prompt_file")"
    --share "$share_file"
  )

  if [[ -n "$agent_id" ]]; then
    cmd=("$COPILOT_BIN" -C "$cwd" --agent "$agent_id" "${cmd[@]:3}")
  fi

  for attachment in "${attachments[@]}"; do
    if [[ -n "$attachment" ]]; then
      cmd+=(--attachment "$attachment")
    fi
  done

  "${cmd[@]}" >"$response_file"
}

append_file_section() {
  local output_file="$1"
  local title="$2"
  local input_file="$3"

  if [[ -f "$input_file" ]]; then
    {
      printf '\n%s\n\n' "$title"
      cat "$input_file"
      printf '\n'
    } >>"$output_file"
  fi
}

execute_bundle() {
  local manager_agent_id
  local manager_response_file
  local manager_session_file
  local index
  local packet_id
  local worker_prompt_file
  local worker_execution_prompt_file
  local worker_response_file
  local worker_session_file
  local worker_agent_id
  local worker_root
  local worker_owner_ref
  local worker_repo_instructions
  local worker_repo_context

  (( EFFECTIVE_PACKETS > 0 )) || fail "--execute requires at least one detected packet boundary."

  COPILOT_BIN="$(resolve_copilot_cli)"
  manager_agent_id="general-purpose"
  if [[ -n "$PLATFORM_ORCHESTRATOR" ]]; then
    manager_agent_id="$(basename "$PLATFORM_ORCHESTRATOR")"
    manager_agent_id="${manager_agent_id%.agent.md}"
  fi

  manager_response_file="$BUNDLE_DIR/manager-response.txt"
  manager_session_file="$BUNDLE_DIR/manager-session.md"
  run_copilot_prompt "$ROOT" "$manager_agent_id" "$BUNDLE_DIR/manager-prompt.txt" "$manager_response_file" "$manager_session_file"

  for ((index = 0; index < EFFECTIVE_PACKETS; index++)); do
    printf -v packet_id '%02d' $((index + 1))
    worker_prompt_file="$BUNDLE_DIR/worker-prompt-${packet_id}.txt"
    worker_execution_prompt_file="$BUNDLE_DIR/worker-execution-${packet_id}.txt"
    worker_response_file="$BUNDLE_DIR/worker-report-${packet_id}.txt"
    worker_session_file="$BUNDLE_DIR/worker-session-${packet_id}.md"
    worker_agent_id="$(detect_agent_id "${BOUNDARY_OWNER_KINDS[$index]}" "${BOUNDARY_OWNER_REFS[$index]}")"
    worker_root="${BOUNDARY_PATHS[$index]}"
    worker_owner_ref="${BOUNDARY_OWNER_REFS[$index]}"
    worker_repo_instructions="$worker_root/.github/copilot-instructions.md"
    worker_repo_context="$worker_root/.github/agent-context.json"

    {
      cat "$worker_prompt_file"
    } >"$worker_execution_prompt_file"

    {
      printf '\nExecution requirements for this worker session:\n\n'
      printf -- '- Current working directory during execution: %s\n' "$worker_root"
      printf -- '- Treat the repo-local instruction, context, and orchestrator sections below as controlling guidance for this packet.\n'
      printf -- '- Stay inside the current working directory unless you must report a dependency back to the manager.\n'
      printf -- '- Use repo-root-relative paths such as ./.github/copilot-instructions.md and ./src/... in your reasoning and validation.\n'
    } >>"$worker_execution_prompt_file"

    append_file_section "$worker_execution_prompt_file" "Repo-local copilot instructions:" "$worker_repo_instructions"
    append_file_section "$worker_execution_prompt_file" "Repo-local agent context:" "$worker_repo_context"
    append_file_section "$worker_execution_prompt_file" "Owning orchestrator instructions:" "$worker_owner_ref"

    {
      printf '\nManager output to honor while executing this packet:\n\n'
      cat "$manager_response_file"
    } >>"$worker_execution_prompt_file"

    run_copilot_prompt "$worker_root" "$worker_agent_id" "$worker_execution_prompt_file" "$worker_response_file" "$worker_session_file"
  done
}

ROOT=""
SESSIONS="3"
GOAL=""
AUTO_MODE="1"
BUNDLE_DIR=""
EXECUTE_MODE="0"
COPILOT_BIN=""

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --root)
      [[ "$#" -ge 2 ]] || fail "Missing value for --root."
      ROOT="$2"
      shift 2
      ;;
    --sessions)
      [[ "$#" -ge 2 ]] || fail "Missing value for --sessions."
      SESSIONS="$2"
      shift 2
      ;;
    --goal)
      [[ "$#" -ge 2 ]] || fail "Missing value for --goal."
      GOAL="$2"
      shift 2
      ;;
    --auto)
      AUTO_MODE="1"
      shift
      ;;
    --no-auto)
      AUTO_MODE="0"
      shift
      ;;
    --execute)
      EXECUTE_MODE="1"
      AUTO_MODE="1"
      shift
      ;;
    --bundle-dir)
      [[ "$#" -ge 2 ]] || fail "Missing value for --bundle-dir."
      BUNDLE_DIR="$2"
      AUTO_MODE="1"
      shift 2
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

if [[ -z "$ROOT" ]]; then
  ROOT="$DEFAULT_ROOT"
fi

if [[ ! -d "$ROOT" ]]; then
  fail "Platform root does not exist: $ROOT"
fi

if ! [[ "$SESSIONS" =~ ^[1-9][0-9]*$ ]]; then
  fail "--sessions must be a positive integer."
fi

ROOT="$(cd "$ROOT" && pwd)"
PLATFORM_NAME="$(basename "$ROOT")"

PLATFORM_ORCHESTRATOR="$(find "$ROOT" -maxdepth 3 -type f -name '*platform-orchestrator.agent.md' | sort | head -n 1 || true)"
PLATFORM_CONTEXT="$(find "$ROOT" -maxdepth 1 -type f -name '*platform-context.json' | sort | head -n 1 || true)"

VERIFY_ALL_LINUX=""
if [[ -f "$ROOT/scripts/linux/verify-all.sh" ]]; then
  VERIFY_ALL_LINUX="$ROOT/scripts/linux/verify-all.sh"
fi

VERIFY_ALL_WINDOWS=""
if [[ -f "$ROOT/scripts/windows/verify-all.ps1" ]]; then
  VERIFY_ALL_WINDOWS="$ROOT/scripts/windows/verify-all.ps1"
fi

if [[ -z "$GOAL" ]]; then
  GOAL="Split the next roadmap work into ${SESSIONS} parallel, non-overlapping packets."
fi

BOUNDARY_PATHS=()
BOUNDARY_OWNER_KINDS=()
BOUNDARY_OWNER_REFS=()
BOUNDARY_CONTEXT_REFS=()
BOUNDARY_VERIFY_SCRIPTS=()
REPO_ORCHESTRATORS=()
OWNED_ROOTS=()

collect_boundaries

AVAILABLE_BOUNDARIES="${#BOUNDARY_PATHS[@]}"
REQUESTED_PACKETS="$SESSIONS"
EFFECTIVE_PACKETS="$REQUESTED_PACKETS"
CAPPED_NOTE=""
UNUSED_NOTE=""

if (( EFFECTIVE_PACKETS > AVAILABLE_BOUNDARIES )); then
  EFFECTIVE_PACKETS="$AVAILABLE_BOUNDARIES"
  if (( AVAILABLE_BOUNDARIES > 0 )); then
    CAPPED_NOTE="requested ${REQUESTED_PACKETS} packets but only ${AVAILABLE_BOUNDARIES} boundaries are available, so the effective packet count was capped to ${EFFECTIVE_PACKETS}"
  else
    CAPPED_NOTE="requested ${REQUESTED_PACKETS} packets but no packet boundaries were detected"
  fi
fi

if (( REQUESTED_PACKETS < AVAILABLE_BOUNDARIES )); then
  for ((i = REQUESTED_PACKETS; i < AVAILABLE_BOUNDARIES; i++)); do
    if [[ -n "$UNUSED_NOTE" ]]; then
      UNUSED_NOTE="${UNUSED_NOTE}, "
    fi
    UNUSED_NOTE="${UNUSED_NOTE}$(relative_to_root "$ROOT" "${BOUNDARY_PATHS[$i]}")"
  done
fi

if [[ "$AUTO_MODE" == "1" && -z "$BUNDLE_DIR" ]]; then
  BUNDLE_DIR="$(mktemp -d "/tmp/$(sanitize_name "$PLATFORM_NAME")-parallel-prompts-XXXXXX")"
fi

if [[ -n "$BUNDLE_DIR" ]]; then
  write_bundle
  if [[ "$EXECUTE_MODE" == "1" ]]; then
    execute_bundle
  fi
else
  render_manager_prompt
fi
