---
name: migrate-spring-to-quarkus
description: >
  Use this skill when migrating a Spring Boot application to Quarkus. Use when the user wants to migrate, convert, or port a Spring Boot app to Quarkus, mentions "spring to quarkus", "quarkus migration", "replace spring", or asks about migrating "pom.xml", "build.gradle", "Spring MVC", "Spring Data JPA", "Thymeleaf", "@SpringBootApplication". Even if they don't explicitly mention "Quarkus", use this skill when the user wants to replace Spring Boot with a build-time-optimized, cloud-native framework.
license: PT. Prudential Life Indonesia
metadata:
  author: Irsyad Jamal Pratama Putra - https://github.com/Irsyad-Putra1-Consultant_pru
---

# Spring Boot to Quarkus Migration

Modular, gate-driven migration of Spring Boot applications to Quarkus using native Quarkus APIs.

## Critical Rules

- **Never delete code you cannot migrate.** If you cannot fully migrate a piece of code, leave the original in place with a `// TODO: Migration required — <reason>` comment explaining what needs to change and why. This applies to:
    - Methods, classes, or annotations you don't know how to convert
    - Spring-specific patterns without a clear Quarkus equivalent
    - Configuration or wiring code whose purpose is unclear
      If you must remove code (e.g., a Spring-only base class), document what was removed and why in a `// REMOVED:` comment at the same location.
- **Don't break the build.** Run the compile command after each phase (`./mvnw clean compile -DskipTests` for Maven, `./gradlew clean compileJava -x test` for Gradle). Never move to the next phase with a broken build.
- **No silent changes.** Every file modification must be intentional and traceable. If a check fails after a phase, diagnose and fix — don't skip the check or delete the failing code.

## Reference Files

Load the relevant reference file when working on a module:

| Reference | Use during |
|---|---|
| [references/dependency-map.md](references/dependency-map.md) | Build module: dependency and plugin mapping |
| [references/annotation-map.md](references/annotation-map.md) | Code module: annotation, DI, REST, Data, Security migration |
| [references/config-map.md](references/config-map.md) | Build module: configuration property migration |
| [references/service-generation-standards.md](references/service-generation-standards.md) | Code module: project structure, package naming, layered architecture, DTOs, entities, mappers, services, repositories, exception handling, validation, logging, testing patterns from `ptpla-cbv-pf-engineering-prompts` |
| [references/engineering-standards.md](references/engineering-standards.md) | Validation module: quality gates checklist and compliance requirements from `ptpla-cbv-pf-engineering-prompts` |
| [references/service-template.md](references/service-template.md) | Service generation template, prompt structure, workflow examples from `ptpla-cbv-pf-engineering-prompts` |
| [references/quick-reference.md](references/quick-reference.md) | Code snippets, common issues, performance tips, security considerations, version compatibility from `ptpla-cbv-pf-engineering-prompts` |

## Available Scripts

The following scripts are bundled in the `scripts/` directory. Run them from the skill root directory using relative paths.

| Script | Purpose | Usage |
|---|---|---|
| `scripts/check-spring-annotations.sh` | Search for Spring annotations in Java sources | `bash scripts/check-spring-annotations.sh --dir <path>` |
| `scripts/check-spring-dependencies.sh` | Check for Spring Boot dependencies in build files | `bash scripts/check-spring-dependencies.sh --dir <path>` |

All scripts:
- Accept `--help` for usage documentation
- Output structured JSON for programmatic consumption
- Send diagnostics to stderr, data to stdout
- Are non-interactive (no TTY prompts)
- Return meaningful exit codes (0 = success, 1 = error)


## Step 1: Analyze

Scan the application to understand what needs to migrate:

- **Build system**: Read the build file (`pom.xml` for Maven, `build.gradle` or `build.gradle.kts` for Gradle) — Spring Boot version, starters, plugins
- **Java code**: Search for Spring annotations (DI, REST, Data, Security, Scheduling)
- **Configuration**: Read `application.properties`/`application.yml`, check for profiles
- **Tests**: Check for `@SpringBootTest`, `@WebMvcTest`, `@DataJpaTest`

Present a summary table with area, findings, and complexity. Inform the user that the migration will proceed using full Quarkus: replacing Spring annotations with JAX-RS, CDI, Hibernate ORM with Panache, and native Quarkus extensions.

**Stop here and wait for the user's response before continuing.** Do not ask about git workflow or anything else in the same message.

## Step 2: Git branch (optional)

After the analysis summary, check if the target project is a git repository. If it is, propose the git workflow:

> **Migration workflow:** Each migration run can be isolated in its own branch (`feature/JIRA-TICKET-NUMBER`) created from `master`. The branch will contain a single commit with all changes plus a migration report. A draft PR against `master` will be created for review — it is never merged, it serves as a permanent diff and discussion record. **Would you like to use this workflow?**

- **User accepts** → follow [modules/git.md](modules/git.md) — **Pre-migration** section. Propose the branch name (`feature/JIRA-TICKET-NUMBER`) and wait for confirmation before creating it.
- **User declines** → skip git management entirely, proceed with migration in the current branch.
- **Not a git repo** → inform the user, skip git management, proceed normally.

## Step 3: Execute Modules

## Instructions

