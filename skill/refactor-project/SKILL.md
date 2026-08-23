---
name: refactor-project
description: >
  Use this skill when refactoring a Quarkus project that has already been migrated from Spring Boot. Use when the user wants to refactor, improve, restructure, or clean up a Quarkus codebase, mentions "refactor quarkus", "improve quarkus code", "clean up migrated project", "restructure quarkus service", or asks about applying engineering standards to an existing Quarkus project. Even if they don't explicitly mention "refactor", use this skill when the user wants to improve code quality, apply engineering standards, fix architectural issues, or optimize a Quarkus project that was previously migrated from Spring Boot.
license: PT. Prudential Life Indonesia
metadata:
  author: Nurvan Afandi
---

# Quarkus Project Refactoring

Modular, gate-driven refactoring of Quarkus projects that have already been migrated from Spring Boot. Applies the engineering standards internally to improve code quality, architecture, and compliance.

## Critical Rules

- **Never delete code you cannot refactor.** If you cannot fully refactor a piece of code, leave the original in place with a `// TODO: Refactor required — <reason>` comment explaining what needs to change and why. This applies to:
    - Methods, classes, or annotations you don't know how to improve
    - Quarkus patterns that violate engineering standards
    - Configuration or wiring code whose purpose is unclear
      If you must remove code, document what was removed and why in a `// REMOVED:` comment at the same location.
- **Don't break the build.** Run the compile command after each phase (`./mvnw clean compile -DskipTests` for Maven, `./gradlew clean compileJava -x test` for Gradle). Never move to the next phase with a broken build.
- **No silent changes.** Every file modification must be intentional and traceable. If a check fails after a phase, diagnose and fix — don't skip the check or delete the failing code.
- **Preserve behavior.** Refactoring must not change the external behavior of the application. All existing tests must continue to pass.

## Reference Files

Load the relevant reference file when working on a module:

| Reference | Use during |
|---|---|
| [references/engineering-standards.md](references/engineering-standards.md) | All modules: PruForce engineering standards — architecture, naming, quality gates checklist |
| [references/refactoring-patterns.md](references/refactoring-patterns.md) | Code module: Quarkus-specific refactoring patterns, code smells, and improvement recipes |
| [references/quick-reference.md](references/quick-reference.md) | Code snippets, common issues, performance tips, security considerations |
| [references/lombok-rules.md](references/lombok-rules.md) | Code module: Lombok annotation usage rules and Quarkus patterns |
| [references/entity-mapper-metrics.md](references/entity-mapper-metrics.md) | Code module: Entity audit/version standards, mapper layer rules, and Micrometer metrics patterns |
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

## Phase 1: Analyze

Scan the Quarkus project to understand what needs to be refactored:

- **Build system**: Read the build file (`pom.xml` for Maven, `build.gradle` or `build.gradle.kts` for Gradle) — Quarkus version, extensions, dependencies
- **Dependencies**: Use Context7 to query the latest Quarkus stable version and verify the project's dependencies against current releases (see [references/context7-queries.md](references/context7-queries.md))
- **Spring leftovers**: Search for remaining Spring imports, annotations, dependencies, and config properties. For ambiguous replacements, query Context7 to verify the current Quarkus equivalent (see [references/context7-queries.md](references/context7-queries.md) → Spring Boot Smell Detection)
- **Java code**: Search for Quarkus annotations (JAX-RS, CDI, Panache, Qute) and identify code smells
- **Architecture**: Check package structure, layered architecture compliance, naming conventions
- **Configuration**: Read `application.properties`/`application.yml`, check for hardcoded values
- **Engineering standards**: Run the validation checks from `references/engineering-standards.md`
- **Knowledge graph**: If the `graphify` CLI is available (`command -v graphify`), build or refresh the code map before scanning files: run `graphify extract . --code-only` when `graphify-out/` is missing or built from an older commit than HEAD (compare `git rev-parse HEAD` with the commit noted in `GRAPH_REPORT.md`), then `graphify cluster-only .`. Use it for this phase: god nodes → god-class/SRP candidates, communities → subsystem boundaries vs required layers, `graphify path A B` → coupling between classes you plan to change. If graphify is not installed or fails, continue without it — do not block Phase 1 on it

Present a summary table with area, findings, and complexity. Include a **Dependency freshness** row comparing the project's Quarkus version with the latest stable from Context7. Inform the user that the refactoring will proceed using the internal engineering standards.

**Stop here and wait for the user's response before continuing.** Do not ask about git workflow or anything else in the same message.

> **Phase 1 Gate**: Analysis complete — user must confirm to proceed to Phase 2.

## Step 2: Git branch (optional)

After the analysis summary (Phase 1 complete), check if the target project is a git repository. If it is, propose the git workflow:

> **Refactoring workflow:** Each refactoring run can be isolated in its own branch (`feature/JIRA-TICKET-NUMBER`) created from `master`. The branch will contain a single commit with all changes plus a refactoring report. A draft PR against `master` will be created for review — it is never merged, it serves as a permanent diff and discussion record. **Would you like to use this workflow?**

