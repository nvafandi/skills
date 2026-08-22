---
name: spring-to-quarkus
description: >
  Use this skill when migrating a Spring Boot application to Quarkus using the OpenRewrite Spring to Quarkus recipe suite. Use when the user wants to convert, migrate, or port a Spring Boot project to Quarkus, mentions "spring to quarkus", "migrate spring boot to quarkus", "convert spring to quarkus", or references the `org.openrewrite.quarkus.spring.SpringBootToQuarkus` recipe. Even if they don't explicitly mention "OpenRewrite", use this skill when the user wants to move a Spring Boot codebase to Quarkus.
license: PT. Prudential Life Indonesia
metadata:
  author: Irsyad Jamal Pratama Putra - https://github.com/Irsyad-Putra1-Consultant_pru
---

# Spring Boot to Quarkus Migration (OpenRewrite)

Migrate a Spring Boot application to Quarkus using the OpenRewrite `rewrite-spring-to-quarkus` recipe suite. This skill automates the conversion of Spring Boot dependencies, annotations, configuration, and code to Quarkus equivalents.

## Prerequisites

- **Java 17+** (Quarkus 3.x requires Java 17)
- **Maven** (`mvn`) or **Gradle** (`gradle`) available
- **Network access** to the Code Genome Project repository (`https://artifacts.codegenomeproject.org/maven`) — the `rewrite-spring-to-quarkus` recipe artifacts are distributed there and require authentication (username + token)
- Target project on disk and readable

> **Defaults**: If the user does not specify a Java version, default to **Java 21**. If the user does not specify a build tool, default to **Maven**.

## Step 1 — Analyse the project

Inspect the target project BEFORE applying any recipe:

1. **Identify build system**: `pom.xml` (Maven) or `build.gradle(.kts)` (Gradle)
2. **Determine Spring Boot version**: check `<parent>` with `spring-boot-starter-parent` or `spring-boot.version` property
3. **Determine Java version**: check `<maven.compiler.source/target>` or `java.version`
4. **List Spring Boot starters**: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, etc.
5. **Check for Spring Cloud**: `spring-cloud-starter-*` dependencies

**IMPORTANT**: The `SpringBootToQuarkus` recipe has a **precondition** — it only runs on projects with `org.springframework.boot:spring-*` dependencies at version `3.x`. If the project uses Spring Boot 2.x, you must first upgrade to Spring Boot 3.x using the `org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_*` recipes before applying the Quarkus migration.

## Step 2 — Set up OpenRewrite

### Maven

Add the Code Genome Project repository and the OpenRewrite Maven plugin to `pom.xml`:

```xml
<repositories>
  <repository>
    <id>codegenome</id>
    <url>https://artifacts.codegenomeproject.org/maven</url>
  </repository>
</repositories>
<pluginRepositories>
  <pluginRepository>
    <id>codegenome</id>
    <url>https://artifacts.codegenomeproject.org/maven</url>
  </pluginRepository>
</pluginRepositories>
<build>
  <plugins>
    <plugin>
      <groupId>org.openrewrite.maven</groupId>
      <artifactId>rewrite-maven-plugin</artifactId>
      <version>6.46.1</version>
      <configuration>
        <exportDatatables>true</exportDatatables>
        <activeRecipes>
          <recipe>org.openrewrite.quarkus.spring.SpringBootToQuarkus</recipe>
        </activeRecipes>
      </configuration>
      <dependencies>
        <dependency>
          <groupId>org.openrewrite.recipe</groupId>
          <artifactId>rewrite-spring-to-quarkus</artifactId>
          <version>0.11.1</version>
        </dependency>
      </dependencies>
    </plugin>
  </plugins>
</build>
```

Add the Code Genome Project credentials to `~/.m2/settings.xml`:

```xml
<settings>
  <servers>
    <server>
      <id>codegenome</id>
      <username>USERNAME</username>
      <password>TOKEN</password>
    </server>
  </servers>
</settings>
```

### Gradle

Add to `build.gradle`:

```groovy
plugins {
    id "org.openrewrite.rewrite" version "latest.release"
}

rewrite {
    activeRecipe("org.openrewrite.quarkus.spring.SpringBootToQuarkus")
    setExportDatatables(true)
}

repositories {
    mavenCentral()
    maven {
        url = "https://artifacts.codegenomeproject.org/maven"
        credentials {
            username = "USERNAME"
            password = "TOKEN"
        }
    }
}

dependencies {
    rewrite("org.openrewrite.recipe:rewrite-spring-to-quarkus:0.11.1")
}
```

## Step 3 — Run the migration

### Maven

```bash
mvn rewrite:run
```

Or without modifying `pom.xml` (using `settings.xml` credentials):

```bash
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring-to-quarkus:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.quarkus.spring.SpringBootToQuarkus \
  --define rewrite.exportDatatables=true
```

