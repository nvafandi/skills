# Quarkus Coding Style Conventions

This reference file contains the coding style conventions and formatting guidelines for Quarkus project development. Maintained internally for this skill.

## Java Code Conventions

### File Structure
- Package structure: `com.prudential.pruforce.aob.{function}.{layer}`
- File naming: `{Domain}Resource.java`, `{Domain}Service.java`, `{Domain}Repository.java`, etc.
- Layer patterns, rules, and cross-layer sync: see [entity-mapper-metrics.md](entity-mapper-metrics.md) — single source of truth for Entity, Mapper, DTO, Service, and Resource standards
- Directory structure:
  ```
  src/main/java/com/prudential/pruforce/aob/{function}/
  ├── api/
  │   ├── rest/
  │   │   └── {Domain}Resource.java
  │   ├── dto/
  │   │   ├── request/
  │   │   │   ├── Create{Domain}Request.java
  │   │   │   └── Update{Domain}Request.java
  │   │   └── response/
  │   │       └── {Domain}Response.java
  │   └── ApiResponse.java               # Shared response wrapper
  ├── service/
  │   ├── {Domain}Service.java           # Service interface
  │   └── impl/
  │       └── {Domain}ServiceImpl.java   # Service implementation
  ├── repository/
  │   ├── {Domain}Repository.java        # Repository interface (extends PanacheRepository)
  │   └── impl/
  │       └── {Domain}RepositoryImpl.java # Repository implementation
  ├── entity/
  │   └── {Domain}.java                  # JPA entity (audit fields, @Version)
  ├── mapper/
  │   └── {Domain}Mapper.java            # DTO ↔ Entity conversion
  ├── exception/
  │   ├── {Domain}Exception.java         # Base domain exception
  │   └── GlobalExceptionHandler.java    # @ServerExceptionMapper
  ├── constants/
  │   ├── {Domain}Constants.java         # Domain magic values (statuses, labels, limits)
  │   └── {Domain}QueryConstants.java    # JPQL/native query literals
  ├── config/
  │   └── {Domain}Config.java
  └── util/
      └── {Domain}Utils.java             # Only if truly reusable logic exists
  ```

### Code Formatting
- **Indentation**: 2 spaces (no tabs)
- **Line length**: Maximum 120 characters
- **Braces**: K&R style (braces on same line as control structure)
- **Imports**: 
  - Group imports: static imports, then Jakarta EE, then Quarkus, then project-specific
  - Separate groups with blank lines
  - Static imports: `static java.util.stream.Collectors.toList*;`
- **Blank lines**:
  - Between import groups
  - Between class members (method, field)
  - Before closing brace of class (optional)

### Naming Conventions
- **Classes**: `PascalCase` (e.g., `TodoService`, `OrderRepository`)
- **Methods**: `camelCase` (e.g., `findById`, `saveOrder`)
- **Fields**: `camelCase`, private by default (but use constructor injection)
- **Constants**: `UPPER_SNAKE_CASE` with `final` keyword (e.g., `MAX_PAGE_SIZE`)
- **Interfaces**: `PascalCase` ending (optional) or `camelCase` (e.g., `TodoService`, `PaymentService`)
- **Exceptions**: Ends with `Exception` (e.g., `TodoNotFoundException`)

### Comments & TODOs
- **No narration**: Don't write comments that restate what the code does (`// increment counter`).
- **Rationale only**: Comment non-obvious constraints, external requirements, and why-choices — not what.
- **Refactoring TODO marker** (used by this skill): `// TODO: Refactor required — <reason>` on any code that cannot be refactored now. The reason must say what needs to change, not just "later".
- **Removal marker**: `// REMOVED: <what> — <why>` at the location of deleted code.
- **Never commit** commented-out code blocks; remove them in the cleanup phase.

### Javadoc
- **Public API surface** (resource methods, service interfaces): brief Javadoc with one-line summary plus `@param`/`@return` when they add information beyond the signature.
- **Entities/DTOs**: class-level Javadoc stating the domain meaning; skip field-by-field narration.
- Do not duplicate OpenAPI annotations' wording into Javadoc verbatim — OpenAPI is for API consumers, Javadoc is for maintainers.

