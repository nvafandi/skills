# Module: Build System

Refactor the Quarkus build descriptor and configuration files to comply with engineering standards.

## What to do

- [ ] Verify Quarkus BOM and extensions are correctly configured
- [ ] Check for leftover Spring dependencies (should be zero)
- [ ] Verify `quarkus-maven-plugin` or Quarkus Gradle plugin is configured
- [ ] Check for unused dependencies and remove them
- [ ] Verify Java version is set to 21+
- [ ] Check for `-parameters` compiler flag (Maven) or `options.compilerArgs.add('-parameters')` (Gradle)
- [ ] Verify test dependencies include `quarkus-junit5`, `rest-assured`, `quarkus-junit5-mockito`
- [ ] Check for hardcoded versions that should use Quarkus BOM
- [ ] Compile: `./mvnw clean compile -DskipTests` (Maven) or `./gradlew clean compileJava -x test` (Gradle)

## Build File Checks

### Maven (`pom.xml`)

Verify the following are present:

```xml
<!-- Quarkus BOM in dependencyManagement -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.quarkus.platform</groupId>
            <artifactId>quarkus-bom</artifactId>
            <version>${quarkus.platform.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

```xml
<!-- Quarkus Maven plugin -->
<plugin>
    <groupId>io.quarkus.platform</groupId>
    <artifactId>quarkus-maven-plugin</artifactId>
    <version>${quarkus.platform.version}</version>
    <extensions>true</extensions>
    <executions>
        <execution>
            <goals>
                <goal>build</goal>
                <goal>generate-code</goal>
                <goal>generate-code-tests</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

```xml
<!-- Compiler with -parameters flag -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <parameters>true</parameters>
    </configuration>
</plugin>
```

### Gradle (`build.gradle`)

Verify the following are present:

```groovy
// Quarkus plugin
plugins {
    id 'java'
    id 'io.quarkus' version "${quarkusPlatformVersion}"
}

// Quarkus BOM
dependencies {
    implementation enforcedPlatform("io.quarkus.platform:quarkus-bom:${quarkusPlatformVersion}")
}

// Java 21+
java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

// -parameters flag
compileJava {
    options.compilerArgs.add('-parameters')
}
```

### Gradle Kotlin DSL (`build.gradle.kts`)

Same configuration in Kotlin syntax:

```kotlin
plugins {
    java
    id("io.quarkus") version "3.x.y" // must match the BOM version below
}

dependencies {
    implementation(enforcedPlatform("io.quarkus.platform:quarkus-bom:3.x.y"))
}

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

tasks.withType<JavaCompile> {
    options.compilerArgs.add("-parameters")
}
```

### Version Alignment Rule

The Quarkus **plugin** version and the **BOM** version must be identical and come from one property:

| Build file | Single source of truth |
|---|---|
| Maven | `<properties><quarkus.platform.version>X</quarkus.platform.version></properties>` used by both the BOM import and the plugin |
| Groovy DSL | `quarkusPlatformVersion` variable used by both the plugin and `enforcedPlatform(...)` |
| Kotlin DSL | One constant/property used by both declarations |

If plugin and BOM versions drift apart, flag it as a finding and align them to the latest stable from Context7.

## Common Issues to Fix

| Issue | Fix |
|---|---|
| Spring dependencies still present | Remove all `org.springframework.*` dependencies |
| Missing `-parameters` flag | Add to compiler configuration |
| Java version < 21 | Update `sourceCompatibility`/`targetCompatibility` to 21 |
| Hardcoded Quarkus version | Use `${quarkus.platform.version}` property |
| Missing test dependencies | Add `quarkus-junit5`, `rest-assured`, `quarkus-junit5-mockito` |
| `spring-boot-maven-plugin` still present | Remove — replaced by `quarkus-maven-plugin` |
| `io.spring.dependency-management` plugin | Remove — replaced by Quarkus BOM `enforcedPlatform` |
| Plugin and BOM versions differ | Align both to one property (see Version Alignment Rule) |
| Deprecated platform artifact (`quarkus-universe-platform`, old `quarkus-universe-bom`) | Replace with `io.quarkus.platform:quarkus-bom` |
| Dependency versions hardcoded where the BOM manages them | Remove explicit versions — let the Quarkus BOM manage them |
| Lombok dependency without annotation processor path | Configure per [references/lombok-rules.md](../references/lombok-rules.md) |

## Watch out

- **Build tool wrapper**: If the project has `mvnw`/`gradlew`, always use `./mvnw` or `./gradlew` instead of the system-installed `mvn` or `gradle` command.
- **Lombok**: Can be applied in Quarkus projects for reducing boilerplate. If present, verify it's properly configured with annotation processor (see [references/lombok-rules.md](../references/lombok-rules.md) for Lombok usage rules). For native mode, ensure Lombok compatibility or use standard Java alternatives.
- **OpenPDF**: If JasperReports was replaced with OpenPDF, verify the version is explicitly specified (not managed by Quarkus BOM).

## Post-edit Verification

After every build-file change:

1. Re-resolve dependencies to catch breakage immediately:
   ```bash
   ./mvnw dependency:resolve -q          # Maven
   ./gradlew dependencies --configuration runtimeClasspath  # Gradle
   ```
2. Run the compile command from the Execution Protocol.
3. If a managed artifact now fails to resolve, check whether it was previously supplied transitively by Spring Boot's BOM and needs an explicit version in the Quarkus world.

Do not batch multiple build-file edits before verifying — one logical change, one compile cycle.