---
name: task-breakdown
description: >
  Breaks down approved PRD/RFC into implementation tasks with prioritization, 
  sprint planning, branch naming conventions, and commit message standards.
argument-hint: "<prd-file> <rfc-file> [--sprint-length=2w] [--team-size=N]"
license: MIT
metadata:
  author: Nurvan Afandi
  version: 1.0.0
---

# Task Breakdown

Decomposes approved architectural specifications into actionable, prioritized 
implementation tasks with sprint allocation, branching strategy, and commit conventions.

## Purpose

Bridge the gap between architectural design (RFC) and daily engineering work 
by creating a structured, prioritized task backlog ready for implementation.

## Input

- Approved PRD (from `storytelling-to-prd`)
- Approved RFC (from `prd-to-rfc` + `backend-architect-review`)
- Team capacity & velocity data
- Existing project backlog (for dependency mapping)

## Output: Task Breakdown Document

```markdown
# Task Breakdown: {Feature Name} - {RFC-ID}

## Sprint Plan Overview
- Total Sprints: {N}
- Sprint Length: {2 weeks}
- Team Size: {N} engineers
- Total Story Points: {XXX}
- Target Start: {Date}
- Target End: {Date}

## Sprint 1: Foundation ({Dates})
**Goal**: {Sprint goal}
**Capacity**: {XX} story points

| Task ID | Title | Type | Priority | Points | Assignee | Dependencies | Branch Name |
|---------|-------|------|----------|--------|----------|--------------|-------------|
| TASK-001 | Setup project scaffolding | SETUP | P0 | 3 | - | - | SETUP/project-scaffolding |
| TASK-002 | Configure CI/CD pipeline | SETUP | P0 | 5 | - | TASK-001 | SETUP/ci-cd-pipeline |
| TASK-003 | Implement domain models | FEAT | P0 | 8 | - | TASK-001 | FEAT/domain-models |
| TASK-004 | Create repository interfaces | FEAT | P0 | 5 | - | TASK-003 | FEAT/repository-interfaces |

## Sprint 2: Core API ({Dates})
**Goal**: {Sprint goal}
**Capacity**: {XX} story points

| Task ID | Title | Type | Priority | Points | Assignee | Dependencies | Branch Name |
|---------|-------|------|----------|--------|----------|--------------|-------------|
| TASK-005 | Implement User REST API | FEAT | P0 | 13 | - | TASK-003, TASK-004 | FEAT/user-rest-api |
| TASK-006 | Add input validation | FEAT | P0 | 5 | - | TASK-005 | FEAT/input-validation |
| TASK-007 | Implement authentication | FEAT | P0 | 8 | - | TASK-002 | FEAT/authentication |

## Sprint 3: Business Logic ({Dates})
...

## Task Type Definitions

| Type | Prefix | Description | Examples |
|------|--------|-------------|----------|
| **FEAT** | `FEAT/` | New feature implementation | `FEAT/user-registration`, `FEAT/payment-processing` |
| **HOTFIX** | `HOTFIX/` | Urgent production fix | `HOTFIX/login-null-pointer`, `HOTFIX/payment-timeout` |
| **SETUP** | `SETUP/` | Infrastructure, config, tooling | `SETUP/docker-compose`, `SETUP/monitoring-stack` |
| **TECHDEBT** | `TECHDEBT/` | Refactoring, debt reduction | `TECHDEBT/legacy-user-service`, `TECHDEBT/db-index-optimization` |

## Commit Message Convention

```
{task-type}: {message-commit}

