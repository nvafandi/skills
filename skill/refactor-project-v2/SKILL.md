# Refactor Project V2: Prudential Engineering Standards

Refactor Java backend projects (Quarkus/Spring Boot) to meet Prudential's layered architecture and code quality standards as defined in the engineering prompts.

## When to Use

- Refactoring existing Quarkus/Spring Boot services
- Applying Prudential engineering standards to a codebase
- Fixing architectural violations (e.g., wrong layer responsibilities)
- Standardizing DTOs, entities, mappers, exception handling
- Restructuring packages and dependencies
- Improving code quality and maintainability

## Key Standards to Apply

### 1. Layered Architecture Enforcement
- **API Layer** (`api/rest/*Resource.java`, `api/dto/**/*Request.java`, `api/dto/**/*Response.java`): HTTP handling and DTOs only
- **Service Layer** (`service/*Service.java`, `service/impl/*ServiceImpl.java`): Business logic, transactions
- **Repository Layer** (`repository/*Repository.java`, `repository/impl/*RepositoryImpl.java`): Data access only
- **Entity Layer** (`entity/*Entity.java`): JPA mappings, audit fields, no business logic
- **Mapper Layer** (`mapper/*Mapper.java`): DTO ↔ Entity conversions
- **Exception Layer** (`exception/*Exception.java`, `exception/GlobalExceptionHandler.java`): Centralized error handling
- **Constants Layer** (`constants/*Constants.java`, `constants/*QueryConstants.java`): Domain magic values and query literals
- **Config Layer** (`config/*Config.java`): Beans, configurations, application setup
- **Util Layer** (`util/*Utils.java`): Only truly reusable helper logic

### 2. Package Naming Conventions
```
src/main/java/com/prudential/pruforce/aob/{function}/
├── api/
│   ├── rest/
│   │   └── {Domain}Resource.java      # REST Resource (controller)
│   ├── dto/
│   │   ├── request/
│   │   │   ├── Create{Domain}Request.java
│   │   │   └── Update{Domain}Request.java
│   │   └── response/
│   │       └── {Domain}Response.java
│   └── ApiResponse.java               # Shared response wrapper
├── service/
│   ├── {Domain}Service.java           # Service interface
│   └── impl/
│       └── {Domain}ServiceImpl.java    # Service implementation
├── repository/
│   ├── {Domain}Repository.java        # Repository interface
│   └── impl/
│       └── {Domain}RepositoryImpl.java # Repository implementation
├── entity/
│   └── {Domain}.java                  # JPA entity (audit fields, @Version)
├── mapper/
│   └── {Domain}Mapper.java            # DTO ↔ Entity conversion
├── exception/
│   ├── {Domain}Exception.java         # Base domain exception
│   └── GlobalExceptionHandler.java    # Centralized error handler
├── constants/
│   ├── {Domain}Constants.java         # Domain magic values (statuses, labels, limits)
│   └── {Domain}QueryConstants.java    # JPQL/native query literals
├── config/
│   └── {Domain}Config.java            # Configuration and beans
└── util/
    └── {Domain}Utils.java             # Only if truly reusable logic exists
```

### 3. REST Endpoints
```
POST   /api/v1/{resource}           → Create
GET    /api/v1/{resource}/{id}      → Read
GET    /api/v1/{resource}           → List (with pagination)
PUT    /api/v1/{resource}/{id}      → Update
DELETE /api/v1/{resource}/{id}      → Delete
```

### 4. DTOs & Validation
- **Request DTOs**: Include Bean Validation (`@NotNull`, `@NotBlank`, etc.)
- **Response DTOs**: No validation annotations
- **ApiResponse<T> wrapper**: All endpoints return `ApiResponse<T>`
- **BigDecimal for money**: Never Float/Double
- **LocalDateTime for timestamps**: Never java.util.Date

### 5. Service Layer Rules
- **Constructor injection** (no `@Autowired` field injection)
- **@Transactional** on write operations
- **@Transactional(readOnly = true)** on read operations
- **@Slf4j** for logging
- **Mapper usage**: Convert entities to DTOs in service layer

### 6. Entity Model Standards
- **@Id @GeneratedValue(strategy = GenerationType.IDENTITY)**
- **Audit fields**: `createdAt`, `updatedAt`, `@Version`
- **@CreationTimestamp** and **@UpdateTimestamp** annotations
- **Indexes** on frequently queried columns
- **@JsonInclude(JsonInclude.Include.NON_NULL)** on responses

### 7. Exception Handling
- Extend `DomainException` base class
- Use `@RestControllerAdvice` for global handler
- Include HTTP status codes
- Log all exceptions with context

### 8. Dependency Injection
- **Always use constructor injection**
- **Make all dependencies `private final`**
- No field injection with `@Autowired`

## Refactoring Checklist

Before starting refactor:
- [ ] Identify all layers and their current locations
- [ ] Check for circular dependencies or layer violations
- [ ] Review DTOs and validation
- [ ] Audit service methods for transaction boundaries
- [ ] Check exception handling coverage
- [ ] Verify mapper implementations

