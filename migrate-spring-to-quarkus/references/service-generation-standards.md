# Service Generation Standards

This reference contains comprehensive architectural and coding guidelines for generating consistent Java backend services during migration. Based on `ptpla-cbv-pf-engineering-prompts/prompts/code-guideline/copilot-instructions.md`.

## 1. Project Structure & Package Naming

### Standard Package Structure
```
com.prudential.pruforce.aob.{function}
├── com.prudential.pruforce.aob.{function}.api
│   ├── rest
│   │   └── {DomainResource}.java (e.g., PaymentResource.java)
│   ├── dto
│   │   ├── request
│   │   │   └── Create{Domain}Request.java
│   │   │   └── Update{Domain}Request.java
│   │   └── response
│   │       └── {Domain}Response.java
│   └── ApiResponse.java (shared wrapper)
├── com.prudential.pruforce.aob.{function}.service
│   ├── {Domain}Service.java (interface)
│   └── {Domain}ServiceImpl.java (implementation)
├── com.prudential.pruforce.aob.{function}.repository
│   └── {Domain}Repository.java (Spring Data JPA / Quarkus Repository)
├── com.prudential.pruforce.aob.{function}.entity
│   └── {Domain}.java (JPA Entity)
├── com.prudential.pruforce.aob.{function}.mapper
│   └── {Domain}Mapper.java (DTOs ↔ Entities)
├── com.prudential.pruforce.aob.{function}.exception
│   ├── {Domain}Exception.java
│   ├── {Domain}NotFoundException.java
│   └── GlobalExceptionHandler.java
├── com.prudential.pruforce.aob.{function}.config
│   ├── AppConfig.java (Beans, Configurations)
│   └── ValidationConfig.java (Validation rules)
└── com.prudential.pruforce.aob.{function}.util
    └── {Domain}Utils.java
```

### File Naming Conventions
| Component | Naming Pattern | Example |
|-----------|---|---|
| REST Controller | `{Domain}Resource.java` | `PaymentResource.java` |
| Service Interface | `{Domain}Service.java` | `PaymentService.java` |
| Service Impl | `{Domain}ServiceImpl.java` | `PaymentServiceImpl.java` |
| Repository | `{Domain}Repository.java` | `PaymentRepository.java` |
| Entity | `{Domain}.java` | `Payment.java` |
| Request DTO | `{Action}{Domain}Request.java` | `CreatePaymentRequest.java` |
| Response DTO | `{Domain}Response.java` | `PaymentResponse.java` |
| Mapper | `{Domain}Mapper.java` | `PaymentMapper.java` |
| Exception | `{Domain}{Type}Exception.java` | `PaymentNotFoundException.java` |

## 2. Layered Architecture

### Layer Responsibilities

#### API Layer (REST Controllers)
- Accept HTTP requests
- Validate input using Bean Validation (`@Valid`)
- Call service layer
- Return standardized `ApiResponse<T>`
- File: `com.prudential.pruforce.aob.{function}.api.rest.{Domain}Resource.java`

#### Service Layer
- Business logic & orchestration
- Transaction management (`@Transactional`)
- Validation & error handling
- Mapper calls for DTO/Entity conversion
- Files:
  - Interface: `com.prudential.pruforce.aob.{function}.service.{Domain}Service.java`
  - Implementation: `com.prudential.pruforce.aob.{function}.service.{Domain}ServiceImpl.java`

#### Repository Layer
- Database operations only
- Use Spring Data JPA or Quarkus Panache ORM
- Custom native queries when needed
- File: `com.prudential.pruforce.aob.{function}.repository.{Domain}Repository.java`

#### Entity Layer
- JPA Entity mappings
- No business logic
- Use column annotations for DB mapping
- File: `com.prudential.pruforce.aob.{function}.entity.{Domain}.java`

## 3. REST API Endpoints

### Naming Convention
```
/api/v1/{resource}/{id}
```

### Standard CRUD Endpoints
```
POST   /api/v1/payments                  → Create
GET    /api/v1/payments/{id}             → Read (by ID)
GET    /api/v1/payments                  → List (with pagination)
PUT    /api/v1/payments/{id}             → Update
DELETE /api/v1/payments/{id}             → Delete
```

## 4. Standardized API Response Wrapper