### Gradle

```bash
gradle rewriteRun
```

### Moderne CLI

```bash
mod run . --recipe SpringBootToQuarkus
```

## Step 4 — What the recipe does

The `org.openrewrite.quarkus.spring.SpringBootToQuarkus` recipe applies the following sub-recipes in order:

| # | Recipe | What it does |
|---|--------|--------------|
| 1 | `org.openrewrite.maven.AddManagedDependency` | Adds `io.quarkus.platform:quarkus-bom:3.x` as an imported BOM |
| 2 | `org.openrewrite.quarkus.spring.MigrateMavenPlugin` | Replaces `spring-boot-maven-plugin` with `quarkus-maven-plugin` |
| 3 | `org.openrewrite.quarkus.spring.MigrateDatabaseDrivers` | Migrates database driver dependencies to Quarkus equivalents |
| 4 | `org.openrewrite.quarkus.spring.MigrateBootStarters` | Replaces `spring-boot-starter-*` with Quarkus extensions |
| 5 | `org.openrewrite.quarkus.spring.SpringApplicationRunToQuarkusRun` | Converts `SpringApplication.run()` to `Quarkus.run()` |
| 6 | `org.openrewrite.quarkus.spring.ReplaceSpringBootApplication` | Replaces `@SpringBootApplication` with Quarkus bootstrap |
| 7 | `org.openrewrite.quarkus.spring.EnableAnnotationsToQuarkusDependencies` | Maps `@Enable*` annotations to Quarkus extensions |
| 8 | `org.openrewrite.quarkus.spring.AddSpringCompatibilityExtensions` | Adds Quarkus Spring compatibility extensions (`quarkus-spring-web`, `quarkus-spring-di`, etc.) |
| 9 | `org.openrewrite.quarkus.spring.ResponseEntityToJaxRsResponse` | Converts `ResponseEntity<T>` to JAX-RS `Response` |
| 10 | `org.openrewrite.quarkus.spring.StereotypeAnnotationsToCDI` | Converts `@Service`, `@Component`, `@Repository` to CDI scopes |
| 11 | `org.openrewrite.quarkus.spring.ValueToCdiConfigProperty` | Converts `@Value("${...}")` to `@ConfigProperty(name = "...")` |
| 12 | `org.openrewrite.quarkus.spring.WebToJaxRs` | Converts Spring Web annotations to JAX-RS |
| 13 | `org.openrewrite.quarkus.spring.RemoveSpringBootParent` | Removes the Spring Boot parent POM |
| 14 | `org.openrewrite.quarkus.spring.MigrateSpringValidation` | Migrates Spring Validation to Quarkus Hibernate Validator |
| 15 | `org.openrewrite.quarkus.spring.MigrateSpringActuator` | Migrates Spring Boot Actuator to Quarkus Health and Metrics |
| 16 | `org.openrewrite.quarkus.spring.MigrateSpringTesting` | Migrates Spring Boot Testing to Quarkus Testing |
| 17 | `org.openrewrite.quarkus.spring.MigrateConfigurationProperties` | Migrates `@ConfigurationProperties` to Quarkus `@ConfigMapping` |
| 18 | `org.openrewrite.quarkus.spring.MigrateSpringTransactional` | Migrates Spring `@Transactional` to Jakarta `@Transactional` |
| 19 | `org.openrewrite.quarkus.spring.MigrateSpringEvents` | Migrates Spring Events to CDI Events |
| 20 | `org.openrewrite.quarkus.spring.MigrateEntitiesToPanache` | Migrates JPA Entities to Panache Entities |
| 21 | `org.openrewrite.quarkus.spring.MigrateSpringDataMongodb` | Migrates Spring Data MongoDB to Quarkus Panache MongoDB |
| 22 | `org.openrewrite.quarkus.spring.MigrateSpringCloudConfig` | Migrates Spring Cloud Config Client to Quarkus Config |
| 23 | `org.openrewrite.quarkus.spring.MigrateRequestParameterEdgeCases` | Migrates additional Spring Web parameter annotations |
| 24 | `org.openrewrite.quarkus.spring.MigrateSpringCloudServiceDiscovery` | Migrates Spring Cloud Service Discovery to Quarkus |
| 25 | `org.openrewrite.quarkus.spring.MigrateSpringBootDevTools` | Removes Spring Boot DevTools |
| 26 | `org.openrewrite.quarkus.spring.CustomizeQuarkusVersion` | Customizes the Quarkus BOM version |

## Step 5 — Manual follow-up

After the recipe runs, manually verify and fix:

