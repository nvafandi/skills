---
name: dont-be-dumb
description: >
  Master orchestration skill for the complete development workflow: 
  storytelling → PRD → RFC → architect review → task breakdown → 
  implementation → code review → security analysis → task audit → 
  documentation → project context → resource investigation. 
  Includes mandatory coding standards and workflow gates.
argument-hint: "<phase|task-id|resource> [--auto|--manual] [--strict]"
license: MIT
metadata:
  author: Nurvan Afandi
  version: 1.0.0
---

# Don't Be Dumb

Master skill that orchestrates the complete software development lifecycle with 
strict quality gates, architectural compliance, and coding standards enforcement.

## Core Philosophy

> "Don't be dumb" means: don't write code without understanding, don't skip 
> design, don't ignore architecture, don't avoid tests, don't skip security, 
> don't forget documentation. Follow the process.

## Workflow Pipeline

```
┌─────────────────┐    ┌─────────┐    ┌─────────────┐    ┌──────────────────┐
│ storytelling    │───►│  PRD    │───►│    RFC      │───►│ backend-architect│
│-to-prd          │    │(business│    │  (system    │    │    -review       │
│                 │    │  pov)   │    │   pov)      │    │  (latest gate)   │
└─────────────────┘    └─────────┘    └─────────────┘    └──────────────────┘
                                                              │
                                                              ▼ APPROVED
┌─────────────────┐    ┌─────────┐    ┌─────────────────────────────────────┐
│ resource        │◄───│project  │◄───│        task-audit (FINAL GATE)     │
│-investigation   │    │-context │    │  traceability + compliance + docs   │
└─────────────────┘    └─────────┘    └─────────────────────────────────────┘
         ▲                                         ▲
         │                                         │
┌─────────────────┐    ┌─────────┐    ┌────────────┴────────────────────────┐
│  documentation  │◄───│security │◄───│           code-review               │
│  generator      │    │-analysis│    │  critical/major/medium/minor/       │
└─────────────────┘    └─────────┘    │  code-smells/potential-issue/       │
         ▲                              │  misplacement/mapper-misplacement  │
         │                              └─────────────────────────────────────┘
         │                                         ▲
         │              ┌──────────────────────────┘
         │              ▼
         │    ┌─────────────────┐    ┌─────────────────────────────────────┐
         └────│ backend-        │◄───│           task-breakdown            │
              │ implementation  │    │  prioritize + sprint + branch +     │
              └─────────────────┘    │  commit message format              │
                                     └─────────────────────────────────────┘
```

## Phase Execution Order

| Phase | Skill | Input | Output | Gate |
|-------|-------|-------|--------|------|
| 1 | `storytelling-to-prd` | User storytelling/narrative | PRD document | PRD must have features, metrics, NFRs |
| 2 | `prd-to-rfc` | Approved PRD | RFC document | RFC must have 3+ options, cost analysis, architecture |
| 3 | `backend-architect-review` | PRD + RFC | Review report | **MUST be APPROVED** before Phase 4 |
| 4 | `task-breakdown` | Approved PRD+RFC+Review | Task list + sprint plan | Tasks must have branch names, commit format, priorities |
| 5 | `backend-implementation` | Task from breakdown | Code + unit tests | Must follow coding-standards.md |
| 6 | `code-review` | Implemented code | Review report | All CRITICAL/MAJOR resolved |
| 7 | `security-analysis` | Reviewed code | Security report | All CRITICAL/HIGH remediated |
| 8 | `task-audit` | All above artifacts | Audit report | **MUST PASS** before Phase 9 |
| 9 | `documentation` | Audit-passed task | Docs, API specs, runbooks | Docs complete and accurate |
| 10 | `project-context` | Updated docs + code | project_context.md + README | Context matches actual state |
| 11 | `resource-investigation` | Any resource (API, fn, schema) | Investigation report | On-demand, anytime |

## Mandatory Coding Standards

All implementation and review skills MUST enforce:

| Rule | Scope |
|------|-------|
| No wildcard imports/queries/patterns | Everywhere |
| Null-safe assignment (Optional, Objects.requireNonNull) | Everywhere |
| Tests: NO ArgumentCaptor, ArgumentMatchers, lenient(), any(), stubbing | Unit tests |
| Hardcoded values → Constants (SCREAMING_SNAKE_CASE) | Everywhere |
| Functions ≤ 30 lines, single responsibility | Functions |
| No redundant comments | Everywhere |
| Use framework utilities (StringUtils, CollectionUtils, etc.) | Everywhere |
| JDK 17+: records for immutable data | Models/DTOs |
| @Builder over @Setter | Construction |
| Large functions → decompose with informative names | Functions |
| Follow architecture convention (clean arch, hexagonal, etc.) | Structure |
| Mapper functions in separate mapper classes per layer | Architecture |

