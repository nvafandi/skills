---
name: backend-architect-review
description: >
  Reviews PRD and RFC documents from a backend architecture perspective. 
  Validates architectural soundness, feasibility, scalability, and alignment 
  with system principles. Acts as the final gate before implementation approval.
argument-hint: "<prd-file> <rfc-file> [--strict]"
license: MIT
metadata:
  author: Nurvan Afandi
  version: 1.0.0
---

# Backend Architect Review

The quality gate that validates PRD-RFC alignment, architectural integrity, 
and implementation feasibility before any code is written.

## Purpose

Ensure that what the business wants (PRD) and what engineering proposes (RFC) 
are aligned, achievable, and architecturally sound. This is the **final approval gate** 
before implementation sprints begin.

## Review Scope

### 1. PRD-RFC Alignment
- [ ] Every PRD functional requirement addressed in RFC
- [ ] PRD non-functional requirements mapped to RFC specs
- [ ] User stories traceable to technical components
- [ ] Business rules correctly interpreted technically
- [ ] Acceptance criteria testable at system level

### 2. Architectural Soundness
- [ ] **Consistency**: Aligns with existing system architecture
- [ ] **Cohesion**: Services/modules have single responsibilities
- [ ] **Coupling**: Loose coupling, high cohesion maintained
- [ ] **Boundaries**: Clear domain boundaries (DDD aligned)
- [ ] **Data Ownership**: Single source of truth per domain
- [ ] **Communication Patterns**: Appropriate sync/async choices

### 3. Scalability & Performance
- [ ] Load projections realistic
- [ ] Bottlenecks identified and mitigated
- [ ] Horizontal scaling strategy defined
- [ ] Caching strategy (where, what, invalidation)
- [ ] Database scaling (read replicas, sharding, partitioning)
- [ ] Latency budgets per critical path

### 4. Reliability & Resilience
- [ ] Failure modes analyzed (FMEA)
- [ ] Circuit breakers, retries, timeouts specified
- [ ] Idempotency guarantees
- [ ] Data consistency model (strong/eventual) justified
- [ ] Disaster recovery / backup strategy
- [ ] Chaos engineering readiness

### 5. Security & Compliance
- [ ] Threat model (STRIDE) applied
- [ ] Authentication/authorization design
- [ ] Data encryption (at rest, in transit)
- [ ] PII handling & GDPR/privacy compliance
- [ ] Audit logging requirements
- [ ] Secrets management

### 6. Operational Excellence
- [ ] Observability: metrics, logs, traces, alerts
- [ ] Deployment strategy (blue-green, canary, rolling)
- [ ] Rollback procedures
- [ ] Capacity planning
- [ ] Runbook completeness

### 7. Cost Efficiency
- [ ] Resource utilization projections
- [ ] Cost optimization opportunities identified
- [ ] Right-sizing recommendations

### 8. Team & Delivery Feasibility
- [ ] Skill match with team capabilities
- [ ] Dependency risks (other teams, vendors)
- [ ] Sprint breakdown realistic
- [ ] Technical debt impact assessed

## Review Output

```markdown
# Architect Review: {RFC-ID} - {Feature Name}

## Verdict: ✅ APPROVED | ⚠️ CONDITIONAL | ❌ REJECTED

## Summary
{2-3 paragraph executive summary}

## Detailed Findings

### ✅ Strengths
- {Strength 1}
- {Strength 2}

### ⚠️ Concerns (Must Address for Approval)
| ID | Category | Severity | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| AR-001 | Scalability | HIGH | No caching strategy for read-heavy endpoint | Add Redis cache with TTL/invalidation |
| AR-002 | Security | MEDIUM | PII stored without encryption | Enable TDE + field-level encryption |

### 💡 Suggestions (Optional Improvements)
| ID | Category | Finding | Recommendation |
|----|----------|---------|----------------|
| AR-003 | Observability | Missing distributed tracing | Add OpenTelemetry instrumentation |

### ❓ Open Questions
- {Question requiring clarification}

## Traceability Matrix
| PRD Requirement | RFC Section | Review Status |
|-----------------|-------------|---------------|
| REQ-001 | §3.1, §6.2 | ✅ Covered |
| REQ-002 | §3.2 | ⚠️ Partial |

## Conditions for Approval (if CONDITIONAL)
1. {Specific change required}
2. {Specific change required}

## Next Steps
- [ ] Address concerns → Resubmit for review
- [ ] Update RFC with decisions
- [ ] Proceed to `task-breakdown` skill
- [ ] Schedule implementation kickoff

## Sign-off
- Reviewer: {Name}
- Date: {Date}
- Signature: {Digital/Manual}
```

## Severity Definitions

| Severity | Definition | Action Required |
|----------|------------|-----------------|
| **CRITICAL** | System failure, data loss, security breach risk | Block approval |
| **HIGH** | Significant scalability/reliability/maintainability issue | Must fix before approval |
| **MEDIUM** | Suboptimal but workable; technical debt risk | Fix or document acceptance |
| **LOW** | Minor improvement, style, nice-to-have | Optional |

## Category Checklist

### Architecture Categories
- [ ] Domain Modeling (DDD)
- [ ] API Design (REST/gRPC/GraphQL)
- [ ] Event-Driven Architecture
- [ ] Data Architecture
- [ ] Infrastructure/Cloud
- [ ] Security Architecture

### Quality Attributes (ISO 25010)
- [ ] Functional Suitability
- [ ] Performance Efficiency
- [ ] Compatibility
- [ ] Usability (API DX)
- [ ] Reliability
- [ ] Security
- [ ] Maintainability
- [ ] Portability

## Usage

```bash
# Standard review
opencode run backend-architect-review -- prd.md rfc.md

# Strict mode (blocks on MEDIUM+)
opencode run backend-architect-review -- prd.md rfc.md --strict

# With architecture decision log context
opencode run backend-architect-review -- prd.md rfc.md --adl adr-log.md

# Output review report
opencode run backend-architect-review -- prd.md rfc.md --output review-report.md
```

## Integration

- **Consumes**: PRD + RFC
- **Produces**: Review report with verdict
- **Blocks**: `task-breakdown` until APPROVED
- **References**: 
  - `coding-guidelines/references/coding-standards.md`
  - Project ADR log
  - Existing system architecture docs
- **Escalates**: To tech lead / CTO on REJECTED