- **User accepts** → follow [modules/git.md](modules/git.md) — **Pre-refactoring** section. Propose the branch name (`feature/JIRA-TICKET-NUMBER`) and wait for confirmation before creating it.
- **User declines** → skip git management entirely, proceed with refactoring in the current branch.
- **Not a git repo** → inform the user, skip git management, proceed normally.

## Phase 2: Build System

Migrate the build descriptor and configuration files from Spring Boot to Quarkus.

> **Phase 2 Gate**: Build system configured — proceed to Phase 3 if PASS, else fix and retry.

### Decision Gate Table

- For each module, evaluate whether it applies to this project. A module executes only when its gate status is: **PASS**.
- Inspect the project to determine the gate result.

| Module                          | Gate Check                                                                                                                | Gate Result                                                                              |
|---------------------------------|---------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| [jdk](modules/jdk.md)           | JDK 21+ required                                   | **ALWAYS** -- stop refactoring if < 21 |
| [build](modules/build.md)       | Quarkus BOM/plugins/extensions in `pom.xml`, or Quarkus plugin in `build.gradle(.kts)` | **PASS** if Quarkus build markers found; **SKIP** otherwise                          |

### Execution Protocol

```
FOR module IN [jdk, build]:

  1. EVALUATE — inspect the project for the gate condition
  2. DECIDE
     IF gate == ALWAYS → proceed to step 3
     IF gate == PASS   → proceed to step 3
     IF gate == SKIP   → log "Module {name}: SKIPPED — {reason}", mark checkbox, continue
  3. LOAD — read the module file and relevant reference files
  4. EXECUTE — follow the module instructions, adapting to Quarkus refactoring
  5. COMPILE — run the project's compile command (`./mvnw clean compile -DskipTests` for Maven, `./gradlew clean compileJava -x test` for Gradle)
     Fails → diagnose and fix before proceeding
  6. LOG — mark checkbox as done
```

> **Phase 2 Output**: Build system migrated, compile successful — proceed to Phase 3.

---

## Phase 3: Code Migration

Refactor all Java source code in the Quarkus project to comply with engineering standards.

> **Phase 3 Gate**: Code refactored — proceed to Phase 4 if PASS, else fix and retry.

### Decision Gate Table

- For each module, evaluate whether it applies to this project. A module executes only when its gate status is: **PASS**.

| Module                          | Gate Check                                                                                                                | Gate Result                                                                              |
|---------------------------------|---------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| [code](modules/code.md)         | Quarkus annotations in Java sources (`@Path`, `@ApplicationScoped`, `@Inject`, `@Entity`, etc.) | **PASS** if Quarkus annotations found; **SKIP** otherwise                                 |

### Execution Protocol

```
FOR module IN [code]:

  1. EVALUATE — inspect the project for the gate condition
  2. DECIDE
     IF gate == ALWAYS → proceed to step 3
     IF gate == PASS   → proceed to step 3
     IF gate == SKIP   → log "Module {name}: SKIPPED — {reason}", mark checkbox, continue
  3. LOAD — read the module file and relevant reference files
  4. EXECUTE — follow the module instructions, adapting to Quarkus refactoring
  5. COMPILE — run the project's compile command (`./mvnw clean compile -DskipTests` for Maven, `./gradlew clean compileJava -x test` for Gradle)
     Fails → diagnose and fix before proceeding
  6. LOG — mark checkbox as done
```

> **Phase 3 Output**: Code refactored to comply with engineering standards — proceed to Phase 4.

---

## Phase 4: Cleanup

Remove leftover Spring artifacts, unused dependencies, stale configuration, and dead code that survived the migration.

> **Phase 4 Gate**: Cleanup complete — proceed to Phase 5 if PASS, else fix and retry.

### Decision Gate Table

- For each module, evaluate whether it applies to this project. A module executes only when its gate status is: **PASS**.

| Module                          | Gate Check                                                                                                                | Gate Result                                                                              |
|---------------------------------|---------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| [cleanup](modules/cleanup.md)   | Leftover Spring artifacts, unused dependencies, stale configuration | **PASS** if Spring artifacts or unused code found; **SKIP** otherwise |

### Execution Protocol

```
FOR module IN [cleanup]:

  1. EVALUATE — inspect the project for the gate condition
  2. DECIDE
     IF gate == ALWAYS → proceed to step 3
     IF gate == PASS   → proceed to step 3
     IF gate == SKIP   → log "Module {name}: SKIPPED — {reason}", mark checkbox, continue
  3. LOAD — read the module file and relevant reference files
  4. EXECUTE — follow the module instructions, adapting to Quarkus refactoring
  5. COMPILE — run the project's compile command (`./mvnw clean compile -DskipTests` for Maven, `./gradlew clean compileJava -x test` for Gradle)
     Fails → diagnose and fix before proceeding
  6. LOG — mark checkbox as done
```

> **Phase 4 Output**: Spring artifacts removed, codebase clean — proceed to Phase 5.

---

## Phase 5: Verify

