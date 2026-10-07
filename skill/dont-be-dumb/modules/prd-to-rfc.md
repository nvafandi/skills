---
name: prd-to-rfc
description: >
  Transforms a Product Requirements Document (PRD) into a Request for Comments (RFC) 
  with system-level perspective. Generates technical options, cost analysis, 
  architecture diagrams, and trade-off matrices for engineering review.
argument-hint: "<prd-file> [--template=microservice|monolith|serverless]"
license: MIT
metadata:
  author: Nurvan Afandi
  version: 1.0.0
---

# PRD to RFC

Converts business-facing PRDs into engineering-facing RFCs with multiple 
implementation options, architectural decisions, cost modeling, and risk assessment.

## Purpose

Translate product requirements into technical specifications that enable 
informed architectural decisions before implementation begins.

## Input

- PRD document (from `storytelling-to-prd` or manual)
- Existing system architecture context
- Technical constraints (stack, infrastructure, team)
- Non-functional requirements from PRD

## Output: RFC Structure

```markdown
# RFC: {Feature/System Name} - {RFC-ID}

## Metadata
- RFC ID: RFC-{YYYYMMDD}-{SEQ}
- Status: DRAFT | REVIEW | APPROVED | REJECTED | SUPERSEDED
- Author(s): 
- Reviewers: 
- Created: {date}
- Last Updated: {date}
- Related PRD: {PRD reference}

## 1. Problem Statement
- Business context (from PRD)
- Technical problem to solve
- Scope boundaries (in/out)

## 2. Proposed Solution Overview
- High-level approach
- Key design decisions
- Integration points

## 3. Architecture Options Analysis

### Option A: {Name} (Recommended)
- Description
- Architecture diagram (Mermaid/PlantUML)
- Data flow
- Component breakdown

### Option B: {Name}
- Description
- Architecture diagram
- Data flow
- Component breakdown

### Option C: {Name}
- Description
- ...

## 4. Trade-off Matrix

| Criteria | Weight | Option A | Option B | Option C |
|----------|--------|----------|----------|----------|
| Development Effort | 25% | 🟢 Low | 🟡 Medium | 🔴 High |
| Operational Complexity | 20% | 🟢 Low | 🟡 Medium | 🔴 High |
| Scalability | 20% | 🟡 Medium | 🟢 High | 🟢 High |
| Latency | 15% | 🟢 <50ms | 🟡 <200ms | 🟢 <50ms |
| Cost (Monthly) | 10% | $XXX | $XXX | $XXX |
| Team Familiarity | 10% | 🟢 High | 🟡 Medium | 🔴 Low |

## 5. Cost Analysis

### Development Cost
- Engineering hours by role
- Sprint estimates
- Dependencies on other teams

### Operational Cost (Monthly/Annual)
- Infrastructure (compute, storage, network)
- Managed services
- Monitoring/observability
- Support overhead

### Cost Comparison by Option
| Option | Dev Cost | Ops Cost (yr 1) | Total 3-yr TCO |
|--------|----------|-----------------|----------------|
| A | $XX,XXX | $X,XXX/mo | $XXX,XXX |
| B | $XX,XXX | $X,XXX/mo | $XXX,XXX |

## 6. Technical Specifications

### API Contracts
- OpenAPI/GraphQL schemas
- Authentication/authorization
- Rate limiting
- Versioning strategy

### Data Model
- Entity relationships (ERD)
- Migration strategy
- Indexing strategy
- Partitioning/sharding

### Infrastructure
- Deployment topology
- Scaling policies
- Disaster recovery
- Security zones

## 7. Implementation Phases

### Phase 1: Foundation (Sprint 1-2)
- Tasks, dependencies, deliverables

### Phase 2: Core Features (Sprint 3-5)
- Tasks, dependencies, deliverables

### Phase 3: Hardening (Sprint 6)
- Tasks, dependencies, deliverables

## 8. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| {Risk} | High/Med/Low | High/Med/Low | {Action} |

## 9. Open Questions
- Items requiring stakeholder input
- Technical spikes needed

## 10. Decision Log
- Date | Decision | Rationale | Alternatives Considered

## 11. Appendices
- Detailed diagrams
- Spike results
- Reference implementations
```

## Process

### Phase 1: PRD Analysis
1. Parse PRD for functional/non-functional requirements
2. Identify technical implications per feature
3. Map user stories to system capabilities
4. Extract NFRs with measurable targets

### Phase 2: Option Generation
1. Generate 3+ viable architectural options
2. Apply architectural patterns appropriately
3. Consider build vs buy vs hybrid
4. Document assumptions per option

### Phase 3: Analysis & Scoring
1. Build trade-off matrix with weighted criteria
2. Model costs (dev + ops + opportunity)
3. Identify risks per option
4. Score and rank options

### Phase 4: RFC Assembly
1. Compile into RFC template
2. Generate architecture diagrams (Mermaid)
3. Create traceability: PRD requirement → RFC section
4. Flag open questions for review

## Templates by Architecture Style

### Microservice Template
- Service boundaries
- Inter-service communication (sync/async)
- Data consistency patterns
- Observability stack

### Monolith/Modular Monolith Template
- Module boundaries
- Internal APIs
- Shared kernel decisions
- Deployment model

### Serverless Template
- Function boundaries
- Event-driven flows
- Cold start mitigation
- Cost optimization

## Usage

```bash
# Basic conversion
opencode run prd-to-rfc -- prd.md

# With architecture template
opencode run prd-to-rfc -- prd.md --template=microservice

# With existing architecture context
opencode run prd-to-rfc -- prd.md --arch-context arch-decision-log.md

# Output to specific directory
opencode run prd-to-rfc -- prd.md --output ./rfcs/
```

## Integration

- **Consumes**: PRD from `storytelling-to-prd`
- **Produces**: RFC for `backend-architect-review`
- **References**: `coding-guidelines/references/coding-standards.md` (for implementation standards)
- **Feeds**: `task-breakdown` after approval