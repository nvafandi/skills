---
name: refactor-project
description: >
  Use this skill when refactoring a Quarkus project that has already been migrated from Spring Boot. Use when the user wants to refactor, improve, restructure, or clean up a Quarkus codebase, mentions "refactor quarkus", "improve quarkus code", "clean up migrated project", "restructure quarkus service", or asks about applying engineering standards to an existing Quarkus project. Even if they don't explicitly mention "refactor", use this skill when the user wants to improve code quality, apply engineering standards, fix architectural issues, or optimize a Quarkus project that was previously migrated from Spring Boot.
license: PT. Prudential Life Indonesia
metadata:
  author: Nurvan Afandi
---

# Quarkus Project Refactoring

Fine-grained, gate-driven refactoring of Quarkus projects that have already been migrated from Spring Boot. Work is split into **20 small phases** across 6 stages so every task is executed separately, deliberately, and verifiably — one concern at a time, with a compile checkpoint and progress report after each phase.

## Critical Rules

- **Never delete code you cannot refactor.** If you cannot fully refactor a piece of code, leave the original in place with a `// TODO: Refactor required — <reason>` comment explaining what needs to change and why. This applies to:
    - Methods, classes, or annotations you don't know how to improve
    - Quarkus patterns that violate engineering standards
    - Configuration or wiring code whose purpose is unclear
      If you must remove code, document what was removed and why in a `// REMOVED:` comment at the same location.
- **Don't break the build.** Run the compile command after each phase (`./mvnw clean compile -DskipTests` for Maven, `./gradlew clean compileJava -x test` for Gradle). Never move to the next phase with a broken build.
- **No silent changes.** Every file modification must be intentional and traceable. If a check fails after a phase, diagnose and fix — don't skip the check or delete the failing code.
- **Preserve behavior.** Refactoring must not change the external behavior of the application. All existing tests must continue to pass.
- **One phase, one concern.** Do not pull work from a later phase into the current one. Out-of-scope findings are written down (phase + short note) and handled when that phase arrives.

## Pacing Protocol

The default mode is **slow and automatic**: execute phases strictly in order, and after each phase print a progress card, then continue:

```
▶ Phase 8 complete — CDI & Injection
  Files touched: 6 | Compile: PASS | Fixes applied: 9 | Deferred: 1 (→ Phase 9)
  Next: Phase 9 — API Layer (Resources & DTOs)
```

- **PAUSE MODE**: if the user asks to review each phase before continuing ("pause mode", "stop setiap fase"), end your turn after every progress card and wait for explicit approval.
- **Plan sync**: every progress card must be mirrored into `<project-root>/refactor-plan.md` (status checkbox + Result line + Completion Log row) per [modules/refactor-plan.md](modules/refactor-plan.md). The card is for the chat; the plan is the durable record inside the project.
- Full stop-and-wait is mandatory only at the marked gates: Phase 3 (analysis + plan confirmation), Phase 4 (git opt-in), and Phase 20 (commit/push approvals).

## Failure Protocol (applies to every phase)

1. **Compile fails after a change** → read the first compiler error (not the last), fix it, re-run compile. Do not continue to the next phase with a red build.
2. **Same error persists after 3 fix attempts** → revert that specific edit, log it as `// TODO: Refactor required — <reason>`, mark the checkbox as blocked, and continue with other work. Report it in Phase 19.
3. **A check cannot run** (missing tool, no database for startup check, etc.) → record `SKIPPED — <reason>` instead of PASS/FAIL. Never fabricate a PASS.
4. **Ambiguous Spring→Quarkus replacement** → query Context7 per [references/context7-queries.md](references/context7-queries.md) before changing anything.

## Reference Files

Load the relevant reference file when working on a module:

