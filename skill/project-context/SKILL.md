---
name: project-context
description: >
  Creates and maintains project_context.md and README.md that accurately 
  reflect the application details, features, technology stack, code conventions, 
  and project structure. Keeps documentation in sync with actual codebase.
argument-hint: "[--init|--sync|--validate] [--output-dir=.]"
license: MIT
metadata:
  author: Nurvan Afandi
  version: 1.0.0
---

# Project Context

Automatically generates and keeps project context files (`project_context.md` 
and `README.md`) synchronized with the actual codebase state, architecture 
decisions, and team conventions.

## Purpose

Provide a single source of truth for project understanding that enables:
- New team members to onboard quickly
- AI assistants to understand project context accurately
- Architecture decisions to be discoverable
- Conventions to be enforced consistently

## Generated Files

### 1. project_context.md
```markdown
# Project Context: {Project Name}

## Overview
- **Name**: {project name}
- **Description**: {what the app does}
- **Version**: {X.Y.Z}
- **Status**: {Active/Maintenance/Sunset}
- **Repository**: {github/gitlab URL}

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Spring Boot / Quarkus / Node.js / Go | X.Y |
| Frontend | React / Vue / Angular / Next.js | X.Y |
| Database | PostgreSQL / MongoDB / MySQL | X.Y |
| Cache | Redis / Memcached | X.Y |
| Message Queue | Kafka / RabbitMQ / SQS | X.Y |
| Auth | JWT / OAuth2 / Keycloak | - |
| Observability | Micrometer / OpenTelemetry / Prometheus | - |
| CI/CD | GitHub Actions / GitLab CI / Jenkins | - |
| Cloud | AWS / GCP / Azure | - |
| Container | Docker / Kubernetes | - |

## Architecture

### Pattern
- **Primary**: Clean Architecture / Hexagonal / Layered / Microservices
- **Communication**: REST / gRPC / GraphQL / Event-Driven
- **Data**: CQRS / Event Sourcing (if applicable)

### Layer Structure
```
src/main/java/com/example/app/
├── domain/           # Pure business logic (no framework deps)
│   ├── model/        # Entities, value objects, records
│   ├── service/      # Domain services
│   ├── repository/   # Repository interfaces (ports)
│   └── exception/    # Domain exceptions
├── application/      # Use cases / application services
│   ├── service/      # Application services (orchestration)
│   ├── dto/          # Data transfer objects
│   └── mapper/       # Domain↔DTO mappers
├── infrastructure/   # External concerns
│   ├── persistence/  # JPA entities, repositories (adapters)
│   ├── client/       # External API clients
│   ├── config/       # Framework configuration
│   └── mapper/       # Entity↔Domain mappers
└── presentation/     # Entry points
    ├── controller/   # REST controllers
    └── mapper/       # Domain↔DTO mappers
```

## Code Conventions

### Naming
- **Classes**: PascalCase (`UserService`, `PaymentController`)
- **Methods**: camelCase, verb-first (`calculateTotal`, `validateInput`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Packages**: lowercase, domain-based (`com.example.app.domain.model`)
- **Files**: match class name (`UserService.java`)

### Structure
- Max 30 lines per function
- Max 300 lines per class
- Max 10 methods per class
- One public class per file
- Constructor injection only (no @Autowired on fields)

### Patterns
- Records for immutable data (JDK 17+)
- `@Builder` for object construction
- Separate mapper classes per layer boundary
- Domain exceptions → Global handler
- Validation at service entry points
- `@Transactional` on services only

### Testing
- No ArgumentCaptor, ArgumentMatchers, lenient(), any()
- Explicit test data setup (no mocks for domain logic)
- Test naming: `should{Expected}_when{Condition}`
- Coverage thresholds: Domain 95%, Service 90%, Repository 80%

## Features

### Implemented
| Feature | Status | API Endpoint | Owner |
|---------|--------|--------------|-------|
| User Registration | ✅ DONE | POST /api/v1/users/register | Team A |
| User Login (JWT) | ✅ DONE | POST /api/v1/auth/login | Team A |
| Payment Processing | 🔄 IN PROGRESS | POST /api/v1/payments | Team B |

### Planned
| Feature | Priority | Target Sprint |
|---------|----------|---------------|
| Refresh Token Rotation | P1 | Sprint 4 |
| Admin Dashboard | P2 | Sprint 5 |

## External Integrations
| System | Type | Auth | Docs |
|--------|------|------|------|
| Stripe | Payment | API Key | https://docs.stripe.com |
| SendGrid | Email | API Key | https://docs.sendgrid.com |
| AWS S3 | Storage | IAM Role | - |

## Environment Variables
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection | Yes | - |
| `JWT_SECRET` | JWT signing key | Yes | - |
| `REDIS_HOST` | Redis host | No | localhost |
| `STRIPE_API_KEY` | Stripe secret key | Yes | - |

## Glossary
| Term | Definition |
|------|------------|
| **Domain Model** | Pure business objects without framework dependencies |
| **Value Object** | Immutable object defined by its attributes (e.g., Money, Email) |
| **Aggregate** | Cluster of domain objects treated as a unit (DDD) |
| **Port/Adapter** | Hexagonal architecture: interface (port) + implementation (adapter) |
```