1. **Build**: Run `./mvnw clean compile` (Maven) or `./gradlew clean compileJava` (Gradle)
2. **Spring compatibility extensions**: If the recipe added `quarkus-spring-web` or `quarkus-spring-di`, you can keep Spring annotations working. For a full migration, remove these and convert annotations manually.
3. **Configuration**: Review `application.properties` — Spring properties (`spring.*`, `server.*`) need manual conversion to Quarkus properties (`quarkus.*`)
4. **Tests**: Convert `@SpringBootTest` to `@QuarkusTest`, `@MockBean` to `@InjectMock`
5. **Startup**: Run `./mvnw quarkus:dev` and verify the app starts

## Key Annotation Mappings

| Spring | Quarkus |
|--------|---------|
| `@RestController` | `@Path` + `@GET`/`@POST` (JAX-RS) |
| `@RequestMapping` | `@Path` |
| `@GetMapping` / `@PostMapping` | `@GET` / `@POST` |
| `@RequestParam` | `@QueryParam` |
| `@PathVariable` | `@PathParam` |
| `@RequestBody` | Method parameter (JAX-RS) |
| `@Service` / `@Component` / `@Repository` | `@ApplicationScoped` / `@Singleton` |
| `@Autowired` | `@Inject` |
| `@Value("${...}")` | `@ConfigProperty(name = "...")` |
| `@ConfigurationProperties` | `@ConfigMapping` |
| `@SpringBootApplication` | `@QuarkusMain` + `Quarkus.run()` |
| `@SpringBootTest` | `@QuarkusTest` |
| `@MockBean` | `@InjectMock` |
| `@Transactional` (Spring) | `@Transactional` (Jakarta) |
| `ResponseEntity<T>` | `Response` (JAX-RS) |

## Key Dependency Mappings

| Spring Boot Starter | Quarkus Extension |
|---------------------|-------------------|
| `spring-boot-starter-web` | `quarkus-resteasy-reactive` / `quarkus-resteasy-reactive-jackson` |
| `spring-boot-starter-data-jpa` | `quarkus-hibernate-orm-panache` |
| `spring-boot-starter-validation` | `quarkus-hibernate-validator` |
| `spring-boot-starter-security` | `quarkus-elytron-security-properties-file` / `quarkus-spring-security` |
| `spring-boot-starter-actuator` | `quarkus-smallrye-health` / `quarkus-smallrye-metrics` |
| `spring-boot-starter-test` | `quarkus-junit5` + `rest-assured` |
| `spring-boot-starter-data-mongodb` | `quarkus-mongodb-panache` |
| `spring-boot-devtools` | (removed — Quarkus has dev mode built-in) |

## Key Configuration Mappings

| Spring Property | Quarkus Property |
|-----------------|------------------|
| `server.port` | `quarkus.http.port` |
| `spring.datasource.url` | `quarkus.datasource.jdbc.url` |
| `spring.datasource.username` | `quarkus.datasource.username` |
| `spring.datasource.password` | `quarkus.datasource.password` |
| `spring.jpa.hibernate.ddl-auto` | `quarkus.hibernate-orm.database.generation` |
| `spring.jpa.show-sql` | `quarkus.hibernate-orm.log.sql` |
| `spring.application.name` | `quarkus.application.name` |
| `spring.profiles.active` | `quarkus.profile` |
| `management.endpoints.web.exposure.include` | `quarkus.smallrye-health` (auto) |

## Verification Checklist

After migration, verify:

| # | Check | Command | Pass criteria |
|---|-------|---------|---------------|
| 1 | **Builds** | `./mvnw clean package -DskipTests` / `./gradlew clean build -x test` | Exit code 0 |
| 2 | **No Spring deps** | Search build file for `org.springframework` | Zero Spring dependencies (unless using compatibility extensions) |
| 3 | **Has Quarkus** | Search build file for `io.quarkus` | Quarkus BOM and at least one extension present |
| 4 | **Tests pass** | `./mvnw test` / `./gradlew test` | All tests pass using `@QuarkusTest` |
| 5 | **Starts up** | `./mvnw quarkus:dev` / `./gradlew quarkusDev` | App starts, `curl http://localhost:8080/q/health` returns UP |

## Troubleshooting

### Recipe doesn't run (precondition not met)
The `SpringBootToQuarkus` recipe only runs on Spring Boot 3.x projects. If the project is on Spring Boot 2.x, first run:
```bash
mvn rewrite:run -Drewrite.activeRecipe=org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_3
```

### Code Genome Project authentication
The `rewrite-spring-to-quarkus` artifacts are NOT on Maven Central. You must:
1. Sign in at https://artifacts.codegenomeproject.org to create a download token
2. Add the repository and credentials to `pom.xml` / `settings.xml` / `build.gradle`

### Spring annotations still present after migration
The recipe adds `quarkus-spring-web` and `quarkus-spring-di` compatibility extensions by default. To fully migrate:
1. Remove these compatibility extensions
2. Manually convert remaining Spring annotations using the mapping tables above