| Reference | Use during |
|---|---|
| [references/engineering-standards.md](references/engineering-standards.md) | All modules: PruForce engineering standards — architecture, naming, quality gates checklist |
| [references/refactoring-patterns.md](references/refactoring-patterns.md) | Code modules (Phases 7–14): Quarkus-specific refactoring patterns, code smells, improvement recipes |
| [references/quick-reference.md](references/quick-reference.md) | All code modules: code snippets, common issues, performance tips, security considerations |
| [references/lombok-rules.md](references/lombok-rules.md) | Phases 10–11: Lombok annotation usage rules and Quarkus patterns |
| [references/entity-mapper-metrics.md](references/entity-mapper-metrics.md) | Phases 11 & 14: entity audit/version standards, mapper layer rules, Micrometer metrics patterns |
| [references/coding-style.md](references/coding-style.md) | Phases 7–13: Quarkus coding style conventions — package structure, naming, formatting |
| [references/solid-principles.md](references/solid-principles.md) | Phases 8 & 10: SOLID principle definitions, violation detection patterns, refactoring recipes |
| [references/context7-queries.md](references/context7-queries.md) | All modules: Context7 library IDs and queries for checking latest dependency versions and patterns |

## Available Scripts

The following scripts are bundled in the `scripts` directory. Run them from the skill root directory using relative paths.

| Script | Purpose | Usage |
|---|---|---|
| `scripts/check-quarkus-annotations.sh` | Search for Quarkus annotations in Java sources | `bash scripts/check-quarkus-annotations.sh --dir <path>` |
| `scripts/check-engineering-violations.sh` | Check for common engineering standard violations | `bash scripts/check-engineering-violations.sh --dir <path>` |

All scripts:
- Accept `--help` for usage documentation
- Output structured JSON for programmatic consumption
- Send diagnostics to stderr, data to stdout
- Are non-interactive (no TTY prompts)
- Return meaningful exit codes (0 = success, 1 = error)

## Progress Tracking

At the start of the run, copy this checklist into your working notes and update it after every phase. The same statuses live durably in `<project-root>/refactor-plan.md` (see [modules/refactor-plan.md](modules/refactor-plan.md)) — this checklist is the in-chat mirror. Present it whenever the user asks for status.

```
STAGE A — Understand
[ ] P01 Inventory            [ ] P02 Source & Config Scan   [ ] P03 Analysis Report ⏸gate
STAGE B — Prepare
[ ] P04 Git Branch (opt)     [ ] P05 JDK Verification       [ ] P06 Build System
STAGE C — Refactor Core
[ ] P07 Package & Architecture  [ ] P08 CDI & Injection     [ ] P09 API Layer
[ ] P10 Service Layer           [ ] P11 Repository & Entity [ ] P12 Exception Handling
[ ] P13 Documentation           [ ] P14 Metrics (opt)
STAGE D — Tests & Hygiene
[ ] P15 Test Migration       [ ] P16 Cleanup
STAGE E — Prove It
[ ] P17 Verification Suite   [ ] P18 Validation & Comparison
STAGE F — Report & Ship
[ ] P19 Review Report        [ ] P20 Commit & PR (opt)
```

## Module Inventory

| Module | File | Feeds phases | Gate condition |
|---|---|---|---|
| refactor-plan | [modules/refactor-plan.md](modules/refactor-plan.md) | Created in P03; updated by EVERY subsequent phase | **ALWAYS** — living document in project root |
| treemap | [modules/treemap.md](modules/treemap.md) | P03 baseline, P18 comparison | **ALWAYS** — twice per run |
| git | [modules/git.md](modules/git.md) | P04, P20 | Optional — user opt-in |
| jdk | [modules/jdk.md](modules/jdk.md) | P05 | **ALWAYS** — JDK 21+; hard stop if < 21 |
| build | [modules/build.md](modules/build.md) | P06 | PASS if Quarkus build markers found; SKIP otherwise |
| code | [modules/code.md](modules/code.md) | P07–P14 (one slice per phase) | Per-phase gates below |
| testing | [modules/testing.md](modules/testing.md) | P15 | PASS if test sources found; SKIP otherwise |
| cleanup | [modules/cleanup.md](modules/cleanup.md) | P16 | PASS if Spring artifacts / unused code found; SKIP otherwise |
| validation | [modules/validation.md](modules/validation.md) | P18 | **ALWAYS** |

---

# STAGE A — Understand (no edits allowed)

Phases 1–3 only read and measure the project. **No file is modified in Stage A.**

## Phase 1: Inventory

Build a factual inventory before touching anything.

- Read the build descriptor (`pom.xml`, `build.gradle`, or `build.gradle.kts`): Quarkus platform version, plugin config, extensions, all dependencies
- Query Context7 for the latest stable Quarkus version ([references/context7-queries.md](references/context7-queries.md)) and compare against the project's version
- List Spring dependencies and plugins still present
- Detect build tool wrapper (`mvnw`/`gradlew`) and record which compile commands this run will use

