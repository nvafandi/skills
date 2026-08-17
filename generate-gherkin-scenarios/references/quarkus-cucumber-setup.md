# Quarkus Cucumber Setup

Bootstrap Cucumber testing in a Quarkus repository. Based on the official **Quarkus Cucumber** extension documentation: https://docs.quarkiverse.io/quarkus-cucumber/dev/index.html

## Prerequisites

- A Quarkus Maven project (`pom.xml` present)
- `RestAssured` (usually included with `quarkus-junit5`) for HTTP assertions, or use Quarkus REST Client

## 1. Add the Dependency

`pom.xml`:

```xml
<dependency>
    <groupId>io.quarkiverse.cucumber</groupId>
    <artifactId>quarkus-cucumber</artifactId>
    <version>1.3.0</version>
    <scope>test</scope>
</dependency>
```

> Check Maven Central for the latest version (may be newer than `1.3.0`).

## 2. Bootstrap Test Class

`src/test/java/<package>/RunCucumberTest.java`:

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

This bootstraps Cucumber and automatically discovers any `.feature` files and step classes (glue code) on the test classpath.

## 3. Feature Files Location

`.feature` files **MUST** be under test resources so Cucumber discovers them from the classpath:

```
src/test/resources/features/
├── payment/
│   └── process-payment.feature
└── user/
    └── login.feature
```

## 4. Reports (HTML + JSON)

`src/test/resources/cucumber.properties`:

```properties
cucumber.plugin=pretty, html:target/cucumber-reports/cucumber.html, json:target/cucumber-reports/cucumber.json
cucumber.execution.parallel.enabled=false
```

Output after `./mvnw test`:
- `target/cucumber-reports/cucumber.html` — HTML report
- `target/cucumber-reports/cucumber.json` — JSON report (machine-readable, CI-friendly)

Alternatively, configure plugins on the test class:

```java
import io.cucumber.junit.CucumberOptions;

@CucumberOptions(plugin = {
    "pretty",
    "html:target/cucumber-reports/cucumber.html",
    "json:target/cucumber-reports/cucumber.json"
})
public class RunCucumberTest extends CucumberQuarkusTest { }
```

## 5. Step Definitions (Glue Code)

Place glue classes under `src/test/java/<package>/steps/`. Steps must match the text in the `.feature` files. Example matching the generated API feature steps:

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
        response.then().body(equalTo(expectedBody));
    }
}
```

## 6. Run

```bash
./mvnw test
# or
mvn test
```

## Setup Checklist

- [ ] `io.quarkiverse.cucumber:quarkus-cucumber` test dependency added to `pom.xml`
- [ ] `RunCucumberTest extends CucumberQuarkusTest` annotated with `@QuarkusTest` exists
- [ ] `.feature` files placed under `src/test/resources/features/`
- [ ] `cucumber.properties` configures `html:` and `json:` plugins (or `@CucumberOptions`)
- [ ] Step definitions (glue) exist and match the `.feature` step text
- [ ] `./mvnw test` produces `target/cucumber-reports/cucumber.html` and `cucumber.json`

## 7. @ScenarioScope

`@ScenarioScope` defines beans whose state is tied to the lifecycle of a Cucumber scenario. State resets automatically between scenarios (no manual cleanup).

```java
package com.example;

import io.quarkiverse.cucumber.ScenarioScope;

@ScenarioScope
public class MyStatefulBean {
    private String state;

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
}
```

Injected into step definitions — each scenario gets its own instance:

```java
package com.example.steps;

import jakarta.inject.Inject;
import io.cucumber.java.en.Given;
import com.example.MyStatefulBean;

public class MyStepDefinitions {

    @Inject
    MyStatefulBean myStatefulBean;

    @Given("I set the state to {string}")
    public void setState(String state) {
        myStatefulBean.setState(state);
    }
}
```

## 8. Scenario Lifecycle Events

The extension fires CDI events at the start and end of each scenario using the familiar `@Observes` pattern:

- `@BeforeScenario` — Fired when a scenario starts, before any steps execute
- `@AfterScenario` — Fired when a scenario finishes (regardless of pass/fail status)

### ScenarioEvent API

| Method | Description |
|---|---|
| `getName()` | The scenario name as defined in the feature file |
| `getUri()` | The URI of the feature file containing this scenario |
| `getLine()` | The line number of the scenario in the feature file |
| `getTags()` | Collection of tags (e.g., `@smoke`, `@regression`) |
| `getStatus()` | Execution status (`PASSED`, `FAILED`, `SKIPPED`) — only in `@AfterScenario` |
| `isFailed()` / `isPassed()` | Convenience methods for checking the result |
| `getTestCase()` | Access to the underlying Cucumber `TestCase` for advanced use cases |

### Basic Example

```java
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import io.quarkiverse.cucumber.BeforeScenario;
import io.quarkiverse.cucumber.AfterScenario;
import io.quarkiverse.cucumber.ScenarioEvent;

