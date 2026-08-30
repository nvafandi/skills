# PruForce Engineering Standards

Architectural and coding standards that all Quarkus services must follow.

## Core Principles

- Layered Architecture: Resource → Service → Repository → Entity
- Package Structure: `com.prudential.pruforce.aob.{function}.{layer}`
- Standardized API Responses via `ApiResponse<T>` wrapper
- Rigorous Exception Handling with `DomainException` hierarchy
- Constructor-only DI (no field injection)
- Bean Validation on all request DTOs
- Comprehensive Testing (unit + integration)

## Critical Rules

| # | Rule | Detail |
|---|---|---|
| 1 | No private field injection | Use constructor injection or package-private `@Inject` fields (GraalVM native: private members require reflection) |
| 2 | Money always BigDecimal | `@Column(precision = 19, scale = 2)` — never `double`/`float` |
| 3 | Standardized responses | All Resource endpoints return `ApiResponse<Response DTO>` — never raw entities; Service returns Response DTO only |
| 4 | Exception hierarchy | All custom exceptions extend `DomainException`; handled by `@ServerExceptionMapper` |
| 5 | `@Identifier` over `@Named` | `@Named` auto-adds `@Default` causing ambiguity; use `@io.smallrye.common.annotation.Identifier` instead |
| 6 | Java Streams | Use `filter`/`map`/`collect` pipelines instead of manual `for`/`for-each` loops |
| 7 | Log with JBoss Logging | `private static final Logger log = Logger.getLogger(X.class)` — no `@Slf4j`, no `System.out` |
| 8 | Extract magic values | Domain constants → `{Domain}Constants`; query literals → `{Domain}QueryConstants`; env values → `@ConfigProperty` |

> For code examples of each rule, see [refactoring-patterns.md](refactoring-patterns.md). For layer patterns and cross-layer sync, see [entity-mapper-metrics.md](entity-mapper-metrics.md).

## Quality Gates Checklist

- [ ] **Architecture:** All layers present (API, Service, Repository, Entity, Mapper, Exception, Config)
- [ ] **Naming:** Package structure follows `com.prudential.pruforce.aob.{function}.{layer}`
- [ ] **Injection:** Constructor or package-private `@Inject` — no private member injection
- [ ] **DTOs:** Separate Request/Response DTOs with `@Valid` on request DTOs
- [ ] **Responses:** All endpoints return `ApiResponse<T>`
- [ ] **Exceptions:** Custom exceptions extend `DomainException`
- [ ] **Logging:** JBoss Logging field on services; no `System.out`/`printStackTrace`
- [ ] **Tests:** Unit tests (mocked) + Integration tests (`@QuarkusTest`)
- [ ] **Documentation:** OpenAPI annotations + Javadoc
- [ ] **Configuration:** No hardcoded values; env-specific via `@ConfigProperty`; domain values in `constants/`
- [ ] **Transactions:** `@Transactional` on write operations
- [ ] **Validation:** Bean Validation on request DTOs
- [ ] **Streams:** Collection iteration uses Java Streams
- [ ] **CDI:** No `@Named` for DI resolution; use `@Identifier`
- [ ] **Lombok:** No `@RequiredArgsConstructor` for services; no `@Slf4j`; explicit constructors

## Common Mistakes

| Pattern | Fix |
|---|---|
| `@Inject private` field | Use constructor injection or package-private field |
| Dummy no-args constructors | Remove — Quarkus generates them for normal scoped beans |
| `@Named("foo")` for DI | Replace with `@Identifier("foo")` |
| Raw entity return | Wrap in `ApiResponse<T>` with Response DTO |
| `double` for money | Change to `BigDecimal` |
| `System.out`/`printStackTrace` | Use JBoss Logging `log` field |
| Manual `for`/`for-each` loops | Use Java Streams |
| Inline query literals | Move to `{Domain}QueryConstants` |
| God class (multiple concerns) | Split into focused services (SRP) |
| Switch/if-else chains for types | Use strategy pattern (OCP) |
| Concrete class injection | Inject interface, not implementation (DIP) |