**Output:** inventory table (component → detected version/state → note), including the **Dependency freshness** row.
**Gate:** inventory complete. No user interaction yet.

## Phase 2: Source & Config Scan

Scan code and configuration for violations — measurement only.

- Run both bundled scripts against `src/main/java` and `src/test/java`
- Search for Spring leftovers: imports, annotations, XML configs, `spring.*` properties (commands in [modules/cleanup.md](modules/cleanup.md))
- Check package structure against `com.prudential.pruforce.aob.{function}.{layer}` and the standard layer tree ([references/coding-style.md](references/coding-style.md))
- Read `application.properties` / `application.yml`; flag hardcoded environment values and orphaned profile files
- **Knowledge graph**: if the `graphify` CLI is available (`command -v graphify`), build or refresh the code map: `graphify extract . --code-only` when `graphify-out/` is missing or stale vs HEAD, then `graphify cluster-only .`. Use god nodes → god-class candidates, communities → subsystem boundaries, `graphify path A B` → coupling between classes you plan to change. If unavailable or it fails, continue without it — do not block this phase
- Tally findings per upcoming phase (P07…P16) so later gate decisions are already grounded

**Output:** findings list grouped by target phase, with counts.
**Gate:** scan complete.

## Phase 3: Analysis Report ⏸ USER GATE

Produce the analysis summary, write the execution plan into the project, and get approval.

- Run [modules/treemap.md](modules/treemap.md) — **Before Refactoring (Capture Baseline)**
- Generate **`<project-root>/refactor-plan.md`** following [modules/refactor-plan.md](modules/refactor-plan.md): inventory (P01), findings mapped to target phases (P02), and the full ordered 20-phase checklist with per-phase goal/scope/gate pre-filled from this project's data
- Present the summary table: area → findings → complexity, plus the Dependency freshness row from Phase 1
- Present the projected phase plan: which of P07–P16 will be PASS vs SKIP (based on Phase 2 tallies), exactly as recorded in `refactor-plan.md` §3
- Inform the user the refactoring will proceed using the internal engineering standards

**Stop here and wait for the user's response before continuing** — they are approving both the analysis AND `refactor-plan.md`. Do not ask about git workflow or anything else in the same message.

> **Phase 3 Gate**: analysis + refactor-plan accepted by user — proceed to Stage B.

---

# STAGE B — Prepare (environment ready before any refactor)

## Phase 4: Git Branch (optional)

Check if the target project is a git repository. If it is, propose the workflow:

> **Refactoring workflow:** Each run can be isolated in its own branch (`feature/JIRA-TICKET-NUMBER`) created from `master`, containing a single commit plus a refactoring report. A draft PR against `master` is created for review — never merged, a permanent diff and discussion record. **Use this workflow?**

- **User accepts** → follow [modules/git.md](modules/git.md) — **Pre-refactoring** section. Propose the branch name and wait for confirmation before creating it.
- **User declines** → skip git management, refactor in the current branch.
- **Not a git repo** → inform the user, skip, proceed normally.

> **Phase 4 Gate**: branch ready (or declined / not a repo).

## Phase 5: JDK Verification

Run [modules/jdk.md](modules/jdk.md). This module is **ALWAYS** executed.

- Verify `java --version` ≥ 21 AND the build tool resolves a JDK ≥ 21
- Handle multi-JDK environments per the module's decision table; fix the environment, not the build files
- If no JDK 21+ exists anywhere → warn the user and **STOP the entire run**

> **Phase 5 Gate**: JDK 21+ confirmed for both `java` and the build tool.

## Phase 6: Build System

Gate check first: **PASS** if Quarkus BOM/plugin/extensions found in the build descriptor; **SKIP** (log reason, mark checkbox) otherwise. When PASS, run [modules/build.md](modules/build.md):

- Verify BOM, plugin, `-parameters` flag, Java 21 settings, test dependencies
- Apply the Version Alignment Rule; remove leftover Spring build entries
- Re-resolve dependencies after each build-file edit, then compile

> **Phase 6 Gate**: compile passes with the compliant build descriptor — proceed to Stage C.

