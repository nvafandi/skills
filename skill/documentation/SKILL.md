---
name: documentation
description: >
  Generates comprehensive documentation for implemented tasks including 
  API docs (OpenAPI/GraphQL), architecture decision records, runbooks, 
  curl examples, schema references, and impacted code analysis.
argument-hint: "<task-id|audit-report> [--format=markdown|html|pdf|confluence] [--include=curl,graphql,adrs,runbooks]"
license: MIT
metadata:
  author: Nurvan Afandi
  version: 1.0.0
---

# Documentation Generator

Automatically creates comprehensive, multi-audience documentation from 
implemented code, audit results, and architectural decisions. Produces 
developer docs, API references, operational guides, and architecture records.

## Purpose

Eliminate documentation debt by generating accurate, up-to-date documentation 
directly from source code and verified artifacts, ensuring docs never drift 
from implementation.

## Documentation Types Generated

### 1. API Documentation
- **OpenAPI 3.1** (REST): Paths, schemas, parameters, responses, examples
- **GraphQL Schema**: Types, queries, mutations, subscriptions, directives
- **AsyncAPI**: Event-driven APIs (Kafka, RabbitMQ, etc.)
- **gRPC**: Protobuf definitions + service descriptions

### 2. Implementation Documentation
- **Code Walkthrough**: Key classes, flow diagrams, design decisions
- **Impacted Code Analysis**: Files changed, call graphs, dependency impact
- **Database Schema**: ERD, migrations, indexes, constraints
- **Configuration Reference**: All config properties with defaults

### 3. Operational Documentation
- **Runbooks**: Deployment, rollback, scaling, incident response
- **Monitoring Guide**: Key metrics, alerts, dashboards, SLIs/SLOs
- **Troubleshooting**: Common errors, causes, resolutions
- **Capacity Planning**: Resource requirements, scaling triggers

### 4. Architecture Documentation
- **ADRs**: Architecture Decision Records for significant choices
- **C4 Diagrams**: Context, Container, Component, Code (Mermaid/PlantUML)
- **Sequence Diagrams**: Key flows (auth, payment, data sync)
- **Data Flow Diagrams**: Privacy/security boundaries

### 5. Developer Guides
- **Onboarding**: Setup, run, test, debug
- **Contributing**: Code style, PR process, review checklist
- **Testing Guide**: Unit, integration, contract, e2e strategies
- **Migration Guides**: Version upgrades, breaking changes

## Input Sources

| Source | Used For |
|--------|----------|
| Source code (annotations, types) | API schemas, code docs |
| Audit report (`task-audit`) | Completeness verification |
| RFC + Architect Review | Architecture docs, ADRs |
| Code Review + Security Analysis | Operational considerations |
| Git history | Changelog, migration guides |
| Test cases | Usage examples, edge cases |
| CI/CD config | Deployment docs |

## Output Structure

```
docs/
├── api/
│   ├── openapi.yaml              # REST API spec
│   ├── graphql.schema.graphql    # GraphQL schema
│   ├── asyncapi.yaml             # Event APIs
│   └── examples/
│       ├── curl/                 # cURL examples per endpoint
│       ├── postman/              # Postman collection
│       └── http/                 # .http files (VS Code/IntelliJ)
├── architecture/
│   ├── adrs/
│   │   ├── 001-use-records-for-dtos.md
│   │   ├── 002-event-driven-payments.md
│   │   └── ...
│   ├── diagrams/
│   │   ├── c4-context.mmd
│   │   ├── c4-container.mmd
│   │   ├── c4-component-user.mmd
│   │   └── sequence-auth.mmd
│   └── data-flow/
│       ├── dfd-level0.mmd
│       └── dfd-level1-payment.mmd
├── operations/
│   ├── runbooks/
│   │   ├── deploy.md
│   │   ├── rollback.md
│   │   ├── scale.md
│   │   └── incident-response.md
│   ├── monitoring/
│   │   ├── metrics-catalog.md
│   │   ├── alerts.md
│   │   └── dashboards/
│   └── troubleshooting/
│       ├── common-errors.md
│       └── faq.md
├── development/
│   ├── onboarding.md
│   ├── contributing.md
│   ├── testing-guide.md
│   └── migration-guides/
│       └── v1-to-v2.md
└── changelog/
    └── CHANGELOG.md
```

## Generated Content Examples

### cURL Examples (per endpoint)
```bash
# POST /api/v1/users/register
curl -X POST 'https://api.example.com/api/v1/users/register' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Idempotency-Key: <uuid>' \
  -d '{
    "email": "user@example.com",
    "fullName": "John Doe",
    "password": "securePassword123"
  }'

# Response: 201 Created
# {
#   "id": "usr_abc123",
#   "email": "user@example.com",
#   "fullName": "John Doe",
#   "tier": "FREE",
#   "createdAt": "2026-01-15T10:30:00Z"
# }
```

### GraphQL Schema + Example
```graphql
# Schema
type User {
  id: ID!
  email: String!
  fullName: String!
  tier: UserTier!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input RegisterUserInput {
  email: String!
  fullName: String!
  password: String!
}

type RegisterUserPayload {
  user: User!
  accessToken: String!
  refreshToken: String!
}

type Mutation {
  registerUser(input: RegisterUserInput!): RegisterUserPayload!
}

# Example Query
mutation RegisterUser($input: RegisterUserInput!) {
  registerUser(input: $input) {
    user { id email fullName tier }
    accessToken
    refreshToken
  }
}

# Variables
{ "input": { "email": "user@example.com", "fullName": "John Doe", "password": "securePassword123" } }
```

