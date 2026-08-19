# Module: Code

Refactor all Java source code in the Quarkus project to comply with engineering standards from `migrate-spring-to-quarkus` skill.

Load [references/engineering-standards.md](../references/engineering-standards.md) before starting. It contains the architectural and coding standards from `ptpla-cbv-pf-engineering-prompts` that all Quarkus services must follow.

Load [references/refactoring-patterns.md](../references/refactoring-patterns.md) before starting. It contains Quarkus-specific refactoring patterns, code smells, and improvement recipes.

## What to do

- [ ] Verify package structure follows `com.prudential.pruforce.aob.{function}.{layer}`
- [ ] Verify all 5 layers present (api, service, repository, entity, config)
- [ ] Convert field injection to constructor injection (or package-private field injection)
- [ ] Replace private injected fields/methods with package-private modifiers
- [ ] Remove dummy no-args constructors (Quarkus generates them)
- [ ] Replace `@Named` qualifiers with `@Identifier`
- [ ] Wrap all endpoint responses in `ApiResponse<T>`
- [ ] Ensure custom exceptions extend `DomainException`
- [ ] Add Bean Validation to all request DTOs
- [ ] Add `@Transactional` to all write operations
- [ ] Replace `double`/`float` money fields with `BigDecimal`
- [ ] Externalize hardcoded values to `@ConfigProperty`
- [ ] Add logging to service classes
- [ ] Add OpenAPI documentation annotations
- [ ] Convert manual `for`/`for-each`/`while` collection loops to Java Streams
- [ ] Compile: `./mvnw clean compile -DskipTests` (Maven) or `./gradlew clean compileJava -x test` (Gradle)

## Refactoring Patterns

### 1. Field Injection → Constructor Injection (or Package-Private)
```java
// BEFORE: Private field injection
@ApplicationScoped
public class TodoService {
    @Inject
    TodoRepository repository;

    @Inject
    TodoMapper mapper;
}

// AFTER: Constructor injection (preferred)
@ApplicationScoped
public class TodoService {
    private final TodoRepository repository;
    private final TodoMapper mapper;

    TodoService(TodoRepository repository, TodoMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }
}

// AFTER (alternative): Package-private field injection
// Per Quarkus CDI reference, private members require reflection in native images.
// Package-private modifiers avoid reflection entirely.
@ApplicationScoped
public class TodoService {
    @Inject
    TodoRepository repository;

    @Inject
    TodoMapper mapper;
}
```

### 2. Raw Entity Returns → ApiResponse<T>

```java
// BEFORE: Raw entity return
@GET
@Path("/{id}")
public Todo getById(@PathParam("id") Long id) {
    return todoService.getById(id);
}

// AFTER: Wrapped in ApiResponse<T>
@GET
@Path("/{id}")
public ApiResponse<TodoResponse> getById(@PathParam("id") Long id) {
    TodoResponse response = todoService.getById(id);
    return ApiResponse.success(response);
}
```

### 3. double/Float Money → BigDecimal

```java
// BEFORE: double for money
private double amount;

// AFTER: BigDecimal for money
@Column(precision = 19, scale = 2)
private BigDecimal amount;
```

### 4. Hardcoded Values → @ConfigProperty

```java
// BEFORE: Hardcoded value
public class EmailService {
    public void sendEmail(String to) {
        // hardcoded SMTP host
        String host = "smtp.example.com";
        int port = 587;
    }
}

// AFTER: Externalized configuration
@ApplicationScoped
public class EmailService {
    @ConfigProperty(name = "app.smtp.host")
    String smtpHost;

    @ConfigProperty(name = "app.smtp.port", defaultValue = "587")
    int smtpPort;

    public void sendEmail(String to) {
        // use smtpHost and smtpPort
    }
}
```

### 5. Missing @Transactional → Add to Write Operations

```java
// BEFORE: Missing @Transactional
@ApplicationScoped
public class TodoService {
    public TodoResponse create(CreateTodoRequest request) {
        Todo entity = mapper.toEntity(request);
        Todo saved = repository.save(entity);
        return mapper.toResponse(saved);
    }
}

// AFTER: With @Transactional
@ApplicationScoped
public class TodoService {
    @Transactional
    public TodoResponse create(CreateTodoRequest request) {
        Todo entity = mapper.toEntity(request);
        Todo saved = repository.save(entity);
        return mapper.toResponse(saved);
    }
}
```

### 6. Missing Logging → Add JBoss Logging

```java
// BEFORE: No logging
@ApplicationScoped
public class TodoService {
    public TodoResponse create(CreateTodoRequest request) {
        // no logging
    }
}

// AFTER: With logging
@ApplicationScoped
public class TodoService {
    private static final Logger LOG = Logger.getLogger(TodoService.class);

    public TodoResponse create(CreateTodoRequest request) {
        LOG.info("Creating todo: {}", request);
        // ...
    }
}
```

### 7. Missing Bean Validation → Add to Request DTOs

```java
// BEFORE: No validation
public record CreateTodoRequest(
    String title,
    String description
) {}

// AFTER: With Bean Validation
public record CreateTodoRequest(
    @NotBlank(message = "Title is required")
    @Size(max = 100, message = "Title must be at most 100 characters")
    String title,

    @Size(max = 500, message = "Description must be at most 500 characters")
    String description
) {}
```

