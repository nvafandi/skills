# PruForce Engineering Standards

This reference file contains the architectural and coding standards that all migrated services must follow. It is based on `ptpla-cbv-pf-engineering-prompts/documentation/README.md`.

## Core Principles

All Java backend services must follow these principles:

- ✅ **Layered Architecture** (Controller → Service → Repository → Entity)
- ✅ **Package Structure:** `com.prudential.pruforce.aob.{function}.{layer}`
- ✅ **Consistent Naming Conventions** across all components
- ✅ **Standardized API Responses** using `ApiResponse<T>` wrapper
- ✅ **Rigorous Exception Handling** with custom exceptions
- ✅ **Dependency Injection** (constructor-only, no field injection)
- ✅ **Bean Validation** on all request DTOs
- ✅ **Comprehensive Testing** (unit + integration tests)
- ✅ **Complete Documentation** (OpenAPI + Swagger + Javadoc)

## Precision & Consistency

Every service generated follows the **exact same** structure, naming conventions, and patterns. No drift or variations allowed.

## Critical Rules

### 1. No Field Injection

```java
// ❌ NEVER
@Autowired
private PaymentService service;

// ✅ ALWAYS
private final PaymentService service;
public Controller(PaymentService service) {
    this.service = service;
}
```

### 2. Money Always BigDecimal

```java
// ❌ NEVER
private double amount;

// ✅ ALWAYS
private BigDecimal amount;
```

### 3. Standardized Responses

All responses wrapped in `ApiResponse<T>`:

```java
public ApiResponse<PaymentResponse> create(@Valid @RequestBody CreatePaymentRequest request) {
    PaymentResponse response = service.createPayment(request);
    return ApiResponse.success(response, "Payment created successfully");
}
```

### 4. Layered Architecture

```
REST Controller (@RestController)
     ↓
Service Layer (@Service, @Transactional)
     ↓
Repository Layer (JpaRepository)
     ↓
Entity (JPA @Entity)
```

### 5. Exception Handling

All exceptions extend `DomainException` and are caught by `GlobalExceptionHandler`.

## Quality Gates Checklist

Before migrating or generating any service, verify:

- [ ] **Architecture:** All 5 layers present (API, Service, Repository, Entity, Config)
- [ ] **Naming:** Package structure and naming follow standards exactly
- [ ] **Injection:** Only constructor injection used (no @Autowired field injection)
- [ ] **DTOs:** Separate Request/Response DTOs with @Valid annotations
- [ ] **Responses:** All endpoints return `ApiResponse<T>` wrapper
- [ ] **Exceptions:** Custom exceptions extend DomainException
- [ ] **Logging:** @Slf4j on services, appropriate log levels
- [ ] **Tests:** Unit tests (mocked) + Integration tests (TestRestTemplate)
- [ ] **Documentation:** OpenAPI annotations + Javadoc + README.md
- [ ] **Configuration:** No hardcoded values, all externalized
- [ ] **Transactions:** @Transactional on write operations
- [ ] **Validation:** Bean Validation on request DTOs

## Common Mistakes to Avoid

```
✗ @Autowired field injection (use constructor instead)
✗ Service fields that are not final (always use private final)
✗ Returning raw entities (always wrap in ApiResponse<T>)
✗ Using Double for money (always use BigDecimal)
✗ Business logic in repository layer
✗ Missing exception handling
✗ No logging in services
✗ Hardcoded configuration values
✗ No validation on request DTOs
✗ Missing unit/integration tests