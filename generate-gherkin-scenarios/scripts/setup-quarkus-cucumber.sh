#!/bin/bash
# Script: setup-quarkus-cucumber.sh
# Description: Bootstrap Cucumber in a Quarkus repository: adds quarkus-cucumber test dependency,
#              creates RunCucumberTest bootstrap class, cucumber.properties with HTML/JSON reports,
#              and a sample step-definition skeleton.
# Output: modifies pom.xml, creates src/test/java/.../RunCucumberTest.java,
#         src/test/resources/cucumber.properties, src/test/java/.../steps/...Steps.java
#
# Usage: bash scripts/setup-quarkus-cucumber.sh [OPTIONS]
#
# Options:
#   --project-dir DIR   Path to the Quarkus project root (default: current directory)
#   --package PKG       Java package for generated test classes (required), e.g. com.example
#   --help              Show this help message
#
# Examples:
#   bash scripts/setup-quarkus-cucumber.sh --project-dir . --package com.example
#   bash scripts/setup-quarkus-cucumber.sh --package com.mycompany.myapp

set -euo pipefail

show_help() {
  cat << 'EOF'
Usage: bash scripts/setup-quarkus-cucumber.sh [OPTIONS]

Bootstrap Cucumber in a Quarkus repository.

Options:
  --project-dir DIR   Path to the Quarkus project root (default: current directory)
  --package PKG       Java package for generated test classes (required), e.g. com.example
  --help              Show this help message

This script will:
  - Add io.quarkiverse.cucumber:quarkus-cucumber (test scope) to pom.xml if not present
  - Create src/test/java/<package>/RunCucumberTest.java extending CucumberQuarkusTest
  - Create src/test/resources/cucumber.properties with html + json report plugins
  - Create src/test/java/<package>/steps/ApiSteps.java as a reusable step skeleton

Exit codes:
  0 - Success
  1 - Invalid arguments or unsupported project layout
EOF
  exit 0
}

PROJECT_DIR=""
PACKAGE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) show_help ;;
    --project-dir)
      if [[ -z "$2" ]]; then
        echo "Error: --project-dir requires a path argument." >&2
        exit 1
      fi
      PROJECT_DIR="$2"
      shift 2
      ;;
    --package)
      if [[ -z "$2" ]]; then
        echo "Error: --package requires a Java package argument." >&2
        exit 1
      fi
      PACKAGE="$2"
      shift 2
      ;;
    *)
      echo "Error: Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

PROJECT_DIR="${PROJECT_DIR:-.}"
PACKAGE="${PACKAGE:-}"

if [[ -z "$PACKAGE" ]]; then
  echo "Error: --package is required." >&2
  echo "Usage: bash scripts/setup-quarkus-cucumber.sh --project-dir . --package com.example" >&2
  exit 1
fi

if [[ ! -f "$PROJECT_DIR/pom.xml" ]]; then
  echo "Error: pom.xml not found in project directory: $PROJECT_DIR" >&2
  exit 1
fi

# Normalize package to path
PACKAGE_PATH="${PACKAGE//./\/}"
TEST_JAVA_DIR="$PROJECT_DIR/src/test/java/$PACKAGE_PATH"
TEST_RES_DIR="$PROJECT_DIR/src/test/resources"
FEATURES_DIR="$TEST_RES_DIR/features"
STEPS_DIR="$TEST_JAVA_DIR/steps"

mkdir -p "$TEST_JAVA_DIR"
mkdir -p "$STEPS_DIR"
mkdir -p "$FEATURES_DIR"
mkdir -p "$TEST_RES_DIR"

