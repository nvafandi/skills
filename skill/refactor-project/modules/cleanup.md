# Module: Cleanup

Remove leftover Spring artifacts, unused dependencies, stale configuration, and dead code that survived the migration.

## What to do

- [ ] Remove leftover Spring imports from all Java files
- [ ] Remove unused Spring dependencies from the build file (`pom.xml` or `build.gradle(.kts)`)
- [ ] Remove stale Spring configuration properties
- [ ] Remove orphaned Spring config files (`application-*.properties/yml` that have no Quarkus equivalent)
- [ ] Remove unused imports and dead code
- [ ] Remove commented-out code blocks
- [ ] Use Context7 to verify Spring→Quarkus replacements for ambiguous patterns
- [ ] Compile: `./mvnw clean compile -DskipTests` (Maven) or `./gradlew clean compileJava -x test` (Gradle)

## Leftover Spring imports

Search all Java files for remaining `org.springframework.*` imports:

```bash
grep -rn "import org.springframework" src/
```

For each hit:
- If the class has a Quarkus/Jakarta equivalent → replace the import
- If it's an unused import → delete it
- If it's still needed (Spring compat strategy) → leave it, but verify the corresponding `quarkus-spring-*` extension is in the build file

## Context7 Verification (Optional but Recommended)

When a Spring import, annotation, dependency, or config property is found and the correct Quarkus replacement is unclear, use Context7 to verify the current equivalent:

1. Identify the Spring pattern found
2. Query Context7 with the specific pattern
3. Replace with the Quarkus/Jakarta equivalent returned

See [references/context7-queries.md](../references/context7-queries.md) → **Spring Boot Smell Detection** section for specific queries.

### Examples

| Found Spring pattern | Context7 query | Quarkus replacement |
|---|---|---|
| `import org.springframework.web.bind.annotation.GetMapping` | `@GetMapping migration to Quarkus` | `import jakarta.ws.rs.GET` |
| `@Service` on a class | `@Service Quarkus CDI equivalent` | `@ApplicationScoped` |
| `spring-boot-starter-data-jpa` in pom.xml | `spring-boot-starter-data-jpa Quarkus equivalent` | `quarkus-hibernate-orm-panache` |
| `spring.datasource.url` in properties | `spring.datasource.url Quarkus property` | `quarkus.datasource.jdbc.url` |
| `@SpringBootTest` in tests | `@SpringBootTest Quarkus testing` | `@QuarkusTest` |
| `@Transactional` from Spring | `@Transactional Spring to jakarta migration` | `jakarta.transaction.Transactional` |

## Unused Spring dependencies

Check the build file (`pom.xml` or `build.gradle(.kts)`) for Spring dependencies that are no longer referenced anywhere in the code:

- `spring-boot-devtools` → always remove (no Quarkus equivalent; use `quarkus:dev` instead)
- `spring-boot-configuration-processor` → remove (Quarkus uses build-time config)
- `spring-boot-starter-actuator` → remove if replaced by `quarkus-smallrye-health` / `quarkus-micrometer`
- Any `spring-boot-starter-*` without matching code usage → remove

## Stale configuration

Check `application.properties` / `application.yml` for properties still using `spring.*` prefix that were missed during the build module. Either migrate them or remove them if the feature they configure no longer exists.

## Dead code removal

- Remove unused imports (use IDE or `grep` to find)
- Remove commented-out code blocks that reference Spring patterns
- Remove unused private methods
- Remove unused fields
- Remove unused local variables