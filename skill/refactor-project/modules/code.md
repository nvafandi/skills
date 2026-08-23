# Module: Code

Refactor all Java source code in the Quarkus project to comply with internal engineering standards.

Load [references/engineering-standards.md](../references/engineering-standards.md) before starting. It contains the architectural and coding standards that all Quarkus services must follow.

Load [references/refactoring-patterns.md](../references/refactoring-patterns.md) before starting. It contains Quarkus-specific refactoring patterns, code smells, and improvement recipes.

Load [references/solid-principles.md](../references/solid-principles.md) before starting. It contains SOLID principle definitions, detection patterns, and refactoring recipes for each principle.

Load [references/lombok-rules.md](../references/lombok-rules.md) before starting. It contains Lombok annotation usage rules and Quarkus patterns.

Load [references/entity-mapper-metrics.md](../references/entity-mapper-metrics.md) before starting. It contains entity audit/version standards, mapper layer rules, and Micrometer metrics patterns.

## What to do

- [ ] Verify package structure follows `com.prudential.pruforce.aob.{function}.{layer}`
- [ ] Verify layers present (api, service, repository, entity, mapper, exception, config)
- [ ] Convert field injection to constructor injection (or package-private field injection)
- [ ] Replace private injected fields/methods with package-private modifiers
- [ ] Remove dummy no-args constructors (Quarkus generates them)
- [ ] Replace `@Named` qualifiers with `@Identifier`
- [ ] Wrap all endpoint responses in `ApiResponse<T>`
- [ ] Ensure custom exceptions extend `DomainException`
- [ ] Add Bean Validation to all request DTOs
- [ ] Add `@Transactional` to all write operations
- [ ] Replace `double`/`float` money fields with `BigDecimal`
- [ ] Extract magic values and query literals to `constants/` (`{Domain}Constants`, `{Domain}QueryConstants`); externalize environment-specific values via `@ConfigProperty`
- [ ] Add `@Slf4j` (Lombok) to service classes and replace `System.out`/`printStackTrace`/manual loggers with it
- [ ] Add OpenAPI documentation annotations
- [ ] Convert manual `for`/`for-each`/`while` collection loops to Java Streams
- [ ] Verify classes follow SRP — each class has one reason to change
- [ ] Check for OCP violations — replace switch/if-else chains with strategy/extension patterns
- [ ] Verify LSP compliance — subtypes are substitutable without surprise behavior
- [ ] Check ISP — interfaces are focused, no class implements unused methods
- [ ] Verify DIP — depend on abstractions, not concrete implementations
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

### 6. Missing Logging → Add `@Slf4j`

```java
// BEFORE: No logging or direct printing
@ApplicationScoped
public class TodoService {
    public TodoResponse create(CreateTodoRequest request) {
        System.out.println("Creating todo: " + request); // replace with log
    }
}

// AFTER: With logging
@Slf4j
@ApplicationScoped
public class TodoService {

    public TodoResponse create(CreateTodoRequest request) {
        log.info("Creating todo: {}", request);
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

## SOLID Principles Refactoring Patterns

Load [references/solid-principles.md](../references/solid-principles.md) for full definitions, detection tables, and validation checklists.

### 13. God Class → SRP Split (Single Responsibility)

```java
// BEFORE: God class — multiple reasons to change
@ApplicationScoped
public class OrderService {
    private final EntityManager em;
    private final EmailService emailService;
    private final PaymentGateway paymentGateway;
    private final ReportGenerator reportGenerator;

    OrderService(EntityManager em, EmailService emailService,
                 PaymentGateway paymentGateway, ReportGenerator reportGenerator) {
        this.em = em;
        this.emailService = emailService;
        this.paymentGateway = paymentGateway;
        this.reportGenerator = reportGenerator;
    }

    @Transactional public OrderResponse createOrder(CreateOrderRequest request) { /* ... */ }
    @Transactional public void cancelOrder(Long orderId) { /* ... */ }
    public void sendOrderConfirmation(Long orderId) { /* ... */ }
    public void processPayment(Long orderId, PaymentRequest payment) { /* ... */ }
    public byte[] generateOrderReport(Long orderId) { /* ... */ }
}

// AFTER: Each service has one reason to change
@ApplicationScoped
public class OrderService {
    private final OrderRepository repository;
    private final OrderMapper mapper;

    OrderService(OrderRepository repository, OrderMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        Order entity = mapper.toEntity(request);
        Order saved = repository.save(entity);
        return mapper.toResponse(saved);
    }

    @Transactional
    public void cancelOrder(Long orderId) {
        Order order = repository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
        order.cancel();
    }
}

@ApplicationScoped
public class OrderNotificationService {
    private final EmailService emailService;
    OrderNotificationService(EmailService emailService) { this.emailService = emailService; }
    public void sendOrderConfirmation(Long orderId) { /* ... */ }
}

@ApplicationScoped
public class OrderPaymentService {
    private final PaymentGateway paymentGateway;
    private final OrderRepository repository;
    OrderPaymentService(PaymentGateway paymentGateway, OrderRepository repository) {
        this.paymentGateway = paymentGateway;
        this.repository = repository;
    }
    @Transactional
    public void processPayment(Long orderId, PaymentRequest payment) { /* ... */ }
}
```

### 14. Switch Chain → Strategy Pattern (Open/Closed)

```java
// BEFORE: Must modify this method every time a new type is added
@ApplicationScoped
public class PaymentService {
    @Transactional
    public void processPayment(PaymentRequest request) {
        switch (request.type()) {
            case "CREDIT_CARD": processCreditCard(request); break;
            case "BANK_TRANSFER": processBankTransfer(request); break;
            default: throw new IllegalArgumentException("Unknown: " + request.type());
        }
    }
}

