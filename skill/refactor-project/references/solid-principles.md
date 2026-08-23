# SOLID Principles for Quarkus Refactoring

Comprehensive reference for detecting and refactoring SOLID principle violations in Quarkus projects migrated from Spring Boot.

## Overview

| Principle | Definition | Key Question |
|-----------|-----------|--------------|
| **S** — Single Responsibility | A class should have only one reason to change | Does this class do more than one thing? |
| **O** — Open/Closed | Software entities should be open for extension, closed for modification | Do I need to modify existing code to add new behavior? |
| **L** — Liskov Substitution | Subtypes must be substitutable for their base types without altering correctness | Can I replace the parent with the child without surprises? |
| **I** — Interface Segregation | Clients shouldn't depend on interfaces they don't use | Are there methods in this interface that some implementers don't need? |
| **D** — Dependency Inversion | Depend on abstractions, not concretions | Is this class instantiating its dependencies directly with `new`? |

---

## 1. Single Responsibility Principle (SRP)

> A class should have only one reason to change.

### Detection

| Smell | How to detect |
|-------|---------------|
| God Class | Class has >10 methods, handles multiple concerns (DB + email + validation + logging) |
| Mixed Layers | Service class contains REST logic, business logic, and data access |
| Multi-purpose Service | Service handles CRUD + notifications + reporting + auditing |
| Large Resource | Resource class has >5 endpoints doing different domain operations |

### Refactoring Pattern: God Class → Focused Services

```java
// BEFORE: God class — multiple reasons to change
@ApplicationScoped
public class OrderService {

    private static final Logger LOG = Logger.getLogger(OrderService.class);

    private final EntityManager em;
    private final EmailService emailService;
    private final PaymentGateway paymentGateway;
    private final ReportGenerator reportGenerator;
    private final AuditLogger auditLogger;

    OrderService(EntityManager em, EmailService emailService,
                 PaymentGateway paymentGateway, ReportGenerator reportGenerator,
                 AuditLogger auditLogger) {
        this.em = em;
        this.emailService = emailService;
        this.paymentGateway = paymentGateway;
        this.reportGenerator = reportGenerator;
        this.auditLogger = auditLogger;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) { /* ... */ }
    @Transactional
    public void cancelOrder(Long orderId) { /* ... */ }
    public List<OrderResponse> getOrdersByDateRange(LocalDate from, LocalDate to) { /* ... */ }
    public void sendOrderConfirmation(Long orderId) { /* ... */ }
    public void processPayment(Long orderId, PaymentRequest payment) { /* ... */ }
    public byte[] generateOrderReport(Long orderId) { /* ... */ }
    public void auditOrderChange(Long orderId, String change) { /* ... */ }
}
```

```java
// AFTER: Each class has one reason to change
@Slf4j
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
        log.info("Creating order: {}", request);
        Order entity = mapper.toEntity(request);
        Order saved = repository.save(entity);
        return mapper.toResponse(saved);
    }

    @Transactional
    public void cancelOrder(Long orderId) {
        log.info("Cancelling order: {}", orderId);
        Order order = repository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
        order.cancel();
    }

    public List<OrderResponse> getOrdersByDateRange(LocalDate from, LocalDate to) {
        return repository.findByDateRange(from, to).stream()
                .map(mapper::toResponse)
                .toList();
    }
}

@Slf4j
@ApplicationScoped
public class OrderNotificationService {

    private final EmailService emailService;

    OrderNotificationService(EmailService emailService) {
        this.emailService = emailService;
    }

    public void sendOrderConfirmation(Long orderId) {
        log.info("Sending confirmation for order: {}", orderId);
        emailService.send(orderId, "Order confirmed");
    }
}

@Slf4j
@ApplicationScoped
public class OrderPaymentService {

    private final PaymentGateway paymentGateway;
    private final OrderRepository repository;

    OrderPaymentService(PaymentGateway paymentGateway, OrderRepository repository) {
        this.paymentGateway = paymentGateway;
        this.repository = repository;
    }

    @Transactional
    public void processPayment(Long orderId, PaymentRequest payment) {
        log.info("Processing payment for order: {}", orderId);
        Order order = repository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
        paymentGateway.charge(order.getTotalAmount(), payment);
    }
}
```