- Execute the instructions of the modules according to the following Decision Gate Table
- Always log which Module and Gate check is evaluated and the status using the format:
  Gate result: <STATUS> and <CONDITION_EVALUATED>

### Decision Gate Table 

- For each module, evaluate whether it applies to this project. A module executes only when its gate status is: **PASS**.
- Inspect the project to determine the gate result — do not rely on blind grep commands; use your understanding of the codebase.

| Module                          | Gate Check                                                                                                                | Gate Result                                                                              |
|---------------------------------|---------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| [jdk](modules/jdk.md)           | JDK 21+ required                                   | **ALWAYS** -- stop migration if < 21 |
| [build](modules/build.md)       | Spring Boot parent/starters/`spring-boot-maven-plugin` in `pom.xml`, or Spring Boot/`io.spring.dependency-management` plugins in `build.gradle(.kts)` | **PASS** if Spring Boot build markers found; **SKIP** otherwise                          |
| [code](modules/code.md)         | Spring annotations in Java sources (`@Component`, `@Service`, `@Controller`, `@Repository`, `@Entity`, `@Autowired`, etc.) | **PASS** if Spring annotations found; **SKIP** otherwise                                 |
| [testing](modules/testing.md)   | Spring test annotations in test sources (`@SpringBootTest`, `@WebMvcTest`, `@MockBean`)                                   | **PASS** if Spring tests found; **SKIP** otherwise                                       |
| [validation](modules/validation.md) | Post-migration compliance with engineering standards from `ptpla-cbv-pf-engineering-prompts`                      | **ALWAYS** — runs after cleanup                                                          |

### Execution Protocol

```
FOR module IN [build, code, testing, cleanup, validation]:

  1. EVALUATE — inspect the project for the gate condition
  2. DECIDE
     IF gate == ALWAYS → proceed to step 3
     IF gate == PASS   → proceed to step 3
     IF gate == SKIP   → log "Module {name}: SKIPPED — {reason}", mark checkbox, continue
  3. LOAD — read the module file and relevant reference files
  4. EXECUTE — follow the module instructions, adapting to full Quarkus migration
  5. COMPILE — run the project's compile command (`./mvnw clean compile -DskipTests` for Maven, `./gradlew clean compileJava -x test` for Gradle)
     Fails → diagnose and fix before proceeding
  6. LOG — mark checkbox as done
```

### Running Individual Modules

To run a single module outside the full migration flow, read its file directly:

- "Read `modules/build.md` and execute it"
- "Run only the testing module"
- "Re-run the cleanup module"

The module will use the current project state with full Quarkus migration strategy.

## Step 4: Verify the Migration

Run each check in order. A check fails = stop and fix before continuing.

| # | Check | Command (Maven / Gradle) | Pass criteria |
|---|-------|---------|---------------|
| 1 | **Builds** | `./mvnw clean package -DskipTests` / `./gradlew clean build -x test` | Exit code 0, no compilation errors |
| 2 | **No Spring deps** | Search build file for `org.springframework` | Zero Spring dependencies |
| 3 | **Has Quarkus** | Search build file for `io.quarkus` | Quarkus BOM and at least one extension present |
| 4 | **Tests pass** | `./mvnw test` / `./gradlew test` | All tests pass using `@QuarkusTest` |
| 5 | **Starts up** | `./mvnw quarkus:dev` / `./gradlew quarkusDev` | App starts, `curl http://localhost:8080/q/health` returns UP |
| 6 | **Engineering standards** | Run validation module checks (13 checks) | All 13 validation checks pass |

## Step 5: Validation Report

After all verification checks pass, run the validation module and include its report in the migration output.

Run [modules/validation.md](modules/validation.md) and present the validation report with:
- All 13 checks passed/failed
- Any violations with file paths and line numbers
- Fix recommendations for each violation
- Overall compliance status

If validation fails, fix the violations before proceeding to Step 6.

## Step 6: Migration Review (Self-Reflection)

Answer each question honestly:

1. **What migrated cleanly?** Patterns that mapped 1:1.
2. **What required manual judgment?** Non-obvious decisions made.
3. **What was left as TODO?** Every `// TODO: Migration required` comment and why.
4. **Was any code removed?** What, where, justification. Flag runtime risks.
5. **What checks failed initially?** Failures from Step 4 and how you fixed them.
6. **What's missing from the skill references?** Mappings you had to figure out.

### Migration Report

Present the review as a structured report:

```
## Migration Report: [app-name]

### Summary
- Strategy: Full Quarkus Migration
- Agent: [AI agent name - e.g claude, pi, opencode, gemini, etc]
- Model: [model name — e.g. claude-sonnet-4-6, check system context]
- Modules completed: [X/4]
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

### Unmigrated Code (TODOs)
| File | Line | What | Why not migrated |
|------|------|------|-----------------|

### Removed Code
| File | What was removed | Justification |
|------|-----------------|---------------|

### Skill Improvement Suggestions
- [Any missing mappings, unclear instructions, or edge cases discovered]
```

## Step 7: Commit and PR (only if git workflow was accepted)

Follow [modules/git.md](modules/git.md) — **Post-migration** section. Ask the user for confirmation before committing, and again before pushing / creating the draft PR. Do not proceed with either action without explicit user approval.

---