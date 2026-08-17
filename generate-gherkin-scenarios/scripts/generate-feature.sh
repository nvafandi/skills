#!/bin/bash
# Script: generate-feature.sh
# Description: Generate an API-testing .feature file from a template
# Output: .feature file written to --output path
#
# Usage: bash scripts/generate-feature.sh [OPTIONS]
#
# Options:
#   --feature NAME    Feature name (required)
#   --method METHOD   HTTP method: GET, POST, PUT, PATCH, DELETE (required)
#   --endpoint PATH   API endpoint, e.g. /api/v1/payments (required)
#   --output FILE     Output file path (optional; defaults to src/test/resources/features/<feature>.feature)
#   --help            Show this help message
#
# Examples:
#   bash scripts/generate-feature.sh --feature "Payment Processing" --method POST --endpoint /api/v1/payments
#   bash scripts/generate-feature.sh --feature "Payment Processing" --method POST --endpoint /api/v1/payments --output src/test/resources/features/payment/process-payment.feature
#   bash scripts/generate-feature.sh --feature "User Login" --method POST --endpoint /api/v1/auth/login

set -euo pipefail

show_help() {
  cat << 'EOF'
Usage: bash scripts/generate-feature.sh [OPTIONS]

Generate an API-testing .feature file from a template.

Options:
  --feature NAME    Feature name (required)
  --method METHOD   HTTP method: GET, POST, PUT, PATCH, DELETE (required)
  --endpoint PATH   API endpoint, e.g. /api/v1/payments (required)
  --output FILE     Output file path (required)
  --help            Show this help message

Template includes:
  - Feature header with API Contract comment (HTTP method, endpoint, request, response)
  - Background section
  - Scenario Outline with Examples covering happy path, error path, and edge case
  - Each scenario documents HTTP method, endpoint, request, and response
  - Defaults output to src/test/resources/features/<feature-name-kebab-case>.feature

Exit codes:
  0 - Success
  1 - Invalid arguments
EOF
  exit 0
}

FEATURE_NAME=""
HTTP_METHOD=""
ENDPOINT=""
OUTPUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) show_help ;;
    --feature)
      if [[ -z "$2" ]]; then
        echo "Error: --feature requires a feature name argument." >&2
        exit 1
      fi
      FEATURE_NAME="$2"
      shift 2
      ;;
    --method)
      if [[ -z "$2" ]]; then
        echo "Error: --method requires an HTTP method argument." >&2
        exit 1
      fi
      HTTP_METHOD=$(echo "$2" | tr '[:lower:]' '[:upper:]')
      shift 2
      ;;
    --endpoint)
      if [[ -z "$2" ]]; then
        echo "Error: --endpoint requires an endpoint path argument." >&2
        exit 1
      fi
      ENDPOINT="$2"
      shift 2
      ;;
    --output)
      if [[ -z "$2" ]]; then
        echo "Error: --output requires a file path argument." >&2
        exit 1
      fi
      OUTPUT_FILE="$2"
      shift 2
      ;;
    *)
      echo "Error: Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$FEATURE_NAME" ]]; then
  echo "Error: --feature is required." >&2
  echo "Usage: bash scripts/generate-feature.sh --feature \"Feature Name\" --method POST --endpoint /api/v1/payments --output file.feature" >&2
  exit 1
fi

if [[ -z "$HTTP_METHOD" ]]; then
  echo "Error: --method is required." >&2
  echo "Usage: bash scripts/generate-feature.sh --feature \"Feature Name\" --method POST --endpoint /api/v1/payments --output file.feature" >&2
  exit 1
fi

case "$HTTP_METHOD" in
  GET|POST|PUT|PATCH|DELETE)
    ;;
  *)
    echo "Error: --method must be one of GET, POST, PUT, PATCH, DELETE. Got: $HTTP_METHOD" >&2
    exit 1
    ;;
esac

if [[ -z "$ENDPOINT" ]]; then
  echo "Error: --endpoint is required." >&2
  echo "Usage: bash scripts/generate-feature.sh --feature \"Feature Name\" --method POST --endpoint /api/v1/payments --output file.feature" >&2
  exit 1
fi

if [[ -z "$OUTPUT_FILE" ]]; then
  # Default to Quarkus test resources folder
  feature_kebab=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
  OUTPUT_FILE="src/test/resources/features/${feature_kebab}.feature"
  echo "Info: --output not provided; defaulting to $OUTPUT_FILE" >&2
fi

# Create output directory if it doesn't exist
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
if [[ ! -d "$OUTPUT_DIR" ]]; then
  mkdir -p "$OUTPUT_DIR"
fi

# Convert feature name to lowercase with hyphens for tag
feature_tag=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
method_lower=$(echo "$HTTP_METHOD" | tr '[:upper:]' '[:lower:]')

cat > "$OUTPUT_FILE" << EOF
@api @domain-${feature_tag} @http-${method_lower}
Feature: ${FEATURE_NAME}
  As a user of the system
  I want to use this feature
  So that I can achieve my goals

  # API Contract
  #   ${HTTP_METHOD} ${ENDPOINT}
  #   Request:  <request payload / query parameters>
  #   Response: <expected status code and response body>

  Background:
    Given the API ${HTTP_METHOD} ${ENDPOINT} is available

  Scenario Outline: ${HTTP_METHOD} ${ENDPOINT} returns the expected response
    Given the API ${HTTP_METHOD} ${ENDPOINT} is available
    When a ${HTTP_METHOD} request is sent to ${ENDPOINT} with payload:
      """
      <REQUEST_BODY>
      """
    Then a <STATUS_CODE> response is returned
    And the response body matches:
      """
      <RESPONSE_BODY>
      """

    Examples:
      | scenario                     | REQUEST_BODY                        | STATUS_CODE | RESPONSE_BODY                              |
      | happy path                   | {"example": "valid-request"}        | 200         | {"status": "SUCCESS"}                      |
      | negative case - invalid body | {"example": ""}                     | 400         | {"message": "example is required"}         |
      | edge case - unauthorized     | {"example": "valid-request"}        | 401         | {"message": "unauthorized"}                |
EOF

echo "Generated feature file: $OUTPUT_FILE" >&2
echo "{\"status\": \"success\", \"file\": \"$OUTPUT_FILE\", \"feature\": \"$FEATURE_NAME\", \"method\": \"$HTTP_METHOD\", \"endpoint\": \"$ENDPOINT\"}"
exit 0