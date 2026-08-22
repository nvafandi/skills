# Module: Validation

Validate that all refactored services comply with the internal engineering standards.

**Executes after:** `cleanup` module (always runs last)

## Reference Files

- [references/engineering-standards.md](../references/engineering-standards.md) — contains the quality gates checklist and internal engineering standards
- [references/solid-principles.md](../references/solid-principles.md) — contains SOLID principle definitions, detection patterns, and validation checklists

## Instructions

Load [references/engineering-standards.md](../references/engineering-standards.md) and validate the refactored code against each item in the Quality Gates Checklist.

Execute the following checks in order. If any check fails, stop and fix before continuing.

| # | Check | Validation Method | Pass Criteria |
| --- | ------- | ------------------- | --------------- |
| 1 | **Architecture** | Verify each service has all 5 layers: API (Resource), Service, Repository, Entity, Config | All layers present |
| 2 | **Naming** | Check package structure follows `com.prudential.pruforce.aob.{function}.{layer}` | Correct package naming |
| 3 | **Injection** | Search for `@Inject` on fields (should only be on constructors or with `@Inject` on final fields via constructor) | No field injection; constructor injection only |
| 4 | **DTOs** | Verify Request/Response DTOs exist and have `@Valid` on request DTOs in resource parameters | Separate Request/Response DTOs with `@Valid` |
| 5 | **Responses** | Search for return types in resources. Verify all are wrapped in `ApiResponse<T>` | All endpoints return wrapped responses |
| 6 | **Exceptions** | Check that custom exceptions extend `DomainException` (or equivalent base) | Custom exceptions extend base exception |
| 7 | **Logging** | Verify `Logger` usage in service classes | Services have logging |
| 8 | **Tests** | Check for unit tests with mocks and integration tests with `@QuarkusTest` | Both test types present |
| 9 | **Documentation** | Check for OpenAPI annotations (`@Operation`, `@APIResponse`, etc.) and Javadoc | Documentation present |
| 10 | **Configuration** | Search for hardcoded values (magic strings, numbers) in Java code. All should use `@ConfigProperty` | No hardcoded values |
| 11 | **Transactions** | Verify `@Transactional` (jakarta.transaction) on write operations in service/repository | Write operations have transactions |
| 12 | **Validation** | Verify `@NotNull`, `@NotBlank`, `@Size`, `@Valid` annotations on request DTOs | Bean Validation present |
| 13 | **Streams** | Search for manual `for`/`for-each`/`while` loops iterating collections in service/repository code | Collection iteration uses Java Streams (filter/map/collect) |
| 14 | **CDI** | Verify no `@Inject` on private fields/methods, no `@Named` for DI resolution, no dummy no-args constructors | Package-private or constructor injection; `@Identifier` for string qualifiers |
| 15 | **SOLID** | Verify SRP (focused classes), OCP (no switch chains), ISP (focused interfaces), DIP (interface injection) | All 5 SOLID principles followed — see [references/solid-principles.md](../references/solid-principles.md) |

## Report Format

After validation, present results in this format:

```
## Validation Report: [app-name]

### Summary
- Standards: PruForce Engineering Standards
- Checks passed: [X/15]
- Checks failed: [Y/15]

### Failed Checks
| # | Check | File | Issue | Required Fix |
|---|-------|------|-------|---------------|
| 1 | [check name] | [file path] | [description] | [fix recommendation] |

### SOLID Compliance
| Principle | Status | Violations |
|-----------|--------|------------|
| SRP | PASS/FAIL | [description] |
| OCP | PASS/FAIL | [description] |
| LSP | PASS/FAIL | [description] |
| ISP | PASS/FAIL | [description] |
| DIP | PASS/FAIL | [description] |

### Compliance Status
- **Fully Compliant:** YES/NO
- **Blocks Refactoring:** YES/NO
```

## Compliance Rules

- **All 15 checks must PASS** for the refactoring to be considered complete.
- If any check fails, provide specific file paths and line numbers where the issue occurs.
- Common non-compliant patterns:
  - `@Inject` on fields → move to constructor injection
  - Raw entity returns → wrap in `ApiResponse<T>`
  - `double` for money → change to `BigDecimal`
  - Missing `@Valid` → add to request DTO parameters
  - Missing `@Transactional` → add to write operations
  - Hardcoded strings/numbers → extract to `@ConfigProperty`
  - Manual `for`/`for-each` loops over collections → use Java Streams
  - `@Inject` on private members → use package-private modifiers (per Quarkus CDI reference)
  - `@Named` for DI resolution → replace with `@Identifier`
  - Dummy no-args constructors → remove (Quarkus generates them)
  - God classes handling multiple concerns → split into focused services (SRP)
  - Switch/if-else chains for type dispatch → use strategy pattern or map-based dispatch (OCP)
  - Subtypes throwing unexpected exceptions → ensure consistent contracts (LSP)
  - Fat interfaces with unused methods → split into segregated interfaces (ISP)
  - Concrete class injection → inject interfaces via constructor (DIP)

## What to do

1. Load the engineering standards reference
2. Perform each validation check against the detailed architectural patterns
3. Document any violations with file paths and line numbers
4. Provide fix recommendations for each violation
5. Stop refactoring if critical compliance issues are found
6. Proceed to Step 4 (Verify the Refactoring) when all checks pass