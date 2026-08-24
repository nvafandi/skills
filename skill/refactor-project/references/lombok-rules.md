# Lombok Usage Rules

Lombok (`org.projectlombok:lombok`) can be **applied** in Quarkus projects for reducing boilerplate code. Use Lombok annotations to simplify DTOs, entities, and service classes while maintaining Quarkus compatibility.

## Lombok in Quarkus

Lombok is **supported** in Quarkus JVM mode. For native mode, ensure proper configuration or use standard Java alternatives.

### When to Use Lombok
- **DTOs**: Use `@Data`, `@Builder`, `@Value` for concise data carriers
- **Entities**: Use `@Data`, `@NoArgsConstructor` with `@Entity` (JPA requires no-arg constructor)
- **Services**: Use explicit constructor injection — do not use `@RequiredArgsConstructor`
- **Logging**: Do NOT use Lombok for logging — use a JBoss Logging field (`private static final Logger log = Logger.getLogger(X.class)`) instead of `@Slf4j`
- **Validation**: Use `@NonNull` for method parameters

## Lombok Annotation Usage

| Lombok annotation | Usage |
|---|---|
| `@Data` | Generates getters, setters, `equals`, `hashCode`, `toString` |
| `@Builder` | Generates fluent builder pattern |
| `@Value` | Immutable value object (equivalent to `final` fields + `@Data`) |
| `@NoArgsConstructor` | Generates no-argument constructor (required by JPA) |
| `@AllArgsConstructor` | Generates all-argument constructor |
| `@RequiredArgsConstructor` | Not recommended for services — write the constructor explicitly so injection points stay visible and package-private |
| `@Slf4j` | Do NOT use — logging standard is JBoss Logging (`org.jboss.logging.Logger` static field); SLF4J `{}` placeholders are not supported by JBoss Logger |
| `@NonNull` | Generates null checks on method parameters |
| `@EqualsAndHashCode` | Customize `equals`/`hashCode` |
| `@ToString` | Customize `toString` |

## 1. DTOs → Lombok @Data + @Builder

```java
// Lombok DTO - concise and readable
@Data
@Builder
public class TodoResponse {
    private Long id;
    private String title;
    private boolean completed;
}

// Usage
TodoResponse response = TodoResponse.builder()
    .id(1L)
    .title("Task")
    .completed(false)
    .build();
```

> `@Data` + `@Builder` replaces manual builder pattern and auto-generates getters, setters, `equals`, `hashCode`, `toString`.

## 2. Entities → Lombok @Data + @NoArgsConstructor

```java
// JPA Entity with Lombok
@Entity
@Data
@NoArgsConstructor
public class Todo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private boolean completed;
    
    // Custom constructor if needed
    public Todo(String title) {
        this.title = title;
    }
}
```

> **Important**: JPA requires `@NoArgsConstructor` (package-private or public). Use `@Data` + `@NoArgsConstructor` instead of explicit getters/setters.

## 3. Services → Explicit Constructor Injection

```java
// Write the constructor explicitly — do not use @RequiredArgsConstructor
@ApplicationScoped
public class TodoService {
    private final TodoRepository repository;
    private final ObjectMapper mapper;

    public TodoService(TodoRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional
    public TodoResponse create(TodoRequest request) {
        // ...
    }
}
```

> Write constructors explicitly instead of using `@RequiredArgsConstructor`. Explicit constructors keep injection points visible, work naturally with package-private visibility (native-image friendly), and make dependency changes explicit in code review.

## 4. Logging → JBoss Logging Field (not Lombok)

```java
// Logging uses org.jboss.logging.Logger directly — no Lombok annotation
import org.jboss.logging.Logger;

@ApplicationScoped
public class TodoService {

    private static final Logger log = Logger.getLogger(TodoService.class);

    public void doSomething() {
        log.info("Doing something");
        log.error("Failed doing something", e);
    }
}
```

> Do not use `@Slf4j`. The JBoss Logging field is the project standard: no Lombok dependency needed for logging, and messages concatenate (JBoss Logger has no `{}` substitution; use `infof("x=%s", x)` for printf-style).

## 5. `@NonNull` → Null Checks

```java
// Lombok null check
public void save(@NonNull Todo todo) {
    // Lombok generates: if (todo == null) throw new NullPointerException("todo");
    // ...
}
```

## 6. `@Builder` → Fluent Builder Pattern

```java
// Lombok builder for complex objects
@Builder
public class SearchCriteria {
    private String title;
    private Boolean completed;
    private Integer page;
    private Integer size;
}

// Usage
SearchCriteria criteria = SearchCriteria.builder()
    .title("task")
    .completed(false)
    .page(0)
    .size(20)
    .build();
```

## Build File Configuration

### Maven (`pom.xml`)

```xml
<!-- ADD Lombok dependency -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <scope>provided</scope>
</dependency>

<!-- Configure annotation processor -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <annotationProcessorPaths>
            <path>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
            </path>
        </annotationProcessorPaths>
    </configuration>
</plugin>
```

### Gradle (`build.gradle` / `build.gradle.kts`)

```groovy
// ADD Lombok dependency
dependencies {
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
}
```

```kotlin
dependencies {
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")
}
```

> **Note**: For native image, ensure Lombok version is compatible or use `quarkus-lombok` extension if available.

## Best Practices

1. **DTOs**: Use `@Data` + `@Builder` for immutable data carriers
2. **Entities**: Use `@Data` + `@NoArgsConstructor` (JPA requires no-arg constructor)
3. **Services**: Use explicit constructor injection — avoid `@RequiredArgsConstructor`
4. **Logging**: Use the JBoss Logging field (`Logger.getLogger(X.class)`); never print via `System.out`/`System.err`; no `@Slf4j`
5. **Validation**: Combine `@NonNull` with Bean Validation (`@NotNull`, `@Size`)
6. **Avoid**: `@Data` on mutable entities that need identity-based `equals`/`hashCode`
7. **Native**: Test native compilation with Lombok; consider `quarkus-lombok` extension

## Build File Removal (if needed)

To remove Lombok (if not using):

### Maven
```xml
<!-- REMOVE -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <scope>provided</scope>
</dependency>

<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <annotationProcessorPaths>
            <path>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
            </path>
        </annotationProcessorPaths>
    </configuration>
</plugin>
```

### Gradle
```groovy
// REMOVE
compileOnly 'org.projectlombok:lombok'
annotationProcessor 'org.projectlombok:lombok'
```

```kotlin
// REMOVE
compileOnly("org.projectlombok:lombok")
annotationProcessor("org.projectlombok:lombok")
```