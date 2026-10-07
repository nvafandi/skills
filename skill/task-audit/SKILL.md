---
name: task-audit
description: >
  Performs detailed audit of implemented tasks against original requirements, 
  architectural decisions, coding standards, and quality gates. Verifies 
  completeness, traceability, and compliance before considering a task done.
argument-hint: "<task-id|task-file> [--rfc-file] [--prd-file] [--strict]"
license: MIT
metadata:
  author: Nurvan Afandi
  version: 1.0.0
---

# Task Audit

Final verification gate that audits implemented tasks against all upstream 
artifacts (PRD, RFC, Task Breakdown, Code Review, Security Analysis) to 
ensure complete, compliant, and production-ready delivery.

## Purpose

Provide a single, comprehensive "Definition of Done" verification that 
catches gaps between what was planned, what was reviewed, and what was 
actually implemented.

## Audit Scope

### 1. Requirements Traceability
- [ ] **PRD Coverage**: Every acceptance criterion from PRD implemented
- [ ] **RFC Alignment**: Implementation matches approved RFC design
- [ ] **Task Completeness**: All sub-tasks from breakdown completed
- [ ] **No Scope Creep**: Nothing implemented beyond approved scope
- [ ] **No Missing Features**: Nothing from scope left unimplemented

### 2. Code Quality Compliance
- [ ] **Coding Standards**: All rules from `coding-guidelines/references/coding-standards.md` pass
- [ ] **Code Review**: All CRITICAL/MAJOR findings resolved
- [ ] **Security Analysis**: All CRITICAL/HIGH findings remediated
- [ ] **Static Analysis**: Zero violations (Checkstyle, SpotBugs, PMD, SonarQube)
- [ ] **Dependencies**: No vulnerable/outdated dependencies introduced

### 3. Testing Completeness
- [ ] **Unit Tests**: Coverage ≥ threshold (Domain 95%, Service 90%, etc.)
- [ ] **Integration Tests**: All repository/service integrations tested
- [ ] **Contract Tests**: API contracts verified (if applicable)
- [ ] **Test Quality**: No forbidden patterns (ArgumentCaptor, any(), lenient)
- [ ] **Mutation Testing**: Score ≥ 80% (if configured)

### 4. Architectural Compliance
- [ ] **Layer Separation**: Controller/Service/Repository/Domain respected
- [ ] **Dependency Direction**: Inward only, no cycles
- [ ] **Mapper Placement**: Correct layer boundaries, no misplacements
- [ ] **Domain Purity**: Zero framework dependencies in domain
- [ ] **Pattern Consistency**: Follows project's established patterns

### 5. Documentation & Knowledge Transfer
- [ ] **Code Documentation**: Complex logic documented (JavaDoc/KDoc)
- [ ] **API Documentation**: OpenAPI/GraphQL schema updated
- [ ] **README/Changelog**: Updated for user-facing changes
- [ ] **Architecture Decision**: ADR created for significant decisions
- [ ] **Runbooks**: Operational procedures documented

### 6. Operational Readiness
- [ ] **Observability**: Metrics, logs, traces, alerts implemented
- [ ] **Configuration**: Environment-specific config externalized
- [ ] **Migrations**: Database migrations included and tested
- [ ] **Rollback Plan**: Documented and tested
- [ ] **Feature Flags**: New functionality behind flags (if applicable)

### 7. Compliance & Governance
- [ ] **Licensing**: No incompatible licenses introduced
- [ ] **Regulatory**: GDPR, PCI, HIPAA requirements met (if applicable)
- [ ] **Data Classification**: PII handling per policy
- [ ] **Audit Trail**: Security-relevant actions logged
- [ ] **Secrets**: No secrets in code, config, or Docker images

## Audit Process

### Phase 1: Artifact Collection
```bash
# Gather all upstream artifacts
- PRD document
- RFC document (with architect review approval)
- Task breakdown with sprint allocation
- Code review report (with resolution evidence)
- Security analysis report (with remediation evidence)
- CI/CD pipeline results (build, test, scan)
- Git history (commits, branches, merges)
```

### Phase 2: Automated Verification
```bash
# Run automated checks
./gradlew clean test jacocoTestReport checkstyle spotbugs pmd dependencyCheck
# Verify: coverage thresholds, zero violations, no vulnerable deps
```

### Phase 3: Manual Traceability Check
```
For each PRD acceptance criterion:
  → Find corresponding test case
  → Verify implementation matches
  → Confirm test passes

For each RFC technical decision:
  → Verify implementation follows decision
  → Check for deviations (documented?)
```

### Phase 4: Gap Analysis
- Compare: Planned vs Implemented vs Tested vs Documented
- Identify: Missing, Incomplete, Deviated, Extra
- Classify: Blocker / Major / Minor / Info

## Audit Output