---

## 2. Open/Closed Principle (OCP)

> Software entities should be open for extension, closed for modification.

### Detection

| Smell | How to detect |
|-------|---------------|
| Switch/If-Else chains | Large `switch` or `if-else` blocks that must be modified when adding new types |
| Type checking with `instanceof` | Repeated `instanceof` checks that grow with new subtypes |
| Config-driven branching | `if (type.equals("X"))` blocks in service logic |
| Conditional logic per type | Business logic scattered across type-specific conditionals |

### Refactoring Pattern: Switch Chain → Strategy Pattern

```java
// BEFORE: Must modify this method every time a new payment type is added
@ApplicationScoped
public class PaymentService {

    @Transactional
    public void processPayment(PaymentRequest request) {
        switch (request.type()) {
            case "CREDIT_CARD":
                processCreditCard(request);
                break;
            case "BANK_TRANSFER":
                processBankTransfer(request);
                break;
            case "E_WALLET":
                processEWallet(request);
                break;
            default:
                throw new IllegalArgumentException("Unknown payment type: " + request.type());
        }
    }

    private void processCreditCard(PaymentRequest request) { /* ... */ }
    private void processBankTransfer(PaymentRequest request) { /* ... */ }
    private void processEWallet(PaymentRequest request) { /* ... */ }
}
```

```java
// AFTER: Open for extension (new PaymentStrategy impl), closed for modification
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
public class BankTransferPaymentStrategy implements PaymentStrategy {
    @Override public String type() { return "BANK_TRANSFER"; }
    @Override public void process(PaymentRequest request) { /* ... */ }
}

@ApplicationScoped
public class EWalletPaymentStrategy implements PaymentStrategy {
    @Override public String type() { return "E_WALLET"; }
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
            throw new IllegalArgumentException("Unknown payment type: " + request.type());
        }
        strategy.process(request);
    }
}
```

---

## 3. Liskov Substitution Principle (LSP)

> Subtypes must be substitutable for their base types without altering the correctness of the program.

### Detection

| Smell | How to detect |
|-------|---------------|
| Overridden method throws new exception | Subclass method throws checked/unchecked exception not declared in parent |
| Subclass changes method semantics | Parent says "save" but subclass "save and notify" |
| Preconditions strengthened in subtype | Subclass adds validation that parent didn't have |
| Postconditions weakened in subtype | Subclass returns null when parent guarantees non-null |

### Refactoring Pattern: Subtype Contract Violation → Proper LSP

```java
// BEFORE: LSP violation — subclass throws unexpected exception
public abstract class NotificationService {
    public abstract void send(String recipient, String message);
}

@ApplicationScoped
public class EmailNotificationService extends NotificationService {
    @Override
    public void send(String recipient, String message) {
        if (!recipient.contains("@")) {
            throw new IllegalArgumentException("Invalid email");  // Parent doesn't declare this
        }
        // send email
    }
}

@ApplicationScoped
public class SmsNotificationService extends NotificationService {
    @Override
    public void send(String recipient, String message) {
        if (recipient.length() > 15) {
            throw new IllegalArgumentException("Invalid phone");  // Different validation
        }
        // send SMS
    }
}

// Client code can't safely use parent type — different exceptions expected
public void notifyUser(NotificationService service, String recipient, String msg) {
    try {
        service.send(recipient, msg);  // Which exception? Depends on implementation
    } catch (IllegalArgumentException e) {
        // Not all subclasses throw this — LSP violated
    }
}
```

