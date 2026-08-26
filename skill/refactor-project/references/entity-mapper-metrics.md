# Entity, Mapper, DTO, Service & Resource Standards

Standards applied during the Code module of the Quarkus refactoring flow. This is the **single source of truth** for all layer-specific patterns, rules, and cross-layer synchronization. All other reference files defer to this document for layer implementation details.

---

## Layer Flow & Synchronization

Every request flows through the layers in this exact order. Each layer has a defined responsibility — no layer may skip or duplicate another layer's job.

```
Client Request
     ↓
┌─────────────────────────────────────────────────────┐
│  REST Resource (@Path)                              │
│  Responsibility: HTTP mapping, input validation,   │
│                  response wrapping (ApiResponse)    │
│  Receives: @Valid Request DTO                       │
│  Returns:  ApiResponse<Response DTO>                │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  Service (@ApplicationScoped)                       │
│  Responsibility: business logic, transaction       │
│                  boundaries, logging, metrics       │
│  Receives: Request DTO                              │
│  Returns:  Response DTO                             │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  Mapper (@ApplicationScoped)                        │
│  Responsibility: DTO ↔ Entity conversion only       │
│  Called by: Service layer                           │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  Repository (PanacheRepository interface + impl)    │
│  Responsibility: data access, custom queries        │
│  Returns:  Entity                                   │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  Entity (@Entity)                                   │
│  Responsibility: JPA mapping, audit fields,        │
│                  optimistic locking                 │
└─────────────────────────────────────────────────────┘
```

### Cross-Layer Rules

| Rule | Detail |
|---|---|
| **Entity never leaves Resource** | Resource returns Response DTO wrapped in `ApiResponse<T>`, never the Entity |
| **Service never returns Entity** | Service returns Response DTO; mapper converts Entity → Response DTO |
| **Resource never contains business logic** | Resource delegates to Service immediately after validation |
| **Mapper is the only converter** | DTO ↔ Entity conversion happens exclusively in Mapper; Service and Resource never call `new Entity(...)` or access Entity fields directly for response building |
| **DTOs are immutable** | Use Java records (preferred) or Lombok `@Data` + `@Builder`; never mutate DTOs after creation |
| **Repository never contains business logic** | Repository is data access only; business rules belong in Service |

---

## 1. Entity Standards

### Entity Pattern
```java
@Entity
@Table(name = "payments", indexes = {
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_created_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"metadata"})
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "JSON")
    private String metadata; // Store as JSON string, deserialize on demand

    @CreationTimestamp
    @Column(nullable = false, updatable = false, name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false, name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    private Long version; // Optimistic locking
}
```

### Entity Rules
| Rule | Detail |
|---|---|
| **Primary Key** | Always `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| **Audit Fields** | Wajib ada `createdAt`, `updatedAt`, `version` |
| **Timestamps** | Gunakan `@CreationTimestamp` dan `@UpdateTimestamp`, tipe `LocalDateTime` (bukan `Date`) |
| **Versioning** | Field `@Version` untuk optimistic locking |
| **Indexes** | Definisikan index pada kolom yang sering menjadi filter query |
| **Money** | `BigDecimal` dengan `precision = 19, scale = 2`; dilarang `float`/`double` |
| **Large Content** | `columnDefinition = "TEXT"` atau `"JSON"` |
| **Identity** | `@EqualsAndHashCode(of = "id")`; exclude field besar dari `@ToString` |

### Entity ↔ Other Layers Sync
| Layer | Entity interaction |
|---|---|
| **Mapper** | Mapper reads Entity fields to build Response DTO; Mapper creates Entity from Request DTO |
| **Repository** | Repository returns Entity; Service calls Repository |
| **Service** | Service receives Entity from Repository, passes to Mapper; never exposes Entity to Resource |
| **Resource** | Resource never touches Entity directly |

---

## 2. Mapper Layer (DTO ↔ Entity)

### Mapper Pattern
```java
@ApplicationScoped
public class PaymentMapper {

    // Request DTO → Entity
    public Payment toEntity(CreatePaymentRequest request) {
        return Payment.builder()
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .status(PaymentStatus.PENDING)
                .build();
    }