During refactor:
- [ ] Create new package structure if needed
- [ ] Move classes to correct layers
- [ ] Extract DTOs to separate request/response files
- [ ] Create mappers and remove manual conversions
- [ ] Add/improve exception handling
- [ ] Replace field injection with constructor injection
- [ ] Add missing @Transactional annotations
- [ ] Add @Slf4j and logging

After refactor:
- [ ] Run full build: `mvn clean install` or `gradle clean build`
- [ ] Run lint/formatter: `mvn spotless:apply` or `gradle spotlessApply`
- [ ] Run tests: `mvn test` or `gradle test`
- [ ] Verify coverage increased (aim for 80%+)
- [ ] Check no new warnings/errors introduced

## Common Refactoring Patterns

### Moving Classes Between Layers
```bash
# Identify classes in wrong layers
grep -r "@Service" src/main/java/*/repository/
grep -r "@Repository" src/main/java/*/service/

# Move files to correct location
mv src/main/java/com/prudential/pruforce/aob/old/WrongLayer.java \
   src/main/java/com/prudential/pruforce/aob/new/correct/Layer.java

# Update package declarations and imports
```

### Creating Mappers for Manual Conversions
Look for manual `.setXxx()` and `.getXxx()` chains:
```java
// Old pattern to eliminate
Payment p = new Payment();
p.setId(dto.getId());
p.setAmount(dto.getAmount());
// ...

// New pattern with mapper
Payment p = paymentMapper.toEntity(dto);
```

### Replacing Field Injection with Constructor
```java
// Old (wrong)
@Service
public class MyService {
    @Autowired
    private MyRepository repo;
}

// New (right)
@Service
public class MyService {
    private final MyRepository repo;
    
    public MyService(MyRepository repo) {
        this.repo = repo;
    }
}
```

### Adding Audit Fields to Entities
```java
@CreationTimestamp
@Column(nullable = false, updatable = false)
private LocalDateTime createdAt;

@UpdateTimestamp
@Column(nullable = false)
private LocalDateTime updatedAt;

@Version
private Long version;
```

### Extracting Response DTO Wrapping
```java
// Old
return payment;  // Returns entity directly

// New
return ApiResponse.success(paymentMapper.toResponse(payment));
```

## Implementation Workflow

1. **Survey** the codebase to understand current structure
2. **Audit** layers and identify violations
3. **Plan** refactoring order (dependencies first)
4. **Implement** layer by layer
5. **Test** after each major change
6. **Build & verify** with full compilation and checks
7. **Run test suite** and report coverage

## Example Refactoring Task

```
Use the refactor-project-v2 skill to refactor PaymentService:

1. Separate PaymentDTO into CreatePaymentRequest and PaymentResponse
2. Create PaymentMapper for all DTO/Entity conversions
3. Replace @Autowired field injection with constructor injection
4. Add @Transactional and @Transactional(readOnly=true) annotations
5. Create custom exceptions (PaymentNotFoundException, PaymentValidationException)
6. Set up GlobalExceptionHandler with @RestControllerAdvice
7. Ensure all responses wrapped in ApiResponse<T>
8. Add BigDecimal constraints to monetary fields
9. Run full build and tests
10. Report coverage and verify no new warnings
```

## Tools & Commands Reference

```bash
# Build commands
mvn clean install              # Maven
gradle clean build             # Gradle
mvn quarkus:dev               # Quarkus dev mode

# Formatting
mvn spotless:apply            # Maven formatter
gradle spotlessApply          # Gradle formatter

# Testing
mvn test                       # Maven tests
gradle test                    # Gradle tests
mvn test jacoco:report        # Coverage report

# Static analysis
mvn checkstyle:check          # Code style
mvn pmd:check                 # Code analysis
mvn spotbugs:check            # Bug detection
```

## Global Coding Guidelines Compliance

Ensure refactoring adheres to the Global Coding Guidelines:

1. **No wildcard imports** - Use explicit imports
2. **Safe assignment** - Use Optional, guards, validation
3. **No test mocking shortcuts** - Use exact values
4. **Named constants** - Extract repeated hardcoded values
5. **Small functions** - Extract cohesive helpers
6. **No redundant comments** - Only non-obvious rationale
7. **Use framework validators** - Don't reinvent validation
8. **Immutable records** - Use record types on JDK 17+
9. **Builders/immutable construction** - Over mutable setters
10. **Respect architecture** - Clean Architecture layer direction

## Success Criteria

✅ All classes in correct layers
✅ Package structure follows conventions
✅ No field injection remaining
✅ DTOs properly separated (request/response)
✅ All responses wrapped in ApiResponse<T>
✅ Exception handling centralized
✅ Mappers handle all conversions
✅ Transactional boundaries correct
✅ Tests pass with 80%+ coverage
✅ Full build succeeds with no warnings
✅ Code formatted and linted

## See Also

- Service Generation: Use when creating new services from scratch
- Always-Full-Compile: Run build after major changes
- Global Coding Guidelines: /home/nurvan/AGENTS.md
