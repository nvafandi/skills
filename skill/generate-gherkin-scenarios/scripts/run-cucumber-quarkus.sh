#!/bin/bash
# Script: run-cucumber-quarkus.sh
# Description: Master orchestrator for the Gherkin + Quarkus Cucumber workflow.
#
# Modes:
#   1. generate   - Generate .feature file(s) only
#   2. setup      - Setup Quarkus Cucumber only (auto-detect existing features)
#   3. run        - Run tests and generate reports only
#   4. full       - Generate + Setup + Run + Split reports (HTML + optional PDF)
#
# Usage:
#   bash scripts/run-cucumber-quarkus.sh --mode generate --feature "Payment Processing" --method POST --endpoint /api/v1/payments
#   bash scripts/run-cucumber-quarkus.sh --mode setup --project-dir . --package com.example
#   bash scripts/run-cucumber-quarkus.sh --mode run --project-dir .
#   bash scripts/run-cucumber-quarkus.sh --mode full --feature "Payment Processing" --method POST --endpoint /api/v1/payments --project-dir . --package com.example --pdf
#
# All scripts are non-interactive, return meaningful exit codes, and write outputs to standard locations.

set -euo pipefail

show_help() {
  cat << 'EOF'
Usage: bash scripts/run-cucumber-quarkus.sh [OPTIONS]

Master orchestrator for Gherkin + Quarkus Cucumber workflow.

Modes:
  generate            Generate .feature file(s) only
  setup               Setup Quarkus Cucumber only (auto-detect existing features)
  run                 Run tests and generate reports only
  full                Generate + Setup + Run + Split reports (HTML + optional PDF)

Options:
  --mode MODE         Required: generate | setup | run | full
  --feature NAME      Feature name for generation
  --method METHOD     HTTP method: GET, POST, PUT, PATCH, DELETE
  --endpoint PATH     API endpoint, e.g. /api/v1/payments
  --output FILE       Output .feature path (optional; defaults to src/test/resources/features/<kebab>.feature)
  --project-dir DIR   Quarkus project root (default: current directory)
  --package PKG       Java package for generated test classes (required for setup/full)
  --pdf               Generate PDF reports from HTML (requires Edge/Chrome)
  --pdf-only          Generate PDF reports only (skip HTML split)
  --help              Show this help message

Examples:
  bash scripts/run-cucumber-quarkus.sh --mode generate --feature "Payment Processing" --method POST --endpoint /api/v1/payments
  bash scripts/run-cucumber-quarkus.sh --mode setup --project-dir . --package com.example
  bash scripts/run-cucumber-quarkus.sh --mode run --project-dir .
  bash scripts/run-cucumber-quarkus.sh --mode full --feature "Payment Processing" --method POST --endpoint /api/v1/payments --project-dir . --package com.example --pdf

Exit codes:
  0 - Success
  1 - Invalid arguments or command failed
EOF
  exit 0
}

MODE=""
FEATURE_NAME=""
HTTP_METHOD=""
ENDPOINT=""
OUTPUT_FILE=""
PROJECT_DIR=""
PACKAGE=""
PDF_FLAG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) show_help ;;
    --mode)
      if [[ -z "$2" ]]; then echo "Error: --mode requires a value." >&2; exit 1; fi
      MODE="$2"; shift 2 ;;
    --feature)
      if [[ -z "$2" ]]; then echo "Error: --feature requires a name." >&2; exit 1; fi
      FEATURE_NAME="$2"; shift 2 ;;
    --method)
      if [[ -z "$2" ]]; then echo "Error: --method requires an HTTP method." >&2; exit 1; fi
      HTTP_METHOD=$(echo "$2" | tr '[:lower:]' '[:upper:]'); shift 2 ;;
    --endpoint)
      if [[ -z "$2" ]]; then echo "Error: --endpoint requires a path." >&2; exit 1; fi
      ENDPOINT="$2"; shift 2 ;;
    --output)
      if [[ -z "$2" ]]; then echo "Error: --output requires a file path." >&2; exit 1; fi
      OUTPUT_FILE="$2"; shift 2 ;;
    --project-dir)
      if [[ -z "$2" ]]; then echo "Error: --project-dir requires a path." >&2; exit 1; fi
      PROJECT_DIR="$2"; shift 2 ;;
    --package)
      if [[ -z "$2" ]]; then echo "Error: --package requires a Java package." >&2; exit 1; fi
      PACKAGE="$2"; shift 2 ;;
    --pdf|--pdf-only)
      PDF_FLAG="$1"; shift ;;
    *)
      echo "Error: Unknown option: $1" >&2; exit 1 ;;
  esac
done

PROJECT_DIR="${PROJECT_DIR:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -z "$MODE" ]]; then
  echo "Error: --mode is required (generate|setup|run|full)." >&2
  exit 1
fi

case "$MODE" in
  generate|setup|run|full)
    ;;
  *)
    echo "Error: --mode must be one of generate, setup, run, full. Got: $MODE" >&2
    exit 1
    ;;
esac

log() { echo "[run-cucumber-quarkus] $*"; }