    // Entity → Response DTO
    public PaymentResponse toResponse(Payment entity) {
        return PaymentResponse.builder()
                .id(entity.getId())
                .amount(entity.getAmount())
                .status(entity.getStatus().name())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    // Update existing entity from Update DTO
    public Payment toEntity(UpdatePaymentRequest request, Payment existing) {
        existing.setAmount(request.getAmount());
        existing.setStatus(PaymentStatus.valueOf(request.getStatus()));
        return existing;
    }

    // Collection helpers
    public List<PaymentResponse> toResponseList(List<Payment> entities) {
        return entities.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
}
```

### Mapper Rules
| Rule | Detail |
|---|---|
| **Satu mapper per domain** | `{Domain}Mapper.java` di package `mapper/` (e.g., `PaymentMapper`) |
| **Registration** | `@ApplicationScoped` |
| **Eksplisit satu arah** | Map field secara manual dan eksplisit; tidak ada circular mapping |
| **Collections** | List → `.stream().map(...).collect(...)`; Page → `.map(this::toResponse)` |
| **Placement** | Konversi DTO ↔ Entity hanya dilakukan mapper; service memanggil mapper |
| **Update pattern** | For updates: `toEntity(UpdateRequest, existingEntity)` — mutate existing entity, don't create new one |
| **Null safety** | Mapper methods must handle null inputs gracefully (return null or empty, don't throw) |
| **No business logic** | Mapper only converts data; no validation, no transaction, no side effects |

### Mapper ↔ Other Layers Sync
| Layer | Mapper interaction |
|---|---|
| **Service** | Service creates Mapper via constructor injection; calls `mapper.toEntity(request)` and `mapper.toResponse(entity)` |
| **Entity** | Mapper reads Entity fields; Mapper creates Entity via builder |
| **Resource** | Resource never calls Mapper directly; Service is the only caller |
| **Repository** | Repository never calls Mapper |

---

## 3. DTO Standards

### DTO Types

| DTO Type | Purpose | Package | Naming | Validation |
|---|---|---|---|---|
| **Create Request** | Input for create operations | `api/dto/request/` | `Create{Domain}Request` | `@Valid` + Bean Validation annotations |
| **Update Request** | Input for update operations | `api/dto/request/` | `Update{Domain}Request` | `@Valid` + Bean Validation annotations |
| **Search/Filter Request** | Query parameters for list/search | `api/dto/request/` | `Search{Domain}Request` or `{Domain}FilterRequest` | Optional validation |
| **Response** | Output to client | `api/dto/response/` | `{Domain}Response` | None (output only) |
| **List Response** | Paginated list output | `api/dto/response/` | `{Domain}ListResponse` | None (output only) |

### Request DTO Pattern
```java
// Create request — all required fields validated
public record CreatePaymentRequest(
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    BigDecimal amount,

    @NotBlank(message = "Currency is required")
    @Size(min = 3, max = 3, message = "Currency must be 3 characters")
    String currency,

    @Size(max = 500, message = "Description must be at most 500 characters")
    String description
) {}

// Update request — partial updates, all fields optional
public record UpdatePaymentRequest(
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    BigDecimal amount,

    @Size(min = 3, max = 3, message = "Currency must be 3 characters")
    String currency,

    @Size(max = 500, message = "Description must be at most 500 characters")
    String description
) {}

// Search/filter request — query parameters
public record SearchPaymentRequest(
    @Size(max = 100) String status,
    @DecimalMin("0.01") BigDecimal minAmount,
    @DecimalMin("0.01") BigDecimal maxAmount,
    @Min(0) Integer page,
    @Min(1) @Max(100) Integer size
) {}
```

### Response DTO Pattern
```java
// Single entity response
public record PaymentResponse(
    Long id,
    BigDecimal amount,
    String currency,
    String status,
    String description,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}

// Paginated list response
public record PaymentListResponse(
    List<PaymentResponse> data,
    long totalElements,
    int totalPages,
    int currentPage,
    int pageSize
) {}
```

### DTO Rules
| Rule | Detail |
|---|---|
| **Immutable** | Use Java records (preferred) or Lombok `@Data` + `@Builder` |
| **Separate Request/Response** | Never reuse the same DTO for input and output |
| **Validation on Request** | All Request DTOs must have Bean Validation annotations (`@NotNull`, `@NotBlank`, `@Size`, `@DecimalMin`, etc.) |
| **No Validation on Response** | Response DTOs are output-only; no validation needed |
| **No Entity references** | DTOs must not import or reference Entity classes |
| **No business logic** | DTOs are pure data carriers; no methods beyond getters/builders |
| **Naming convention** | `Create{Domain}Request`, `Update{Domain}Request`, `{Domain}Response`, `{Domain}ListResponse` |
| **Package location** | Request: `api/dto/request/`, Response: `api/dto/response/` |

### DTO ↔ Other Layers Sync
| Layer | DTO interaction |
|---|---|
| **Resource** | Resource receives `@Valid Request DTO`; Resource returns `ApiResponse<Response DTO>` |
| **Service** | Service receives Request DTO; Service returns Response DTO |
| **Mapper** | Mapper converts Request DTO → Entity; Mapper converts Entity → Response DTO |
| **Entity** | Entity is never imported in DTO files |

---

## 4. Service Standards

### Service Pattern
```java
@ApplicationScoped
public class PaymentService {

    private static final Logger log = Logger.getLogger(PaymentService.class);

    private final PaymentRepository repository;
    private final PaymentMapper mapper;

    PaymentService(PaymentRepository repository, PaymentMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    // CREATE
    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request) {
        log.info("Creating payment with amount: %s", request.getAmount());
        Payment entity = mapper.toEntity(request);
        Payment saved = repository.save(entity);
        log.info("Payment created with id: %d", saved.getId());
        return mapper.toResponse(saved);
    }

    // READ (single)
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(Long id) {
        Payment entity = repository.findByIdOptional(id)
                .orElseThrow(() -> new PaymentNotFoundException(id));
        return mapper.toResponse(entity);
    }

    // READ (list with filter)
    @Transactional(readOnly = true)
    public PaymentListResponse getPayments(SearchPaymentRequest filter) {
        // Build Panache query from filter
        PanacheQuery<Payment> query = repository.find(buildQuery(filter), buildParams(filter));
        List<PaymentResponse> data = query.page(filter.getPage(), filter.getSize())
                .list()
                .stream()
                .map(mapper::toResponse)
                .toList();
        return new PaymentListResponse(
                data,
                query.count(),
                query.pageCount(),
                filter.getPage(),
                filter.getSize()
        );
    }

    // UPDATE
    @Transactional
    public PaymentResponse updatePayment(Long id, UpdatePaymentRequest request) {
        log.info("Updating payment id: %d", id);
        Payment existing = repository.findByIdOptional(id)
                .orElseThrow(() -> new PaymentNotFoundException(id));
        Payment updated = mapper.toEntity(request, existing);
        repository.update(updated);
        return mapper.toResponse(updated);
    }

    // DELETE
    @Transactional
    public void deletePayment(Long id) {
        log.info("Deleting payment id: %d", id);
        Payment existing = repository.findByIdOptional(id)
                .orElseThrow(() -> new PaymentNotFoundException(id));
        repository.delete(existing);
    }

    // Private helper — query building
    private String buildQuery(SearchPaymentRequest filter) {
        StringBuilder query = new StringBuilder("1=1");
        if (filter.getStatus() != null) {
            query.append(" AND status = :status");
        }
        if (filter.getMinAmount() != null) {
            query.append(" AND amount >= :minAmount");
        }
        return query.toString();
    }

    private Map<String, Object> buildParams(SearchPaymentRequest filter) {
        Map<String, Object> params = new HashMap<>();
        if (filter.getStatus() != null) {
            params.put("status", filter.getStatus());
        }
        if (filter.getMinAmount() != null) {
            params.put("minAmount", filter.getMinAmount());
        }
        return params;
    }
}
```

### Service Rules
| Rule | Detail |
|---|---|
| **Class annotation** | `@ApplicationScoped` |
| **Constructor injection** | All dependencies via constructor; `private final` fields |
| **Logger** | `private static final Logger log = Logger.getLogger({Domain}Service.class)` using `org.jboss.logging.Logger` |
| **Transactions** | `@Transactional` on write operations (create/update/delete); `@Transactional(readOnly = true)` on read operations |
| **Logging** | Log entry/exit of write operations; use `log.infof(...)`, `log.errorf(...)` for parameterized messages |
| **Error handling** | Throw custom `DomainException` subclasses; never catch and swallow exceptions |
| **Mapper usage** | Service calls Mapper for all DTO ↔ Entity conversions; never converts directly |
| **Repository usage** | Service calls Repository for data access; never uses EntityManager directly |
| **No HTTP awareness** | Service has no knowledge of HTTP, REST, or `@Path`; pure business logic |
| **No Response wrapping** | Service returns Response DTO; Resource wraps in `ApiResponse<T>` |
| **Constants** | Magic values and query literals in `constants/` package |

### Service ↔ Other Layers Sync
| Layer | Service interaction |
|---|---|
| **Resource** | Resource calls Service methods; Service never knows about Resource |
| **Mapper** | Service injects Mapper via constructor; calls `toEntity()` and `toResponse()` |
| **Repository** | Service injects Repository via constructor; calls CRUD methods |
| **Entity** | Service never exposes Entity to Resource; Entity is internal to Service/Repository |
| **DTO** | Service receives Request DTO from Resource; returns Response DTO to Resource |

---

## 5. REST Resource Standards

### Resource Pattern
```java
@Path("/api/v1/payments")
@ApplicationScoped
@Tag(name = "payments", description = "Payment management operations")
public class PaymentResource {

    private final PaymentService service;

    PaymentResource(PaymentService service) {
        this.service = service;
    }

    // CREATE
    @POST
    @Transactional
    @Operation(summary = "Create a new payment", description = "Creates a payment and returns the persisted entity")
    @APIResponse(responseCode = "201", description = "Payment created",
                 content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = ApiResponse.class)))
    @APIResponse(responseCode = "400", description = "Validation failed")
    public ApiResponse<PaymentResponse> create(@Valid CreatePaymentRequest request) {
        PaymentResponse response = service.createPayment(request);
        return ApiResponse.success(response, "Payment created successfully");
    }

