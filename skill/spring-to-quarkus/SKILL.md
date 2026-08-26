---
name: spring-to-quarkus
description: >
  Use this skill when migrating a Spring Boot application to Quarkus using OpenRewrite. The skill checks Spring Boot version and Java version, incrementally upgrades to meet OpenRewrite requirements (Spring Boot 3.x, Java 17+), then runs the SpringBootToQuarkus recipe. Use when the user wants to convert, migrate, or port a Spring Boot project to Quarkus.
license: PT. Prudential Life Indonesia
metadata:
  author: Irsyad Jamal Pratama Putra - https://github.com/Irsyad-Putra1-Consultant_pru
---

# Spring Boot to Quarkus Migration (OpenRewrite Only)

Migrate a Spring Boot application to Quarkus using OpenRewrite `rewrite-spring-to-quarkus` recipe suite. This skill **only uses OpenRewrite** — it automatically checks versions, upgrades incrementally if needed, then runs the migration.

## Prerequisites

- **Maven** (`mvn`) or **Gradle** (`gradle`) available
- **Network access** to Code Genome Project repository (`https://artifacts.codegenomeproject.org/maven`) — requires authentication (username + token)
- Target project on disk and readable

> **Defaults**: If user doesn't specify Java version, default to **Java 21**. If no build tool specified, default to **Maven**.

## Automated Migration Workflow

### Phase 1 — Analyse Project

Inspect the target project BEFORE applying any recipe:

1. **Identify build system**: `pom.xml` (Maven) or `build.gradle(.kts)` (Gradle)
2. **Determine Spring Boot version**: check `<parent>` with `spring-boot-starter-parent` or `spring-boot.version` property
3. **Determine Java version**: check `<maven.compiler.source/target>` or `java.version`
4. **List Spring Boot starters**: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, etc.
5. **Check for Spring Cloud**: `spring-cloud-starter-*` dependencies

### Phase 2 — Version Compliance Check

**OpenRewrite `SpringBootToQuarkus` requires:**
- Spring Boot **3.x** (3.0, 3.1, 3.2, 3.3, 3.4, 3.5+)
- Java **17+** (17, 21)

If project is **already compliant**, skip to Phase 4.

If **Spring Boot < 3.x** or **Java < 17**, proceed to Phase 3.

### Phase 3 — Incremental Upgrade (OpenRewrite Only)

#### 3a. Upgrade Java Version (if < 17)

Use OpenRewrite Java migration recipes to upgrade Java version incrementally:

```bash
# Maven - upgrade to Java 17 (one step at a time)
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-java:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.migrate.UpgradeToJava17 \
  --define rewrite.exportDatatables=true
```

```bash
# Gradle - upgrade to Java 17
gradle rewriteRun -Drewrite.activeRecipe=org.openrewrite.java.migrate.UpgradeToJava17
```

> If project is on Java 8 → 11 → 17, run sequentially: `UpgradeToJava11` then `UpgradeToJava17`

#### 3b. Upgrade Spring Boot to 3.x (if < 3.x)

Use OpenRewrite Spring Boot upgrade recipes **incrementally, one minor version at a time**, starting from the earliest supported version.

**Step 0: Upgrade Spring Boot 1.x → 2.0 (for legacy repos on 1.x)**

> Spring Boot 1.x is very old (1.0 released 2014, 1.5 EOL 2018). Upgrade path: 1.0 → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 2.0

```bash
# Spring Boot 1.0 → 1.1
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot1.UpgradeSpringBoot_1_1 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 1.1 → 1.2
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot1.UpgradeSpringBoot_1_2 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 1.2 → 1.3
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot1.UpgradeSpringBoot_1_3 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 1.3 → 1.4
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot1.UpgradeSpringBoot_1_4 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 1.4 → 1.5
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot1.UpgradeSpringBoot_1_5 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 1.5 → 2.0 (major version jump)
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_0 \
  --define rewrite.exportDatatables=true
```

**Step 1: Upgrade Spring Boot 2.x → 2.7 (if on 2.0-2.6)**

```bash
# Spring Boot 2.0 → 2.1
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_1 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 2.1 → 2.2
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_2 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 2.2 → 2.3
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_3 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 2.3 → 2.4
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_4 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 2.4 → 2.5
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_5 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 2.5 → 2.6
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_6 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 2.6 → 2.7
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_7 \
  --define rewrite.exportDatatables=true
```

**Step 2: Upgrade Spring Boot 2.7 → 3.0 (major version jump)**

```bash
# Spring Boot 2.7 → 3.0
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_0 \
  --define rewrite.exportDatatables=true
```

**Step 3: Incremental upgrades within Spring Boot 3.x**

```bash
# Spring Boot 3.0 → 3.1
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_1 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 3.1 → 3.2
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_2 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 3.2 → 3.3
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_3 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 3.3 → 3.4
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_4 \
  --define rewrite.exportDatatables=true
```

```bash
# Spring Boot 3.4 → 3.5
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_5 \
  --define rewrite.exportDatatables=true
```

**After each upgrade step:**
1. Run `mvn clean compile` (or `gradle clean compileJava`) to verify build
2. Run tests if available
3. Re-check Spring Boot version
4. Continue to next version until reaching 3.x (latest)