# -----------------------------
# MODE: generate
# -----------------------------
if [[ "$MODE" == "generate" ]]; then
  if [[ -z "$FEATURE_NAME" || -z "$HTTP_METHOD" || -z "$ENDPOINT" ]]; then
    echo "Error: generate mode requires --feature, --method, and --endpoint." >&2
    exit 1
  fi
  log "Mode: generate .feature"
  if [[ -z "$OUTPUT_FILE" ]]; then
    FEATURE_KEBAB=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    OUTPUT_FILE="src/test/resources/features/${FEATURE_KEBAB}.feature"
  fi
  bash "$SCRIPT_DIR/generate-feature.sh" \
    --feature "$FEATURE_NAME" \
    --method "$HTTP_METHOD" \
    --endpoint "$ENDPOINT" \
    --output "$OUTPUT_FILE"
  exit $?
fi

# -----------------------------
# MODE: setup
# -----------------------------
if [[ "$MODE" == "setup" ]]; then
  if [[ -z "$PACKAGE" ]]; then
    echo "Error: setup mode requires --package." >&2
    exit 1
  fi
  log "Mode: setup Quarkus Cucumber"
  log "Checking for existing .feature files under src/test/resources/features/ ..."
  FEATURE_COUNT=$(find "$PROJECT_DIR/src/test/resources/features" -name '*.feature' 2>/dev/null | wc -l || echo 0)
  if [[ "$FEATURE_COUNT" -gt 0 ]]; then
    log "Found $FEATURE_COUNT existing .feature file(s). Proceeding with setup."
  else
    log "No existing .feature files found. You should generate at least one feature before running setup."
    log "Hint: rerun with --mode generate or use --mode full to generate first."
  fi
  bash "$SCRIPT_DIR/setup-quarkus-cucumber.sh" \
    --project-dir "$PROJECT_DIR" \
    --package "$PACKAGE"
  exit $?
fi

# -----------------------------
# MODE: run
# -----------------------------
if [[ "$MODE" == "run" ]]; then
  log "Mode: run tests"
  cd "$PROJECT_DIR"
  if [[ ! -f "pom.xml" ]]; then
    echo "Error: pom.xml not found in $PROJECT_DIR" >&2
    exit 1
  fi
  MVN="./mvnw"
  if [[ ! -f "$MVN" ]]; then
    MVN="mvn"
  fi
  log "Running: $MVN test"
  $MVN test
  log "Reports generated at: $PROJECT_DIR/target/cucumber-reports/"
  exit $?
fi

# -----------------------------
# MODE: full
# -----------------------------
if [[ "$MODE" == "full" ]]; then
  if [[ -z "$FEATURE_NAME" || -z "$HTTP_METHOD" || -z "$ENDPOINT" || -z "$PACKAGE" ]]; then
    echo "Error: full mode requires --feature, --method, --endpoint, and --package." >&2
    exit 1
  fi
  log "Mode: full pipeline (generate + setup + run + split report)"
  STEP=1

  # Step 1: generate
  log "[$STEP] Generating .feature ..."
  if [[ -z "$OUTPUT_FILE" ]]; then
    FEATURE_KEBAB=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    OUTPUT_FILE="src/test/resources/features/${FEATURE_KEBAB}.feature"
  fi
  bash "$SCRIPT_DIR/generate-feature.sh" \
    --feature "$FEATURE_NAME" \
    --method "$HTTP_METHOD" \
    --endpoint "$ENDPOINT" \
    --output "$OUTPUT_FILE"
  GENERATE_STATUS=$?
  if [[ $GENERATE_STATUS -ne 0 ]]; then
    log "Generation failed with exit code $GENERATE_STATUS"; exit $GENERATE_STATUS; fi
  STEP=$((STEP+1))

  # Step 2: setup
  log "[$STEP] Setting up Quarkus Cucumber ..."
  bash "$SCRIPT_DIR/setup-quarkus-cucumber.sh" \
    --project-dir "$PROJECT_DIR" \
    --package "$PACKAGE"
  SETUP_STATUS=$?
  if [[ $SETUP_STATUS -ne 0 ]]; then
    log "Setup failed with exit code $SETUP_STATUS"; exit $SETUP_STATUS; fi
  STEP=$((STEP+1))

  # Step 3: run tests
  log "[$STEP] Running tests ..."
  cd "$PROJECT_DIR"
  MVN="./mvnw"
  if [[ ! -f "$MVN" ]]; then MVN="mvn"; fi
  $MVN test
  RUN_STATUS=$?
  if [[ $RUN_STATUS -ne 0 ]]; then
    log "Tests failed with exit code $RUN_STATUS"; exit $RUN_STATUS; fi
  STEP=$((STEP+1))

  # Step 4: split reports
  log "[$STEP] Splitting reports ..."
  if [[ -n "$PDF_FLAG" ]]; then
    node "$SCRIPT_DIR/split-cucumber-report.js" "$PDF_FLAG"
  else
    node "$SCRIPT_DIR/split-cucumber-report.js"
  fi
  SPLIT_STATUS=$?
  if [[ $SPLIT_STATUS -ne 0 ]]; then
    log "Report splitting failed with exit code $SPLIT_STATUS"; exit $SPLIT_STATUS; fi

  log "Full pipeline completed successfully."
  exit 0
fi