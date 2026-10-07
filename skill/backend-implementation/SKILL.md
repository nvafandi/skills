---
name: backend-implementation
description: >
  Implements backend tasks following coding standards, architectural patterns, 
  and quality requirements. Produces production-ready code with comprehensive 
  unit tests adhering to the project's coding guidelines.
argument-hint: "<task-file> [--dry-run] [--watch]"
license: MIT
metadata:
  author: Nurvan Afandi
  version: 1.0.0
---

# Backend Implementation

Executes implementation tasks with strict adherence to coding standards, 
architectural patterns, and test quality requirements. This skill embodies 
the "craftsmanship" layer of the development pipeline.

**Philosophy: Thinker-lite mode** — Write the least code that is correct, 
verified, and reviewable. Prefer deletion over addition, reuse over rewrite, 
and one small test over a large suite. Never over-engineer for what the 
current task requires.

## Purpose

Transform well-defined tasks into production-quality backend code that:
- Follows all coding guidelines (see `coding-guidelines/references/coding-standards.md`)
- Implements the architectural decisions from RFC
- Includes comprehensive, meaningful tests
- Is ready for code review without basic violations

## Input

- Task breakdown document (from `task-breakdown`)
- Approved RFC with technical specifications
- Coding standards reference
- Existing codebase context (patterns, utilities, shared libraries)

## Implementation Principles

### 0. Thinker Mindset (MANDATORY)

Before writing any code, climb the ladder from simplest to most complex:

1. **Reuse** — Is there an existing utility, mapper, or service method in the codebase?
2. **Stdlib** — Does Java/Quarkus/Spring provide this natively? (`Optional`, `Objects`, `StringUtils`)
3. **Native Platform** — Can a `record`, `enum`, or `sealed` class solve it?
4. **Already-installed dependency** — Is there a library already in `build.gradle` that covers it?
5. **One line** — Can this be expressed in one clear line?
6. **Minimum code that works** — Only then write a new implementation.

Rules while coding:
- **No unrequested abstractions**: No interface for a single implementation, no factory for one product, no generic `<T>` for a concrete type.
- **Deletion over addition**: If 200 lines can be 50, rewrite to 50.
- **No speculative generality**: Don't build for "future extensions" that don't exist.
- **Surgical diffs**: Touch only what the task requires. Do not refactor adjacent code.
- **When uncertain**: Ask the user or request architect guidance — do not guess silently.

### 1. Code Quality Standards (MANDATORY)

All code MUST comply with `coding-guidelines/references/coding-standards.md`:

| Rule | Enforcement |
|------|-------------|
| No wildcard imports/queries | Lint rule + review gate |
| Null-safe assignments | Compiler + static analysis |
| No ArgumentCaptor/ArgumentMatchers/lenient/any in tests | Test lint rule |
| Hardcoded values → constants | Lint rule |
| Functions ≤ 30 lines | Lint rule + review |
| No redundant comments | Review gate |
| Use framework utilities (StringUtils, etc.) | Review gate |
| JDK 17+ → records for immutable data | Compiler target + review |
| @Builder over @Setter | Lint rule + review |
| Decompose large functions | Lint rule + review |
| Follow project architecture | Review gate |
| Separate mapper classes | Review gate |

### 2. Architecture Compliance

- **Layer Separation**: Controller → Service → Repository → Domain
- **Dependency Direction**: Inward only (Domain has zero external deps)
- **Mapper Pattern**: One mapper per layer boundary
- **Validation**: At boundaries (Controller + Service)
- **Error Handling**: Domain exceptions → Global handler
- **Transactions**: Service layer only (not Controller/Repository)

### 3. Testing Standards

```java
// ✅ GOOD: Explicit, readable, no matchers
@Test
void shouldCalculateTotalWithDiscount_whenUserIsPremium() {
    // Given
    User user = User.builder()
        .id(USER_ID)
        .tier(UserTier.PREMIUM)
        .build();
    
    Order order = Order.builder()
        .user(user)
        .items(List.of(item1, item2))
        .build();
    
    // When
    Money total = orderService.calculateTotal(order);
    
    // Then
    assertThat(total).isEqualTo(expectedTotal);
}

// ❌ FORBIDDEN: Matchers, captors, lenient
@Test
void badExample() {
    when(repository.findById(any())).thenReturn(Optional.of(entity)); // FORBIDDEN
    verify(service, times(1)).process(argThat(matches(...))); // FORBIDDEN
    lenient().when(mapper.map(any())).thenReturn(dto); // FORBIDDEN
}
```

#### Test Requirements Per Layer

| Layer | Coverage Target | Test Types |
|-------|-----------------|------------|
| Domain | 95%+ | Unit (pure logic) |
| Service | 90%+ | Unit + Integration |
| Repository | 80%+ | Integration (Testcontainers) |
| Controller | 80%+ | WebMvcTest / RestAssured |
| Mapper | 100% | Unit (all mappings) |

### 4. Implementation Workflow Per Task

