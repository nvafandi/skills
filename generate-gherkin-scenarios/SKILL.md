---
name: generate-gherkin-scenarios
description: >
  Use this skill when generating Gherkin feature files for BDD testing and setting up Cucumber testing for Quarkus. Use when the user wants to create, write, or generate Gherkin scenarios, .feature files, Cucumber tests, BDD specifications, or acceptance criteria. Covers functional requirements, customer-facing behavior, service layer testing, API behavior validation, and bootstrapping a Quarkus repository to run Cucumber tests and generate HTML/JSON reports. Even if they don't explicitly mention "Gherkin" or "Cucumber", use this skill when the user wants to document behavior as executable specifications.
license: PT. Prudential Life Indonesia
metadata:
  author: Irsyad Jamal Pratama Putra - https://github.com/Irsyad-Putra1-Consultant_pru
---

# Gherkin Scenario Generation for Quarkus Cucumber

Generate BDD Gherkin feature files for testing service and **API** behavior, then bootstrap the **Quarkus** repository to run them with Cucumber and produce **HTML + JSON reports**.

This skill follows a **two-step workflow**:

1. **Step 1 — Generate `.feature` files** directly into the Quarkus test folder (`src/test/resources/features/`). Every `.feature` file documents the full API contract for each scenario: **HTTP method**, **endpoint**, **request**, **response**, and **examples** covering happy path, alternative path, error path, and edge case.
2. **Step 2 — Setup Quarkus Cucumber** so the repository can run the generated features with `mvn test` / `./mvnw test`, and generate reports in **HTML** and **JSON**.

## Important: Where .feature Files Are Generated

Generated `.feature` files **MUST** be placed inside the Quarkus test resources folder so Cucumber can discover them:

```
<quarkus-project>
└── src/test/resources/features/
    ├── payment/
    │   └── process-payment.feature
    ├── subscription/
    │   └── cancel-subscription.feature
    └── user/
        └── login.feature
```

Cucumber discovers `.feature` files from the classpath, so `src/test/resources/features/` is the standard location. The generated `Scenario Outline` step definitions (glue code) go into `src/test/java/.../steps/`.

## Critical Rules

- **Describe behavior, not implementation.** Scenarios should describe _what_ the system does, not _how_ it does it. Ask: "Will this wording need to change if the implementation changes?"
- **Use declarative style.** Describe the intended behavior in business terms, avoiding UI-specific details, field names, or procedural steps.
- **Write as living documentation.** Scenarios should be readable by business stakeholders, not just developers.
- **One feature per file.** Each `.feature` file focuses on a single feature or capability.
- **Keep scenarios independent.** Each scenario should be able to run independently of others.
- **Always capture the API contract for API scenarios.** Each scenario must state the HTTP method, endpoint, request, and expected response. Use `Scenario Outline` with `Examples` to cover multiple request/response variations (happy path, negative cases, edge cases).

## Mandatory API Details

For any scenario that exercises an API, the following **MUST** be explicit in the feature file:

| Detail | Description | Where to place |
|---|---|---|
| **HTTP method** | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, etc. | Feature header metadata + `When` step + `Examples` column |
| **Endpoint** | The resource path, e.g. `/api/v1/payments` | Feature header metadata + `When` step |
| **Request** | Payload, headers, query parameters, or path parameters | `Given`/`And` steps + `Examples` table |
| **Response** | Expected status code, response body, and structure | `Then`/`And` steps + `Examples` table |
| **Examples** | Concrete request → response pairs (happy path, negative, edge) | `Scenario Outline` `Examples:` table |

### Recommended Feature Header Metadata

```gherkin
@api @domain-payment
Feature: Payment Processing
  As a payment processor
  I want to process payments securely
  So that transactions are completed accurately and reliably

  # API Contract
  #   POST /api/v1/payments
  #   Request:  { "amount": decimal, "currency": "IDR", "card_token": string }
  #   Response: 201 Created -> { "transaction_id": string, "status": "SUCCESS" }
```

### Scenario Step Conventions (API)

```gherkin
Scenario Outline: <description>
  Given the API <HTTP_METHOD> <ENDPOINT> is available
  When a request is sent with the following payload:
    """
    <REQUEST_BODY>
    """
  Then a response with status <STATUS_CODE> is returned
  And the response body matches:
    """
    <RESPONSE_BODY>
    """

  Examples:
    | HTTP_METHOD | ENDPOINT     | REQUEST_BODY                  | STATUS_CODE | RESPONSE_BODY                        |
    | POST        | /api/v1/payments | {"amount": 100.00, "currency": "IDR"} | 201         | {"transaction_id": "t-001", "status": "SUCCESS"} |
```

