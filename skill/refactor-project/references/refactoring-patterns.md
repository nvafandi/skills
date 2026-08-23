# Quarkus Refactoring Patterns

This reference contains Quarkus-specific refactoring patterns, code smells, and improvement recipes for projects migrated from Spring Boot.

## Code Smells to Detect

| Smell | Detection | Refactoring |
|---|---|---|
| Field injection | `@Inject` on fields | Convert to constructor injection |
| Raw entity returns | Resource methods returning `Entity` directly | Wrap in `ApiResponse<T>` with DTO |
| `double`/`float` for money | Fields of type `double`/`float` | Change to `BigDecimal` |
| Hardcoded values | Magic strings/numbers in Java code | Extract to `@ConfigProperty` |
| Missing `@Transactional` | Write operations without `@Transactional` | Add `jakarta.transaction.Transactional` |
| Missing Bean Validation | Request DTOs without validation annotations | Add `@NotNull`, `@NotBlank`, `@Size`, `@Valid` |
| Unnecessary interface+impl | Service interface with single impl | Merge into single class |
| Missing logging | Service classes without `Logger` | Add JBoss Logging (`org.jboss.logging.Logger`) |
| Direct printing | `System.out`/`System.err` calls or `printStackTrace()` | Replace with JBoss Logging (`LOG.info`, `LOG.error`) |
| Spring leftovers | `org.springframework` imports | Replace with Quarkus/Jakarta equivalents |
| Lombok misconfigured | Lombok annotations used without `compileOnly` + annotation processor in build file | Configure per [lombok-rules.md](lombok-rules.md) |
| Missing OpenAPI docs | Resource methods without `@Operation` | Add OpenAPI annotations |
| Custom exceptions not extending base | Exceptions extending `RuntimeException` directly | Extend `DomainException` |
| Traditional loops | `for (`, `for-each`, `while` iterating collections | Convert to Java Streams |
| Private injected fields | `@Inject private` on fields/observer/producer methods | Use package-private modifiers per Quarkus CDI reference |
| `@Named` qualifiers | `@Named("foo")` for DI resolution | Replace with `@Identifier("foo")` |
| Dummy no-args constructors | Empty constructors in normal scoped beans | Remove — Quarkus generates them automatically |

## Refactoring Recipes

### Recipe 1: Convert Field Injection to Constructor Injection

```java
// BEFORE
@ApplicationScoped
public class TodoService {
    @Inject TodoRepository repository;
    @Inject TodoMapper mapper;
}

// AFTER
@ApplicationScoped
public class TodoService {
    private final TodoRepository repository;
    private final TodoMapper mapper;

    public TodoService(TodoRepository repository, TodoMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }
}
```

### Recipe 2: Wrap Raw Entity Returns

```java
// BEFORE
@GET
@Path("/{id}")
public Todo getById(@PathParam("id") Long id) {
    return todoService.getById(id);
}

// AFTER
@GET
@Path("/{id}")
public ApiResponse<TodoResponse> getById(@PathParam("id") Long id) {
    TodoResponse response = todoService.getById(id);
    return ApiResponse.success(response);
}
```

### Recipe 3: Replace double with BigDecimal

```java
// BEFORE
private double amount;

// AFTER
@Column(precision = 19, scale = 2)
private BigDecimal amount;
```

### Recipe 4: Externalize Hardcoded Values

```java
// BEFORE
public class EmailService {
    public void sendEmail(String to) {
        String host = "smtp.example.com";
        int port = 587;
    }
}

// AFTER
@ApplicationScoped
public class EmailService {
    @ConfigProperty(name = "app.smtp.host")
    String smtpHost;

    @ConfigProperty(name = "app.smtp.port", defaultValue = "587")
    int smtpPort;
}
```

### Recipe 5: Add @Transactional to Write Operations

```java
// BEFORE
public TodoResponse create(CreateTodoRequest request) {
    Todo entity = mapper.toEntity(request);
    Todo saved = repository.save(entity);
    return mapper.toResponse(saved);
}

// AFTER
@Transactional
public TodoResponse create(CreateTodoRequest request) {
    Todo entity = mapper.toEntity(request);
    Todo saved = repository.save(entity);
    return mapper.toResponse(saved);
}
```

### Recipe 6: Add Bean Validation to Request DTOs

```java
// BEFORE
public record CreateTodoRequest(String title, String description) {}

// AFTER
public record CreateTodoRequest(
    @NotBlank(message = "Title is required")
    @Size(max = 100)
    String title,
    @Size(max = 500)
    String description
) {}
```

### Recipe 7: Merge Interface + Impl