```
1. READ task specification completely
2. ANALYZE existing codebase for patterns/reusables (thinker: reuse first)
3. DESIGN classes/interfaces (on paper or mental) — keep it minimal
4. IMPLEMENT in this order (smallest verifiable step first):
   a. Domain models (records/entities)
   b. Repository interfaces + implementations
   c. Mappers (domain↔entity, domain↔dto)
   d. Domain services (pure logic)
   e. Application services (orchestration)
   f. Controllers/Endpoints
   g. Configuration (if any)
5. TEST each layer as implemented (one runnable check per non-trivial logic)
6. REFACTOR ONLY if it improves clarity (thinker: 200→50 lines justified)
7. VERIFY all coding standards pass
8. DOCUMENT only non-obvious decisions (thinker: no redundant comments)
```

## Implementation Checklist Per Task

### Pre-Implementation
- [ ] Task fully understood (acceptance criteria clear)
- [ ] Related RFC sections reviewed
- [ ] Existing similar implementations studied (don't re-implement what exists)
- [ ] Dependencies (other tasks) confirmed complete
- [ ] Minimal approach identified (thinker: reuse > stdlib > native > dep > one-line > minimal)

### During Implementation
- [ ] Domain models as records (JDK 17+) or @Builder classes (thinker: native type first)
- [ ] No @Setter on domain/DTO classes
- [ ] All constants extracted to `Constants` class/interface
- [ ] Functions ≤ 30 lines, single responsibility (thinker: 200→50 justified)
- [ ] Null checks using Optional/Objects.requireNonNull
- [ ] Framework utilities used (StringUtils, CollectionUtils, etc.) (thinker: stdlib first)
- [ ] Mappers in separate classes per layer boundary
- [ ] Validation at service entry points
- [ ] Custom exceptions for domain errors
- [ ] Structured logging (no System.out)
- [ ] No unrequested abstractions (thinker: YAGNI)
- [ ] No redundant comments (thinker: code should speak)

### Testing
- [ ] Unit tests for all domain logic (thinker: one runnable check per non-trivial logic)
- [ ] Unit tests for all service methods
- [ ] Integration tests for repository queries
- [ ] Controller tests for happy + error paths
- [ ] Mapper tests for all field mappings
- [ ] NO ArgumentCaptor, ArgumentMatchers, lenient, any()
- [ ] Test names: `should{ExpectedBehavior}_when{Condition}`
- [ ] No framework suites unless asked (thinker: minimal test, not per-function suites)

### Post-Implementation
- [ ] All tests pass (unit + integration)
- [ ] Code coverage meets thresholds
- [ ] Static analysis clean (SonarQube/SpotBugs/Checkstyle)
- [ ] No TODO/FIXME without ticket reference
- [ ] Branch name follows convention
- [ ] Commit messages follow convention
- [ ] PR description references task ID
- [ ] Diff is surgical — no unrelated changes (thinker)

## Code Templates

### Domain Model (Record - JDK 17+)
```java
public record User(
    @NotNull UserId id,
    @NotBlank @Email String email,
    @NotBlank String fullName,
    @NotNull UserTier tier,
    @NotNull Instant createdAt,
    @NotNull Instant updatedAt
) {
    // Compact constructor for validation
    public User {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(email, "email must not be null");
        // ... validation
    }
    
    // Behavior methods (no setters)
    public User upgradeTier(UserTier newTier) {
        return new User(id, email, fullName, newTier, createdAt, Instant.now());
    }
}
```

### Mapper (Separate Class)
```java
@Component
public class UserEntityToDomainMapper {
    
    public User toDomain(UserEntity entity) {
        if (entity == null) return null;
        
        return new User(
            new UserId(entity.getId()),
            entity.getEmail(),
            entity.getFullName(),
            UserTier.valueOf(entity.getTier()),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
    
    public UserEntity toEntity(User domain) {
        if (domain == null) return null;
        
        UserEntity entity = new UserEntity();
        entity.setId(domain.id().value());
        entity.setEmail(domain.email());
        // ... mapping
        return entity;
    }
}
```

### Service (No @Setter, Constructor Injection)
```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {
    
    private final UserRepository userRepository;
    private final UserEntityToDomainMapper mapper;
    private final PasswordEncoder passwordEncoder;
    
    @Transactional
    public User register(RegisterUserCommand command) {
        // Validation
        if (userRepository.existsByEmail(command.email())) {
            throw new EmailAlreadyExistsException(command.email());
        }
        
        // Domain logic
        User user = User.create(
            command.email(),
            command.fullName(),
            passwordEncoder.encode(command.password())
        );
        
        // Persist
        UserEntity saved = userRepository.save(mapper.toEntity(user));
        
        return mapper.toDomain(saved);
    }
}
```

## Usage

```bash
# Implement single task
opencode run backend-implementation -- task-TASK-005.md

# Implement full sprint
opencode run backend-implementation -- sprint-2-tasks.md --parallel

# Dry run (show what would be created)
opencode run backend-implementation -- task-TASK-005.md --dry-run

# Watch mode (re-run on file changes)
opencode run backend-implementation -- task-TASK-005.md --watch
```

## Integration

- **Consumes**: Task breakdown from `task-breakdown`
- **Produces**: Implementation code + tests
- **Feeds**: `code-review` skill
- **Enforced by**: `coding-guidelines/references/coding-standards.md`
- **Validated by**: `security-analysis`, `task-audit`