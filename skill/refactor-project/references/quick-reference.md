# Quick Reference

Fast lookup for common patterns, code snippets, and troubleshooting for Quarkus refactoring.

## Code Snippet Library

### REST Resource (Quarkus JAX-RS)
```java
@Path("/api/v1/{domain}")
@ApplicationScoped
public class {Domain}Resource {

    private final {Domain}Service service;

    public {Domain}Resource({Domain}Service service) {
        this.service = service;
    }

    @POST
    @Transactional
    public ApiResponse<{Domain}Response> create(@Valid Create{Domain}Request request) {
        {Domain}Response response = service.create(request);
        return ApiResponse.success(response, "{Domain} created successfully");
    }

    @GET
    @Path("/{id}")
    public ApiResponse<{Domain}Response> getById(@PathParam("id") Long id) {
        {Domain}Response response = service.getById(id);
        return ApiResponse.success(response);
    }
}
```

### Service Class
```java
@ApplicationScoped
public class {Domain}Service {

    private static final Logger log = Logger.getLogger({Domain}Service.class);

    private final {Domain}Repository repository;
    private final {Domain}Mapper mapper;

    public {Domain}Service({Domain}Repository repository, {Domain}Mapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional
    public {Domain}Response create(Create{Domain}Request request) {
        log.info("Creating {} with: {}", "{domain}", request);
        {Domain} entity = mapper.toEntity(request);
        {Domain} saved = repository.save(entity);
        return mapper.toResponse(saved);
    }
}
```

### Panache Repository
```java
@ApplicationScoped
public interface {Domain}Repository extends PanacheRepository<{Domain}> {

    List<{Domain}> findByStatus(Status status);
}

@ApplicationScoped
public class {Domain}RepositoryImpl implements {Domain}Repository {

    @Override
    public List<{Domain}> findByStatus(Status status) {
        return find("status", status).list();
    }
}
```

### ApiResponse Wrapper
```java
public class ApiResponse<T> {
    private int status;
    private String message;
    private T data;
    private List<String> errors;
    private LocalDateTime timestamp;

    public static <T> ApiResponse<T> success(T data) { ... }
    public static <T> ApiResponse<T> success(T data, String message) { ... }
    public static <T> ApiResponse<T> error(int status, String message) { ... }
}
```

### Exception Hierarchy
```java
public abstract class DomainException extends RuntimeException {
    private final int status;
    private final List<String> errors;
    // constructors and getters
}

public class {Domain}NotFoundException extends DomainException {
    public {Domain}NotFoundException(String message) {
        super(message, 404);
    }
}
```

### Global Exception Handler
```java
@Provider
public class GlobalExceptionHandler {

    @ServerExceptionMapper
    public RestResponse<ApiResponse<Void>> handleDomainException(DomainException ex) {
        ApiResponse<Void> response = ApiResponse.error(ex.getStatus(), ex.getMessage());
        return RestResponse.status(ex.getStatus()).entity(response).build();
    }
}
```

### CDI Bean with Package-Private Injection (Quarkus Native-Friendly)
```java
@ApplicationScoped
public class {Domain}Service {

    private static final Logger log = Logger.getLogger({Domain}Service.class);

    // Package-private injection points — avoid reflection in native executables
    @Inject
    {Domain}Repository repository;

    @Inject
    {Domain}Mapper mapper;

    // Simplified constructor injection — no dummy no-args constructor needed
    // @Inject is optional when there is only one constructor
    {Domain}Service({Domain}Repository repository, {Domain}Mapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }
}
```

### Using @Identifier Instead of @Named
```java
// @Named auto-adds @Default and causes ambiguity errors. Use @Identifier instead.
@ApplicationScoped
public class Producers {
    @Produces MyBean produce() { ... }
    @Produces @Identifier("foo") MyBean produceFoo() { ... }
}
```