# 1) Add quarkus-cucumber dependency to pom.xml if missing
if ! grep -q 'quarkus-cucumber' "$PROJECT_DIR/pom.xml"; then
  echo "Adding quarkus-cucumber test dependency to pom.xml..."
  # Cross-platform: avoid sed -i and \n in sed replacement (BSD vs GNU differences).
  # Use printf + awk instead.
  DEP_BLOCK=$(printf '    <dependency>\n        <groupId>io.quarkiverse.cucumber</groupId>\n        <artifactId>quarkus-cucumber</artifactId>\n        <version>1.3.0</version>\n        <scope>test</scope>\n    </dependency>')
  awk -v dep="$DEP_BLOCK" '{print} /<\/dependencies>/ {print dep}' "$PROJECT_DIR/pom.xml" > "$PROJECT_DIR/pom.xml.tmp"
  mv "$PROJECT_DIR/pom.xml.tmp" "$PROJECT_DIR/pom.xml"
else
  echo "quarkus-cucumber dependency already present in pom.xml; skipping."
fi

# 2) Create RunCucumberTest bootstrap class
RUN_CUCUMBER_TEST="$TEST_JAVA_DIR/RunCucumberTest.java"
if [[ ! -f "$RUN_CUCUMBER_TEST" ]]; then
  echo "Creating RunCucumberTest bootstrap class..."
  cat > "$RUN_CUCUMBER_TEST" << JAVA
package $PACKAGE;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkiverse.cucumber.CucumberQuarkusTest;

@QuarkusTest
public class RunCucumberTest extends CucumberQuarkusTest {

    public static void main(String[] args) {
        runMain(RunCucumberTest.class, args);
    }
}
JAVA
else
  echo "RunCucumberTest already exists at $RUN_CUCUMBER_TEST; skipping."
fi

# 3) Create cucumber.properties with HTML + JSON reports
CUCUMBER_PROPERTIES="$TEST_RES_DIR/cucumber.properties"
if [[ ! -f "$CUCUMBER_PROPERTIES" ]]; then
  echo "Creating cucumber.properties..."
  cat > "$CUCUMBER_PROPERTIES" << 'PROPS'
cucumber.plugin=pretty, html:target/cucumber-reports/cucumber.html, json:target/cucumber-reports/cucumber.json
cucumber.execution.parallel.enabled=false
PROPS
else
  echo "cucumber.properties already exists at $CUCUMBER_PROPERTIES; skipping."
fi

# 4) Create a sample step definition skeleton (API-focused)
API_STEPS="$STEPS_DIR/ApiSteps.java"
if [[ ! -f "$API_STEPS" ]]; then
  echo "Creating ApiSteps.java skeleton..."
  cat > "$API_STEPS" << JAVA
package $PACKAGE.steps;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.When;
import io.cucumber.java.en.Then;
import io.restassured.response.Response;

public class ApiSteps {

    private Response response;

    @Given("the API {string} {string} is available")
    public void apiAvailable(String method, String endpoint) {
        // no-op: availability is validated by the request below
    }

    @When("a {string} request is sent to {string} with payload:")
    public void sendRequest(String method, String endpoint, String payload) {
        switch (method.toUpperCase()) {
            case "GET":
                response = given().when().get(endpoint);
                break;
            case "POST":
                response = given().contentType("application/json").body(payload).when().post(endpoint);
                break;
            case "PUT":
                response = given().contentType("application/json").body(payload).when().put(endpoint);
                break;
            case "PATCH":
                response = given().contentType("application/json").body(payload).when().patch(endpoint);
                break;
            case "DELETE":
                response = given().when().delete(endpoint);
                break;
            default:
                throw new IllegalArgumentException("Unsupported method: " + method);
        }
    }

    @Then("a {int} response is returned")
    public void statusCode(int statusCode) {
        response.then().statusCode(statusCode);
    }

    @Then("the response body matches:")
    public void responseBody(String expectedBody) {
        response.then().body(equalTo(expectedBody));
    }
}
JAVA
else
  echo "ApiSteps.java already exists at $API_STEPS; skipping."
fi

echo "Quarkus Cucumber bootstrap complete."
echo "Next steps:"
echo "  1) Place .feature files under $FEATURES_DIR"
echo "  2) Run tests: cd $PROJECT_DIR && ./mvnw test"
echo "  3) Open reports: target/cucumber-reports/cucumber.html and cucumber.json"
exit 0