### ApiResponse Definition
```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private int status;
    private String message;
    private T data;
    private List<String> errors;
    private LocalDateTime timestamp;

    public static <T> ApiResponse<T> success(T data) { ... }
    public static <T> ApiResponse<T> success(T data, String message) { ... }
    public static <T> ApiResponse<T> error(int status, String message) { ... }
    public static <T> ApiResponse<T> error(int status, String message, List<String> errors) { ... }
}
```

All responses must be wrapped in `ApiResponse<T>`.

## 5. DTOs (Data Transfer Objects)

### Request DTO Pattern
- Separate Request/Response DTOs
- Bean Validation annotations (`@NotNull`, `@NotBlank`, `@Size`, `@Valid`)
- Use `BigDecimal` for money
- Use `LocalDateTime` for dates

### Response DTO Pattern
- No validation annotations needed
- Include all fields returned to client
- Use `Map<String, String>` for extensibility/metadata

## 6. Entity Models

### Entity Pattern
- `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)`
- Audit fields: `createdAt`, `updatedAt`, `version`
- Use `@CreationTimestamp` and `@UpdateTimestamp`
- Include `@Version` for optimistic locking
- Define indexes on frequently queried columns
- Money fields: `precision = 19, scale = 2`

## 7. Mappers (DTO ↔ Entity Conversion)

- Separate mappers per domain
- Methods: `toEntity()`, `toResponse()`, `toResponseList()`, `toResponsePage()`
- Use `@Component` (Spring) or `@ApplicationScoped` (Quarkus)
- Never circular mappings

## 8. Service Layer

### Service Interface
- Define clear method signatures
- Include Javadoc for each method

### Service Implementation
- Constructor injection only (no field injection)
- `@Transactional` on write operations
- `@Transactional(readOnly = true)` on read operations
- Logging with `@Slf4j`
- Convert entities to DTOs using mappers

## 9. Repository Layer

### Spring Data JPA Repository
- Extend `JpaRepository<T, ID>`
- Use derived query methods (`findByStatus`, `countByStatus`)
- Use `@Query` for complex queries with `@Param`
- Support `Pageable` for pagination

### Quarkus Panache Repository
- Implement `PanacheRepository<T>`
- Use `find()`, `list()`, `count()`, etc.

## 10. Exception Handling

### Custom Exception Hierarchy
```java
public abstract class DomainException extends RuntimeException {
    private final int status;
    private final List<String> errors;
    // constructors and getters
}
```

All custom exceptions extend `DomainException`.

### Global Exception Handler
- `@RestControllerAdvice` (Spring) or `@ServerExceptionMapper` (Quarkus)
- Handle `DomainException`, validation exceptions, and general exceptions
- Return `ApiResponse` with appropriate HTTP status

## 11. Dependency Injection

- **ALWAYS constructor injection** - No field injection with `@Autowired`
- All dependencies are `private final`
- Enables easy mocking in tests

## 12. Validation

- Request DTOs: Bean Validation annotations (`@NotNull`, `@NotBlank`, `@Size`, etc.)
- Resource methods: Use `@Valid` on DTO parameters
- Service layer: Additional business rule validation
- Custom validators: Implement `ConstraintValidator` for complex logic

## 13. Configuration Management

- Externalize secrets: Use environment variables
- Profiles: `application-{profile}.yml` for different environments
- No hard-coded values
- Use `@ConfigurationProperties` (Spring) or `@ConfigMapping` (Quarkus)

## 14. Logging & Monitoring

- Use `@Slf4j` annotation
- Log levels: INFO for business events, DEBUG for details, WARN for recoverable issues, ERROR for exceptions
- Never log sensitive data
- Use structured logging with context

## 15. Database Queries

- Prefer JPQL over native SQL
- Use named parameters (`@Param`)
- Support pagination with `Pageable`
- Define indexes for frequently queried columns

## 16. REST API Documentation

- OpenAPI 3.0 annotations (`@Operation`, `@ApiResponse`, `@Schema`)
- Document all endpoints with summary and description
- Include Swagger UI

## 17. Testing Standards

### Unit Tests
- Use JUnit 5 + Mockito
- Mock dependencies
- Test business logic in isolation
- Use `@DisplayName` for readable tests