---

# STAGE C — Refactor Core (one concern per phase)

Every phase in Stage C follows the same loop:

```
1. EVALUATE — phase-specific gate check below
2. DECIDE   — PASS → continue · SKIP → log "SKIPPED — {reason}", mark checkbox, next phase
3. LOAD     — read the listed slices of modules/code.md and reference files
4. EXECUTE  — apply ONLY this phase's concern; defer anything else to its phase (record in refactor-plan.md §4)
5. COMPILE  — ./mvnw clean compile -DskipTests (or Gradle equivalent); fix until green
6. LOG      — mark checkbox, update <project-root>/refactor-plan.md (status + Result + Completion Log), print the progress card, continue
```

## Phase 7: Package & Architecture Structure

- **Gate**: PASS if any class sits outside the standard structure, packages deviate from `com.prudential.pruforce.aob.{function}.{layer}`, or required layers are missing; SKIP if fully compliant
- **Load**: [modules/code.md](modules/code.md) checklist items on package structure & layers; directory tree in [references/coding-style.md](references/coding-style.md); expected structure in [modules/treemap.md](modules/treemap.md)
- **Execute**: create missing layer packages; relocate misplaced classes; align file naming (`{Domain}Resource.java`, `{Domain}Service.java`, …). Create empty packages only when domain code exists to fill them

> **Phase 7 Gate**: tree matches the standard layout, compile green.

## Phase 8: CDI & Dependency Injection

- **Gate**: PASS if field injection on private members, dummy no-args constructors, or `@Named` DI qualifiers exist; SKIP otherwise
- **Load**: [modules/code.md](modules/code.md) Recipes 1 (constructor injection), 11 (`@Named` → `@Identifier`); Critical Rule 1 in [references/engineering-standards.md](references/engineering-standards.md); detection patterns in [references/solid-principles.md](references/solid-principles.md) §DIP
- **Execute**: convert private field injection → constructor (preferred) or package-private fields; delete dummy no-args constructors; replace `@Named` qualifiers with `@Identifier`

> **Phase 8 Gate**: zero private-member injections, zero `@Named` DI usages, compile green.

## Phase 9: API Layer (Resources & DTOs)

- **Gate**: PASS if any resource returns raw entities/unwrapped types, request DTOs lack validation, or `@Valid` missing on parameters; SKIP otherwise
- **Load**: [modules/code.md](modules/code.md) Recipes 2 (ApiResponse wrapping), 7 (Bean Validation on DTOs), 9 (`@Valid`), 10 (interface+impl merge judgment); API response rules in [references/coding-style.md](references/coding-style.md)
- **Execute**: wrap every endpoint return in `ApiResponse<T>`; split/ensure Request & Response DTOs; add constraint annotations + `@Valid`; merge pointless interface+impl pairs

> **Phase 9 Gate**: every endpoint returns `ApiResponse<T>`; all request DTOs validated; compile green.

## Phase 10: Service Layer Logic

- **Gate**: PASS if write methods lack `@Transactional`, services miss the JBoss Logging field, magic values/hardcoded config remain, money uses `double`/`float`, manual loops iterate collections, or SOLID violations were tallied in Phase 2; SKIP otherwise
- **Load**: [modules/code.md](modules/code.md) Recipes 3 (BigDecimal), 4 (@ConfigProperty), 5 (@Transactional), 6 (JBoss Logging), 12 (Streams), 13–16 (SRP/OCP/ISP/DIP); constants pattern in [references/refactoring-patterns.md](references/refactoring-patterns.md); [references/solid-principles.md](references/solid-principles.md)
- **Execute**: annotate writes with `@Transactional` (+ `readOnly = true` reads); add the JBoss Logging field (`private static final Logger log = Logger.getLogger(X.class)`) and replace direct printing; externalize env values via `@ConfigProperty`; extract domain values & query literals to `constants/`; convert money to `BigDecimal`; convert collection loops to Streams; split god classes and switch chains per SOLID recipes

> **Phase 10 Gate**: services comply with standards checklist items 7, 10–15; compile green.

## Phase 11: Repository & Entity Layer

