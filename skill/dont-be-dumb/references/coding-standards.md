# Coding Standards & Guidelines

This document defines the mandatory coding standards that all implementation skills must follow.

## Core Principles

### 1. No Wildcards
- **FORBIDDEN**: Wildcard imports (`import *`), wildcard queries (`SELECT *`), wildcard patterns
- **REQUIRED**: Explicit imports, explicit column selection, explicit patterns

### 2. Null Safety
- **REQUIRED**: Safe assignment with null checks
- **RECOMMENDED**: Use `Optional<T>` (Java), `Optional` (Kotlin), `Option` (Scala), nullable types with proper handling
- **FORBIDDEN**: Direct assignment without null checks that can cause NPE

### 3. Unit Testing Restrictions
- **FORBIDDEN**: 
  - ArgumentCaptor
  - ArgumentMatchers (any(), eq(), etc.)
  - lenient()
  - Stubbing frameworks that hide behavior
- **REQUIRED**: Explicit test inputs, real implementations or explicit mocks with defined behavior
- **RECOMMENDED**: Test with real dependencies where possible, use testcontainers for integration

### 4. Constants Over Hardcoding
- **REQUIRED**: Extract hardcoded values to constants
- **NAMING**: `SCREAMING_SNAKE_CASE` for constants
- **LOCATION**: Dedicated constants class/interface or top of relevant class

### 5. Function Size & Decomposition
- **MAX LINES**: 30 lines per function (excluding comments/blank lines)
- **REQUIRED**: Decompose large functions into smaller, well-named functions
- **NAMING**: Verb phrases that describe *what* the function does (`calculateTotalPrice`, `validateUserInput`)

### 6. Comments
- **FORBIDDEN**: Redundant comments (e.g., `// set name to "John"` above `setName("John")`)
- **REQUIRED**: Only for:
  - Complex business logic rationale
  - Non-obvious algorithmic decisions
  - TODO/FIXME with ticket references
  - Public API documentation (JavaDoc/KDoc)

### 7. Built-in Utilities
- **RECOMMENDED**: Use framework utilities:
  - Spring: `StringUtils`, `CollectionUtils`, `ObjectUtils`, `Assert`
  - Java: `Objects`, `Collections`, `Optional`
  - Avoid reinventing null/empty checks

### 8. Immutable Models (JDK 17+)
- **REQUIRED**: Use `record` for immutable data carriers
- **FORBIDDEN**: Traditional mutable POJOs with setters for DTOs/Entities
- **EXCEPTION**: JPA entities requiring mutation (use `@Builder` pattern)

### 9. Builder Pattern Over Setters
- **REQUIRED**: `@Builder` (Lombok) or manual builder for object construction
- **FORBIDDEN**: `@Setter` on domain models/DTOs
- **RECOMMENDED**: Immutable objects with `withX()` methods for modifications

### 10. Code Conventions & Architecture
- **REQUIRED**: Follow project's architectural pattern (Clean Architecture, Hexagonal, Layered, etc.)
- **REQUIRED**: Respect module boundaries and dependency rules
- **REQUIRED**: Consistent naming, packaging, and structure per project convention

### 11. Mapper Classes
- **REQUIRED**: Separate mapper classes for layer-to-layer conversion
- **PATTERN**: One mapper per layer boundary (e.g., `EntityToDomainMapper`, `DomainToDtoMapper`)
- **FORBIDDEN**: Mapping logic scattered in services/controllers
- **NAMING**: `{Source}To{Target}Mapper`

## Language-Specific Adaptations

### Java (Spring Boot / Quarkus)
- Records for DTOs (JDK 17+)
- `@Builder` for construction
- MapStruct or manual mappers
- `@Valid` + Bean Validation
- Constructor injection (no `@Autowired` on fields)

### Kotlin
- Data classes for DTOs
- Sealed classes for state modeling
- Extension functions for utilities
- `require`/`check` for preconditions

### TypeScript/Node.js
- `readonly` properties, `as const`
- Zod/Valibot for validation
- Functional mappers
- ESLint + Prettier enforced

### Go
- Struct tags for validation
- Constructor functions (`NewX`)
- Explicit error handling
- Interfaces for abstraction

## Enforcement

These standards are **mandatory** for:
- `backend-implementation` skill
- `code-review` skill (as review criteria)
- `security-analysis` skill (as baseline)
- `task-audit` skill (as compliance check)

Any deviation must be explicitly justified and documented.