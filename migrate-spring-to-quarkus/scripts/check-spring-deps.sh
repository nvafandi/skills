#!/bin/bash
# Script: check-spring-deps.sh
# Description: Check for Spring Boot dependencies in build files
# Output: JSON array of Spring dependencies found
#
# Usage: bash scripts/check-spring-deps.sh [--dir DIR] [--help]
#
# Options:
#   --dir DIR    Root directory to search (default: current directory)
#   --help       Show this help message
#
# Examples:
#   bash scripts/check-spring-deps.sh
#   bash scripts/check-spring-deps.sh --dir /path/to/project

set -euo pipefail

show_help() {
  cat << 'EOF'
Usage: bash scripts/check-spring-deps.sh [OPTIONS]

Check for Spring Boot dependencies in build files and output as JSON.

Options:
  --dir DIR    Root directory to search (default: current directory)
  --help       Show this help message

Output format (JSON):
  [
    {"file": "pom.xml", "line": 42, "dependency": "spring-boot-starter-web", "context": "    <artifactId>spring-boot-starter-web</artifactId>"},
    ...
  ]

Exit codes:
  0 - Success (results may be empty)
  1 - Invalid arguments
EOF
  exit 0
}

SEARCH_DIR="."

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      show_help
      ;;
    --dir)
      if [[ -z "$2" ]]; then
        echo "Error: --dir requires a directory path argument." >&2
        echo "Usage: bash scripts/check-spring-deps.sh --dir <path>" >&2
        exit 1
      fi
      SEARCH_DIR="$2"
      shift 2
      ;;
    *)
      echo "Error: Unknown option: $1" >&2
      echo "Usage: bash scripts/check-spring-deps.sh [--dir DIR] [--help]" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$SEARCH_DIR" ]]; then
  echo "Error: Directory not found: $SEARCH_DIR" >&2
  echo "Usage: bash scripts/check-spring-deps.sh --dir <path>" >&2
  exit 1
fi

# Build files to search
BUILD_FILES=(
  "pom.xml"
  "build.gradle"
  "build.gradle.kts"
)

# Spring dependency patterns to search for
PATTERNS=(
  "spring-boot"
  "spring-cloud"
  "spring-data"
  "spring-security"
  "spring-web"
  "spring-context"
  "spring-core"
  "spring-beans"
  "spring-aop"
  "spring-tx"
  "spring-jdbc"
  "spring-orm"
  "spring-batch"
  "spring-integration"
  "spring-kafka"
  "spring-amqp"
  "spring-retry"
  "springdoc"
  "springfox"
  "lombok"
  "jasperreports"
  "itext"
  "openpdf"
)

results="["
first=true

for build_file in "${BUILD_FILES[@]}"; do
  file_path="$SEARCH_DIR/$build_file"
  if [[ ! -f "$file_path" ]]; then
    continue
  fi

  for pattern in "${PATTERNS[@]}"; do
    while IFS=: read -r line context; do
      if [[ -n "$line" ]]; then
        if [[ "$first" == true ]]; then
          first=false
        else
          results+=","
        fi
        # Escape JSON special characters in context
        context_escaped=$(echo "$context" | sed 's/"/\\"/g' | tr -d '\n')
        results+="{\"file\":\"$file_path\",\"line\":$line,\"dependency\":\"$pattern\",\"context\":\"$context_escaped\"}"
      fi
    done < <(grep -n "$pattern" "$file_path" 2>/dev/null || true)
  done
done

results+="]"

# Count results
count=$(echo "$results" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

echo "$results"
echo "{\"total\": $count}" >&2