### 2. README.md
```markdown
# {Project Name}

{Brief description of what the application does}

## Quick Start

### Prerequisites
- Java 17+ / Node.js 18+ / Go 1.21+
- Docker & Docker Compose
- PostgreSQL 15+

### Setup
```bash
# Clone
git clone {repo-url}
cd {project}

# Environment
cp .env.example .env
# Edit .env with your values

# Dependencies
./gradlew build        # Java
npm install            # Node.js
go mod tidy            # Go

# Run
./gradlew bootRun      # Java
npm run dev            # Node.js
go run main.go         # Go
```

### Running Tests
```bash
./gradlew test                    # All tests
./gradlew test --tests "*Service*" # Specific tests
./gradlew jacocoTestReport        # Coverage report
```

## Architecture

{Brief architecture description with C4 diagram reference}

```
{simplified architecture diagram}
```

See [Architecture Docs](docs/architecture/) for detailed diagrams and ADRs.

## API Documentation

- OpenAPI: [Swagger UI](http://localhost:8080/swagger-ui.html) | [OpenAPI Spec](docs/api/openapi.yaml)
- GraphQL: [GraphQL Playground](http://localhost:8080/graphql) | [Schema](docs/api/graphql.schema.graphql)

## Development

### Project Structure
{Tree diagram of key directories}

### Code Conventions
{Key conventions summary, link to coding-standards.md}

### Branching Strategy
```
FEAT/{feature-name}     # New features
HOTFIX/{hotfix-name}    # Urgent fixes
SETUP/{setup-name}      # Infrastructure
TECHDEBT/{tech-debt-name} # Refactoring
```

### Commit Messages
```
{type}: {message}

Types: feat, hotfix, setup, techdebt, fix, docs, test, refactor
```

## Deployment

### Environments
| Env | URL | Branch | Auto-deploy |
|-----|-----|--------|-------------|
| Dev | dev-api.example.com | develop | ✅ |
| Staging | staging-api.example.com | release/* | ✅ |
| Prod | api.example.com | main | Manual approval |

### CI/CD Pipeline
{Pipeline description with stages}

## Contributing

{Link to contributing guide, PR template, review checklist}

## License
{License information}
```

## Validation

The `--validate` flag checks that README and project_context are consistent 
with actual codebase state:

| Check | Description |
|-------|-------------|
| Technology versions | Actual versions match documented versions |
| Project structure | Directory tree matches documented structure |
| Dependencies | Listed deps are present in build files |
| Features | Documented features exist in codebase |
| Endpoints | Documented endpoints exist in controllers |
| Environment variables | Documented env vars used in config |
| Architecture patterns | Actual code follows documented patterns |

## Usage

```bash
# Initialize project context files
opencode run project-context -- --init

# Sync with actual codebase state
opencode run project-context -- --sync

# Validate documentation accuracy
opencode run project-context -- --validate

# Custom output directory
opencode run project-context -- --sync --output-dir=./docs

# Generate from existing codebase analysis
opencode run project-context -- --sync --deep-scan
```

## Integration

- **Consumes**: 
  - Source code structure and annotations
  - Build files (pom.xml, build.gradle, package.json, go.mod)
  - Docker/K8s configs
  - Git history for feature tracking
- **Produces**: `project_context.md` + `README.md`
- **Feeds**: AI assistants, new developers, onboarding
- **References**: 
  - `coding-guidelines/references/coding-standards.md`
  - `documentation` skill output (API docs, architecture)
- **Triggers**: On significant codebase changes, release tag