## Branch & Commit Convention

```
Branch: {FEAT|HOTFIX|SETUP|TECHDEBT}/{kebab-case-name}
Commit: {feat|hotfix|setup|techdebt|fix}: {message}

Examples:
  FEAT/user-registration
  feat: add user registration with email verification

  HOTFIX/login-null-pointer
  hotfix: fix null pointer in login flow

  SETUP/ci-cd-pipeline
  setup: configure GitHub Actions CI

  TECHDEBT/extract-validation-logic
  techdebt: refactor user validation to separate mapper
```

## Sub-Skill Reference

| # | Module | Path | Invoke |
|---|--------|------|--------|
| 1 | Storytelling → PRD | `modules/storytelling-to-prd.md` | `opencode run dont-be-dumb --phase prd --story input.md` |
| 2 | PRD → RFC | `modules/prd-to-rfc.md` | `opencode run dont-be-dumb --phase rfc --prd prd.md` |
| 3 | Architect Review | `modules/backend-architect-review.md` | `opencode run dont-be-dumb --phase review --prd prd.md --rfc rfc.md` |
| 4 | Task Breakdown | `modules/task-breakdown.md` | `opencode run dont-be-dumb --phase breakdown --prd prd.md --rfc rfc.md` |
| 5 | Implementation | `modules/backend-implementation.md` | `opencode run dont-be-dumb --phase implement --task TASK-005.md` |
| 6 | Code Review | `modules/code-review.md` | `opencode run dont-be-dumb --phase code-review --branch FEAT/user-registration` |
| 7 | Security Analysis | `modules/security-analysis.md` | `opencode run dont-be-dumb --phase security --target ./src` |
| 8 | Task Audit | `modules/task-audit.md` | `opencode run dont-be-dumb --phase audit --task TASK-005` |
| 9 | Documentation | `modules/documentation.md` | `opencode run dont-be-dumb --phase docs --task TASK-005` |
| 10 | Project Context | `modules/project-context.md` | `opencode run dont-be-dumb --phase context --sync` |
| 11 | Investigation | `modules/resource-investigation.md` | `opencode run dont-be-dumb --phase investigate --target api-endpoint` |

## Usage

```bash
# Full pipeline from storytelling
opencode run dont-be-dumb -- --full --story story.md

# Single phase
opencode run dont-be-dumb -- --phase prd --story story.md

# Strict mode (block on any MEDIUM+ issue)
opencode run dont-be-dumb -- --phase code-review --branch FEAT/x --strict

# Auto mode (chain all phases)
opencode run dont-be-dumb -- --auto --story story.md --sprint-length=2w

# Investigate a specific resource
opencode run dont-be-dumb -- --phase investigate --target "POST /api/v1/users"
```

## Gate Rules

1. **Phase 3 gate**: PRD+RFC must be APPROVED or CONDITIONAL-WITH-PLAN before Phase 4
2. **Phase 6 gate**: No CRITICAL/MAJOR unresolved before Phase 7
3. **Phase 7 gate**: No CRITICAL/HIGH unresolved before Phase 8
4. **Phase 8 gate**: Audit must be PASSED before Phase 9 (docs)
5. **Every gate failure** requires fixing upstream before proceeding
6. **--strict mode** blocks on MEDIUM+ issues at any gate

## File Structure

```
skill/dont-be-dumb/
├── SKILL.md                          # This master orchestrator
├── modules/
│   ├── storytelling-to-prd.md
│   ├── prd-to-rfc.md
│   ├── backend-architect-review.md
│   ├── task-breakdown.md
│   ├── backend-implementation.md
│   ├── code-review.md
│   ├── security-analysis.md
│   ├── task-audit.md
│   ├── documentation.md
│   ├── project-context.md
│   └── resource-investigation.md
├── references/
│   └── coding-standards.md           # Shared coding standards
└── templates/
    ├── prd-template.md
    ├── rfc-template.md
    ├── review-template.md
    ├── task-template.md
    ├── audit-template.md
    └── investigation-template.md
```

## Integration

- **Extends**: `coding-guidelines/references/coding-standards.md`
- **Standalone**: All modules self-contained in this directory
- **AI Assistant**: Can invoke specific phases or full pipeline
- **CI/CD**: Can be called as pipeline stages