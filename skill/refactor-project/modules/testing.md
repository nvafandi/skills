# Module: Testing

Refactor test infrastructure to Quarkus Test patterns and ensure compliance with engineering standards.

## What to do

- [ ] Replace `@SpringBootTest` with `@QuarkusTest` (if any remain)
- [ ] Replace `@MockBean` with `@InjectMock` (`io.quarkus.test.InjectMock`)
- [ ] Replace `TestRestTemplate` with REST Assured
- [ ] Replace `@ActiveProfiles("test")` with `@TestProfile`
- [ ] Replace `@LocalServerPort` with `@TestHTTPResource`
- [ ] Update test properties (use `%test.` prefix in `application.properties`)
- [ ] Verify test dependencies include `quarkus-junit5`, `rest-assured`, `quarkus-junit5-mockito`
- [ ] Run tests: `./mvnw test` (Maven) or `./gradlew test` (Gradle)

## Key Conversions

```java
// BEFORE: Spring Boot Test
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class TodoControllerTest {
    @Autowired TestRestTemplate restTemplate;
    @MockBean TodoService todoService;

    @Test
    void shouldListTodos() {
        when(todoService.findAll()).thenReturn(List.of(new Todo("Test")));
        ResponseEntity<String> response = restTemplate.getForEntity("/todos", String.class);
        assertEquals(200, response.getStatusCode().value());
    }
}

// AFTER: Quarkus Test
@QuarkusTest
public class TodoResourceTest {
    @InjectMock TodoService todoService;

    @Test
    void shouldListTodos() {
        when(todoService.findAll()).thenReturn(List.of(new Todo("Test")));
        given()
            .when().get("/todos")
            .then().statusCode(200);
    }
}
```

### Profile Activation: `@ActiveProfiles` → `@TestProfile`

Spring's `@ActiveProfiles("test")` has no direct annotation equivalent. Use `%test.` properties for simple overrides, or a profile class for grouped behavior:

```java
// Simple case — no class needed; put overrides in application.properties:
// %test.quarkus.datasource.devservices.enabled=false
// %test.app.feature-flag=off

// Grouped case — QuarkusTestProfile:
public class NoDevServicesProfile implements QuarkusTestProfile {
    @Override
    public Map<String, String> getConfigOverrides() {
        return Map.of(
            "quarkus.datasource.devservices.enabled", "false",
            "app.external-api.url", "http://localhost:8089/stub"
        );
    }
}

@QuarkusTest
@TestProfile(NoDevServicesProfile.class)
class TodoResourceIT {
    // tests
}
```

> Note: `@TestProfile` starts a **new application instance** per profile. Group tests that need identical config into the same profile class to avoid slow restarts.

### Transactional Tests: `@Transactional` → `@TestTransaction`

Spring rolls back test transactions automatically. In Quarkus, annotate the test method with `@TestTransaction` (from `io.quarkus.test.TestTransaction`) to get the same rollback-per-test behavior:

```java
@QuarkusTest
class TodoRepositoryTest {
    @Inject TodoRepository repository;

    @Test
    @TestTransaction
    void shouldPersistTodo() {
        var todo = new Todo();
        todo.setTitle("persisted");
        repository.persist(todo);
        assertThat(repository.findById(todo.getId())).isPresent();
        // rolled back automatically after the test
    }
}
```

### Port Injection: `@LocalServerPort` → `@TestHTTPResource`

```java
@QuarkusTest
class HealthEndpointTest {
    @TestHTTPResource("/q/health")
    URL healthUrl;

    @Test
    void healthIsUp() throws Exception {
        given().get(healthUrl).then().statusCode(200);
    }
}
```

## Test Dependencies

**Maven:**
```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-junit5</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>io.rest-assured</groupId>
    <artifactId>rest-assured</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-junit5-mockito</artifactId>
    <scope>test</scope>
</dependency>
```

**Gradle:**
```groovy
testImplementation 'io.quarkus:quarkus-junit5'
testImplementation 'io.rest-assured:rest-assured'
testImplementation 'io.quarkus:quarkus-junit5-mockito'
```

Also verify:
- JUnit 5 assertions are on the classpath (`org.junit.jupiter:junit-jupiter`) — Quarkus tests do not run under JUnit 4.
- Surefire/Failsafe plugin version is 3.x (JUnit platform support). For integration tests, wire `quarkus:integration-test` via Failsafe and name them `*IT.java`.

## Lifecycle Differences from Spring

| Aspect | Spring Boot | Quarkus |
|---|---|---|
| Application start | New context per test class by default | Single app instance shared across all `@QuarkusTest` classes (unless a different `@TestProfile` forces restart) |
| `@BeforeAll` | May be non-static with `@TestInstance` | Must be `static` |
| Mock reset | `@MockBean` re-created per context | `@InjectMock` mocks are reset per test method |
| Static state | Persists per context | **Persists across ALL test classes sharing an instance** — never rely on static mutable state |

## Watch out

- **`@InjectMock` package**: Use `io.quarkus.test.InjectMock` (since Quarkus 3.2). The old `io.quarkus.test.junit.mockito.InjectMock` is removed in 4.0. For `@Singleton`/final classes use `io.quarkus.test.InjectMock` with `@InjectMock` + `convertScopes=true`, or restructure the bean to allow proxying.
- **Test port**: Quarkus tests default to port 8081. If your app uses 8081, set `quarkus.http.test-port=0`.
- **No `@WebMvcTest` equivalent**: Use `@QuarkusTest` for all test types; slice tests don't exist. Keep unit tests plain Mockito (no `@QuarkusTest`) so they run fast without booting Quarkus.
- **Dev Services**: If Docker is unavailable, disable DB Dev Services in tests with `%test.quarkus.datasource.devservices.enabled=false` and supply a real datasource, otherwise tests hang waiting for a container.
- **Continuous Testing**: Quarkus can run tests continuously in dev mode (`quarkus:dev` press `e`). Mention it to the user as a follow-up tool, but verification still uses `./mvnw test`.

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| `IllegalStateException: POJO property serialization ...` at startup | Test config invalid | Check `%test.` property names for typos |
| Tests hang ~60s then fail | Dev Services waiting for Docker | Disable Dev Services or start Docker |
| `NoClassDefFoundError: io/rest-assured/...` | Missing REST Assured dependency | Add `io.rest-assured:rest-assured` (test scope) |
| `InjectionException` for `@InjectMock` on final class | Mocking non-proxyable bean | Drop `final`, or mock the interface instead |
| Tests pass individually, fail together | Shared static state across the single app instance | Remove static mutability; use `@BeforeEach` resets |