# Examples:
feat: add user registration endpoint with email verification
feat: implement JWT token refresh mechanism
hotfix: fix null pointer in login flow when user not found
setup: configure GitHub Actions CI pipeline with test stage
techdebt: refactor user service to use repository pattern
fix: correct validation error message for duplicate email
```

### Task Type Mapping to Commit Prefix
| Task Type | Commit Prefix |
|-----------|---------------|
| FEAT | `feat` |
| HOTFIX | `hotfix` |
| SETUP | `setup` |
| TECHDEBT | `techdebt` (or `refactor` for pure refactoring) |
| BUG (ad-hoc) | `fix` |

## Prioritization Framework

### MoSCoW + Business Value + Technical Risk

| Priority | Criteria | SLA |
|----------|----------|-----|
| **P0 - Critical** | Blocks other work, high business value, high risk | Must complete in sprint |
| **P1 - High** | Core functionality, significant value | Should complete in sprint |
| **P2 - Medium** | Important but deferrable | Could complete in sprint |
| **P3 - Low** | Nice-to-have, low risk | Won't this sprint |

### Dependency Types
- **Hard**: Task B cannot start until Task A complete
- **Soft**: Task B can start but benefits from Task A
- **External**: Depends on another team/vendor

## Sprint Decomposition Rules

### When to Split a Task
- > 13 story points (too large for single sprint)
- Multiple distinct deliverables
- Spans multiple architectural layers
- Requires different skill sets
- High uncertainty (needs spike first)

### Split Patterns

#### Horizontal Split (by Layer)
```
TASK-005: Implement User REST API (13 pts)
  → TASK-005a: Controller + DTOs (5 pts)
  → TASK-005b: Service + Business Logic (5 pts)
  → TASK-005c: Repository + Data Access (3 pts)
```

#### Vertical Split (by Feature Slice)
```
TASK-008: Payment Processing (21 pts)
  → TASK-008a: Credit Card Payment (8 pts)
  → TASK-008b: Bank Transfer Payment (8 pts)
  → TASK-008c: Payment Webhook Handling (5 pts)
```

#### Spike + Implementation
```
TASK-010: Integrate with External Fraud API (? pts)
  → TASK-010-spike: Research fraud API (3 pts, timeboxed)
  → TASK-010-impl: Implement integration (based on spike)
```

## Branch Naming Convention

```
{type}/{kebab-case-feature-name}

# Rules:
- Lowercase only
- Hyphens as separators
- No special characters
- Max 50 chars after prefix
- Descriptive but concise

# Examples:
FEAT/user-registration-email-verification
HOTFIX/login-session-timeout-fix
SETUP/kubernetes-deployment-configs
TECHDEBT/extract-user-validation-logic
```

## Task Template (per task)

```markdown
## Task: {TASK-ID} - {Title}

### Type: {FEAT|HOTFIX|SETUP|TECHDEBT}
### Priority: {P0|P1|P2|P3}
### Story Points: {N}
### Sprint: {N}
### Assignee: {Name}
### Branch: {FEAT|HOTFIX|SETUP|TECHDEBT}/{feature-name}

### Description
{What needs to be built, from RFC/PRD perspective}

### Acceptance Criteria
- [ ] {Criterion 1 - testable}
- [ ] {Criterion 2 - testable}
- [ ] {Criterion 3 - testable}

### Technical Approach
{High-level implementation approach from RFC}

### Files to Create/Modify
- `src/...` (new)
- `src/...` (modify)

### Dependencies
- Blocked by: {TASK-XXX}
- Blocks: {TASK-YYY}

### Testing Requirements
- Unit tests: {specific scenarios}
- Integration tests: {specific scenarios}
- Contract tests: {if applicable}

### Definition of Done
- [ ] Code implements acceptance criteria
- [ ] Unit tests pass (>80% coverage on new code)
- [ ] Integration tests pass
- [ ] Code review approved
- [ ] Security review passed (if applicable)
- [ ] Documentation updated
- [ ] Deployed to staging
```

## Usage

```bash
# Basic breakdown
opencode run task-breakdown -- prd.md rfc.md

# With sprint configuration
opencode run task-breakdown -- prd.md rfc.md --sprint-length=2w --team-size=4

# With existing backlog for dependency mapping
opencode run task-breakdown -- prd.md rfc.md --backlog backlog.json

# Output formats
opencode run task-breakdown -- prd.md rfc.md --format=markdown|json|jira|csv

# Regenerate specific sprint
opencode run task-breakdown -- prd.md rfc.md --sprint=2 --replan
```

## Integration

- **Consumes**: Approved PRD + RFC + Architect Review
- **Produces**: Task breakdown with sprint plan
- **Feeds**: `backend-implementation` (task execution)
- **References**: `coding-guidelines/references/coding-standards.md` (for task standards)
- **Exports**: Compatible with Jira, GitHub Projects, Linear, Azure DevOps