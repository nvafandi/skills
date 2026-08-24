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
| 1 | **Architecture** | Verify each service has all layers: API (Resource + DTOs), Service, Repository, Entity, Mapper, Exception, Config | All layers present |
| 2 | **Naming** | Check package structure follows `com.prudential.pruforce.aob.{function}.{layer}` | Correct package naming |
| 3 | **Injection** | Search for `@Inject` on fields (should only be on constructors or with `@Inject` on final fields via constructor) | No field injection; constructor injection only |
| 4 | **DTOs** | Verify Request/Response DTOs exist and have `@Valid` on request DTOs in resource parameters | Separate Request/Response DTOs with `@Valid` |
| 5 | **Responses** | Search for return types in resources. Verify all are wrapped in `ApiResponse<T>` | All endpoints return wrapped responses |
| 6 | **Exceptions** | Check that custom exceptions extend `DomainException` (or equivalent base) | Custom exceptions extend base exception |
| 7 | **Logging** | Verify JBoss Logging usage in service classes; search for `System.out`/`printStackTrace` | Services use JBoss Logging; zero direct printing |
| 8 | **Tests** | Check for unit tests with mocks and integration tests with `@QuarkusTest` | Both test types present |
| 9 | **Documentation** | Check for OpenAPI annotations (`@Operation`, `@APIResponse`, etc.) and Javadoc | Documentation present |
| 10 | **Configuration** | Search for hardcoded values and inline query literals in Java code | Environment-specific values via `@ConfigProperty`; magic values & queries in `constants/` |
| 11 | **Transactions** | Verify `@Transactional` (jakarta.transaction) on write operations in service/repository | Write operations have transactions |
| 12 | **Validation** | Verify `@NotNull`, `@NotBlank`, `@Size`, `@Valid` annotations on request DTOs | Bean Validation present |
| 13 | **Streams** | Search for manual `for`/`for-each`/`while` loops iterating collections in service/repository code | Collection iteration uses Java Streams (filter/map/collect) |
| 14 | **CDI** | Verify no `@Inject` on private fields/methods, no `@Named` for DI resolution, no dummy no-args constructors | Package-private or constructor injection; `@Identifier` for string qualifiers |
| 15 | **SOLID** | Verify SRP (focused classes), OCP (no switch chains), ISP (focused interfaces), DIP (interface injection) | All 5 SOLID principles followed — see [references/solid-principles.md](../references/solid-principles.md) |

> This module defines the authoritative check list: **15 checks**. If another file mentions a different count, this table wins.

## Mechanical Detection Commands

Run these greps first to triage; review every hit manually before declaring FAIL. A grep hit is evidence to inspect, not automatically a violation.

```bash
# Check 3/14 — field injection and @Named qualifiers
grep -rn --include='*.java' '@Inject' src/main/java   # inspect each hit: field vs constructor usage
grep -rn --include='*.java' '@Named' src/

# Check 5 — resource methods returning something other than ApiResponse<...>
grep -rn --include='*Resource.java' 'public ' src/main/java | grep -v 'ApiResponse<'

# Check 6 — exceptions extending RuntimeException directly
grep -rn --include='*.java' 'extends RuntimeException' src/main/java | grep -v DomainException

# Check 7 — direct printing
grep -rn --include='*.java' 'System\.out\|System\.err\|printStackTrace' src/main/java

# Check 10 — inline JPQL/native query literals in services/repositories
grep -rn --include='*.java' -E '(find|list|count|execute)\("(SELECT|select|FROM|from)' src/main/java

# Check 11 — write methods missing @Transactional (inspect hits manually)
grep -rn --include='*.java' -E 'public .*(save|create|update|delete|persist)' src/main/java | grep -v Resource

# Check 13 — manual collection loops in service/repository code
find src/main/java \( -path '*service*' -o -path '*repository*' \) -name '*.java' \
  -exec grep -ln -E 'for \(|while \(' {} +

# Check 14 — dummy no-args constructors in scoped beans
grep -rn --include='*.java' -A1 '@ApplicationScoped\|@RequestScoped' src/main/java | grep 'public .*() {}'
```

Or run the bundled script for an aggregated JSON report:

```bash
bash scripts/check-engineering-violations.sh --dir src/main/java
```

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
6. Report results into Phase 18 (Validation & Tree Map Comparison) of the main flow