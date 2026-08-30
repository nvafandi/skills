# Module: Code

Refactor all Java source code in the Quarkus project to comply with internal engineering standards.

Load these references before starting:
- [references/engineering-standards.md](../references/engineering-standards.md) — architectural/coding standards and quality gates checklist
- [references/refactoring-patterns.md](../references/refactoring-patterns.md) — full code-smell detection table and refactoring recipes with examples
- [references/solid-principles.md](../references/solid-principles.md) — SOLID definitions, detection, and refactoring patterns
- [references/lombok-rules.md](../references/lombok-rules.md) — Lombok annotation usage rules
- [references/entity-mapper-metrics.md](../references/entity-mapper-metrics.md) — **single source of truth** for Entity, Mapper, DTO, Service, and REST Resource patterns, rules, and cross-layer sync

## What to do

- [ ] Verify package structure follows `com.prudential.pruforce.aob.{function}.{layer}`
- [ ] Verify layers present (api, service, repository, entity, mapper, exception, config)
- [ ] Convert field injection to constructor injection (or package-private field injection) — see [references/refactoring-patterns.md](../references/refactoring-patterns.md) Recipe 1
- [ ] Replace private injected fields/methods with package-private modifiers
- [ ] Remove dummy no-args constructors (Quarkus generates them)
- [ ] Replace `@Named` qualifiers with `@Identifier` — see Recipe 11
- [ ] Wrap all endpoint responses in `ApiResponse<T>` — see Recipe 2
- [ ] Ensure custom exceptions extend `DomainException` — see Recipe 9
- [ ] Add Bean Validation to all request DTOs — see Recipe 6
- [ ] Add `@Transactional` to all write operations — see Recipe 5
- [ ] Replace `double`/`float` money fields with `BigDecimal` — see Recipe 3
- [ ] Extract magic values and query literals to `constants/` (`{Domain}Constants`, `{Domain}QueryConstants`); externalize environment-specific values via `@ConfigProperty` — see Recipe 4
- [ ] Add the JBoss Logging field (`private static final Logger log = Logger.getLogger(X.class)`) to service classes and replace `System.out`/`printStackTrace`/manual loggers — see Recipe 8
- [ ] Add OpenAPI documentation annotations — see Recipe 17
- [ ] Convert manual `for`/`for-each`/`while` collection loops to Java Streams — see Recipe 12
- [ ] Verify classes follow SRP — each class has one reason to change — see Recipe 13
- [ ] Check for OCP violations — replace switch/if-else chains with strategy/extension patterns — see Recipe 14
- [ ] Verify LSP compliance — subtypes are substitutable without surprise behavior — see [references/solid-principles.md](../references/solid-principles.md) §3
- [ ] Check ISP — interfaces are focused, no class implements unused methods — see Recipe 15
- [ ] Verify DIP — depend on abstractions, not concrete implementations — see Recipe 16
- [ ] Ensure one `@ServerExceptionMapper` per exception hierarchy level — see Recipe 18
- [ ] Compile: `./mvnw clean compile -DskipTests` (Maven) or `./gradlew clean compileJava -x test` (Gradle)

> **Implementation details**: For complete code examples of every recipe above, see [references/refactoring-patterns.md](../references/refactoring-patterns.md). For Entity, Mapper, DTO, Service, and Resource layer patterns and cross-layer sync, see [references/entity-mapper-metrics.md](../references/entity-mapper-metrics.md).

## Watch out

- **Preserve behavior**: Refactoring must not change the external behavior of the application
- **Don't break the build**: Compile after each change
- **No silent changes**: Every file modification must be intentional and traceable
- **Check for Spring leftovers**: Search for `org.springframework` imports that should have been removed during migration
- **Lombok**: Apply Lombok annotations (@Data, @Builder, @NonNull) to reduce boilerplate; write constructors explicitly instead of `@RequiredArgsConstructor`; do not use `@Slf4j` — logging uses the JBoss Logging field. Verify native mode compatibility if applicable