### 8. Custom Exceptions → Extend DomainException

```java
// BEFORE: Not extending DomainException
public class TodoNotFoundException extends RuntimeException {
    public TodoNotFoundException(String message) {
        super(message);
    }
}

// AFTER: Extending DomainException
public class TodoNotFoundException extends DomainException {
    public TodoNotFoundException(String message) {
        super(message, 404);
    }
}
```

### 9. Missing @Valid → Add to Resource Parameters

```java
// BEFORE: No @Valid
@POST
public ApiResponse<TodoResponse> create(CreateTodoRequest request) {
    // ...
}

// AFTER: With @Valid
@POST
public ApiResponse<TodoResponse> create(@Valid CreateTodoRequest request) {
    // ...
}
```

### 10. Unnecessary Interface + Impl → Single Class

```java
// BEFORE: Interface + Impl
public interface TodoService {
    List<TodoResponse> findAll();
}

@ApplicationScoped
public class TodoServiceImpl implements TodoService {
    @Override
    public List<TodoResponse> findAll() {
        // ...
    }
}

// AFTER: Single class
@ApplicationScoped
public class TodoService {
    public List<TodoResponse> findAll() {
        // ...
    }
}
```

### 11. `@Named` → `@Identifier` for String-Based Qualifiers

Per the [Quarkus CDI Reference](https://quarkus.io/guides/cdi-reference#string-based-qualifiers), `@Named` automatically adds `@Default` and causes ambiguity errors. Use `@io.smallrye.common.annotation.Identifier` instead:

```java
// BEFORE: @Named causes ambiguity
@ApplicationScoped
public class Producers {
    @Produces MyBean produce() { ... }
    @Produces @Named("foo") MyBean produceFoo() { ... }
}

@ApplicationScoped
public class Consumer {
    @Inject MyBean bean; // AmbiguousResolutionException!
}

// AFTER: @Identifier is a regular qualifier
@ApplicationScoped
public class Producers {
    @Produces MyBean produce() { ... }
    @Produces @Identifier("foo") MyBean produceFoo() { ... }
}
```

### 12. Manual Loops → Java Streams

Convert manual collection loops to stream pipelines for filtering, mapping, and reducing:

```java
// BEFORE: for-each loop with filter + collect
List<Todo> todos = repository.findAll();
List<TodoResponse> completed = new ArrayList<>();
for (Todo todo : todos) {
    if (todo.isCompleted()) {
        completed.add(mapper.toResponse(todo));
    }
}

// AFTER: Stream filter + map + toList
List<Todo> todos = repository.findAll();
List<TodoResponse> completed = todos.stream()
        .filter(Todo::isCompleted)
        .map(mapper::toResponse)
        .toList();
```

```java
// BEFORE: index-based loop summing amounts
double total = 0;
for (int i = 0; i < items.size(); i++) {
    total += items.get(i).getAmount();
}

// AFTER: Stream mapToDouble + sum
double total = items.stream()
        .mapToDouble(Item::getAmount)
        .sum();
```

```java
// BEFORE: for loop building a map
Map<String, TodoResponse> byId = new HashMap<>();
for (Todo todo : todos) {
    byId.put(todo.getId(), mapper.toResponse(todo));
}

// AFTER: Stream collect toMap
Map<String, TodoResponse> byId = todos.stream()
        .collect(Collectors.toMap(Todo::getId, mapper::toResponse));
```

```java
// BEFORE: for loop finding first match with break
TodoResponse found = null;
for (Todo todo : todos) {
    if (todo.getId().equals(id)) {
        found = mapper.toResponse(todo);
        break;
    }
}

// AFTER: Stream findFirst + map + orElse
TodoResponse found = todos.stream()
        .filter(todo -> todo.getId().equals(id))
        .findFirst()
        .map(mapper::toResponse)
        .orElse(null);
```

## Engineering Standards Compliance

While refactoring code, ensure all services comply with the standards in [references/engineering-standards.md](../references/engineering-standards.md). Key requirements:

- Use constructor injection only (no field injection)
- All monetary fields must be `BigDecimal`
- All endpoint responses must be wrapped in `ApiResponse<T>`
- Custom exceptions must extend `DomainException`
- Follow layered architecture pattern
- Bean Validation on all request DTOs
- Use `ApiResponse.success()` / `ApiResponse.error()` for responses
- Package structure: `com.prudential.pruforce.aob.{function}.{layer}`
- File naming: `{Domain}Resource.java`, `{Domain}Service.java`, `{Domain}Repository.java`, etc.
- Use Java Streams for collection iteration (filter/map/collect) instead of manual `for`/`for-each` loops

## Watch out

- **Preserve behavior**: Refactoring must not change the external behavior of the application
- **Don't break the build**: Compile after each change
- **No silent changes**: Every file modification must be intentional and traceable
- **Check for Spring leftovers**: Search for `org.springframework` imports that should have been removed during migration
- **Lombok**: Should have been removed during migration. If still present, rewrite annotations to standard Java