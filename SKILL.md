---
name: refactor-quarkus
description: Refactor Quarkus projects
version: 1.0.0
license: MIT
metadata:
  author: Hermes Agent
  hermes:
    tags: [quarkus, spring-boot, migration, refactor, cleanup]
    related_skills: [simplify-code, requesting-code-review, test-driven-development]
---

# Quarkus Project Refactoring (Tunable)

Use when refactoring a Quarkus project (post-Spring-Boot migration or greenfield) with phased gates and configurable checks.

## When to Use

- User says "refactor quarkus" / "improve quarkus code" / "clean up migrated project"
- User wants to apply engineering standards to existing Quarkus codebase
- User mentions specific tuning: `phase_scope`, `pause_mode`, `skip_checks`, etc.

## Tuning Knobs (configurable)

| Parameter | Default | Options |
|-----------|---------|---------|
| `phase_scope` | `all` | `all`, `core-only` (P07-P14), `tests-only` (P15), `cleanup-only` (P16), `verify-only` (P17-P18) |
| `pause_mode` | `false` | `true`/`false` — stop each phase for approval |
| `package_root` | `com.prudential.pruforce.aob` | Custom package root |
| `validation_checks` | `all` | `all`, or comma-list: `typed-contracts,solid,lombok,coding-style,metrics` |
| `skip_checks` | `none` | Comma-list of check IDs to skip |
| `build_tool` | `auto` | `maven`, `gradle`, `auto` |
| `jdk_min` | `21` | Minimum JDK version (hard stop if lower) |
| `git_workflow` | `none` | `none`, `branch-pr` |

## Critical Rules

- **Never delete code you cannot refactor.** Leave original with `// TODO: Refactor required — <reason>`
- **Don't break the build.** Compile after each phase
- **Preserve behavior.** All tests pass
- **Preserve API contract.** Wire shape exact
- **No map-based API.** Use typed DTOs (records)

## 20-Phase Flow

### Stage A — Understand (no edits)
- **P01 Inventory**: Build descriptor, deps, Spring deps left, Java version, test stack
- **P02 Source & Config Scan**: Run scripts, Spring leftovers, package structure, hardcoded values
- **P03 Analysis Report**: Findings table → `refactor-plan.md` → **GATE: user approves**

### Stage B — Prepare
- **P04 Git Branch**: If `git_workflow=branch-pr`, create feature branch
- **P05 JDK Verification**: `java -version` ≥ `jdk_min`
- **P06 Build System**: Verify Quarkus markers

### Stage C — Refactor Core
- **P07 Package & Architecture**: Verify `package_root.{function}.{layer}`
- **P08 CDI & Injection**: Field → constructor, package-private, `@Named` → `@Identifier`
- **P09 API Layer**: `ApiResponse<T>`, typed DTOs, Bean Validation, OpenAPI
- **P10 Service Layer**: `@Transactional`, `BigDecimal` money, constants extraction, JBoss Logging, SOLID
- **P11 Repository & Entity**: Panache patterns, mapper symmetry
- **P12 Exception Handling**: Extend `DomainException`, problem details
- **P13 Documentation**: OpenAPI, README, ADR
- **P14 Metrics**: Micrometer per patterns

### Stage D — Tests & Hygiene
- **P15 Test Migration**: `@QuarkusTest`, remove Spring annotations
- **P16 Cleanup**: Remove Spring imports, unused deps, dead code

### Stage E — Prove It
- **P17 Verification Suite**: Build, No Spring, Has Quarkus, Tests pass, Startup, Engineering standards
- **P18 Validation**: Run checks, treemap diff vs P03

### Stage F — Report & Ship
- **P19 Review Report**: Self-reflection, TODOs, removed, failures
- **P20 Commit & PR**: If git_workflow, write report, ask approval

## Reference Files
- `references/engineering-standards.md`
- `references/refactoring-patterns.md`
- `references/entity-mapper-metrics.md`
- `references/coding-style.md`
- `references/solid-principles.md`

## Scripts
- `scripts/check-quarkus-annotations.sh --dir <path>`
- `scripts/check-engineering-violations.sh --dir <path>`

## Usage

```bash
# Full run
refactor-quarkus

# Tuned run
refactor-quarkus --phase-scope core-only --pause-mode true --package-root com.mycompany
```

Or via skill invocation specifying tuning params.