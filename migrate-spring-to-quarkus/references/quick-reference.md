# Quick Reference

Fast lookup for common patterns, code snippets, and troubleshooting. This complements `dependency-map.md`, `annotation-map.md`, and `config-map.md` by providing practical snippets and solutions not covered in those files.

## Code Snippet Library

### REST Resource (Quarkus JAX-RS)
```java
@Path("/api/v1/{domain}")
@ApplicationScoped
@Slf4j
public class {Domain}Resource {

    private final {Domain}Service service;

    public {Domain}Resource({Domain}Service service) {
        this.service = service;
    }

    @POST
    @Transactional
    public ApiResponse<{Domain}Response> create(@Valid @RequestBody Create{Domain}Request request) {
        log.info("Creating {}: {}", "{domain}", request);
        {Domain}Response response = service.create(request);
        return ApiResponse.success(response, "{Domain} created successfully");
    }

    @GET
    @Path("/{id}")
    public ApiResponse<{Domain}Response> getById(@PathParam("id") Long id) {
        log.info("Fetching {}: {}", "{domain}", id);
        {Domain}Response response = service.getById(id);
        return ApiResponse.success(response);
    }
}
```

### Service Class
```java
@ApplicationScoped
@Slf4j
public class {Domain}Service {

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

    @Transactional(readOnly = true)
    public {Domain}Response getById(Long id) {
        log.info("Fetching {} with ID: {}", "{domain}", id);
        {Domain} entity = repository.findById(id)
            .orElseThrow(() -> new {Domain}NotFoundException("Not found: " + id));
        return mapper.toResponse(entity);
    }
}
```

### Panache Repository
```java
@ApplicationScoped
public class {Domain}Repository implements PanacheRepository<{Domain}> {

    public List<{Domain}> findByStatus(Status status) {
        return find("status", status).list();
    }

    public Page<{Domain}> findByStatus(Status status, int pageIndex, int pageSize) {
        return find("status", status).page(pageIndex, pageSize);
    }
}
```

### Entity with Audit Fields
```java
@Entity
@Table(name = "{domain}s")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class {Domain} {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(nullable = false, updatable = false, name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false, name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    private Long version;
}
```

### Mapper
```java
@ApplicationScoped
public class {Domain}Mapper {

    public {Domain} toEntity(Create{Domain}Request request) {
        return {Domain}.builder()
                .build();
    }

    public {Domain}Response toResponse({Domain} entity) {
        return {Domain}Response.builder()
                .id(entity.getId())
                .build();
    }
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

## Common Issues and Solutions

### Issue 1: `@Transactional` not working
**Symptom:** Transactions not rolling back on exceptions.
**Solution:** Ensure you're using `jakarta.transaction.Transactional` (not Spring's). Add `quarkus-narayana-jta` extension.

### Issue 2: Lazy loading fails outside transaction
**Symptom:** `LazyInitializationException` when accessing relationships.
**Solution:** Quarkus doesn't have Open Session in View. Fetch eagerly or use `@Transactional` on the reading method.

### Issue 3: Panache queries fail with "No data source"
**Symptom:** `IOException: No datasource".
**Solution:** Ensure `quarkus-datasource` extension is present. For dev/test, Quarkus Dev Services auto-starts a database.

### Issue 4: `@ConfigProperty` not injecting
**Symptom:** `NullPointerException` on `@ConfigProperty` fields.
**Solution:** Ensure `quarkus-arc` extension is present. Use `@ConfigProperty(name = "key")` with matching `application.properties`.

### Issue 5: Jackson serialization fails
**Symptom:** JSON serialization errors or missing fields.
**Solution:** Add `quarkus-resteasy-jackson` extension. Use `@JsonInclude(JsonInclude.Include.NON_NULL)` on response DTOs.

### Issue 6: Tests fail with "No active context"
**Symptom:** `Context is already active` or `No active contexts` errors.
**Solution:** Use `@QuarkusTest` instead of `@SpringBootTest`. Ensure test dependencies include `quarkus-junit5`.

## Testing Checklist

- [ ] Unit tests cover all service methods (happy path + edge cases)
- [ ] Unit tests use Mockito mocks (not real database)
- [ ] Integration tests use `@QuarkusTest`
- [ ] Integration tests use `@TestTransaction` for rollback
- [ ] Integration tests test REST endpoints with RestAssured
- [ ] Test data cleanup between tests
- [ ] Edge cases tested (null, empty, invalid input)
- [ ] Exception paths tested
- [ ] Validation errors tested

## Build and Deployment Commands

### Maven
```bash
# Compile
./mvnw clean compile -DskipTests

# Build JAR
./mvnw clean package -DskipTests

# Run tests
./mvnw test

# Run in dev mode
./mvnw quarkus:dev

# Build native image
./mvnw package -Pnative
```

### Gradle
```bash
# Compile
./gradlew clean compileJava -x test

# Build
./gradlew clean build -x test

# Run tests
./gradlew test

# Run in dev mode
./gradlew quarkusDev
```

## Performance Tips

1. **Use `@Transactional(readOnly = true)`** on read-only methods — enables query optimization
2. **Enable statistics** — Add `quarkus.hibernate-orm.statistics=true` for query analysis
3. **Use connection pooling** — Quarkus uses Agroal by default; tune pool size
4. **Batch inserts** — Use `@BatchProperty` and `EntityManager.flush()` + `clear()` for bulk operations
5. **Index frequently queried columns** — Add `@Index` annotations on entities
6. **Avoid N+1 queries** — Use JOIN FETCH or entity graphs
7. **Use Panache projections** — For read-only queries, use projection DTOs instead of full entities

## Security Considerations

1. **Never log sensitive data** — Exclude passwords, tokens, PII from logs
2. **Use parameterized queries** — Always use named parameters in Panache/JPQL
3. **Validate input** — All request DTOs must have Bean Validation
4. **Sanitize error messages** — Don't expose stack traces to clients
5. **Use HTTPS** — Configure TLS in production
6. **Rate limiting** — Consider `quarkus-vertx-web` for rate limiting
7. **CORS configuration** — Set `quarkus.http.cors` properties in production
8. **Security headers** — Add HSTS, X-Content-Type-Options, X-Frame-Options

## Version Compatibility Matrix

| Component | Minimum Version | Recommended | Notes |
|---|---|---|---|
| Java | 21 | 21+ | JDK 21+ required |
| Quarkus | 3.10 | Latest 3.x | Native image support |
| Maven | 3.8 | 3.9+ | Use mvnw wrapper |
| Gradle | 8.5 | 8.7+ | Use gradlew wrapper |
| PostgreSQL | 15 | 16 | JSONB support |
| MySQL | 8.0 | 8.0+ | JSON support |
| Panache | 3.10 | Latest | Included with Quarkus |