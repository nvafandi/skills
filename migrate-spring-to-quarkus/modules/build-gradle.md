# Submodule: Build System (Gradle)

Gradle-specific build migration steps. Called from [build.md](build.md).
Covers both Groovy DSL (`build.gradle`) and Kotlin DSL (`build.gradle.kts`).

Detect which DSL the project uses by the file extension. Use the matching syntax in all examples shown to the user. Do not mix DSLs.

## What to do

- [ ] Replace Spring Boot Gradle plugin with Quarkus Gradle plugin
- [ ] Remove `io.spring.dependency-management` plugin
- [ ] Replace Spring dependency management with Quarkus BOM (`enforcedPlatform`)
- [ ] Configure Java compiler (`-parameters` flag)
- [ ] Configure test task (JBoss LogManager)
- [ ] Replace Spring starters with Quarkus equivalents (use dependency-map.md)
- [ ] Remove unused Spring-only dependencies (`spring-boot-devtools`, etc.)
- [ ] Compile: `./gradlew clean compileJava -x test`

## Plugin Block

**Groovy DSL** (`build.gradle`):

```groovy
// BEFORE: Spring Boot
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.x.x'
    id 'io.spring.dependency-management' version '1.x.x'
}

// AFTER: Quarkus
plugins {
    id 'java'
    id 'io.quarkus' version "${quarkusPlatformVersion}"
}
```

**Kotlin DSL** (`build.gradle.kts`):

```kotlin
// BEFORE: Spring Boot
plugins {
    java
    id("org.springframework.boot") version "3.x.x"
    id("io.spring.dependency-management") version "1.x.x"
}

// AFTER: Quarkus
plugins {
    java
    id("io.quarkus") version(quarkusPlatformVersion)
}
```

## Quarkus BOM

Replace Spring's dependency management with Quarkus BOM using `enforcedPlatform`:

**Groovy DSL**:

```groovy
dependencies {
    implementation enforcedPlatform("io.quarkus.platform:quarkus-bom:${quarkusPlatformVersion}")
    // extension dependencies — no version numbers needed
}
```

**Kotlin DSL**:

```kotlin
dependencies {
    implementation(enforcedPlatform("io.quarkus.platform:quarkus-bom:${quarkusPlatformVersion}"))
    // extension dependencies — no version numbers needed
}
```

Define the version in `gradle.properties`:

```properties
quarkusPlatformVersion=3.x.x
```

Do NOT hardcode the version in the build file — use the latest Quarkus release.

## Java Compiler Configuration

**Groovy DSL**:

```groovy
java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

compileJava {
    options.encoding = 'UTF-8'
    options.compilerArgs.add('-parameters')
    // Required for Hibernate static metamodel and Jakarta Data support
    options.annotationProcessorPath = configurations.annotationProcessor
}

configurations {
    annotationProcessor
}

dependencies {
    // Enforce version management of annotation processor dependencies
    annotationProcessor enforcedPlatform("io.quarkus.platform:quarkus-bom:${quarkusPlatformVersion}")
    annotationProcessor 'org.hibernate.orm:hibernate-processor'
}
```

**Kotlin DSL**:

```kotlin
java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

tasks.compileJava {
    options.encoding = "UTF-8"
    options.compilerArgs.add("-parameters")
    // Required for Hibernate static metamodel and Jakarta Data support
    options.annotationProcessorPath = configurations["annotationProcessor"]
}

configurations {
    create("annotationProcessor")
}

dependencies {
    // Enforce version management of annotation processor dependencies
    "annotationProcessor"(enforcedPlatform("io.quarkus.platform:quarkus-bom:${quarkusPlatformVersion}"))
    "annotationProcessor"("org.hibernate.orm:hibernate-processor")
}
```

## Test Configuration

**Groovy DSL**:

```groovy
test {
    systemProperty 'java.util.logging.manager', 'org.jboss.logmanager.LogManager'
}
```

**Kotlin DSL**:

```kotlin
tasks.test {
    systemProperty("java.util.logging.manager", "org.jboss.logmanager.LogManager")
}
```

## OpenPDF (JasperReports Replacement)

JasperReports (`net.sf.jasperreports`) is replaced with **OpenPDF** (`com.github.librepdf:openpdf`) for PDF generation. OpenPDF is **not managed by the Quarkus BOM** — the version must be specified explicitly.

**Remove** JasperReports dependencies in both DSLs:

**Groovy DSL** (`build.gradle`):

```groovy
// DELETE these
dependencies {
    implementation 'net.sf.jasperreports:jasperreports'
    implementation 'com.lowagie:itext'
}
```

**Kotlin DSL** (`build.gradle.kts`):

```kotlin
// DELETE these
dependencies {
    implementation("net.sf.jasperreports:jasperreports")
    implementation("com.lowagie:itext")
}
```

**Add** OpenPDF in both DSLs:

**Groovy DSL**:

```groovy
dependencies {
    implementation 'com.github.librepdf:openpdf:3.0.5'
}

// Optional modules
// implementation 'com.github.librepdf:openpdf-html:3.0.5'       // HTML to PDF
// implementation 'com.github.librepdf:openpdf-fonts-extra:3.0.5' // UTF-8 fonts
// implementation 'com.github.librepdf:openpdf-renderer:3.0.5'    // PDF to images
```