Run final verification checks. A check fails = stop and fix before continuing.

| # | Check | Command (Maven / Gradle) | Pass criteria |
|---|-------|---------|---------------|
| 1 | **Builds** | `./mvnw clean package -DskipTests` / `./gradlew clean build -x test` | Exit code 0, no compilation errors |
| 2 | **No Spring deps** | Search build file for `org.springframework` | Zero Spring dependencies |
| 3 | **Has Quarkus** | Search build file for `io.quarkus` | Quarkus BOM and at least one extension present |
| 4 | **Starts up** | `./mvnw quarkus:dev` / `./gradlew quarkusDev` | App starts, `curl http://localhost:8080/q/health` returns UP |

> **Phase 5 Gate**: All 4 checks pass — refactoring successful, build works. Proceed to Step 6: Refactoring Review.

### Execution Protocol

```
FOR module IN [validation]:

  1. EVALUATE — inspect the project for the gate condition
  2. DECIDE
     IF gate == ALWAYS → proceed to step 3
     IF gate == PASS   → proceed to step 3
     IF gate == SKIP   → log "Module {name}: SKIPPED — {reason}", mark checkbox, continue
  3. LOAD — read the module file and relevant reference files
  4. EXECUTE — follow the module instructions, adapting to Quarkus refactoring
  5. COMPILE — run the project's compile command (`./mvnw clean compile -DskipTests` for Maven, `./gradlew clean compileJava -x test` for Gradle)
     Fails → diagnose and fix before proceeding
  6. LOG — mark checkbox as done
```

The module will use the current project state with Quarkus refactoring strategy.

## Step 4: Verify the Refactoring

Run each check in order. A check fails = stop and fix before continuing.

| # | Check | Command (Maven / Gradle) | Pass criteria |
|---|-------|---------|---------------|
| 1 | **Builds** | `./mvnw clean package -DskipTests` / `./gradlew clean build -x test` | Exit code 0, no compilation errors |
| 2 | **No Spring deps** | Search build file for `org.springframework` | Zero Spring dependencies |
| 3 | **Has Quarkus** | Search build file for `io.quarkus` | Quarkus BOM and at least one extension present |
| 4 | **Tests pass** | `./mvnw test` / `./gradlew test` | All tests pass using `@QuarkusTest` |
| 5 | **Starts up** | `./mvnw quarkus:dev` / `./gradlew quarkusDev` | App starts, `curl http://localhost:8080/q/health` returns UP |
| 6 | **Engineering standards** | Run validation module checks (14 checks) | All 14 validation checks pass |

## Step 5: Validation Report

After all verification checks pass, run the validation module and include its report in the refactoring output.

Run [modules/validation.md](modules/validation.md) and present the validation report with:
- All 14 checks passed/failed
- Any violations with file paths and line numbers
- Fix recommendations for each violation
- Overall compliance status

If validation fails, fix the violations before proceeding to Step 6.

## Step 6: Refactoring Review (Self-Reflection)

Answer each question honestly:

1. **What refactored cleanly?** Patterns that mapped 1:1.
2. **What required manual judgment?** Non-obvious decisions made.
3. **What was left as TODO?** Every `// TODO: Refactor required` comment and why.
4. **Was any code removed?** What, where, justification. Flag runtime risks.
5. **What checks failed initially?** Failures from Step 4 and how you fixed them.
6. **What's missing from the skill references?** Patterns you had to figure out.

### Refactoring Report

Present the review as a structured report:

```
## Refactoring Report: [app-name]

### Summary
- Strategy: Quarkus Engineering Standards Refactoring
- Agent: [AI agent name - e.g claude, pi, opencode, gemini, etc]
- Model: [model name — e.g. claude-sonnet-4-6, check system context]
- Modules completed: [X/5]
- Checks passed: [X/6]
- Token usage: [input tokens / output tokens — check session stats]
- Estimated cost: [~$X.XX — token counts × per-model pricing from anthropic.com/pricing]

### Changes by Module
| Module | Files changed | Key changes |
|--------|--------------|-------------|
| build | pom.xml or build.gradle(.kts), application.properties | ... |
| code | ... | ... |
| testing | ... | ... |

### Validation Results
| Check | Result | Notes |
|-------|--------|-------|
| Builds | PASS/FAIL | |
| No Spring deps | PASS/FAIL | |
| Has Quarkus | PASS/FAIL | |
| Tests pass | PASS/FAIL | |
| Starts up | PASS/FAIL | |

### Unrefactored Code (TODOs)
| File | Line | What | Why not refactored |
|------|------|------|-----------------|

### Removed Code
| File | What was removed | Justification |
|------|-----------------|---------------|

### Skill Improvement Suggestions
- [Any missing patterns, unclear instructions, or edge cases discovered]
```

## Step 7: Commit and PR (only if git workflow was accepted)

Follow [modules/git.md](modules/git.md) — **Post-refactoring** section. Ask the user for confirmation before committing, and again before pushing / creating the draft PR. Do not proceed with either action without explicit user approval.

---