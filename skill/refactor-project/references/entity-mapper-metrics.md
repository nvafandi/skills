# Entity, Mapper & Metrics Standards

Standards applied during the Code module of the Quarkus refactoring flow. Acquired from `ptpla-cbv-pf-engineering-prompts/prompts/code-guideline/copilot-instructions.md` (§6, §7, §14).

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

---

## 2. Mapper Layer (DTO ↔ Entity)

### Mapper Pattern
```java
@ApplicationScoped
public class PaymentMapper {

    // DTO → Entity
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

---

## 3. Metrics (Micrometer)

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

## Source

- Acquired: 2026-08-23
- Origin: `/home/nurvan/project/ptpla-cbv-pf-engineering-prompts/prompts/code-guideline/copilot-instructions.md` §6, §7, §14