```markdown
# Task Audit Report: {TASK-ID} - {Task Title}

## Metadata
- **Task ID**: {TASK-005}
- **Task Type**: FEAT
- **Sprint**: 2
- **Assignee**: {Developer}
- **Branch**: FEAT/user-rest-api
- **PR**: #234
- **Audit Date**: {Date}
- **Auditor**: {Name/Automated}

## Verdict: ✅ PASSED | ⚠️ PASSED WITH CONDITIONS | ❌ FAILED

## Summary
{2-3 sentences: overall status, key findings, readiness for production}

## Traceability Matrix

| PRD Req | RFC Section | Task Sub-item | Implemented | Tested | Documented | Status |
|---------|-------------|---------------|-------------|--------|------------|--------|
| REQ-001 | §3.1 | TASK-005a | ✅ | ✅ | ✅ | ✅ COMPLETE |
| REQ-002 | §3.2 | TASK-005b | ✅ | ⚠️ Partial | ✅ | ⚠️ GAP |
| REQ-003 | §4.1 | TASK-005c | ❌ | ❌ | ❌ | ❌ MISSING |

## Quality Gates

| Gate | Status | Details |
|------|--------|---------|
| Code Review (CRITICAL/MAJOR) | ✅ PASS | 0 unresolved |
| Security Analysis (CRITICAL/HIGH) | ✅ PASS | 0 unresolved |
| Static Analysis | ✅ PASS | 0 violations |
| Unit Test Coverage | ✅ PASS | Domain 96%, Service 92% |
| Integration Tests | ✅ PASS | All 12 tests passing |
| Mutation Testing | ⚠️ PARTIAL | 78% (threshold 80%) |
| Dependency Check | ✅ PASS | No new vulnerabilities |
| License Check | ✅ PASS | All compatible |

## Architectural Compliance

| Rule | Status | Evidence |
|------|--------|----------|
| Layer Separation | ✅ PASS | Verified in code review |
| Dependency Direction | ✅ PASS | No cycles detected |
| Mapper Placement | ✅ PASS | All mappers in correct packages |
| Domain Purity | ✅ PASS | Zero Spring deps in domain |
| Transaction Boundaries | ✅ PASS | @Transactional on services only |

## Findings

### 🔴 BLOCKERS (Must Fix Before Done)
| ID | Category | Description | Required Action |
|----|----------|-------------|-----------------|
| AU-001 | Testing | Mutation score 78% < 80% threshold | Add tests for edge cases in UserValidator |

### 🟠 MAJOR (Should Fix Before Done)
| ID | Category | Description | Required Action |
|----|----------|-------------|-----------------|
| AU-002 | Documentation | OpenAPI spec missing error responses | Add 400/404/500 examples to UserApi.yaml |
| AU-003 | Observability | No custom metrics for registration funnel | Add Counter metrics for success/failure |

### 🟡 MINOR (Can Fix in Follow-up)
| ID | Category | Description | Recommended Action |
|----|----------|-------------|-------------------|
| AU-004 | Code Quality | One function at 35 lines (threshold 30) | Extract validation to private method |
| AU-005 | Changelog | CHANGELOG.md not updated | Add entry for user registration feature |

### 🔵 INFO (Tracking Only)
| ID | Category | Description |
|----|----------|-------------|
| AU-006 | Tech Debt | Consider caching user lookups (see RFC §6.3) |

## Evidence Checklist

- [ ] All commits reference task ID (TASK-005)
- [ ] Branch name follows convention (FEAT/user-rest-api)
- [ ] Commit messages follow convention (feat: ...)
- [ ] PR description links to RFC/PRD
- [ ] All review comments resolved (not just dismissed)
- [ ] Security findings remediated (not suppressed)
- [ ] Database migration tested rollback
- [ ] Feature flag configured (if applicable)
- [ ] Staging deployment verified

## Sign-off

| Role | Name | Status | Date |
|------|------|--------|------|
| Developer | {Name} | ✅ Self-certified | {Date} |
| Code Reviewer | {Name} | ✅ Approved | {Date} |
| Security Reviewer | {Name} | ✅ Cleared | {Date} |
| **Auditor** | **{Name}** | **{Verdict}** | **{Date}** |

## Next Steps (if not PASSED)
1. Fix AU-001 (Blocker - mutation testing)
2. Fix AU-002, AU-003 (Major - docs, observability)
3. Re-run audit after fixes
4. Update task status to DONE only after PASSED
```

## Automation Integration

### CI/CD Pipeline Gate
```yaml
# Final gate before production deploy
- name: Task Audit
  run: |
    opencode run task-audit -- TASK-005 \
      --prd-file docs/prd.md \
      --rfc-file docs/rfc.md \
      --strict \
      --format=json > audit-report.json
    
    # Fail pipeline if not PASSED
    VERDICT=$(jq -r '.verdict' audit-report.json)
    if [ "$VERDICT" != "PASSED" ]; then
      echo "Audit failed: $VERDICT"
      exit 1
    fi
```

### Git Hook (Pre-merge)
```bash
# .git/hooks/pre-merge
#!/bin/bash
task_id=$(echo $1 | grep -oE 'TASK-[0-9]+')
if [ -n "$task_id" ]; then
  opencode run task-audit -- "$task_id" --strict --quiet
fi
```

## Usage

```bash
# Audit single task with all artifacts
opencode run task-audit -- TASK-005 \
  --prd-file docs/prd.md \
  --rfc-file docs/rfc.md \
  --review-file reports/code-review.md \
  --security-file reports/security.md

# Audit entire sprint
opencode run task-audit -- sprint-2-tasks.md --strict

# Quick audit (automated checks only)
opencode run task-audit -- TASK-005 --quick

# Generate audit dashboard data
opencode run task-audit -- sprint-2-tasks.md --format=json --output audit-dashboard.json
```

## Integration

- **Consumes**: 
  - Task breakdown (`task-breakdown`)
  - Implementation (`backend-implementation`)
  - Code review report (`code-review`)
  - Security analysis report (`security-analysis`)
  - CI/CD results
- **Produces**: Audit report with verdict
- **Blocks**: Task closure / Release until PASSED
- **Feeds**: `documentation` skill (for doc generation)
- **References**: All upstream artifacts + `coding-guidelines`
- **Escalates**: FAILED audits to sprint retrospective