### Integration Tests
- Use `@SpringBootTest` (Spring) or `@QuarkusTest` (Quarkus)
- Use `TestRestTemplate` (Spring) or RestAssured (Quarkus)
- Test with real database (H2 for tests)

## 18. Framework-Specific Guidelines

### Spring Boot vs Quarkus Comparison

| Aspect | Spring Boot | Quarkus |
|---|---|---|
| **Dependencies** | `spring-boot-starter-web`, `spring-boot-starter-data-jpa` | `quarkus-rest-jackson`, `quarkus-hibernate-orm-panache` |
| **DI Annotations** | `@Component`, `@Service`, `@Repository`, `@Autowired` | `@ApplicationScoped`, `@Inject` |
| **REST Annotations** | `@RestController`, `@GetMapping`, `@PostMapping` | `@Path`, `@GET`, `@POST` (JAX-RS) |
| **ORM** | Spring Data JPA (`JpaRepository`) | Hibernate ORM with Panache (`PanacheRepository`) |
| **Configuration** | `@ConfigurationProperties`, `application.yml` | `@ConfigMapping`, `application.properties` |
| **Testing** | `@SpringBootTest`, `TestRestTemplate` | `@QuarkusTest`, RestAssured |
| **Main Class** | `@SpringBootApplication` | Not needed (auto-generated) |
| **Startup** | `SpringApplication.run()` | `quarkus:dev` or auto-generated |
| **Transactions** | `@Transactional` (Spring) | `@Transactional` (Jakarta) |
| **Caching** | `@Cacheable` (Spring) | `@CacheResult` (Quarkus) |

### Migration Notes

- **Spring compat extensions** (`quarkus-spring-*`) allow gradual migration but limit native image benefits
- **Full migration** to native Quarkus APIs provides best performance and smallest footprint
- **Annotation mapping** details in `references/annotation-map.md`
- **Dependency mapping** details in `references/dependency-map.md`
- **Configuration mapping** details in `references/config-map.md`

## 19. Code Quality

### Naming Conventions
- Package: `com.company.apps.module.function.{layer}`
- Class: `PascalCase`
- Method: `camelCase`
- Constant: `UPPER_SNAKE_CASE`

### Code Style
- Line length: max 120 characters
- Indentation: 4 spaces
- No wildcard imports
- Use Lombok: `@Data`, `@Builder`, `@AllArgsConstructor`, `@NoArgsConstructor`

### Precision Guidelines
- Date/Time: `LocalDateTime`
- Money: `BigDecimal`
- Prefer immutable objects

## 20. Checklist for Service Generation

- [ ] Package structure follows `com.prudential.pruforce.aob.{function}.{layer}`
- [ ] All layers created (api, service, repository, entity, mapper, exception)
- [ ] REST Controller follows `{Domain}Resource` pattern
- [ ] All endpoints return `ApiResponse<T>` wrapper
- [ ] Service Interface exists with clear Javadoc
- [ ] Service Implementation uses constructor injection
- [ ] All repositories extend `JpaRepository` or `PanacheRepository`
- [ ] Entity includes audit fields (createdAt, updatedAt, version)
- [ ] DTOs have Bean Validation annotations
- [ ] Exception handling with custom `DomainException` hierarchy
- [ ] Global exception handler registered
- [ ] Mapper converts DTO ↔ Entity correctly
- [ ] Service layer has logging with `@Slf4j`
- [ ] Configuration externalized (no hardcoded values)
- [ ] Unit tests written (Mockito)
- [ ] Integration tests included (TestRestTemplate / RestAssured)
- [ ] OpenAPI documentation on endpoints
- [ ] README.md with service overview and API endpoints
- [ ] `application-{profile}.yml` for different environments
- [ ] pom.xml / build.gradle with required dependencies

## 21. Common Mistakes to Avoid

- ❌ Field injection with `@Autowired`
- ❌ Using `Double`/`Float` for money
- ❌ Business logic in repository layer
- ❌ Missing validation annotations
- ❌ Returning raw entities instead of DTOs
- ❌ Hardcoded configuration values
- ❌ Missing logging in services
- ❌ Missing unit/integration tests
- ❌ Not wrapping responses in `ApiResponse<T>`
- ❌ Custom exceptions not extending `DomainException`