    // READ (single)
    @GET
    @Path("/{id}")
    @Operation(summary = "Get payment by ID", description = "Retrieves a single payment by its identifier")
    @APIResponse(responseCode = "200", description = "Payment found")
    @APIResponse(responseCode = "404", description = "Payment not found")
    public ApiResponse<PaymentResponse> getById(@PathParam("id") Long id) {
        PaymentResponse response = service.getPaymentById(id);
        return ApiResponse.success(response);
    }

    // READ (list)
    @GET
    @Operation(summary = "List payments", description = "Retrieves a paginated list of payments with optional filters")
    @APIResponse(responseCode = "200", description = "Payments listed")
    public ApiResponse<PaymentListResponse> list(
            @QueryParam("status") String status,
            @QueryParam("minAmount") BigDecimal minAmount,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        SearchPaymentRequest filter = new SearchPaymentRequest(status, minAmount, null, page, size);
        PaymentListResponse response = service.getPayments(filter);
        return ApiResponse.success(response);
    }

    // UPDATE
    @PUT
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Update a payment", description = "Updates an existing payment")
    @APIResponse(responseCode = "200", description = "Payment updated")
    @APIResponse(responseCode = "404", description = "Payment not found")
    public ApiResponse<PaymentResponse> update(@PathParam("id") Long id,
                                                @Valid UpdatePaymentRequest request) {
        PaymentResponse response = service.updatePayment(id, request);
        return ApiResponse.success(response, "Payment updated successfully");
    }

