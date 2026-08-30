# Quick Reference

Fast lookup for patterns, issues, and commands during Quarkus refactoring.

> For full code examples of all patterns, see [entity-mapper-metrics.md](entity-mapper-metrics.md) (layer patterns) and [refactoring-patterns.md](refactoring-patterns.md) (recipes).

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
| `CircularDependencyException` after refactor | Break the cycle: extract shared logic into a third bean, or use `Instance<T>` / `Supplier<T>` |

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

### Startup Verification (Phase 17)
```bash
curl -f http://localhost:8080/q/health     # expect {"status":"UP",...}
```

## Performance Tips

1. Use `@Transactional(readOnly = true)` on read-only methods
2. Enable `quarkus.hibernate-orm.statistics=true` for query analysis
3. Use connection pooling (Agroal by default)
4. Batch inserts with `EntityManager.flush()` + `clear()`
5. Index frequently queried columns
6. Avoid N+1 queries — use JOIN FETCH or entity graphs
7. Use Panache projections for read-only queries
8. Use Java Streams instead of manual collection loops

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
