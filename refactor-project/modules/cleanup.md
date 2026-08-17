# Module: Cleanup

Remove leftover Spring artifacts, unused dependencies, stale configuration, and dead code that survived the migration.

## What to do

- [ ] Remove leftover Spring imports from all Java files
- [ ] Remove unused Spring dependencies from the build file (`pom.xml` or `build.gradle(.kts)`)
- [ ] Remove stale Spring configuration properties
- [ ] Remove orphaned Spring config files (`application-*.properties/yml` that have no Quarkus equivalent)
- [ ] Remove unused imports and dead code
- [ ] Remove commented-out code blocks
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