```java
// AFTER: LSP compliant — consistent contract, validation before dispatch
public interface NotificationService {
    void send(String recipient, String message);
}

@ApplicationScoped
public class EmailNotificationService implements NotificationService {
    @Override
    public void send(String recipient, String message) {
        // Validation handled by EmailValidator — not in the service
        // send email
    }
}

@ApplicationScoped
public class SmsNotificationService implements NotificationService {
    @Override
    public void send(String recipient, String message) {
        // Validation handled by SmsValidator — not in the service
        // send SMS
    }
}

@ApplicationScoped
public class NotificationDispatcher {

    private final Map<String, NotificationService> services;

    NotificationDispatcher(Set<NotificationService> serviceSet) {
        this.services = serviceSet.stream()
                .collect(Collectors.toMap(NotificationService::type, s -> s));
    }

    public void dispatch(String type, String recipient, String message) {
        NotificationService service = services.get(type);
        if (service == null) {
            throw new IllegalArgumentException("Unknown notification type: " + type);
        }
        service.send(recipient, message);  // All implementations follow same contract
    }
}
```

---

## 4. Interface Segregation Principle (ISP)

> Clients shouldn't depend on interfaces they don't use.

### Detection

| Smell | How to detect |
|-------|---------------|
| Fat interface | Interface has >8 methods, not all implementers need all of them |
| Empty method bodies | Implementer has `// not used` or empty overrides |
| `UnsupportedOperationException` | Implementer throws this for methods it doesn't support |
| God interface | Single interface covers CRUD + search + export + admin operations |

### Refactoring Pattern: Fat Interface → Segregated Interfaces

```java
// BEFORE: Fat interface — implementers forced to implement methods they don't need
public interface UserService {
    UserResponse findById(Long id);
    List<UserResponse> findAll();
    UserResponse create(CreateUserRequest request);
    UserResponse update(Long id, UpdateUserRequest request);
    void delete(Long id);
    byte[] exportToCsv();
    void importFromCsv(InputStream file);
    UserStatistics getStatistics();
    void resetPassword(Long userId);
    void assignRole(Long userId, String role);
}

// ReadOnlyUserService only needs read methods but is forced to implement all
@ApplicationScoped
public class ReadOnlyUserService implements UserService {
    @Override public UserResponse findById(Long id) { /* ... */ }
    @Override public List<UserResponse> findAll() { /* ... */ }
    @Override public UserResponse create(CreateUserRequest request) {
        throw new UnsupportedOperationException("Read-only");
    }
    @Override public UserResponse update(Long id, UpdateUserRequest request) {
        throw new UnsupportedOperationException("Read-only");
    }
    @Override public void delete(Long id) {
        throw new UnsupportedOperationException("Read-only");
    }
    // ... all other methods throw UnsupportedOperationException
}
```

```java
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

public interface UserAdminService {
    UserStatistics getStatistics();
    void resetPassword(Long userId);
    void assignRole(Long userId, String role);
}

@ApplicationScoped
public class UserReadServiceImpl implements UserReadService {
    @Override public UserResponse findById(Long id) { /* ... */ }
    @Override public List<UserResponse> findAll() { /* ... */ }
}

@ApplicationScoped
public class UserWriteServiceImpl implements UserWriteService {
    @Override public UserResponse create(CreateUserRequest request) { /* ... */ }
    @Override public UserResponse update(Long id, UpdateUserRequest request) { /* ... */ }
    @Override public void delete(Long id) { /* ... */ }
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

---

## 5. Dependency Inversion Principle (DIP)

> High-level modules should not depend on low-level modules. Both should depend on abstractions.

### Detection

| Smell | How to detect |
|-------|---------------|
| `new` keyword in constructors | `this.repo = new PostgresOrderRepository()` instead of injection |
| Concrete class injection | `@Inject PostgresOrderRepository` instead of `OrderRepository` interface |
| Direct instantiation in methods | `new SomeService()` inside business methods |
| Framework-specific coupling | Service depends directly on Panache, Jackson, etc. instead of abstractions |

### Refactoring Pattern: Concrete Dependencies → Interface Injection

```java
// BEFORE: DIP violation — depends on concrete implementation
@ApplicationScoped
public class OrderService {

