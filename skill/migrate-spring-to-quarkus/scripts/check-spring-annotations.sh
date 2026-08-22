#!/bin/bash
# Script: check-spring-annotations.sh
# Description: Search for Spring annotations in Java source files
# Output: JSON array of found Spring annotations with file paths and line numbers
#
# Usage: bash scripts/check-spring-annotations.sh [--dir DIR] [--help]
#
# Options:
#   --dir DIR    Root directory to search (default: current directory)
#   --help       Show this help message
#
# Examples:
#   bash scripts/check-spring-annotations.sh
#   bash scripts/check-spring-annotations.sh --dir src/main/java

set -euo pipefail

show_help() {
  cat << 'EOF'
Usage: bash scripts/check-spring-annotations.sh [OPTIONS]

Search for Spring annotations in Java source files and output as JSON.

Options:
  --dir DIR    Root directory to search (default: current directory)
  --help       Show this help message

Output format (JSON):
  [
    {"file": "path/to/File.java", "line": 42, "annotation": "@Autowired", "context": "  @Autowired"},
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
        echo "Usage: bash scripts/check-spring-annotations.sh --dir <path>" >&2
        exit 1
      fi
      SEARCH_DIR="$2"
      shift 2
      ;;
    *)
      echo "Error: Unknown option: $1" >&2
      echo "Usage: bash scripts/check-spring-annotations.sh [--dir DIR] [--help]" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$SEARCH_DIR" ]]; then
  echo "Error: Directory not found: $SEARCH_DIR" >&2
  echo "Usage: bash scripts/check-spring-annotations.sh --dir <path>" >&2
  exit 1
fi

# Spring annotations to search for
ANNOTATIONS=(
  "@Autowired"
  "@Component"
  "@Service"
  "@Repository"
  "@Controller"
  "@RestController"
  "@RequestMapping"
  "@GetMapping"
  "@PostMapping"
  "@PutMapping"
  "@DeleteMapping"
  "@PatchMapping"
  "@SpringBootApplication"
  "@SpringBootTest"
  "@WebMvcTest"
  "@DataJpaTest"
  "@MockBean"
  "@Value"
  "@Configuration"
  "@Bean"
  "@EnableScheduling"
  "@EnableCaching"
  "@Transactional"
  "@Query"
  "@Modifying"
  "@Entity"
  "@Table"
  "@Column"
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
      # Escape JSON special characters in context
      context_escaped=$(echo "$context" | sed 's/"/\\"/g' | tr -d '\n')
      results+="{\"file\":\"$file\",\"line\":$line,\"annotation\":\"$annotation\",\"context\":\"$context_escaped\"}"
    fi
  done < <(grep -rn "$annotation" "$SEARCH_DIR" --include="*.java" 2>/dev/null | awk -F: '{print $1 ":" $2 ":" substr($0, index($0,$3))}' || true)
done

results+="]"

# Count results
count=$(echo "$results" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

echo "$results"
echo "{\"total\": $count}" >&2