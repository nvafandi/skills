# Submodule: Build System (Maven)

Maven-specific build migration steps. Called from [build.md](build.md).

## What to do

- [ ] Replace Spring Boot parent with Quarkus BOM
- [ ] Replace `spring-boot-maven-plugin` with `quarkus-maven-plugin`
- [ ] Update `maven-compiler-plugin` and `maven-surefire-plugin`
- [ ] Add `native` profile
- [ ] Replace Spring starters with Quarkus equivalents (use dependency-map.md)
- [ ] Remove unused Spring-only dependencies (`spring-boot-devtools`, etc.)
- [ ] Compile: `./mvnw clean compile -DskipTests`

## pom.xml Reference Snippets

**Remove** the Spring Boot parent:
```xml
<!-- DELETE this -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>...</version>
</parent>
```

**Add** Quarkus BOM in `<dependencyManagement>`:
```xml
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

**Add** Quarkus plugin and update compiler/surefire:
```xml
<build>
    <plugins>
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
                        <goal>native-image-agent</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>${compiler-plugin.version}</version>
            <configuration>
                <parameters>true</parameters>
                <!-- Required for Hibernate static metamodel and Jakarta Data support -->
                <annotationProcessorPathsUseDepMgmt>true</annotationProcessorPathsUseDepMgmt>
                <annotationProcessorPaths>
                    <path>
                        <groupId>org.hibernate.orm</groupId>
                        <artifactId>hibernate-processor</artifactId>
                        <!-- No version required — managed by Quarkus BOM -->
                    </path>
                    <!-- Other processors that may be required by your app -->
                </annotationProcessorPaths>
            </configuration>
        </plugin>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-surefire-plugin</artifactId>
            <version>${surefire-plugin.version}</version>
            <configuration>
                <systemPropertyVariables>
                    <java.util.logging.manager>org.jboss.logmanager.LogManager</java.util.logging.manager>
                </systemPropertyVariables>
            </configuration>
        </plugin>
    </plugins>
</build>
```

Define `quarkus.platform.version` as a Maven property. Do NOT hardcode the version — use the latest Quarkus release.

## OpenPDF (JasperReports Replacement)

JasperReports (`net.sf.jasperreports`) is replaced with **OpenPDF** (`com.github.librepdf:openpdf`) for PDF generation. OpenPDF is **not managed by the Quarkus BOM** — the version must be specified explicitly.

**Remove** JasperReports dependencies:
```xml
<!-- DELETE these -->
<dependency>
    <groupId>net.sf.jasperreports</groupId>
    <artifactId>jasperreports</artifactId>
</dependency>
<dependency>
    <groupId>com.lowagie</groupId>
    <artifactId>itext</artifactId>
</dependency>
```

**Add** OpenPDF (in `pom.xml`):
```xml
<dependency>
    <groupId>com.github.librepdf</groupId>
    <artifactId>openpdf</artifactId>
    <version>3.0.5</version>
</dependency>
```

**Add** optional modules as needed:
```xml
<!-- HTML to PDF (fork of Flying Saucer) -->
<dependency>
    <groupId>com.github.librepdf</groupId>
    <artifactId>openpdf-html</artifactId>
    <version>3.0.5</version>
</dependency>

<!-- UTF-8 Liberation fonts (for non-Latin text) -->
<dependency>
    <groupId>com.github.librepdf</groupId>
    <artifactId>openpdf-fonts-extra</artifactId>
    <version>3.0.5</version>
</dependency>

<!-- Render PDF pages to images -->
<dependency>
    <groupId>com.github.librepdf</groupId>
    <artifactId>openpdf-renderer</artifactId>
    <version>3.0.5</version>
</dependency>
```

> **Note:** OpenPDF 3.0 uses the `org.openpdf` package (was `com.lowagie` in the iText 4 lineage). Update all `com.lowagie.*` imports to `org.openpdf.*` when replacing iText-based Jasper export code.

## Lombok Removal

Lombok (`org.projectlombok:lombok`) is **not compatible with Quarkus native mode** and is **not managed by the Quarkus BOM**. It must be removed from `pom.xml` and all Lombok annotations must be rewritten to standard Java (see [code.md](code.md) for the annotation rewrite rules).

**Remove** the Lombok dependency and optionally the delombok configuration:

```xml
<!-- DELETE this -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

**Also remove** any `maven-compiler-plugin` Lombok annotation processor paths:

```xml
<!-- DELETE this from <annotationProcessorPaths> if present -->
<path>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
</path>
```

> **Tip:** If the codebase is large, run `mvn lombok:delombok` **before** deleting the dependency to generate the equivalent Java source, then migrate the delomboked code to Quarkus patterns. Do NOT commit Lombok-generated code as-is if it uses Spring-specific patterns — those still need the normal Spring → Quarkus migration.

**Add** Quarkus native profile:

```xml
<profiles>
    <profile>
        <id>native</id>
        <activation>
            <property>
                <name>native</name>
            </property>
        </activation>
        <properties>
            <quarkus.package.jar.enabled>false</quarkus.package.jar.enabled>
            <skipITs>false</skipITs>
            <quarkus.native.enabled>true</quarkus.native.enabled>
        </properties>
    </profile>
</profiles>