#!/usr/bin/env bash
# =============================================================================
# Continuous Learning - Session Evaluator
# =============================================================================
# Evaluates an AI agent session at the end to extract reusable patterns
# and save them as learned skills.
#
# Usage:
#   bash evaluate-session.sh [--session-file <path>] [--config <path>] [--dry-run]
#
# Options:
#   --session-file <path>  Path to the session transcript (default: stdin)
#   --config <path>        Path to config.json (default: ../config.json)
#   --dry-run              Print what would be extracted without saving
#   --help                 Show this help message
#
# Exit codes:
#   0 - Success (or nothing to extract)
#   1 - Error
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_CONFIG="${SCRIPT_DIR}/../config.json"
DEFAULT_LEARNED_PATH="${HOME}/.cline/skills/learned"

SESSION_FILE=""
CONFIG_FILE="${DEFAULT_CONFIG}"
DRY_RUN=false

# --- Parse arguments ---------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --session-file)
      SESSION_FILE="$2"
      shift 2
      ;;
    --config)
      CONFIG_FILE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      grep '^#' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Use --help for usage." >&2
      exit 1
      ;;
  esac
done

# --- Load configuration ------------------------------------------------------
if [[ -f "${CONFIG_FILE}" ]]; then
  MIN_SESSION_LENGTH=$(python3 -c "import json; print(json.load(open('${CONFIG_FILE}'))['min_session_length'])" 2>/dev/null || echo "10")
  LEARNED_PATH=$(python3 -c "import json; print(json.load(open('${CONFIG_FILE}'))['learned_skills_path'])" 2>/dev/null || echo "${DEFAULT_LEARNED_PATH}")
  AUTO_APPROVE=$(python3 -c "import json; print(json.load(open('${CONFIG_FILE}'))['auto_approve'])" 2>/dev/null || echo "false")
else
  MIN_SESSION_LENGTH=10
  LEARNED_PATH="${DEFAULT_LEARNED_PATH}"
  AUTO_APPROVE=false
fi

# Expand ~ in learned path
LEARNED_PATH="${LEARNED_PATH/#\~/${HOME}}"

# --- Read session transcript -------------------------------------------------
if [[ -n "${SESSION_FILE}" ]]; then
  if [[ ! -f "${SESSION_FILE}" ]]; then
    echo "ERROR: Session file not found: ${SESSION_FILE}" >&2
    exit 1
  fi
  SESSION_CONTENT=$(cat "${SESSION_FILE}")
else
  SESSION_CONTENT=$(cat)
fi

# --- Count messages (approximate: count user/assistant turns) ----------------
MESSAGE_COUNT=$(echo "${SESSION_CONTENT}" | grep -cE '^(user|assistant|human|ai):' || true)

if [[ "${MESSAGE_COUNT}" -lt "${MIN_SESSION_LENGTH}" ]]; then
  echo "INFO: Session too short (${MESSAGE_COUNT} messages < ${MIN_SESSION_LENGTH}). Skipping pattern extraction."
  exit 0
fi

echo "INFO: Evaluating session with ${MESSAGE_COUNT} messages..."

# --- Detect patterns ---------------------------------------------------------
# Look for common pattern indicators in the session
PATTERNS_FOUND=()

# Error resolution patterns
if echo "${SESSION_CONTENT}" | grep -qiE '(error|exception|failed|bug|issue).*(fixed|resolved|solved|workaround)'; then
  PATTERNS_FOUND+=("error_resolution")
fi

# User corrections
if echo "${SESSION_CONTENT}" | grep -qiE '(no, |not that|that.s wrong|you should|instead of|actually)'; then
  PATTERNS_FOUND+=("user_corrections")
fi

# Workarounds
if echo "${SESSION_CONTENT}" | grep -qiE '(workaround|hack|trick|quirk|limitation|bypass)'; then
  PATTERNS_FOUND+=("workarounds")
fi

# Debugging techniques
if echo "${SESSION_CONTENT}" | grep -qiE '(debug|trace|log|breakpoint|reproduce|bisect)'; then
  PATTERNS_FOUND+=("debugging_techniques")
fi

# Project-specific
if echo "${SESSION_CONTENT}" | grep -qiE '(project|repository|codebase|convention|standard|architecture)'; then
  PATTERNS_FOUND+=("project_specific")
fi

if [[ ${#PATTERNS_FOUND[@]} -eq 0 ]]; then
  echo "INFO: No extractable patterns detected in session."
  exit 0
fi

echo "INFO: Detected patterns: ${PATTERNS_FOUND[*]}"

# --- Extract and save skills -------------------------------------------------
mkdir -p "${LEARNED_PATH}"

for pattern in "${PATTERNS_FOUND[@]}"; do
  SKILL_NAME="learned-${pattern}"
  SKILL_DIR="${LEARNED_PATH}/${SKILL_NAME}"
  SKILL_FILE="${SKILL_DIR}/SKILL.md"

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "DRY-RUN: Would create ${SKILL_FILE}"
    continue
  fi

  if [[ "${AUTO_APPROVE}" != "true" ]]; then
    read -p "Save learned skill '${SKILL_NAME}'? [y/N] " -r response
    if [[ ! "${response}" =~ ^[Yy]$ ]]; then
      echo "SKIP: ${SKILL_NAME}"
      continue
    fi
  fi

  mkdir -p "${SKILL_DIR}"

  cat > "${SKILL_FILE}" <<EOF
---
name: ${SKILL_NAME}
description: Learned pattern for ${pattern} extracted from a previous session.
---

# ${SKILL_NAME}

## Pattern Type

${pattern}

## Source

- Extracted: $(date -Iseconds)
- Session: ${SESSION_FILE:-stdin}

## Notes

This skill was automatically extracted by the continuous-learning skill.
Review and refine the content based on the specific pattern discovered.
EOF

  echo "SAVED: ${SKILL_FILE}"
done

echo "DONE: Continuous learning evaluation complete."
exit 0