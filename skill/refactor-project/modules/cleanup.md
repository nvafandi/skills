# Module: Cleanup

Remove leftover Spring artifacts, unused dependencies, stale configuration, and dead code that survived the migration.

## What to do

- [ ] Remove leftover Spring imports from all Java files
- [ ] Remove unused Spring dependencies from the build file (`pom.xml` or `build.gradle(.kts)`)
- [ ] Remove stale Spring configuration properties
- [ ] Remove orphaned Spring config files (`application-*.properties/yml` that have no Quarkus equivalent)
- [ ] Remove Spring XML files and `spring.factories` / `@EnableAutoConfiguration` artifacts
- [ ] Remove unused imports and dead code
- [ ] Remove commented-out code blocks
- [ ] Use Context7 to verify Spring→Quarkus replacements for ambiguous patterns
- [ ] Compile: `./mvnw clean compile -DskipTests` (Maven) or `./gradlew clean compileJava -x test` (Gradle)

Work in this order: imports → annotations → config files/properties → build dependencies → dead code. Removing dependencies last prevents "unused" flags on classes that still import Spring.

## Leftover Spring imports

Search all Java files for remaining `org.springframework.*` imports:

```bash
grep -rn "import org.springframework" src/
```

For each hit:
- If the class has a Quarkus/Jakarta equivalent → replace the import
- If it's an unused import → delete it
- If it's still needed (Spring compat strategy) → leave it, but verify the corresponding `quarkus-spring-*` extension is in the build file

Also sweep these related patterns:

```bash
grep -rn "@SpringBootApplication\|@EnableAutoConfiguration\|@ComponentScan\|@ConfigurationProperties\|@EnableWebSecurity\|@RestControllerAdvice\|@ControllerAdvice" src/
grep -rln "org.springframework" src/test/
find . -name "spring.factories" -o -name "*.xsd" -path "*spring*" 2>/dev/null
find src -name "*.xml" | xargs grep -l "springframework" 2>/dev/null   # legacy XML configs
```

Common annotation replacements found by the sweep:

| Found | Replace with |
|---|---|
| `@RestController`, `@Controller` + `@ResponseBody` | JAX-RS `@Path` + method-level `@GET`/`@POST`/… |
| `@RequestMapping(...)` | `@Path(...)` on class/method |
| `@Service`, `@Component` | `@ApplicationScoped` |
| `@Configuration` + `@Bean` producer | `@ApplicationScoped` class + `@Produces` methods |
| `@RestControllerAdvice` / `@ExceptionHandler` | `@ServerExceptionMapper` |
| `@Value("${prop}")` | `@ConfigProperty(name = "prop")` |
| `@Async` | `@ActivateRequestContext` + executor, or Quarkus virtual threads — query Context7 if unsure |

If a replacement is not in this table, query Context7 before editing (see below).

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
- Plugin/buildscript leftovers → remove: `spring-boot-maven-plugin`, `io.spring.dependency-management`, `org.springframework.boot` Gradle plugin

Before removing each dependency, confirm zero references remain:

```bash
grep -rn "<artifactId>spring" pom.xml            # Maven list
grep -rn "org.springframework" src/               # code references
```

After removal, re-run dependency resolution to catch transitive breakage early:

```bash
./mvnw dependency:resolve -q || ./gradlew dependencies --configuration runtimeClasspath
```

## Stale configuration

Check `application.properties` / `application.yml` for properties still using `spring.*` prefix that were missed during the build module. Either migrate them or remove them if the feature they configure no longer exists.

```bash
grep -n "^spring\.\|^ *spring\.\|spring:" application.properties application.yml src/main/resources/application* 2>/dev/null
```

Profile files need attention too. Spring's `application-{profile}.yml` maps to Quarkus's `%{profile}.` prefix **inside** a single `application.properties`/`application.yml`:

| Spring layout | Quarkus layout |
|---|---|
| `application.yml` + `application-prod.yml` | One `application.yml` with `prod:` prefixed keys, or `%prod.` keys in one file |
| `application-test.properties` | `%test.` keys inside the main `application.properties` |

Migrate values into the main file with the profile prefix, then delete the orphaned `application-{profile}.*` files only after confirming every property was carried over (compare key sets before deleting).

## Dead code removal

- Remove unused imports (use IDE or `grep` to find)
- Remove commented-out code blocks that reference Spring patterns
- Remove unused private methods
- Remove unused fields
- Remove unused local variables

Constraints:
- Only remove code that provably has no callers (`grep` the symbol across `src/` first).
- Anything uncertain stays under the Critical Rule: leave it with `// TODO: Refactor required — <reason>`.
- Log every removal (file + symbol) so Phase 19's "Removed Code" table is complete.

## Final Sweep

Compile, then run both verification greps one last time — all must return empty:

```bash
./mvnw clean compile -DskipTests 2>&1 | tail -5        # or gradlew equivalent
grep -rn "import org.springframework" src/             # expect no output
grep -n "org.springframework" pom.xml build.gradle*    # expect no output
```