### Annotations
- **Class annotations** (top to bottom):
  1. `@ApplicationScoped` (or other scope)
  2. `@TransactionManagement(TransactionManagementType.BEAN)` (if needed)
  2. `@InterruptibleThread` (if needed)
- **Method annotations** (top to bottom):
  1. `@Override` (if overriding)
  2. `@Transactional` (only on write operations)
  3. `@WebMethod` / `@SOAPMessageHandler` (if JAX-WS)
  3. `@Resource` (JDBC data source)
- **Field annotations** (if using constructor injection, minimize field annotations):
  - `@Inject` only on constructor parameters
  - `@Qualifier` for disambiguation
  - `@Named` only for Qute templates, not DI

### Logging
- **Logger**: JBoss Logging — declare one static field per class:
  ```java
  private static final Logger log = Logger.getLogger({Domain}Service.class);
  ```
  (`import org.jboss.logging.Logger;`). Do not use `@Slf4j`/SLF4J API directly.
- **Parameterized messages**: JBoss Logger has no `{}` substitution — use concatenation or printf-style `log.infof("x=%s", x)` / `log.infov(...)`
- **Throwable**: pass as last argument to print the stack trace (`log.error("ctx", ex)`)
- **Log level**: Use appropriate levels (`info`, `debug`, `warn`, `error`)
- **Log format**: Include meaningful context (method name, operation ID, etc.)
- **Never log**: Passwords, tokens, PII, full SQL queries

### Constructor Injection
- **Required**: All dependencies via constructor
- **Optional**: Use `javax.inject.Optional` or default values
- **Null safety**: Use `@NonNull` or `Objects.requireNonNull()` in method bodies
- **Builder pattern**: For complex objects, use manual builder or Java records

### Records (Java 16+)
- Use for DTOs/value objects
- Immutable by default
- Canonical constructor, `equals`, `hashCode`, `toString` auto-generated
- Package-private or public, as appropriate

### Error Handling
- **Custom exceptions**: Extend `DomainException`
- **Global handler**: `@ServerExceptionMapper` in global exception handler
- **Error response**: Wrap in `ApiResponse.error(status, message)`
- **HTTP status codes**: Use appropriate codes (404, 400, 500, etc.)
- **Validation**: Use Bean Validation (`@Valid`, `@NotNull`, `@Size`) on DTOs

### API Responses
- **Wrapper**: All responses wrapped in `ApiResponse<T>` — see [entity-mapper-metrics.md](entity-mapper-metrics.md) §5 for full pattern
- **Success**: `ApiResponse.success(data, message)`
- **Error**: `ApiResponse.error(status, message)`
- **Null handling**: Never return null directly; use `Optional` or `ApiResponse.error`

### Quarkus-Specific Conventions
- **CDI**: Use `@ApplicationScoped` by default; `@RequestScoped` only when needed
- **JTA**: Use `@Transactional` only on write operations; `@Transactional(readOnly = true)` on read operations
- **Database**: Use Panache Repository pattern; `@Entity` with `@Id` and `@GeneratedValue`
- **Build**: Use Quarkus BOM for dependency management; `quarkus-maven-plugin` or `io.quarkus` Gradle plugin
- **Native**: Avoid private field injection; use constructor injection or package-private fields
- **Dev Services**: Use Quarkus Dev Services for databases; no local database setup needed

### Security
- **Never log**: Sensitive data (passwords, tokens, PII)
- **Input validation**: Validate all request DTOs with Bean Validation
- **Error messages**: Sanitize error messages; don't expose stack traces
- **HTTPS**: Use HTTPS in production; configure TLS
- **CORS**: Configure via `quarkus.http.cors` properties

### Testing (Guidelines, not strict requirements)
- Use `@QuarkusTest` for integration tests
- Use Mockito for unit test mocks
- Use REST Assured for HTTP endpoint testing
- Test data cleanup between tests
- Edge cases: null, empty, invalid input

> **Note**: This is a style guide, not a strict enforcement mechanism. Use judgment and consistency within the team. For strict enforcement, consult the team's internal coding standards.