    // DELETE
    @DELETE
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Delete a payment", description = "Deletes a payment by its identifier")
    @APIResponse(responseCode = "200", description = "Payment deleted")
    @APIResponse(responseCode = "404", description = "Payment not found")
    public ApiResponse<Void> delete(@PathParam("id") Long id) {
        service.deletePayment(id);
        return ApiResponse.success(null, "Payment deleted successfully");
    }
}
```

### ApiResponse Wrapper Pattern
```java
public class ApiResponse<T> {
    private int status;
    private String message;
    private T data;
    private List<String> errors;
    private LocalDateTime timestamp;

    public static <T> ApiResponse<T> success(T data) {
        return success(data, "Success");
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.status = 200;
        response.message = message;
        response.data = data;
        response.timestamp = LocalDateTime.now();
        return response;
    }

    public static <T> ApiResponse<T> error(int status, String message) {
        return error(status, message, List.of());
    }

    public static <T> ApiResponse<T> error(int status, String message, List<String> errors) {
        ApiResponse<T> response = new ApiResponse<>();
        response.status = status;
        response.message = message;
        response.errors = errors;
        response.timestamp = LocalDateTime.now();
        return response;
    }
}
```

### Resource Rules
| Rule | Detail |
|---|---|
| **Class annotation** | `@Path("/api/v1/{domain}")`, `@ApplicationScoped`, `@Tag(name = ...)` |
| **Constructor injection** | Service via constructor; no `@Inject` on fields |
| **All responses wrapped** | Every endpoint returns `ApiResponse<T>` — never raw entities or DTOs |
| **Validation** | `@Valid` on all Request DTO parameters |
| **HTTP methods** | `@POST` (create), `@GET` (read), `@PUT` (full update), `@PATCH` (partial update), `@DELETE` (delete) |
| **Path params** | `@PathParam("id") Long id` for single-entity operations |
| **Query params** | `@QueryParam("key")` with `@DefaultValue(...)` for list/search operations |
| **Transaction on writes** | `@Transactional` on POST/PUT/DELETE methods (or delegate to Service) |
| **OpenAPI annotations** | `@Operation(summary=...)` on every method; `@APIResponse` for non-2xx outcomes |
| **No business logic** | Resource validates input, delegates to Service, wraps response — nothing else |
| **Error handling** | Exceptions handled by `GlobalExceptionHandler`; Resource does not catch exceptions |
| **HTTP status** | 201 for create, 200 for read/update/delete, 400 for validation, 404 for not found |

### Resource ↔ Other Layers Sync
| Layer | Resource interaction |
|---|---|
| **Service** | Resource calls Service methods; wraps result in `ApiResponse<T>` |
| **Mapper** | Resource never calls Mapper directly |
| **Repository** | Resource never calls Repository directly |
| **Entity** | Resource never imports or references Entity |
| **DTO** | Resource receives `@Valid Request DTO`; returns `ApiResponse<Response DTO>` |
| **Exception** | Resource lets exceptions propagate to `GlobalExceptionHandler` |

---

## 6. Metrics (Micrometer)

### Metrics Pattern
```java
@ApplicationScoped
public class PaymentService {
    private static final Logger log = Logger.getLogger(PaymentService.class);

