#!/bin/bash
# Script: check-engineering-violations.sh
# Description: Check for common engineering standard violations in Quarkus Java code
# Output: JSON array of violations with file paths and line numbers
#
# Usage: bash scripts/check-engineering-violations.sh [--dir DIR] [--help]

set -euo pipefail

show_help() {
  cat << 'EOF'
Usage: bash scripts/check-engineering-violations.sh [OPTIONS]

Check for common engineering standard violations in Quarkus Java code.

Options:
  --dir DIR    Root directory to search (default: current directory)
  --help       Show this help message

Output format (JSON):
  [
    {"file": "path/to/File.java", "line": 42, "violation": "field-injection", "context": "  @Inject"},
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

results="["
first=true

add_result() {
  local file="$1" line="$2" violation="$3" context="$4"
  if [[ -n "$file" && -n "$line" ]]; then
    if [[ "$first" == true ]]; then
      first=false
    else
      results+=","
    fi
    context_escaped=$(echo "$context" | sed 's/"/\\"/g' | tr -d '\n')
    results+="{\"file\":\"$file\",\"line\":$line,\"violation\":\"$violation\",\"context\":\"$context_escaped\"}"
  fi
}

# 1. Spring imports (leftover from migration)
while IFS=: read -r file line context; do
  add_result "$file" "$line" "spring-import" "$context"
done < <(grep -rn "import org.springframework" "$SEARCH_DIR" --include="*.java" 2>/dev/null || true)

# 2. Lombok annotations
while IFS=: read -r file line context; do
  add_result "$file" "$line" "lombok-annotation" "$context"
done < <(grep -rn -E "@(Data|Builder|Slf4j|Getter|Setter|NoArgsConstructor|AllArgsConstructor|RequiredArgsConstructor|Value|EqualsAndHashCode|ToString|NonNull)" "$SEARCH_DIR" --include="*.java" 2>/dev/null || true)

# 3. double/float for money fields
while IFS=: read -r file line context; do
  add_result "$file" "$line" "primitive-money" "$context"
done < <(grep -rn -E "(private|public|protected)\s+(double|float)\s+(amount|price|total|balance|cost|fee|rate|value|salary|payment)" "$SEARCH_DIR" --include="*.java" 2>/dev/null || true)

# 4. Hardcoded values (common patterns)
while IFS=: read -r file line context; do
  add_result "$file" "$line" "hardcoded-value" "$context"
done < <(grep -rn -E "(String\s+\w+\s*=\s*\"(http|https|jdbc|smtp|localhost|127\.0\.0\.1))" "$SEARCH_DIR" --include="*.java" 2>/dev/null || true)

# 5. Spring Boot test annotations
while IFS=: read -r file line context; do
  add_result "$file" "$line" "spring-test-annotation" "$context"
done < <(grep -rn -E "@(SpringBootTest|WebMvcTest|DataJpaTest|MockBean|ActiveProfiles|LocalServerPort)" "$SEARCH_DIR" --include="*.java" 2>/dev/null || true)

# 6. Spring config properties
while IFS=: read -r file line context; do
  add_result "$file" "$line" "spring-config-property" "$context"
done < <(grep -rn "spring\." "$SEARCH_DIR" --include="*.properties" --include="*.yml" --include="*.yaml" 2>/dev/null || true)

# 7. Traditional for-each loops over collections (should use Java Streams)
while IFS=: read -r file line context; do
  add_result "$file" "$line" "manual-loop" "$context"
done < <(grep -rn -E "for\s*\(\s*(List|Collection|Set|Map)\s*<|for\s*\(\s*(final\s+)?[A-Z][A-Za-z0-9]*\s+[a-z][A-Za-z0-9]*\s*:\s*[a-z]" "$SEARCH_DIR" --include="*.java" 2>/dev/null || true)

# 8. @Inject on private members (per Quarkus CDI reference, requires reflection in native image)
# Handles both `@Inject private X` (same line) and `@Inject\nprivate X` (multi-line)
while IFS=: read -r file line context; do
  add_result "$file" "$line" "private-injection" "$context"
done < <(
  grep -rn -E "@Inject\s+private" "$SEARCH_DIR" --include="*.java" 2>/dev/null || true
  # multi-line: @Inject followed by private on the next line
  grep -rn -E "@Inject\s*$" "$SEARCH_DIR" --include="*.java" 2>/dev/null || true
)

# 9. @Named for DI resolution (use @Identifier instead)
while IFS=: read -r file line context; do
  add_result "$file" "$line" "named-qualifier" "$context"
done < <(grep -rn "@Named" "$SEARCH_DIR" --include="*.java" 2>/dev/null || true)

results+="]"

count=$(echo "$results" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

echo "$results"
echo "{\"total\": $count}" >&2