## Reference Files

| Reference | Use during |
|---|---|
| [references/gherkin-best-practices.md](references/gherkin-best-practices.md) | All scenarios: BDD principles, declarative vs imperative style, anti-patterns to avoid |
| [references/step-patterns.md](references/step-patterns.md) | All scenarios: common step patterns for REST APIs, services, and domain logic |
| [references/quarkus-cucumber-setup.md](references/quarkus-cucumber-setup.md) | Step 2: Quarkus Cucumber setup, ScenarioScope, lifecycle events, reports |

## Available Scripts

| Script | Purpose | Usage |
|---|---|---|
| `scripts/generate-feature.sh` | Generate an API-testing `.feature` file (defaults to `src/test/resources/features/`) | `bash scripts/generate-feature.sh --feature "Payment Processing" --method POST --endpoint /api/v1/payments` |
| `scripts/setup-quarkus-cucumber.sh` | Bootstrap Cucumber in a Quarkus repo: adds dependency, creates bootstrap test class, `cucumber.properties` with HTML/JSON reports | `bash scripts/setup-quarkus-cucumber.sh --project-dir . --package com.example` |
| `scripts/run-cucumber-quarkus.sh` | Master orchestrator with 4 modes: `generate`, `setup`, `run`, `full` | `bash scripts/run-cucumber-quarkus.sh --mode full --feature "Payment Processing" --method POST --endpoint /api/v1/payments --package com.example --pdf` |
| `scripts/split-cucumber-report.js` | Split `cucumber.json` into HTML reports (all/passed/failed) and optionally generate PDFs via headless Edge/Chrome | `node scripts/split-cucumber-report.js --pdf` |

All scripts are designed to run on **Windows**, **Linux**, and **macOS** as long as `bash`, `node`, and `mvn`/`./mvnw` are available.

### Platform Notes

- **Linux / macOS**: scripts run natively in Terminal.
- **Windows**: run inside **Git Bash**, **WSL**, or **Cygwin**. The scripts use `#!/bin/bash` and standard POSIX tools (`awk`, `grep`, `find`, `mkdir -p`, `cat`, `tr`) that are available in those environments. Native `cmd.exe` / PowerShell is **not** supported; always invoke via `bash`.
- **Node.js** (`node`) is required for `scripts/split-cucumber-report.js`.
- **Maven** (`mvn` or `./mvnw`) is required for `run` mode.

`setup-quarkus-cucumber.sh` avoids platform-specific `sed -i` and uses a temp-file/awk approach so it works on both GNU/Linux and BSD/macOS `sed`.

All scripts:
- Accept `--help` for usage documentation
- Output structured files for use in test automation
- Are non-interactive (no TTY prompts)
- Return meaningful exit codes (0 = success, 1 = error)

## Workflow Modes

This skill supports **4 execution modes** via `scripts/run-cucumber-quarkus.sh`:

| Mode | Behavior | When to use |
|---|---|---|
| `generate` | Generate `.feature` file(s) only into `src/test/resources/features/` | User only wants feature files |
| `setup` | Setup Quarkus Cucumber only (auto-detect existing `.feature` files; if none, prompt to generate first) | User already has features and needs runner/stepdef setup |
| `run` | Run tests (`./mvnw test`) and generate standard Cucumber reports | User already has setup and just wants to run |
| `full` | Generate → Setup → Run → Split reports (HTML + optional PDF) | User wants end-to-end execution with split/PDF reports |

### Step 1: Generate API-Testing .feature Files

#### Gather Requirements

Before writing scenarios, clarify:
1. **Feature name** — What capability or feature are you testing?
2. **User roles** — Who interacts with this feature? (e.g., "Free Frieda", "Paid Patty", "Admin User")
3. **Business rules** — What are the rules governing this feature?
4. **API contract** — What is the HTTP method, endpoint, request, and expected response?
5. **Happy paths** — What are the successful flows?
6. **Alternative paths** — What are the valid but different flows?
7. **Error paths** — What can go wrong? What are the expected error behaviors (status codes, error bodies)?
8. **Edge cases** — What are the boundary conditions (empty payload, invalid format, missing fields, unauthorized)?

#### Choose Scenario Types

Write at least one scenario for each:

