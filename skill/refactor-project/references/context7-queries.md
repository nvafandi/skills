# Context7 Dependency Queries

Use Context7 to query the latest documentation, versions, and patterns during Quarkus refactoring. This replaces hardcoded version assumptions with live data from the source.

## Available Libraries

| Library | Context7 ID | Use during |
|---------|-------------|------------|
| Quarkus | `/quarkusio/quarkus` | Check latest BOM version, extensions, migration guides |
| Quarkus Guides | `/websites/quarkus_io_guides` | Look up extension configuration, how-to guides |
| Hibernate ORM | `/hibernate/hibernate-orm` | Check Panache/Hibernate ORM version compatibility |
| Hibernate Validator | `/hibernate/hibernate-validator` | Bean Validation patterns and version |
| REST Assured | `/rest-assured/rest-assured` | Testing patterns with Quarkus |
| Spring Boot | `/spring-projects/spring-boot` | Source version for migration comparison |
| Micrometer | `/micrometer-metrics/micrometer` | Metrics patterns (`MeterRegistry`, `Timer`) used in the metrics module |
| SmallRye Health | `/smallrye/smallrye-health` | Health check endpoints (`/q/health`) for the startup verification |
| JUnit 5 | `/junit-team/junit5` | Test lifecycle differences when converting Spring tests |

## Common Queries

### Check Latest Quarkus Version

```
libraryId: /quarkusio/quarkus
query: "latest stable version, BOM version, release date"
```

Returns the current stable Quarkus version. Compare against the project's `quarkus.platform.version` property.

### Check Extension Compatibility

```
libraryId: /quarkusio/quarkus
query: "quarkus-rest-jackson, quarkus-hibernate-orm-panache, quarkus-arc latest version"
```

Verify the project uses current extension artifact names (e.g., `quarkus-rest` not the deprecated `quarkus-resteasy`).

### Check Migration Patterns

```
libraryId: /quarkusio/quarkus
query: "Spring Boot to Quarkus migration, dependency mapping"
```

Look up the correct Quarkus equivalent when a Spring dependency is found in the project.

### Check CDI Patterns

```
libraryId: /quarkusio/quarkus
query: "constructor injection, @ApplicationScoped, @Identifier, CDI native executable"
```

Verify CDI best practices for the target Quarkus version.

### Check Testing Setup

```
libraryId: /quarkusio/quarkus
query: "QuarkusTest, @InjectMock, REST Assured integration, test profile"
```

Verify the correct testing dependencies and patterns.

### Check Micrometer Metrics Patterns

```
libraryId: /quarkusio/quarkus
query: "Micrometer MeterRegistry Timer counter annotation @Counted @Timed"
```

Verify metric registration matches current Quarkus Micrometer support (programmatic vs annotation-based) before adding metrics.

### Check Panache Patterns

```
libraryId: /quarkusio/quarkus
query: "PanacheRepository, PanacheEntity, active record pattern"
```

Verify the correct Panache repository/entity patterns.

### Check Hibernate 6 / Jakarta Persistence

```
libraryId: /hibernate/hibernate-orm
query: "Hibernate 6 migration, Jakarta Persistence, naming strategy"
```

Check Hibernate 6 specifics when migrating from Spring Boot's Hibernate 5.

### Check Bean Validation

```
libraryId: /hibernate/hibernate-validator
query: "Jakarta Bean Validation, @Valid, constraint annotations"
```

Verify validation patterns match the target version.

## Spring Boot Smell Detection

Use Context7 to find correct Quarkus replacements for leftover Spring patterns found during cleanup.

### Look Up Spring Import Replacement

```
libraryId: /quarkusio/quarkus
query: "org.springframework.web.bind.annotation migration to Jakarta JAX-RS"
```

Example: Found `import org.springframework.web.bind.annotation.GetMapping` → replace with `import jakarta.ws.rs.GET`.

### Check Spring Annotation Mapping

```
libraryId: /quarkusio/quarkus
query: "@RestController, @Autowired, @Service, @Component Quarkus CDI equivalent"
```

Verify: `@RestController` → `@Path`, `@Service` → `@ApplicationScoped`, `@Autowired` → `@Inject`.

### Check Spring Dependency Replacement

```
libraryId: /quarkusio/quarkus
query: "spring-boot-starter-web to quarkus-rest, spring-boot-starter-data-jpa to quarkus-hibernate-orm-panache"
```

Verify the correct Quarkus extension for each Spring starter.

### Check Spring Config Property Mapping

```
libraryId: /quarkusio/quarkus
query: "spring.datasource.url, spring.jpa.hibernate.ddl-auto, server.port Quarkus property equivalent"
```

Example: `spring.datasource.url` → `quarkus.datasource.jdbc.url`.

### Check Spring Test Replacement

```
libraryId: /quarkusio/quarkus
query: "@SpringBootTest, @MockBean, TestRestTemplate Quarkus testing equivalent"
```

Verify: `@SpringBootTest` → `@QuarkusTest`, `@MockBean` → `@InjectMock`.

### Check Spring Security Replacement

```
libraryId: /quarkusio/quarkus
query: "@PreAuthorize, @Secured, @AuthenticationPrincipal Quarkus security equivalent"
```

Verify: `@Secured` → `@RolesAllowed`, `@AuthenticationPrincipal` → `SecurityIdentity`.

### Check Spring Transaction Replacement

```
libraryId: /quarkusio/quarkus
query: "@Transactional Spring to jakarta.transaction.Transactional migration"
```

Verify: `org.springframework.transaction.annotation.Transactional` → `jakarta.transaction.Transactional`.

### Check Spring Cache Replacement

```
libraryId: /quarkusio/quarkus
query: "@Cacheable, @CacheEvict Quarkus cache equivalent"
```

Verify: `@Cacheable` → `@CacheResult`, `@CacheEvict` → `@CacheInvalidate`.

## Usage During Refactoring

### Phase 1–2: Inventory & Scan (Stage A)

When scanning the project's build file:

1. Query Context7 for the latest Quarkus stable version
2. Compare the project's `quarkus.platform.version` against it
3. Flag outdated versions as a finding
4. Check if any extension artifact names have been renamed or deprecated

When scanning for Spring leftovers:

1. For each `org.springframework` import found, query Context7 for the correct Quarkus/Jakarta replacement
2. For each Spring annotation found, query Context7 to verify the Quarkus CDI equivalent
3. For each Spring dependency in the build file, query Context7 for the Quarkus extension equivalent
4. For each `spring.*` config property, query Context7 for the Quarkus property mapping

### Phases 7–14: Core Refactoring (Stage C)

When refactoring code:

1. If unsure about a Quarkus annotation or pattern, query Context7
2. When replacing Spring imports, query Context7 for the correct Quarkus equivalent
3. Verify CDI patterns match the target Quarkus version

### Phase 6: Build System

When checking build configuration:

1. Verify the Quarkus BOM version via Context7
2. Check if test dependencies match current recommendations
3. Verify plugin configurations are up to date
