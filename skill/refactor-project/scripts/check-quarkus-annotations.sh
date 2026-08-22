#!/bin/bash
# Script: check-quarkus-annotations.sh
# Description: Search for Quarkus annotations in Java source files
# Output: JSON array of found Quarkus annotations with file paths and line numbers
#
# Usage: bash scripts/check-quarkus-annotations.sh [--dir DIR] [--help]
#
# Options:
#   --dir DIR    Root directory to search (default: current directory)
#   --help       Show this help message

set -euo pipefail

show_help() {
  cat << 'EOF'
Usage: bash scripts/check-quarkus-annotations.sh [OPTIONS]

Search for Quarkus annotations in Java source files and output as JSON.

Options:
  --dir DIR    Root directory to search (default: current directory)
  --help       Show this help message

Output format (JSON):
  [
    {"file": "path/to/File.java", "line": 42, "annotation": "@Path", "context": "  @Path"},
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
        exit 1
      fi
      SEARCH_DIR="$2"
      shift 2
      ;;
    *)
      echo "Error: Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$SEARCH_DIR" ]]; then
  echo "Error: Directory not found: $SEARCH_DIR" >&2
  exit 1
fi

# Quarkus annotations to search for
ANNOTATIONS=(
  "@Path"
  "@GET"
  "@POST"
  "@PUT"
  "@DELETE"
  "@PATCH"
  "@ApplicationScoped"
  "@RequestScoped"
  "@Singleton"
  "@Inject"
  "@ConfigProperty"
  "@Transactional"
  "@QuarkusTest"
  "@InjectMock"
  "@TestHTTPResource"
  "@TestProfile"
  "@ServerExceptionMapper"
  "@RolesAllowed"
  "@CacheResult"
  "@CacheInvalidate"
  "@Scheduled"
  "@QuarkusMain"
  "@CheckedTemplate"
  "@Produces"
  "@Consumes"
  "@PathParam"
  "@QueryParam"
  "@HeaderParam"
  "@BeanParam"
  "@Valid"
)

results="["
first=true

for annotation in "${ANNOTATIONS[@]}"; do
  while IFS=: read -r file line context; do
    if [[ -n "$file" && -n "$line" ]]; then
      if [[ "$first" == true ]]; then
        first=false
      else
        results+=","
      fi
      context_escaped=$(echo "$context" | sed 's/"/\\"/g' | tr -d '\n')
      results+="{\"file\":\"$file\",\"line\":$line,\"annotation\":\"$annotation\",\"context\":\"$context_escaped\"}"
    fi
  done < <(grep -rn "$annotation" "$SEARCH_DIR" --include="*.java" 2>/dev/null | awk -F: '{print $1 ":" $2 ":" substr($0, index($0,$3))}' || true)
done

results+="]"

count=$(echo "$results" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

echo "$results"
echo "{\"total\": $count}" >&2