### Phase 4 — Run Quarkus Migration

Once project is on **Spring Boot 3.x + Java 17+**, run the Quarkus migration:

#### Maven

**Option A: Modify `pom.xml` (persistent)**
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

Add credentials to `~/.m2/settings.xml`:
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

Then run:
```bash
mvn rewrite:run
```

**Option B: One-liner without modifying `pom.xml`**
```bash
mvn -U org.openrewrite.maven:rewrite-maven-plugin:6.46.1:run \
  --define rewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring-to-quarkus:RELEASE \
  --define rewrite.activeRecipes=org.openrewrite.quarkus.spring.SpringBootToQuarkus \
  --define rewrite.exportDatatables=true
```

#### Gradle

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

Then run:
```bash
gradle rewriteRun
```

#### Moderne CLI (alternative)
```bash
mod run . --recipe SpringBootToQuarkus
```

### Phase 5 — Post-Migration Verification

After migration, verify:

1. **Build**: `./mvnw clean compile` / `./gradlew clean compileJava`
2. **No Spring deps**: Search build file for `org.springframework` — should be zero (unless using compatibility extensions)
3. **Has Quarkus**: Search build file for `io.quarkus` — Quarkus BOM and extensions present
3. **Tests**: Convert `@SpringBootTest` to `@QuarkusTest`, `@MockBean` to `@InjectMock`
4. **Startup**: Run `./mvnw quarkus:dev` / `./gradlew quarkusDev` and verify `curl http://localhost:8080/q/health` returns UP

## Key OpenRewrite Recipes Reference

### Java Version Upgrades
| Current → Target | Recipe |
|------------------|--------|
| Java 8 → 11 | `org.openrewrite.java.migrate.UpgradeToJava11` |
| Java 11 → 17 | `org.openrewrite.java.migrate.UpgradeToJava17` |
| Java 17 → 21 | `org.openrewrite.java.migrate.UpgradeToJava21` |

### Spring Boot Upgrades (run sequentially from current version)

#### Spring Boot 1.x → 2.0 (legacy major upgrades)
| From → To | Recipe |
|-----------|--------|
| 1.0 → 1.1 | `org.openrewrite.java.spring.boot1.UpgradeSpringBoot_1_1` |
| 1.1 → 1.2 | `org.openrewrite.java.spring.boot1.UpgradeSpringBoot_1_2` |
| 1.2 → 1.3 | `org.openrewrite.java.spring.boot1.UpgradeSpringBoot_1_3` |
| 1.3 → 1.4 | `org.openrewrite.java.spring.boot1.UpgradeSpringBoot_1_4` |
| 1.4 → 1.5 | `org.openrewrite.java.spring.boot1.UpgradeSpringBoot_1_5` |
| 1.5 → 2.0 | `org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_0` |

#### Spring Boot 2.x → 2.7 (minor upgrades)
| From → To | Recipe |
|-----------|--------|
| 2.0 → 2.1 | `org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_1` |
| 2.1 → 2.2 | `org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_2` |
| 2.2 → 2.3 | `org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_3` |
| 2.3 → 2.4 | `org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_4` |
| 2.4 → 2.5 | `org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_5` |
| 2.5 → 2.6 | `org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_6` |
| 2.6 → 2.7 | `org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_7` |

#### Spring Boot 2.7 → 3.x (major + minor upgrades)
| From → To | Recipe |
|-----------|--------|
| 2.7 → 3.0 | `org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_0` |
| 3.0 → 3.1 | `org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_1` |
| 3.1 → 3.2 | `org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_2` |
| 3.2 → 3.3 | `org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_3` |
| 3.3 → 3.4 | `org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_4` |
| 3.4 → 3.5 | `org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_5` |

### Quarkus Migration
| Target | Recipe |
|--------|--------|
| Spring Boot → Quarkus | `org.openrewrite.quarkus.spring.SpringBootToQuarkus` |

## Troubleshooting

### Build fails after version upgrade
1. Run `mvn clean compile` (or gradle equivalent)
2. Fix any compilation errors manually
3. Run tests
4. Continue to next upgrade step

### Spring Cloud dependencies
If project uses Spring Cloud, upgrade Spring Cloud version to match Spring Boot version after each Spring Boot upgrade:
- Spring Boot 3.0 → Spring Cloud 2022.0.x
- Spring Boot 3.1 → Spring Cloud 2022.0.x
- Spring Boot 3.2 → Spring Cloud 2023.0.x
- Spring Boot 3.3 → Spring Cloud 2023.0.x

Use `org.openrewrite.java.spring.boot3.UpgradeSpringCloud_*` recipes if available.

### Authentication errors
The `rewrite-spring-to-quarkus` artifacts are NOT on Maven Central. You must:
1. Sign in at https://artifacts.codegenomeproject.org to create a download token
2. Add the repository and credentials to `pom.xml` / `settings.xml` / `build.gradle`

### Recipe doesn't run (precondition not met)
If `SpringBootToQuarkus` still doesn't run after upgrades, verify:
- `mvn dependency:tree | grep spring-boot` shows 3.x
- `java -version` shows 17+
- No conflicting parent POM or property overrides