- **Gate**: PASS if repositories deviate from the Panache interface+impl pattern, inline query literals remain, or entities lack audit/version/index standards; SKIP otherwise
- **Load**: [references/entity-mapper-metrics.md](references/entity-mapper-metrics.md) §§1–2 (entity & mapper rules); [modules/code.md](modules/code.md) Recipe 16 (repository interfaces); query-constants pattern in [references/refactoring-patterns.md](references/refactoring-patterns.md)
- **Execute**: repository interface extending `PanacheRepository<T>` + impl; move remaining JPQL/native literals into `{Domain}QueryConstants`; enforce entity audit fields (`createdAt`, `updatedAt`, `@Version`), `@CreationTimestamp`/`@UpdateTimestamp`, indexes on filtered columns, `BigDecimal` money columns; verify mapper placement (all DTO↔Entity conversion lives in mappers)

> **Phase 11 Gate**: repositories and entities match the standards; compile green.

## Phase 12: Exception Handling

- **Gate**: PASS if exceptions extend `RuntimeException` directly, or thrown domain exceptions have no `@ServerExceptionMapper` coverage; SKIP otherwise
- **Load**: [modules/code.md](modules/code.md) Recipes 8 (DomainException) and 18 (global handler wiring); exception snippets in [references/quick-reference.md](references/quick-reference.md)
- **Execute**: custom exceptions extend `DomainException` with proper HTTP status; ensure one handler per hierarchy level; sanitize messages (no stack traces to clients)

> **Phase 12 Gate**: full hierarchy mapped; error shape consistent; compile green.

## Phase 13: Documentation

- **Gate**: PASS if resources lack OpenAPI annotations or public API lacks Javadoc; SKIP otherwise
- **Load**: [modules/code.md](modules/code.md) Recipe 17 (OpenAPI); Javadoc section in [references/coding-style.md](references/coding-style.md)
- **Execute**: minimum bar — `@Tag` per resource class, `@Operation(summary=...)` per method, `@APIResponse` for non-2xx outcomes; add brief Javadoc on public API surface without duplicating OpenAPI wording

> **Phase 13 Gate**: docs minimum bar met; compile green.

## Phase 14: Metrics (optional)

- **Gate**: PASS if Micrometer usage exists in the project or the user requests instrumentation; SKIP otherwise (log the reason)
- **Load**: [references/entity-mapper-metrics.md](references/entity-mapper-metrics.md) §3 (metrics pattern & rules); Micrometer query in [references/context7-queries.md](references/context7-queries.md)
- **Execute**: counters for `.requests`/`.success`/`.failure`, timers with percentiles 0.5/0.95/0.99, naming `{domain}.{operation}.{event}`; inject `MeterRegistry` via constructor

> **Phase 14 Gate**: metrics follow naming/injection rules (or SKIPPED); compile green.

---

# STAGE D — Tests & Hygiene

## Phase 15: Test Migration

Gate check: **PASS** if test sources exist under `src/test`; **SKIP** otherwise (log). When PASS, run [modules/testing.md](modules/testing.md):

- Convert Spring test infrastructure to `@QuarkusTest` patterns (`@InjectMock`, REST Assured, `%test.` properties)
- Verify lifecycle differences (`static @BeforeAll`, shared app instance, `@TestTransaction`)
- Run `./mvnw test` / `./gradlew test` — all tests must pass

> **Phase 15 Gate**: test suite green under Quarkus Test.

## Phase 16: Cleanup

Gate check: **PASS** if Spring leftovers, unused dependencies, or dead code remain; **SKIP** otherwise. When PASS, run [modules/cleanup.md](modules/cleanup.md):

- Sweep imports → annotations → config files/properties → build dependencies → dead code, in that order
- Final sweep greps must come back empty; compile stays green

> **Phase 16 Gate**: zero Spring artifacts, zero dead code — proceed to Stage E.

---

# STAGE E — Prove It

## Phase 17: Verification Suite

Run each check in order. A check fails = stop and fix before continuing.