| Type | Purpose | Example |
|---|---|---|
| **Happy path** | Success scenario | `POST /api/v1/payments` returns `201 Created` |
| **Alternative path** | Valid variation | Different payment method still succeeds |
| **Error path** | Expected failure | Invalid payload returns `400 Bad Request` |
| **Edge case** | Boundary condition | Unauthorized request returns `401 Unauthorized` |

#### Write the Feature File

#### Feature Header

```gherkin
Feature: [Feature Name]
  As a [user role]
  I want [capability]
  So that [business value]

  # API Contract
  #   [HTTP_METHOD] [ENDPOINT]
  #   Request:  [request description]
  #   Response: [response description]
```

#### Scenario Structure (Declarative, API-aware)

```gherkin
Scenario Outline: [Descriptive name of behavior]
  Given [initial context - business/API terms]
  When a <HTTP_METHOD> request is sent to <ENDPOINT> with <REQUEST>
  Then a <STATUS_CODE> response is returned
  And the response body is <RESPONSE>

  Examples:
    | HTTP_METHOD | ENDPOINT | REQUEST | STATUS_CODE | RESPONSE |
```

#### Good vs Bad Examples

**Bad (imperative, implementation-heavy, no API contract):**
```gherkin
Scenario: User logs in
  Given I visit "/login"
  When I enter "testuser" in the "username" field
  And I enter "password123" in the "password" field
  And I click the "Submit" button
  Then I should see the "dashboard" page
```

**Good (declarative, behavior-focused, API contract present):**
```gherkin
@api @auth
Feature: User Login
  As a user
  I want to authenticate with my credentials
  So that I can access protected resources

  # API Contract
  #   POST /api/v1/auth/login
  #   Request:  { "username": string, "password": string }
  #   Response: 200 -> { "access_token": string }

  Scenario Happy path: Free Frieda logs in with valid credentials
    Given the API POST /api/v1/auth/login is available
    When a request is sent with username "free.frieda" and password "valid123"
    Then a 200 response is returned
    And the response contains an access token

  Scenario Error path: login with invalid credentials
    Given the API POST /api/v1/auth/login is available
    When a request is sent with username "free.frieda" and password "wrong"
    Then a 401 response is returned
    And the response contains an error message
```

#### Review Against Principles

Before finalizing, verify each scenario:
- [ ] Describes behavior, not UI mechanics
- [ ] Uses business language, not technical terms
- [ ] Would still be valid if implementation changes
- [ ] Is short and readable
- [ ] Can be understood by non-technical stakeholders
- [ ] Is independent of other scenarios
- [ ] **API scenarios state the HTTP method, endpoint, request, and response**
- [ ] **API scenarios include `Examples` covering happy path, negative case, and edge case**

#### Generate the File

Use the generator script, which writes into the Quarkus test folder by default:

```bash
bash scripts/generate-feature.sh \
  --feature "Payment Processing" \
  --method POST \
  --endpoint /api/v1/payments \
  --output src/test/resources/features/payment/process-payment.feature
```

### Step 2: Setup Quarkus Cucumber