    private final MeterRegistry meterRegistry;
    private final PaymentMapper mapper;

    // Constructor injection (wajib)
    PaymentService(PaymentRepository paymentRepository, MeterRegistry meterRegistry, PaymentMapper mapper) {
        this.paymentRepository = paymentRepository;
        this.meterRegistry = meterRegistry;
        this.mapper = mapper;
    }

    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request) {
        meterRegistry.counter("payment.creation.requests").increment();

        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            Payment saved = paymentRepository.save(mapper.toEntity(request));

            meterRegistry.counter("payment.creation.success").increment();
            sample.stop(Timer.builder("payment.creation.duration")
                    .publishPercentiles(0.5, 0.95, 0.99)
                    .register(meterRegistry));

            return mapper.toResponse(saved);
        } catch (Exception ex) {
            log.error("Payment creation failed", ex);
            meterRegistry.counter("payment.creation.failure").increment();
            throw new PaymentProcessingException("Payment creation failed");
        }
    }
}
```

### Metrics Rules
| Rule | Detail |
|---|---|
| **Counter** | Catat event penting: `.requests`, `.success`, `.failure` |
| **Timer** | Ukur latensi operasi dengan percentiles 0.5 / 0.95 / 0.99 |
| **Naming** | Format `{domain}.{operation}.{event}` (e.g., `payment.creation.success`) |
| **Injection** | `MeterRegistry` via constructor injection |
| **Backend** | Prometheus via extension `quarkus-micrometer-registry-prometheus` |

---

## Quick Reference: Field-by-Field Sync Matrix

This matrix ensures every field is consistent across all layers.

| Entity Field | Mapper Maps? | Request DTO? | Response DTO? | Service Handles? | Resource Exposes? |
|---|---|---|---|---|---|
| `id` | → Response only | No | `Long id` | Yes (findById) | Yes (GET) |
| `amount` | ↔ Both | `BigDecimal amount` | `BigDecimal amount` | Yes | Yes |
| `status` | ↔ Both | `String status` | `String status` | Yes | Yes |
| `description` | ↔ Both | `String description` | `String description` | Yes | Yes |
| `createdAt` | → Response only | No | `LocalDateTime createdAt` | Yes (read) | Yes (GET) |
| `updatedAt` | → Response only | No | `LocalDateTime updatedAt` | Yes (read) | Yes (GET) |
| `version` | No | No | No (internal) | Yes (optimistic lock) | No |

---

## Source

- Acquired: 2026-08-23
- Origin: `/home/nurvan/project/ptpla-cbv-pf-engineering-prompts/prompts/code-guideline/copilot-instructions.md` §6, §7, §14
- Updated: 2026-08-25 — expanded with DTO, Service, REST Resource standards and cross-layer sync matrix
