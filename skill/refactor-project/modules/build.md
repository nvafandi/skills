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

### Gradle (`build.gradle` / `build.gradle.kts`)

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

## Watch out

- **Build tool wrapper**: If the project has `mvnw`/`gradlew`, always use `./mvnw` or `./gradlew` instead of the system-installed `mvn` or `gradle` command.
- **Lombok**: Should have been removed during migration. If still present, remove it and rewrite annotations (see [references/lombok-rules.md](../references/lombok-rules.md) for Lombok removal rules).
- **OpenPDF**: If JasperReports was replaced with OpenPDF, verify the version is explicitly specified (not managed by Quarkus BOM).