```java
// BEFORE
public interface TodoService { List<TodoResponse> findAll(); }

@ApplicationScoped
public class TodoServiceImpl implements TodoService {
    @Override public List<TodoResponse> findAll() { ... }
}

// AFTER
@ApplicationScoped
public class TodoService {
    public List<TodoResponse> findAll() { ... }
}
```

### Recipe 8: Add Logging

```java
// BEFORE
@ApplicationScoped
public class TodoService {
    public TodoResponse create(CreateTodoRequest request) { ... }
}

// AFTER
@ApplicationScoped
public class TodoService {
    private static final Logger LOG = Logger.getLogger(TodoService.class);

    public TodoResponse create(CreateTodoRequest request) {
        LOG.info("Creating todo: {}", request);
        ...
    }
}
```

### Recipe 9: Fix Custom Exceptions

```java
// BEFORE
public class TodoNotFoundException extends RuntimeException {
    public TodoNotFoundException(String message) { super(message); }
}

// AFTER
public class TodoNotFoundException extends DomainException {
    public TodoNotFoundException(String message) { super(message, 404); }
}
```

### Recipe 10: Add @Valid to Resource Parameters

```java
// BEFORE
@POST
public ApiResponse<TodoResponse> create(CreateTodoRequest request) { ... }

// AFTER
@POST
public ApiResponse<TodoResponse> create(@Valid CreateTodoRequest request) { ... }
```

### Recipe 11: Convert For/ForEach Loops to Java Streams

Prefer Java Streams over manual collection loops for filtering, mapping, and reducing:

```java
// BEFORE: for-each loop with manual filter + collect
List<Todo> todos = repository.findAll();
List<TodoResponse> completed = new ArrayList<>();
for (Todo todo : todos) {
    if (todo.isCompleted()) {
        completed.add(mapper.toResponse(todo));
    }
}

// AFTER: Stream with filter + map + toList
List<Todo> todos = repository.findAll();
List<TodoResponse> completed = todos.stream()
        .filter(Todo::isCompleted)
        .map(mapper::toResponse)
        .toList();
```

```java
// BEFORE: index-based for loop summing a property
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
// BEFORE: for loop finding the first match
TodoResponse found = null;
for (Todo todo : todos) {
    if (todo.getId().equals(id)) {
        found = mapper.toResponse(todo);
        break;
    }
}

// AFTER: Stream findFirst
TodoResponse found = todos.stream()
        .filter(todo -> todo.getId().equals(id))
        .findFirst()
        .map(mapper::toResponse)
        .orElse(null);
```

## Quarkus Best Practices

1. **Use `@ApplicationScoped`** for services, not `@Singleton` (unless truly needed)
2. **Use constructor injection** — never private field injection
3. **Use package-private modifiers** for injected fields/observer methods (per Quarkus CDI reference, avoids reflection in native images)
4. **Use `jakarta.transaction.Transactional`** — not Spring's
5. **Use Panache** for repositories — `PanacheRepository<T>` or active record pattern
6. **Use Java records** for DTOs — immutable, concise
7. **Use `@ConfigProperty`** for all configuration values
8. **Use JBoss Logging** — `Logger.getLogger(Class)` or `@Inject Logger`
9. **Use `@ServerExceptionMapper`** for exception handling
10. **Use `@CheckedTemplate`** for Qute templates
11. **Use `@QuarkusTest`** for integration tests
12. **Use Java Streams** for collection processing — filter/map/collect instead of manual `for`/`for-each` loops
13. **Use `@Identifier` over `@Named`** for string-based qualifiers

## Java Streams Guidelines

| ❌ Avoid (manual loop) | ✅ Prefer (Stream) |
|---|---|
| `for (Todo t : todos) { if (t.isDone()) { result.add(t); } }` | `todos.stream().filter(Todo::isDone).toList()` |
| `for (int i = 0; i < items.size(); i++) { sum += items.get(i).getAmount(); }` | `items.stream().mapToDouble(Item::getAmount).sum()` |
| `for (Todo t : todos) { map.put(t.getId(), t); }` | `todos.stream().collect(Collectors.toMap(Todo::getId, t -> t))` |
| Manual loop with `break` to find one item | `stream().findFirst().orElse(...)` |
| Loop building a joined string | `stream().map(...).collect(Collectors.joining(", "))` |
| Loop counting occurrences | `stream().collect(Collectors.groupingBy(...))` |

Keep streams when the logic maps to a chain (`filter` → `map` → `collect`). For complex, stateful, or exception-heavy iteration, a plain loop may be clearer — use judgment, don't force streams.