### Java Streams for Collection Processing
```java
// Filter + map + collect
List<TodoResponse> completed = todos.stream()
        .filter(Todo::isCompleted)
        .map(mapper::toResponse)
        .toList();

// Sum a numeric property
double total = items.stream()
        .mapToDouble(Item::getAmount)
        .sum();

// Build a map
Map<String, TodoResponse> byId = todos.stream()
        .collect(Collectors.toMap(Todo::getId, mapper::toResponse));

// Find first match
TodoResponse found = todos.stream()
        .filter(todo -> todo.getId().equals(id))
        .findFirst()
        .map(mapper::toResponse)
        .orElse(null);

// Group by property
Map<Status, List<Todo>> byStatus = todos.stream()
        .collect(Collectors.groupingBy(Todo::getStatus));

// Join strings
String ids = todos.stream()
        .map(Todo::getId)
        .collect(Collectors.joining(", "));
```

## Common Issues and Solutions

| Issue | Solution |
|---|---|
| `@Transactional` not working | Use `jakarta.transaction.Transactional`, add `quarkus-narayana-jta` |
| Lazy loading fails | Quarkus has no OSIV. Fetch eagerly or use `@Transactional` |
| Panache queries fail | Ensure `quarkus-datasource` extension present |
| `@ConfigProperty` not injecting | Ensure `quarkus-arc` extension present |
| Jackson serialization fails | Add `quarkus-rest-jackson` extension |
| Tests fail with "No active context" | Use `@QuarkusTest` instead of `@SpringBootTest` |
| Manual loops over collections | Replace `for`/`for-each` with Java Streams (`filter`/`map`/`collect`) |
| Native image too large | Remove private injected fields/methods — use package-private modifiers (no reflection needed) |
| `AmbiguousResolutionException` with `@Named` | Replace `@Named` with `@Identifier` (per Quarkus CDI reference) |
| Dummy no-args constructor boilerplate | Remove — Quarkus generates no-args constructors for normal scoped beans automatically |
| Port 8080 already in use in dev mode | `quarkus.http.port=0` (random) or stop the other process; tests use `quarkus.http.test-port` (default 8081) |
| `%test.` properties ignored | Prefix must be exactly `%test.` in the main `application.properties`; profile files (`application-prod.yml`) are a Spring pattern — merge them |
| Startup check fails with no database | Enable Dev Services (Docker required) or point at a reachable DB; record SKIPPED if neither is possible |
| Health endpoint 404 | Add `quarkus-smallrye-health`; endpoints live under `/q/health`, `/q/health/live`, `/q/health/ready` |
| `CircularDependencyException` after refactor | Break the cycle: extract shared logic into a third bean, or use `@Lazy`-equivalent provider injection (`Instance<T>` / `Supplier<T>`) |

## Build and Deployment Commands

### Maven
```bash
./mvnw clean compile -DskipTests   # Compile
./mvnw clean package -DskipTests   # Build JAR
./mvnw test                        # Run tests
./mvnw quarkus:dev                 # Dev mode
./mvnw package -Pnative            # Native image
```

### Gradle
```bash
./gradlew clean compileJava -x test  # Compile
./gradlew clean build -x test        # Build
./gradlew test                       # Run tests
./gradlew quarkusDev                 # Dev mode
```

### Startup Verification (Phase 17 check)
```bash
# Start dev mode in background, then verify health:
curl -f http://localhost:8080/q/health     # expect {"status":"UP",...}
# Stop dev mode afterwards (Ctrl-C or kill the process) before continuing.
```

## Performance Tips

1. Use `@Transactional(readOnly = true)` on read-only methods
2. Enable `quarkus.hibernate-orm.statistics=true` for query analysis
3. Use connection pooling (Agroal by default)
4. Batch inserts with `EntityManager.flush()` + `clear()`
5. Index frequently queried columns
6. Avoid N+1 queries — use JOIN FETCH or entity graphs
7. Use Panache projections for read-only queries
8. Use Java Streams (`filter`/`map`/`collect`) instead of manual collection loops

## Security Considerations

1. Never log sensitive data
2. Use parameterized queries
3. Validate all request DTOs
4. Sanitize error messages
5. Use HTTPS in production
6. Configure CORS via `quarkus.http.cors`
7. Add security headers (HSTS, X-Content-Type-Options, X-Frame-Options)

## Version Compatibility

| Component | Minimum | Recommended |
|---|---|---|
| Java | 21 | 21+ |
| Quarkus | 3.10 | Latest 3.x |
| Maven | 3.8 | 3.9+ |
| Gradle | 8.5 | 8.7+ |
