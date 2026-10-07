---
name: code-review
description: >
  Performs comprehensive code reviews covering implementation correctness, 
  architectural alignment, code smells, potential issues, and misplacements. 
  Categorizes findings by severity: critical, major, medium, minor, code-smells, 
  potential-issues, and misplacements.
argument-hint: "<pr-url|branch-name|commit-range> [--strict] [--format=markdown|json|github]"
license: MIT
metadata:
  author: Nurvan Afandi
  version: 1.0.0
---

# Code Review

Systematic, multi-dimensional code review that goes beyond style to verify 
correctness, architectural integrity, maintainability, and alignment with 
the approved RFC design.

## Purpose

Act as a rigorous quality gate that catches issues before merge, with 
categorized, actionable findings that developers can fix efficiently.

## Review Dimensions

### 1. Implementation Correctness
- [ ] Code implements all acceptance criteria from task
- [ ] Business logic matches RFC specification
- [ ] Edge cases handled (null, empty, boundary, concurrency)
- [ ] Error handling follows domain-driven patterns
- [ ] Transactions correctly scoped (service layer only)
- [ ] Idempotency where required
- [ ] Race conditions addressed

### 2. Architectural Alignment
- [ ] **Layer separation respected**: Controller → Service → Repository → Domain
- [ ] **Dependency direction**: Inward only, no cycles
- [ ] **Domain purity**: No framework deps in domain layer
- [ ] **Mapper placement**: Correct layer boundaries
- [ ] **Module boundaries**: No cross-module implementation leaks
- [ ] **Pattern consistency**: Follows project's architectural patterns

### 3. Code Smells (Maintainability)
- [ ] **Long functions** (>30 lines)
- [ ] **Large classes** (>300 lines / >10 methods)
- [ ] **Primitive obsession** (use value objects)
- [ ] **Data clumps** (group related params into objects)
- [ ] **Feature envy** (method uses another class more than its own)
- [ ] **Inappropriate intimacy** (excessive access to another class internals)
- [ ] **Refused bequest** (inherit but override everything)
- [ ] **Comments as deodorant** (code should be self-documenting)
- [ ] **Duplicate code** (DRY violations)
- [ ] **Dead code** (unused methods, fields, imports)

### 4. Potential Issues (Risk)
- [ ] **Null pointer risks** (unsafe dereference)
- [ ] **Resource leaks** (unclosed streams, connections, threads)
- [ ] **Concurrency bugs** (non-thread-safe shared state)
- [ ] **Performance anti-patterns** (N+1 queries, unbounded collections)
- [ ] **Exception swallowing** (catch without handling/logging)
- [ ] **Magic numbers/strings** (should be constants)
- [ ] **Inconsistent error handling** (different patterns in same layer)
- [ ] **Missing validation** (at trust boundaries)
- [ ] **Time bombs** (hardcoded dates, assumptions about environment)

### 5. Misplacements (Architecture Violations)
- [ ] **Business logic in Controller** (belongs in Service/Domain)
- [ ] **Data access in Service** (belongs in Repository)
- [ ] **HTTP concerns in Service** (Request/Response, headers, cookies)
- [ ] **Mapping logic scattered** (should be in Mapper classes)
- [ ] **Validation in wrong layer** (domain validation in controller only)
- [ ] **Transaction management in Controller** (service layer only)
- [ ] **Domain events in infrastructure** (domain layer)
- [ ] **Configuration in domain** (infrastructure/config layer)

### 6. Mapper Function Misplacements
- [ ] **Entity↔Domain mapping in Service** → Move to `EntityToDomainMapper`
- [ ] **Domain↔DTO mapping in Controller** → Move to `DomainToDtoMapper`
- [ ] **Mapping logic in Repository** → Repository returns Entity only
- [ ] **Mapping in Domain model** → Domain should not know about Entity/DTO
- [ ] **Multiple mappers doing same conversion** → Consolidate

## Severity Classification

| Severity | Definition | Examples | Action |
|----------|------------|----------|--------|
| **CRITICAL** | Production failure, data corruption, security vulnerability | SQL injection, unvalidated file upload, race condition causing data loss | **BLOCK MERGE** - Must fix immediately |
| **MAJOR** | Significant bug, architectural violation, major maintainability issue | Business logic in controller, missing transaction, N+1 query | **BLOCK MERGE** - Must fix before merge |
| **MEDIUM** | Moderate issue, technical debt, inconsistency | Long function, missing test, primitive obsession | **SHOULD FIX** - Fix in this PR or create follow-up task |
| **MINOR** | Style, naming, minor improvement | Non-ideal variable name, missing JavaDoc on public API | **NITPICK** - Fix if easy, otherwise follow-up |
| **CODE_SMELL** | Design issue indicating deeper problem | God class, feature envy, data clumps | **REFACTOR** - Plan refactoring task |
| **POTENTIAL_ISSUE** | Risk that may manifest later | Unbounded list, missing timeout, weak encryption | **MITIGATE** - Add safeguard or document acceptance |
| **MISPLACEMENT** | Code in wrong architectural layer | Mapper in service, HTTP in domain | **MOVE** - Relocate to correct layer |

## Review Output Format