| # | Check                  | Command (Maven / Gradle)                                             | Pass criteria                                                       |
|---|------------------------|-----------------------------------------------------------------------|----------------------------------------------------------------------|
| 1 | **Builds**             | `./mvnw clean package -DskipTests` / `./gradlew clean build -x test` | Exit code 0, no compilation errors                                   |
| 2 | **No Spring deps**     | Search build file for `org.springframework`                           | Zero Spring dependencies                                             |
| 3 | **Has Quarkus**        | Search build file for `io.quarkus`                                    | Quarkus BOM and at least one extension present                       |
| 4 | **Tests pass**         | `./mvnw test` / `./gradlew test`                                     | All tests pass using `@QuarkusTest`                                  |
| 5 | **Starts up**          | `./mvnw quarkus:dev` / `./gradlew quarkusDev`                         | App starts, `curl http://localhost:8080/q/health` returns UP; stop dev mode afterwards |
| 6 | **Engineering standards** | Run [modules/validation.md](modules/validation.md) (15 checks)    | All 15 validation checks pass                                        |

If the environment cannot support check 5 (no free port, no database, CI without Docker), record `SKIPPED — <reason>` for that row instead of failing the run.

> **Phase 17 Gate**: all checks pass or recorded SKIPPED with reason.

## Phase 18: Validation & Tree Map Comparison

1. Run [modules/validation.md](modules/validation.md) and present the validation report:
   - All 15 checks passed/failed
   - Violations with file paths and line numbers
   - Fix recommendations per violation
   - Overall compliance status
2. Fix any violations and re-run the failing checks.
3. Run [modules/treemap.md](modules/treemap.md) — **After Refactoring (Capture Final State)** + **Generate Comparison Report** vs the Phase 3 baseline.

> **Phase 18 Gate**: validation report + comparison produced, fixes applied — proceed to Stage F.

---

# STAGE F — Report & Ship

## Phase 19: Refactoring Review (Self-Reflection)

First, cross-check `<project-root>/refactor-plan.md`: no phase may remain `[ ]` or `[~]` — resolve or justify each in the Deferred Items Registry before writing the report.

Then answer each question honestly:

1. **What refactored cleanly?** Patterns that mapped 1:1.
2. **What required manual judgment?** Non-obvious decisions made.
3. **What was left as TODO?** Every `// TODO: Refactor required` comment and why.
4. **Was any code removed?** What, where, justification. Flag runtime risks.
5. **What failed initially?** Failures from Phases 6–17 and how they were fixed.
6. **What's missing from the skill references?** Patterns you had to figure out.

Present the review using the report template below.

### Refactoring Report Template

```
## Refactoring Report: [app-name]

### Summary
- Strategy: Quarkus Engineering Standards Refactoring
- Agent: [AI agent name - e.g claude, pi, opencode, gemini, etc]
- Model: [model name — e.g. claude-sonnet-4-6, check system context]
- Phases completed: [X/20]
- Verification checks passed: [X/6]
- Validation checks passed: [X/15]
- Token usage: [input tokens / output tokens — check session stats]
- Estimated cost: [~$X.XX — token counts × per-model pricing from anthropic.com/pricing]

### Changes by Phase
| Phase | Files changed | Key changes |
|--------|--------------|-------------|
| P06 Build System | pom.xml or build.gradle(.kts), application.properties | ... |
| P07–P14 Core | ... | ... |
| P15 Testing | ... | ... |
| P16 Cleanup | ... | ... |

### Verification Results
| Check | Result | Notes |
|-------|--------|-------|
| Builds | PASS/FAIL/SKIPPED | |
| No Spring deps | PASS/FAIL/SKIPPED | |
| Has Quarkus | PASS/FAIL/SKIPPED | |
| Tests pass | PASS/FAIL/SKIPPED | |
| Starts up | PASS/FAIL/SKIPPED | |
| Engineering standards | X/15 | |

### Unrefactored Code (TODOs)
| File | Line | What | Why not refactored |
|------|------|------|-----------------|

### Removed Code
| File | What was removed | Justification |
|------|-----------------|---------------|

### Tree Map Comparison
| Category | Count |
|----------|-------|
| New Files | |
| Removed Files | |
| Preserved Files | |

### Skill Improvement Suggestions
- [Any missing patterns, unclear instructions, or edge cases discovered]
```

> **Phase 19 Gate**: report presented to the user.

## Phase 20: Commit and PR (only if git workflow was accepted)

Follow [modules/git.md](modules/git.md) — **Post-refactoring** section:

- Write `refactoring-report.md` (the Phase 19 report) at the repo root
- Ask the user for confirmation before committing
- Ask again before pushing / creating the draft PR — never proceed without explicit approval