### ADR Template
```markdown
# ADR 003: Use Optimistic Locking for User Profile Updates

## Status: Accepted

## Context
User profiles are frequently updated concurrently. Last-write-wins causes 
data loss. Pessimistic locking hurts performance.

## Decision
Use JPA `@Version` with optimistic locking. On `OptimisticLockException`, 
retry with exponential backoff (max 3 retries).

## Consequences
- **Positive**: No DB locks, high throughput, automatic retry
- **Negative**: Caller must handle retry logic, potential stale reads
- **Risk**: High contention → more retries → latency spikes

## Alternatives Considered
- Pessimistic locking (rejected: performance)
- Application-level locking (rejected: complexity)
- Event sourcing (rejected: overkill)

## Implementation
- `User` entity: `@Version Long version`
- `UserService.updateProfile()`: `@Retryable(maxAttempts=3)`
- Custom `OptimisticLockException` → `ConflictException` (409)

## References
- RFC-20260115-001 §6.2
- Task TASK-012
```

### Runbook Example
```markdown
# Runbook: User Service Deployment

## Pre-deployment Checklist
- [ ] All tests passing in CI (unit, integration, contract)
- [ ] Security scan clean (no CRITICAL/HIGH)
- [ ] Audit report PASSED for all tasks in release
- [ ] Database migration reviewed and tested rollback
- [ ] Feature flags configured for new functionality
- [ ] Staging deployment verified

## Deployment Steps
1. **Blue-Green Deploy**
   ```bash
   kubectl set image deployment/user-service-blue \
     user-service=registry.example.com/user-service:v2.3.0
   ```

2. **Health Check**
   ```bash
   curl -f https://blue.api.example.com/actuator/health/liveness
   curl -f https://blue.api.example.com/actuator/health/readiness
   ```

3. **Smoke Tests**
   ```bash
   ./scripts/smoke-tests.sh --env=blue
   ```

4. **Traffic Switch**
   ```bash
   kubectl patch ingress user-service -p '{"spec":{"rules":[{"host":"api.example.com","http":{"paths":[{"backend":{"serviceName":"user-service-blue"}}]}}]}}'
   ```

## Rollback Procedure
1. Immediate: Switch ingress back to green
   ```bash
   kubectl patch ingress user-service -p '{"spec":{"rules":[{"host":"api.example.com","http":{"paths":[{"backend":{"serviceName":"user-service-green"}}]}}]}}'
   ```
2. Verify green health
3. Investigate blue failure
4. Delete blue deployment after root cause

## Monitoring During Deploy
- Watch: `user_service_requests_total`, `user_service_latency_p99`
- Alert: Error rate > 1%, Latency p99 > 500ms
- Dashboard: Grafana "User Service Deployment"
```

## Impacted Code Analysis

```markdown
# Impacted Code Analysis: TASK-005 (User Registration)

## Files Changed (12)
| File | Change Type | Lines | Risk |
|------|-------------|-------|------|
| `UserController.java` | NEW | +85 | LOW |
| `UserService.java` | MODIFIED | +42/-12 | MEDIUM |
| `UserRepository.java` | NEW | +38 | LOW |
| `User.java` (record) | NEW | +25 | LOW |
| `UserEntity.java` | NEW | +45 | LOW |
| `UserEntityToDomainMapper.java` | NEW | +52 | LOW |
| `UserDomainToDtoMapper.java` | NEW | +38 | LOW |
| `RegisterUserCommand.java` | NEW | +18 | LOW |
| `UserDto.java` | NEW | +22 | LOW |
| `EmailAlreadyExistsException.java` | NEW | +15 | LOW |
| `UserServiceTest.java` | NEW | +180 | LOW |
| `UserControllerTest.java` | NEW | +145 | LOW |

## Call Graph Impact
```
UserController.register()
  → UserService.register()
      → UserRepository.existsByEmail()
      → UserEntityToDomainMapper.toEntity()
      → UserRepository.save()
      → UserEntityToDomainMapper.toDomain()
      → UserDomainToDtoMapper.toDto()
```

## Dependency Impact
- **New Dependencies**: None
- **Updated Dependencies**: None
- **Breaking Changes**: None (new endpoint only)

## Database Impact
- **New Table**: `users` (id, email, full_name, password_hash, tier, created_at, updated_at, version)
- **Indexes**: `idx_users_email` (unique), `idx_users_tier`
- **Migration**: `V20260115_001__create_users_table.sql`
- **Rollback**: `DROP TABLE users;`
```

## Usage

```bash
# Generate all docs from audit report
opencode run documentation -- audit-report.json --format=markdown --output ./docs

# Generate specific doc types
opencode run documentation -- TASK-005 --include=curl,graphql,adrs

# Generate only API docs from code
opencode run documentation -- ./src --include=openapi,graphql --output ./docs/api

# Generate runbooks from deployment config
opencode run documentation -- ./k8s --include=runbooks --output ./docs/operations

# Update existing docs (incremental)
opencode run documentation -- audit-report.json --incremental --output ./docs

# Publish to Confluence
opencode run documentation -- audit-report.json --format=confluence --space-key=DEV --parent-page=12345
```

## Integration

- **Consumes**: 
  - Audit report (`task-audit`)
  - Source code + annotations
  - RFC + Architecture decisions
  - CI/CD + Deployment configs
- **Produces**: Complete documentation site
- **Feeds**: `project-context` skill (for README sync)
- **Publishes**: 
  - GitHub Pages / GitLab Pages
  - Confluence / Notion / Wiki
  - Swagger UI / Redoc / GraphQL Playground
- **Triggers**: On task audit PASSED, release tag