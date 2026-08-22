# PruForce Engineering Standards

This reference file contains the architectural and coding standards that all Quarkus services must follow. It is maintained internally for this skill.

## Core Principles

All Java backend services must follow these principles:

- ✅ **Layered Architecture** (Resource → Service → Repository → Entity)
- ✅ **Package Structure:** `com.prudential.pruforce.aob.{function}.{layer}`
- ✅ **Consistent Naming Conventions** across all components
- ✅ **Standardized API Responses** using `ApiResponse<T>` wrapper
- ✅ **Rigorous Exception Handling** with custom exceptions
- ✅ **Dependency Injection** (constructor-only, no field injection)
- ✅ **Bean Validation** on all request DTOs
- ✅ **Comprehensive Testing** (unit + integration tests)
- ✅ **Complete Documentation** (OpenAPI + Swagger + Javadoc)

## Precision & Consistency

Every service follows the **exact same** structure, naming conventions, and patterns. No drift or variations allowed.

## Critical Rules

### 1. No Private Field Injection — Prefer Package-Private or Constructor Injection

Per the [Quarkus CDI Reference](https://quarkus.io/guides/cdi-reference#native-executables-and-private-members), Quarkus uses GraalVM for native executables, and reflective access to **private members** increases native executable size. Use **package-private** injected fields, or constructor injection (simplified in Quarkus — no dummy no-args constructor needed):

```java
// ❌ NEVER: private field injection (requires reflection in native image)
@Inject
private PaymentService service;

// ✅ ALWAYS: package-private field injection (no reflection needed)
@Inject
PaymentService service;

// ✅ ALSO: simplified constructor injection — @Inject is optional with a single constructor
@ApplicationScoped
public class PaymentResource {
    private final PaymentService service;
    PaymentResource(PaymentService service) {   // package-private constructor, no @Inject needed
        this.service = service;
    }
}
```

Quarkus treats constructor injection as **simplified**: there is no need for a dummy no-args constructor, and `@Inject` is optional when there is only one constructor.

### 2. Money Always BigDecimal

```java
// ❌ NEVER
private double amount;

// ✅ ALWAYS
@Column(precision = 19, scale = 2)
private BigDecimal amount;
```

### 3. Standardized Responses

All responses wrapped in `ApiResponse<T>`:

```java
public ApiResponse<PaymentResponse> create(@Valid CreatePaymentRequest request) {
    PaymentResponse response = service.createPayment(request);
    return ApiResponse.success(response, "Payment created successfully");
}
```

### 4. Layered Architecture

```
REST Resource (@Path)
     ↓
Service Layer (@ApplicationScoped, @Transactional)
     ↓
Repository Layer (PanacheRepository)
     ↓
Entity (JPA @Entity)
```

### 5. Exception Handling

All exceptions extend `DomainException` and are caught by `GlobalExceptionHandler`.

### 6. Use `@Identifier` over `@Named`

String-based qualifiers like `@Named` are not type-safe and are discouraged in CDI. Instead, use `@io.smallrye.common.annotation.Identifier`, which works like all other qualifiers and does **not** automatically add `@Default`:

```java
// ❌ NEVER: @Named causes ambiguity issues (auto-adds @Default)
@ApplicationScoped
public class Producers {
    @Produces MyBean produce() { ... }
    @Produces @Named("foo") MyBean produceFoo() { ... }
}

// ✅ ALWAYS: @Identifier is a regular qualifier
@ApplicationScoped
public class Producers {
    @Produces MyBean produce() { ... }
    @Produces @Identifier("foo") MyBean produceFoo() { ... }
}
```

Use `@Named` only as an external identifier for Qute templates (`{inject:myBean.value}`), not for DI resolution.

### 7. Java Streams for Collection Processing

Prefer Java Streams over manual `for`/`for-each`/`while` loops when iterating collections for filtering, mapping, or reducing:

```java
// ❌ NEVER: manual for-each loop with filter + collect
List<TodoResponse> completed = new ArrayList<>();
for (Todo todo : todos) {
    if (todo.isCompleted()) {
        completed.add(mapper.toResponse(todo));
    }
}

// ✅ ALWAYS: Stream pipeline
List<TodoResponse> completed = todos.stream()
        .filter(Todo::isCompleted)
        .map(mapper::toResponse)
        .toList();
```

## Quality Gates Checklist

Before refactoring or generating any service, verify:

- [ ] **Architecture:** All 5 layers present (API, Service, Repository, Entity, Config)
- [ ] **Naming:** Package structure and naming follow standards exactly
- [ ] **Injection:** Only constructor injection used (no @Inject field injection)
- [ ] **DTOs:** Separate Request/Response DTOs with @Valid annotations
- [ ] **Responses:** All endpoints return `ApiResponse<T>` wrapper
- [ ] **Exceptions:** Custom exceptions extend DomainException
- [ ] **Logging:** Logger on services, appropriate log levels
- [ ] **Tests:** Unit tests (mocked) + Integration tests (@QuarkusTest)
- [ ] **Documentation:** OpenAPI annotations + Javadoc + README.md
- [ ] **Configuration:** No hardcoded values, all externalized
- [ ] **Transactions:** @Transactional on write operations
- [ ] **Validation:** Bean Validation on request DTOs
- [ ] **Streams:** Collection iteration uses Java Streams, not manual `for`/`for-each` loops
- [ ] **CDI:** No private member injection (use package-private or constructor injection)
- [ ] **CDI:** `@Inject` not on private constructors/fields in bean classes
- [ ] **CDI:** Bean classes avoid private observer/producer methods

## Common Mistakes to Avoid

```
✗ @Inject field injection (use package-private or constructor injection instead)
✗ Private injected fields/observer methods (use package-private modifiers per Quarkus CDI reference)
✗ Dummy no-args constructors for normal scoped beans (Quarkus generates them automatically)
✗ `@Named` for string-based qualifiers (use `@Identifier` from SmallRye)
✗ Service fields that are not final (always use private final)
✗ Returning raw entities (always wrap in ApiResponse<T>)
✗ Using Double for money (always use BigDecimal)
✗ Business logic in repository layer
✗ Missing exception handling
✗ No logging in services
✗ Manual `for`/`for-each` loops over collections (use Java Streams)
✗ Hardcoded configuration values
✗ No validation on request DTOs
✗ Missing unit/integration tests