    private static final Logger LOG = Logger.getLogger(OrderService.class);

    // Depends directly on concrete class — not an abstraction
    private final PanacheOrderRepository repository;
    private final JacksonObjectMapper mapper;

    OrderService(PanacheOrderRepository repository, JacksonObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        Order entity = mapper.convertValue(request, Order.class);
        repository.persist(entity);
        return mapper.convertValue(entity, OrderResponse.class);
    }
}
```

```java
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

    public Order toEntity(CreateOrderRequest request) {
        Order order = new Order();
        order.setOrderNumber(request.orderNumber());
        order.setTotalAmount(request.totalAmount());
        return order;
    }

    public OrderResponse toResponse(Order entity) {
        return new OrderResponse(
                entity.getId(),
                entity.getOrderNumber(),
                entity.getTotalAmount(),
                entity.getStatus()
        );
    }
}

@Slf4j
@ApplicationScoped
public class OrderService {

    // Depends on abstractions — implementations injected by CDI
    private final OrderRepository repository;
    private final OrderMapper mapper;

    OrderService(OrderRepository repository, OrderMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        log.info("Creating order: {}", request);
        Order entity = mapper.toEntity(request);
        repository.persist(entity);
        return mapper.toResponse(entity);
    }
}
```

---

## SOLID Code Smells Table

| Smell | Violates | Detection | Refactoring |
|-------|----------|-----------|-------------|
| God Class | SRP | Class >10 methods, handles DB + email + validation + logging | Split into focused services |
| Mixed Layers | SRP | Service contains REST + business + data access logic | Separate into Resource, Service, Repository |
| Switch/If-Else chains | OCP | Large switch blocks, must modify for new types | Strategy pattern, sealed interfaces |
| `instanceof` chains | OCP | Repeated instanceof checks, grows with new subtypes | Polymorphism, visitor pattern |
| Subclass throws new exception | LSP | Overridden methods throw exceptions parent doesn't declare | Consistent contracts, validate before dispatch |
| Subclass weakens postconditions | LSP | Subclass returns null when parent guarantees non-null | Proper subtype contracts |
| Fat interface | ISP | Interface >8 methods, implementers override with empty bodies | Split into focused interfaces |
| `UnsupportedOperationException` | ISP | Implementer throws this for unused methods | Interface segregation |
| `new` in constructor | DIP | `this.repo = new PostgresRepo()` | Inject interface via constructor |
| Concrete class injection | DIP | `@Inject PostgresOrderRepository` | Inject `OrderRepository` interface |
| Direct instantiation in methods | DIP | `new SomeService()` inside business logic | Inject via constructor |

---

## SOLID Validation Checklist

### Single Responsibility
- [ ] Each class has exactly one reason to change
- [ ] Services handle one concern (CRUD, notification, payment, etc.)
- [ ] Resource classes only handle HTTP routing, not business logic
- [ ] No class exceeds ~15 methods (guideline, not hard rule)

### Open/Closed
- [ ] No switch/if-else chains that must be modified for new types
- [ ] Extension points use interfaces/abstract classes
- [ ] New behavior added via new implementations, not modifying existing code
- [ ] Map-based dispatch replaces conditional branching where applicable

### Liskov Substitution
- [ ] Subtypes don't throw exceptions not declared in parent
- [ ] Subtypes maintain the same semantic contract as parent
- [ ] Preconditions are not strengthened in subtypes
- [ ] Postconditions are not weakened in subtypes

### Interface Segregation
- [ ] No interface has methods that some implementers don't need
- [ ] No `UnsupportedOperationException` in implementations
- [ ] Clients depend only on the methods they actually use
- [ ] Interfaces are focused on a single capability

### Dependency Inversion
- [ ] High-level modules depend on abstractions, not concretions
- [ ] No `new` keyword for instantiating dependencies in constructors
- [ ] CDI injects interfaces, not concrete classes
- [ ] Framework-specific code (Panache, Jackson) is isolated behind interfaces