After generating `.feature` files, bootstrap the repository so it can execute them with Cucumber on Quarkus and produce **HTML + JSON reports**. Setup is based on the official **Quarkus Cucumber** extension documentation (https://docs.quarkiverse.io/quarkus-cucumber/dev/index.html).

#### 2.1 Add the Quarkus Cucumber Dependency

In the Quarkus project `pom.xml`, add:

```xml
<dependency>
    <groupId>io.quarkiverse.cucumber</groupId>
    <artifactId>quarkus-cucumber</artifactId>
    <version>1.3.0</version>
    <scope>test</scope>
</dependency>
```

> Use the latest version on Maven Central when newer than `1.3.0`.

#### 2.2 Create the Cucumber Bootstrap Test Class

Create `src/test/java/<package>/RunCucumberTest.java`:

```java
package com.example;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkiverse.cucumber.CucumberQuarkusTest;

@QuarkusTest
public class RunCucumberTest extends CucumberQuarkusTest {
    public static void main(String[] args) {
        runMain(RunCucumberTest.class, args); // Optional: enables running .feature directly in IntelliJ
    }
}
```

This bootstraps Cucumber and automatically discovers `.feature` files and step definition (glue) classes on the test classpath.

#### 2.3 Configure Reports (HTML + JSON)

Create `src/test/resources/cucumber.properties`:

```properties
cucumber.plugin=pretty, html:target/cucumber-reports/cucumber.html, json:target/cucumber-reports/cucumber.json
cucumber.execution.parallel.enabled=false
```

After running `./mvnw test`, reports are generated at:
- `target/cucumber-reports/cucumber.html` (HTML report)
- `target/cucumber-reports/cucumber.json` (JSON report, machine-readable / CI integration)

Alternatively, configure plugins on the test class:

```java
@CucumberOptions(plugin = {
    "pretty",
    "html:target/cucumber-reports/cucumber.html",
    "json:target/cucumber-reports/cucumber.json"
})
public class RunCucumberTest extends CucumberQuarkusTest { }
```

#### 2.4 Create Step Definitions (Glue Code)

Create `src/test/java/<package>/steps/` with step definitions that use Quarkus REST client / `RestAssured` / `QuarkusTest` HTTP endpoints:

```java
package com.example.steps;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.When;
import io.cucumber.java.en.Then;
import io.restassured.response.Response;

public class PaymentSteps {

    private Response response;

    @Given("the API POST /api/v1/payments is available")
    public void apiAvailable() {
        // no-op: availability is validated by the request below
    }

    @When("a POST request is sent to /api/v1/payments with payload:")
    public void sendPost(String payload) {
        response = given()
                .contentType("application/json")
                .body(payload)
                .when()
                .post("/api/v1/payments");
    }

    @Then("a {int} response is returned")
    public void statusCode(int statusCode) {
        response.then().statusCode(statusCode);
    }

    @Then("the response body matches:")
    public void responseBody(String expectedBody) {
        // Compare JSON; for a full match use JsonAssert or parse both documents
        response.then().body(equalTo(expectedBody));
    }
}
```

> The glue step patterns must match the steps written in the generated `.feature` files exactly (see [references/step-patterns.md](references/step-patterns.md)).

#### 2.5 Run the Tests

```bash
./mvnw test
# or
mvn test
```

Reports land in `target/cucumber-reports/` (both `cucumber.html` and `cucumber.json`).

#### 2.6 (Optional) Advanced Quarkus Cucumber Features

See [references/quarkus-cucumber-setup.md](references/quarkus-cucumber-setup.md) for:
- `@ScenarioScope` — CDI beans whose state resets per scenario
- `@BeforeScenario` / `@AfterScenario` lifecycle events with `ScenarioEvent`
- Database reset observers
- Conditional setup by tag
- Failure logging
- Test metrics
- IDE integration (IntelliJ)

## Run and Split Reports

After tests run with `./mvnw test`, Cucumber produces `target/cucumber-reports/cucumber.json` and `cucumber.html`. Use `scripts/split-cucumber-report.js` to split the JSON report into separate HTML files and optionally generate PDFs:

```bash
# HTML only
node scripts/split-cucumber-report.js

# HTML + PDF (requires Edge or Chrome)
node scripts/split-cucumber-report.js --pdf

# PDF only
node scripts/split-cucumber-report.js --pdf-only
```

Outputs in `target/cucumber-reports/`:
- `cucumber-all.html` — ALL scenarios
- `cucumber-passed.html` — PASSED scenarios only
- `cucumber-failed.html` — FAILED scenarios only
- Optionally: `cucumber-all.pdf`, `cucumber-passed.pdf`, `cucumber-failed.pdf`

## Output Format

Generate `.feature` files in the standard Cucumber format and place them in `src/test/resources/features/`. For API scenarios, include the API contract and `Examples`:

```gherkin
@api @tag2
Feature: Feature Name
  Description of the feature

  # API Contract
  #   POST /api/v1/feature
  #   Request:  { "field": "value" }
  #   Response: 201 -> { "id": "1" }

  Background:
    Given the API endpoint is available

  Scenario Outline: Scenario Name
    Given the API <HTTP_METHOD> <ENDPOINT> is available
    When a request is sent with:
      """
      <REQUEST_BODY>
      """
    Then a <STATUS_CODE> response is returned
    And the response body matches:
      """
      <RESPONSE_BODY>
      """

    Examples:
      | HTTP_METHOD | ENDPOINT          | REQUEST_BODY                  | STATUS_CODE | RESPONSE_BODY                        |
      | POST        | /api/v1/feature   | {"field": "value"}            | 201         | {"id": "1", "status": "CREATED"}     |
      | POST        | /api/v1/feature   | {}                            | 400         | {"message": "field is required"}     |
```

## Example: Payment Service API Feature

```gherkin
@api @domain-payment @smoke
Feature: Payment Processing
  As a payment processor
  I want to process payments securely
  So that transactions are completed accurately and reliably

  # API Contract
  #   POST /api/v1/payments
  #   Request:  { "amount": decimal, "currency": "IDR", "card_token": string }
  #   Response:
  #     201 -> { "transaction_id": string, "status": "SUCCESS" }
  #     400 -> { "message": string }   (invalid payload)
  #     401 -> { "message": string }   (unauthorized)
  #     402 -> { "message": string }   (insufficient balance)

  Background:
    Given the payment API is available at /api/v1/payments

  Scenario Outline: Process a payment with a valid request
    Given an authenticated merchant
    When a POST request is sent to /api/v1/payments with payload:
      """
      <REQUEST_BODY>
      """
    Then a <STATUS_CODE> response is returned
    And the response body matches:
      """
      <RESPONSE_BODY>
      """

    Examples:
      | REQUEST_BODY                                              | STATUS_CODE | RESPONSE_BODY                                            |
      | {"amount": 100.00, "currency": "IDR", "card_token": "tok"} | 201         | {"transaction_id": "t-001", "status": "SUCCESS"}         |
      | {"amount": 0, "currency": "IDR", "card_token": "tok"}      | 400         | {"message": "amount must be greater than 0"}             |
      | {"amount": 100.00, "currency": "IDR"}                      | 400         | {"message": "card_token is required"}                    |
      | {"amount": 100.00, "currency": "IDR", "card_token": "tok"} | 401         | {"message": "unauthorized"}                              |
      | {"amount": 100.00, "currency": "IDR", "card_token": "tok"} | 402         | {"message": "insufficient balance"}                      |

  Scenario: Free Frieda processes a valid payment
    Given Free Frieda has sufficient balance
    When she processes a payment of $100.00
    Then the payment is completed successfully
    And her balance is reduced by $100.00

  Scenario: Free Frieda attempts to process a payment with insufficient balance
    Given Free Frieda has insufficient balance
    When she attempts to process a payment of $100.00
    Then the payment is rejected
    And she sees an error message about insufficient funds
```

## Setup Mode Behavior

When using `setup` mode (`scripts/run-cucumber-quarkus.sh --mode setup`):

1. The script checks for existing `.feature` files under `src/test/resources/features/`.
2. If `.feature` files are found, it proceeds with setup: adds the `quarkus-cucumber` dependency, creates `RunCucumberTest`, `cucumber.properties`, and `ApiSteps.java`.
3. If no `.feature` files are found, setup warns the user and suggests generating at least one feature first (`--mode generate` or `--mode full`).

## Review Checklist

Before finalizing, verify:

- [ ] `.feature` files are placed under `src/test/resources/features/`
- [ ] Feature header describes the capability, not the implementation
- [ ] Scenarios describe behavior in business terms
- [ ] API scenarios state the HTTP method, endpoint, request, and response
- [ ] API scenarios include `Examples` covering happy path, negative case, and edge case
- [ ] Quarkus Cucumber dependency added to `pom.xml`
- [ ] Bootstrap test class extends `CucumberQuarkusTest` exists
- [ ] `cucumber.properties` configures HTML and JSON reports
- [ ] Step definitions (glue code) exist for the generated steps
- [ ] `./mvnw test` runs the features and produces `target/cucumber-reports/cucumber.html` and `cucumber.json`
- [ ] `scripts/split-cucumber-report.js` can split `cucumber.json` into HTML/PDF reports

## Severity Levels for Findings

| Severity | Meaning | Action |
|---|---|---|
| **HIGH** | Violates BDD principles. Must be rewritten. | Blocking |
| **MED** | Implementation details leaked. Should refactor. | Non-blocking |
| **LOW** | Minor style issue. Nice to fix. | Advisory |
| **INFO** | Suggestion for improvement. | Informational |

**API Completeness Severity:**

| Severity | Meaning | Action |
|---|---|---|
| **HIGH** | API scenario missing HTTP method, endpoint, request, or response. | Blocking |
| **MED** | API scenario lacks `Examples` covering negative/edge cases. | Non-blocking |
| **INFO** | API contract could be more detailed (e.g., headers, validation rules). | Informational |

**Quarkus Setup Severity:**

| Severity | Meaning | Action |
|---|---|---|
| **HIGH** | No `CucumberQuarkusTest` bootstrap class or missing dependency; features cannot run. | Blocking |
| **MED** | Reports (HTML/JSON) not configured in `cucumber.properties`. | Non-blocking |
| **INFO** | Step definitions could be shared/reused across features. | Informational |