**Kotlin DSL**:

```kotlin
dependencies {
    implementation("com.github.librepdf:openpdf:3.0.5")
}

// Optional modules
// implementation("com.github.librepdf:openpdf-html:3.0.5")        // HTML to PDF
// implementation("com.github.librepdf:openpdf-fonts-extra:3.0.5") // UTF-8 fonts
// implementation("com.github.librepdf:openpdf-renderer:3.0.5")    // PDF to images
```

> **Note:** OpenPDF 3.0 uses the `org.openpdf` package (was `com.lowagie` in the iText 4 lineage). Update all `com.lowagie.*` imports to `org.openpdf.*` when replacing iText-based Jasper export code.

## Lombok Removal

Lombok (`org.projectlombok:lombok`) is **not compatible with Quarkus native mode** and is **not managed by the Quarkus BOM**. It must be removed from the build file and all Lombok annotations must be rewritten to standard Java (see [code.md](code.md) for the annotation rewrite rules).

**Remove** the Lombok dependency and the `annotationProcessor` configuration in both DSLs:

**Groovy DSL** (`build.gradle`):

```groovy
// DELETE these
dependencies {
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
}

// DELETE this if present (older Gradle setups)
configurations {
    compileOnly {
        extendsFrom annotationProcessor
    }
}
```

**Kotlin DSL** (`build.gradle.kts`):

```kotlin
// DELETE these
dependencies {
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")
}

// DELETE this if present (older Gradle setups)
configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}
```

> **Tip:** If the codebase is large, use the `delombok` Gradle plugin or run `./gradlew delombok` **before** deleting the dependency to generate the equivalent Java source, then migrate the delomboked code to Quarkus patterns. Do NOT commit Lombok-generated code as-is if it uses Spring-specific patterns — those still need the normal Spring → Quarkus migration.

> **Note:** After removing Lombok, the `annotationProcessor` configuration is still needed for `hibernate-processor` (see [Java Compiler Configuration](#java-compiler-configuration) above). Only remove the Lombok entries — keep the `enforcedPlatform` and `hibernate-processor` lines.

## Native Build Support

Unlike Maven, Gradle does not need a separate profile. The Quarkus Gradle plugin registers native tasks automatically:

```bash
# Build a native image
./gradlew build -Dquarkus.native.enabled=true
```

## Complete Before/After Example

**Groovy DSL** (`build.gradle`):

```groovy
// BEFORE: Full Spring Boot build.gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.0'
    id 'io.spring.dependency-management' version '1.1.4'
}

group = 'com.example'
version = '0.0.1-SNAPSHOT'

java {
    sourceCompatibility = '21'
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    runtimeOnly 'com.mysql:mysql-connector-j'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

test {
    useJUnitPlatform()
}

// AFTER: Quarkus build.gradle
plugins {
    id 'java'
    id 'io.quarkus' version "${quarkusPlatformVersion}"
}

group = 'com.example'
version = '0.0.1-SNAPSHOT'

java {
    sourceCompatibility = '21'
}

compileJava {
    options.encoding = 'UTF-8'
    options.compilerArgs.add('-parameters')
}

dependencies {
    implementation enforcedPlatform("io.quarkus.platform:quarkus-bom:${quarkusPlatformVersion}")
    implementation 'io.quarkus:quarkus-rest'
    implementation 'io.quarkus:quarkus-hibernate-orm-panache'
    implementation 'io.quarkus:quarkus-jdbc-mysql'
    testImplementation 'io.quarkus:quarkus-junit5'
    testImplementation 'io.rest-assured:rest-assured'
}

test {
    systemProperty 'java.util.logging.manager', 'org.jboss.logmanager.LogManager'
}
```

## Gradle-specific watch out

- **`io.spring.dependency-management` plugin**: Must be removed entirely. Quarkus uses `enforcedPlatform` instead. Leaving both causes version conflicts.
- **`bootJar` / `bootRun` tasks**: These are Spring Boot plugin tasks. After removing the Spring Boot plugin, they no longer exist. The Quarkus plugin provides `quarkusBuild` and `quarkusDev` instead.
- **Gradle wrapper**: If the project has `gradlew`/`gradlew.bat`, always use `./gradlew` instead of a system-installed `gradle` command.
- **Multi-project builds**: If the Spring Boot app is a subproject in a multi-project Gradle build, apply the Quarkus plugin only to the subproject, not the root. The BOM should also be scoped to that subproject's dependencies.
- **Groovy vs Kotlin DSL**: Detect which DSL the project uses by the file extension (`.gradle` vs `.gradle.kts`). Use the matching syntax. Do not mix DSLs.
- **`settings.gradle(.kts)`**: Some Spring Boot projects configure plugin management in the settings file. After migration, the Quarkus plugin resolves from the Gradle Plugin Portal by default — no special plugin management is needed.
- **Run Gradle on a JDK ≥ the project's target Java version**: `quarkusBuild` runs Quarkus augmentation inside the Gradle JVM and loads the project's compiled classes. If Gradle itself runs on an older JDK than the code targets, `compileJava` can still pass (via toolchains / `--release`) while `quarkusBuild` fails with `UnsupportedClassVersionError`. Point `JAVA_HOME` (or a Gradle toolchain) at a JDK matching the target version, and use the same JDK in CI and the Docker build stage.