// AFTER: Open for extension, closed for modification
public interface PaymentStrategy {
    String type();
    void process(PaymentRequest request);
}

@ApplicationScoped
public class CreditCardPaymentStrategy implements PaymentStrategy {
    @Override public String type() { return "CREDIT_CARD"; }
    @Override public void process(PaymentRequest request) { /* ... */ }
}

@ApplicationScoped
public class PaymentService {
    private final Map<String, PaymentStrategy> strategies;

    PaymentService(Set<PaymentStrategy> strategySet) {
        this.strategies = strategySet.stream()
                .collect(Collectors.toMap(PaymentStrategy::type, s -> s));
    }

    @Transactional
    public void processPayment(PaymentRequest request) {
        PaymentStrategy strategy = strategies.get(request.type());
        if (strategy == null) {
            throw new IllegalArgumentException("Unknown: " + request.type());
        }
        strategy.process(request);
    }
}
```

### 15. Fat Interface → Segregated Interfaces (Interface Segregation)

```java
// BEFORE: Fat interface — implementers forced to implement unused methods
public interface UserService {
    UserResponse findById(Long id);
    List<UserResponse> findAll();
    UserResponse create(CreateUserRequest request);
    UserResponse update(Long id, UpdateUserRequest request);
    void delete(Long id);
    byte[] exportToCsv();
    void importFromCsv(InputStream file);
    UserStatistics getStatistics();
}

@ApplicationScoped
public class ReadOnlyUserService implements UserService {
    @Override public UserResponse findById(Long id) { /* ... */ }
    @Override public List<UserResponse> findAll() { /* ... */ }
    @Override public UserResponse create(CreateUserRequest request) {
        throw new UnsupportedOperationException("Read-only");
    }
    // ... all other methods throw UnsupportedOperationException
}

// AFTER: Segregated interfaces — each client depends only on what it uses
public interface UserReadService {
    UserResponse findById(Long id);
    List<UserResponse> findAll();
}

public interface UserWriteService {
    UserResponse create(CreateUserRequest request);
    UserResponse update(Long id, UpdateUserRequest request);
    void delete(Long id);
}

public interface UserExportService {
    byte[] exportToCsv();
    void importFromCsv(InputStream file);
}

@ApplicationScoped
public class UserReadServiceImpl implements UserReadService {
    @Override public UserResponse findById(Long id) { /* ... */ }
    @Override public List<UserResponse> findAll() { /* ... */ }
}

// Clients inject only what they need
@ApplicationScoped
public class UserResource {
    private final UserReadService readService;
    private final UserWriteService writeService;
    UserResource(UserReadService readService, UserWriteService writeService) {
        this.readService = readService;
        this.writeService = writeService;
    }
}
```

### 16. Concrete Dependencies → Interface Injection (Dependency Inversion)

```java
// BEFORE: DIP violation — depends on concrete implementation
@ApplicationScoped
public class OrderService {
    private final PanacheOrderRepository repository;  // concrete class
    private final JacksonObjectMapper mapper;          // concrete class

    OrderService(PanacheOrderRepository repository, JacksonObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }
}

// AFTER: DIP compliant — depends on abstractions
public interface OrderRepository extends PanacheRepository<Order> {
    Optional<Order> findByOrderNumber(String orderNumber);
}

@ApplicationScoped
public class OrderRepositoryImpl implements OrderRepository {
    @Override
    public Optional<Order> findByOrderNumber(String orderNumber) {
        return find("orderNumber", orderNumber).firstResultOptional();
    }
}

@ApplicationScoped
public class OrderMapper {
    public Order toEntity(CreateOrderRequest request) { /* ... */ }
    public OrderResponse toResponse(Order entity) { /* ... */ }
}

@ApplicationScoped
public class OrderService {
    private final OrderRepository repository;   // abstraction
    private final OrderMapper mapper;            // abstraction

    OrderService(OrderRepository repository, OrderMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }
}
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
- Follow SOLID principles — see [references/solid-principles.md](../references/solid-principles.md)

## Watch out

- **Preserve behavior**: Refactoring must not change the external behavior of the application
- **Don't break the build**: Compile after each change
- **No silent changes**: Every file modification must be intentional and traceable
- **Check for Spring leftovers**: Search for `org.springframework` imports that should have been removed during migration
- **Lombok**: Apply Lombok annotations (@Data, @Builder, @NonNull, @Slf4j) to reduce boilerplate; write constructors explicitly instead of `@RequiredArgsConstructor`. Verify native mode compatibility if applicable
- **SRP**: Don't create god classes — split services handling multiple concerns (DB + email + payment + reporting)
- **OCP**: Avoid switch/if-else chains that require modification for new types — use strategy pattern or map-based dispatch
- **LSP**: Ensure subtypes don't throw unexpected exceptions or change method semantics
- **ISP**: Don't force implementers to override methods they don't need — split fat interfaces
- **DIP**: Don't depend on concrete implementations — inject interfaces, not classes