```markdown
# Code Review: {PR/Branch} - {Feature}

## Summary
- **Files Changed**: {N}
- **Lines Added/Removed**: +{XXX} / -{YYY}
- **Overall Verdict**: ✅ APPROVED | ⚠️ CHANGES REQUESTED | ❌ REJECTED
- **Review Time**: {X} minutes

## Findings by Severity

### 🔴 CRITICAL ({count})
| ID | File:Line | Finding | Recommendation |
|----|-----------|---------|----------------|
| CR-001 | UserController.java:45 | SQL injection via string concatenation | Use parameterized query / JPA Criteria |

### 🟠 MAJOR ({count})
| ID | File:Line | Finding | Recommendation |
|----|-----------|---------|----------------|
| MJ-001 | UserService.java:120 | Business logic in controller (validateAndSave) | Move to UserService.register() |
| MJ-002 | OrderRepository.java:30 | N+1 query in findAllWithItems | Add @EntityGraph or join fetch |

### 🟡 MEDIUM ({count})
| ID | File:Line | Finding | Recommendation |
|----|-----------|---------|----------------|
| MD-001 | PaymentService.java:85 | Function 45 lines - extract calculateFee() | Split into calculateBaseFee + calculateDiscount |
| MD-003 | UserMapper.java | Missing null check on entity.getAddress() | Add null-safe mapping |

### 🔵 MINOR ({count})
| ID | File:Line | Finding | Recommendation |
|----|-----------|---------|----------------|
| MN-001 | constants.java | Constant name `MAX_RETRY` → `MAX_RETRY_ATTEMPTS` | Rename for clarity |

### 🟣 CODE SMELLS ({count})
| ID | File:Line | Smell Type | Recommendation |
|----|-----------|------------|----------------|
| CS-001 | UserService.java | God Class (15 methods, 400 lines) | Split into UserRegistrationService, UserProfileService |
| CS-002 | OrderController.java | Feature Envy (uses OrderService internals) | Move logic to OrderService |

### 🟤 POTENTIAL ISSUES ({count})
| ID | File:Line | Risk | Mitigation |
|----|-----------|------|------------|
| PI-001 | CacheService.java | Unbounded ConcurrentHashMap | Add max size + eviction policy |

### ⚫ MISPLACEMENTS ({count})
| ID | File:Line | Current Location | Correct Location |
|----|-----------|------------------|------------------|
| MP-001 | UserService.java:60 | Entity→Domain mapping in service | UserEntityToDomainMapper.toDomain() |
| MP-002 | UserController.java:35 | Domain→DTO mapping in controller | UserDomainToDtoMapper.toDto() |

## Architectural Compliance Check

| Rule | Status | Notes |
|------|--------|-------|
| Layer separation | ✅ PASS / ❌ FAIL | |
| Dependency direction | ✅ PASS / ❌ FAIL | |
| Domain purity | ✅ PASS / ❌ FAIL | |
| Mapper placement | ❌ FAIL | See MP-001, MP-002 |
| Transaction boundaries | ✅ PASS / ❌ FAIL | |
| Validation layers | ✅ PASS / ❌ FAIL | |

## Coding Standards Compliance

| Standard | Status | Violations |
|----------|--------|------------|
| No wildcards | ✅ PASS | |
| Null safety | ❌ FAIL | 3 locations |
| No test matchers | ✅ PASS | |
| Constants over hardcoding | ❌ FAIL | 2 magic numbers |
| Function size ≤ 30 | ❌ FAIL | 2 functions (45, 52 lines) |
| No redundant comments | ✅ PASS | |
| Framework utilities | ✅ PASS | |
| Records for immutable | ❌ FAIL | UserDto still class |
| @Builder over @Setter | ✅ PASS | |
| Separate mappers | ❌ FAIL | See misplacements |

## Positive Observations
- Clean domain model with records
- Good test coverage on PaymentCalculator
- Proper use of @Transactional on service methods
- Clear commit messages following convention

## Required Actions (for APPROVAL)
1. Fix CR-001 (Critical - SQL injection)
2. Fix MJ-001, MJ-002 (Major - Architecture)
3. Fix MP-001, MP-002 (Misplacements - Mappers)
4. Address MD-001 (Medium - Function size)

## Suggested Improvements (Optional)
1. Refactor CS-001 (God class) - create techdebt task
2. Add cache eviction for PI-001
3. Convert UserDto to record

## Reviewer
- Name: {Reviewer}
- Date: {Date}
- Tools: Static analysis + Manual review
```

## Review Process

### Automated Checks (Pre-Review)
```bash
# Run before human review
./gradlew checkstyle spotbugs pmd test jacocoTestReport
# Or: mvn verify checkstyle:check spotbugs:check pmd:check
```

### Human Review Checklist
1. **Read the task/RFC first** - understand intent
2. **Run the code mentally** - trace happy + error paths
3. **Check architecture** - layers, dependencies, patterns
4. **Verify tests** - meaningful, no matchers, cover edge cases
5. **Look for misplacements** - especially mappers, validation
6. **Categorize every finding** - use severity matrix
7. **Write actionable recommendations** - not just "fix this"

## Usage

```bash
# Review PR by URL
opencode run code-review -- https://github.com/org/repo/pull/123

# Review local branch vs main
opencode run code-review -- feature/user-registration

# Review commit range
opencode run code-review -- main..feature/user-registration

# Strict mode (fail on MEDIUM+)
opencode run code-review -- feature/user-registration --strict

# Output formats
opencode run code-review -- feature/user-registration --format=github
opencode run code-review -- feature/user-registration --format=json
```

## Integration

- **Consumes**: Implementation from `backend-implementation`
- **Produces**: Review report with categorized findings
- **Blocks**: Merge until CRITICAL/MAJOR resolved
- **Feeds**: `security-analysis` (after basic review passes)
- **References**: 
  - `coding-guidelines/references/coding-standards.md`
  - Approved RFC for architectural decisions
- **Escalates**: CRITICAL findings to tech lead immediately