@ApplicationScoped
public class TestSetupObserver {

    public void onBeforeScenario(@Observes @BeforeScenario ScenarioEvent event) {
        System.out.println("Starting scenario: " + event.getName());
    }

    public void onAfterScenario(@Observes @AfterScenario ScenarioEvent event) {
        System.out.println("Finished scenario: " + event.getName() + " - " + event.getStatus());
    }
}
```

### Use Case: Database Reset

```java
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import io.quarkiverse.cucumber.BeforeScenario;
import io.quarkiverse.cucumber.ScenarioEvent;

@ApplicationScoped
public class DatabaseResetObserver {

    @Inject
    EntityManager em;

    @Transactional
    public void resetDatabase(@Observes @BeforeScenario ScenarioEvent event) {
        em.createQuery("DELETE FROM Order").executeUpdate();
        em.createQuery("DELETE FROM Customer").executeUpdate();
        em.persist(new Customer("test-user", "test@example.com"));
    }
}
```

### Use Case: Conditional Setup by Tag

```java
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import io.quarkiverse.cucumber.BeforeScenario;
import io.quarkiverse.cucumber.AfterScenario;
import io.quarkiverse.cucumber.ScenarioEvent;

@ApplicationScoped
public class ConditionalSetupObserver {

    @Inject
    MockServerClient mockServer;

    public void setupMocks(@Observes @BeforeScenario ScenarioEvent event) {
        if (event.getTags().contains("@external-api")) {
            mockServer.when(request().withPath("/api/users"))
                      .respond(response().withBody("{\"id\": 1}"));
        }
    }

    public void cleanupMocks(@Observes @AfterScenario ScenarioEvent event) {
        if (event.getTags().contains("@external-api")) {
            mockServer.reset();
        }
    }
}
```

### Use Case: Failure Logging

```java
import java.util.logging.Logger;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import io.quarkiverse.cucumber.AfterScenario;
import io.quarkiverse.cucumber.ScenarioEvent;

@ApplicationScoped
public class FailureHandler {

    private static final Logger LOG = Logger.getLogger(FailureHandler.class.getName());

    public void handleFailure(@Observes @AfterScenario ScenarioEvent event) {
        if (event.isFailed()) {
            LOG.severe("Scenario FAILED: " + event.getName() +
                    " (line " + event.getLine() + " in " + event.getUri() + ")");
            LOG.severe("Tags: " + event.getTags());
        }
    }
}
```

### Use Case: Test Metrics

```java
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkiverse.cucumber.BeforeScenario;
import io.quarkiverse.cucumber.AfterScenario;
import io.quarkiverse.cucumber.ScenarioEvent;

@ApplicationScoped
public class TestMetricsObserver {

    private final Map<String, Long> scenarioStartTimes = new ConcurrentHashMap<>();

    @Inject
    MeterRegistry registry;

    public void startTimer(@Observes @BeforeScenario ScenarioEvent event) {
        scenarioStartTimes.put(event.getName(), System.currentTimeMillis());
    }

    public void recordMetrics(@Observes @AfterScenario ScenarioEvent event) {
        Long startTime = scenarioStartTimes.remove(event.getName());
        if (startTime != null) {
            long duration = System.currentTimeMillis() - startTime;
            registry.timer("cucumber.scenario.duration",
                    "name", event.getName(),
                    "status", event.getStatus().toString())
                    .record(duration, TimeUnit.MILLISECONDS);
        }
    }
}
```

### Combining ScenarioScope with Lifecycle Events

`@BeforeScenario` fires before the scenario context is activated; `@AfterScenario` fires before the context is destroyed — so state set in observers is visible in `@ScenarioScope` beans:

```java
@ScenarioScope
public class TestContext {
    private String authToken;
    // getters/setters
}

@ApplicationScoped
public class AuthSetupObserver {

    @Inject
    TestContext testContext;

    @Inject
    AuthService authService;

    public void setupAuth(@Observes @BeforeScenario ScenarioEvent event) {
        if (event.getTags().contains("@authenticated")) {
            String token = authService.login("test-user", "password");
            testContext.setAuthToken(token);
        }
    }
}
```

## 9. IDE Integration

The test class can be run by any IDE with JUnit5 support. In IntelliJ you can run `.feature` files directly when the `main` method is present:

```java
public class RunCucumberTest extends CucumberQuarkusTest {
    public static void main(String[] args) {
        runMain(RunCucumberTest.class, args);
    }
}