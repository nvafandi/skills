---
name: resource-investigation
description: >
  Investigates and analyzes resources like APIs, GraphQL schemas, functions, 
  external services, and code usage patterns. Provides detailed analysis of
  how resources are used, external dependencies, and integration points.
argument-hint: "<resource-type> <target> [--deep] [--format=markdown|json|graph]"
license: MIT
metadata:
  author: Nurvan Afandi
  version: 1.0.0
---

# Resource Investigation

Deep investigation of specific resources (APIs, GraphQL schemas, functions, 
external services) to understand their usage, integration patterns, and 
dependencies. Essential for onboarding, debugging, and architectural decisions.

## Purpose

Answer critical questions about resources in the codebase:
- "How is this API used?"
- "What external services does this function call?"
- "What does this GraphQL schema support?"
- "Who consumes this endpoint?"
- "What's the blast radius if I change this?"

## Investigation Targets

### 1. API Investigation
- REST endpoints (OpenAPI spec, controllers)
- GraphQL schemas (types, queries, mutations, subscriptions)
- gRPC services (proto definitions)
- AsyncAPI (event-driven APIs)

### 2. External Resource Investigation
- HTTP calls to external services (Retrofit, RestTemplate, WebClient)
- Database queries (JPA, jOOQ, MyBatis)
- Message queue producers/consumers (Kafka, RabbitMQ)
- Third-party SDK usage (Stripe, AWS, SendGrid)

### 3. Function/Method Investigation
- Call graphs (who calls this, what does it call)
- Parameter analysis (types, nullability, constraints)
- Return type analysis (success/error cases)
- Side effects (DB writes, external calls, events)

### 4. Code Usage Investigation
- Where is this class/interface used?
- What implements this interface?
- What extends this class?
- What annotates with this annotation?

## Analysis Output

```markdown
# Resource Investigation: {Resource Name}

## Overview
- **Type**: API | GraphQL | Function | External Service | Class
- **Location**: `path/to/file:line`
- **Visibility**: Public | Internal | Private
- **Since**: {Version/Date}

## API Analysis (if applicable)

### Endpoints
| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| POST | /api/v1/users/register | Register new user | None | 10/min |
| GET | /api/v1/users/{id} | Get user by ID | JWT | 100/min |

### Request/Response Schemas
```json
// POST /api/v1/users/register - Request
{
  "email": "string (email, required)",
  "fullName": "string (1-100, required)",
  "password": "string (8-72, required)"
}

// Response: 201 Created
{
  "id": "string",
  "email": "string",
  "fullName": "string",
  "tier": "FREE | PREMIUM | ENTERPRISE",
  "createdAt": "ISO-8601 datetime"
}
```

### Error Responses
| Status | Code | Condition | Example |
|--------|------|-----------|---------|
| 400 | VALIDATION_ERROR | Invalid input | Missing email |
| 409 | EMAIL_EXISTS | Duplicate email | Already registered |
| 429 | RATE_LIMIT | Too many requests | 10/min exceeded |

## GraphQL Schema Analysis (if applicable)

### Types
```graphql
type User {
  id: ID!
  email: String!
  fullName: String!
  tier: UserTier!
  createdAt: DateTime!
}

enum UserTier { FREE PREMIUM ENTERPRISE }
```

### Queries
| Query | Returns | Arguments | Complexity |
|-------|---------|-----------|------------|
| `user(id: ID!)` | User | id (required) | 1 |
| `users(filter: UsersFilter)` | [User!]! | filter (optional) | 10-100 |

### Mutations
| Mutation | Returns | Arguments | Validation |
|----------|---------|-----------|------------|
| `registerUser` | RegisterUserPayload | input: RegisterUserInput! | Email uniqueness |
| `updateProfile` | UpdateProfilePayload | input: UpdateProfileInput! | Ownership |

## External Dependencies

### HTTP Calls
| Target | Method | URL | Auth | Timeout | Retry |
|--------|--------|-----|------|---------|-------|
| Stripe | POST | https://api.stripe.com/v1/charges | API Key | 30s | 3x |
| SendGrid | POST | https://api.sendgrid.com/v3/mail/send | API Key | 10s | 2x |

### Database Queries
| Query | Table(s) | Type | Indexes | N+1 Risk |
|-------|----------|------|---------|----------|
| `findByEmail` | users | SELECT | idx_users_email | No |
| `findByTier` | users | SELECT | idx_users_tier | Yes (needs join) |

### Message Queue
| Topic | Type | Producer | Consumer | Guarantees |
|-------|------|----------|----------|------------|
| `user.events` | Publish | UserService | EmailService | At-least-once |

## Call Graph

### Incoming Calls (Who calls this?)
```
UserController.register() → UserService.register() → UserRepository.save()
AdminController.updateUser() → UserService.update() → UserRepository.save()
BatchJob.processInactiveUsers() → UserService.deactivate() → ...
```

### Outgoing Calls (What does this call?)
```
UserService.register()
  → UserRepository.existsByEmail()
  → PasswordEncoder.encode()
  → UserRepository.save()
  → EventPublisher.publish(UserRegisteredEvent)
```

## Usage Analysis

### Call Sites
| File | Line | Usage | Context |
|------|------|-------|---------|
| `UserController.java` | 45 | `userService.register(cmd)` | REST endpoint |
| `AdminController.java` | 120 | `userService.register(cmd)` | Admin panel |
| `InviteService.java` | 67 | `userService.register(cmd)` | Invite flow |

### Configuration
| Property | Value | Environment | Required |
|----------|-------|-------------|----------|
| `stripe.api.key` | `${STRIPE_KEY}` | All | Yes |
| `user.cache.ttl` | `300` | Config | No (default 300) |

## Impact Analysis (if changed)

### Direct Impact
- `UserController.register()` - must handle new validation
- `AdminController` - must handle new error types
- `InviteService` - must pass new required fields

### Indirect Impact
- `EmailService` - receives `UserRegisteredEvent` (schema change)
- `AnalyticsService` - tracks registration (new fields)
- `BillingService` - tier calculation (if tier logic changes)

### Breaking Change Assessment
| Change | Breaking? | Affected Callers | Mitigation |
|--------|-----------|------------------|------------|
| Add required field | Yes | All 3 callers | Add default value |
| Rename field | Yes | All 3 callers | Deprecate old, add new |
| Change return type | Yes | All callers | Send as new endpoint |
| Add optional field | No | None | Safe |

## Recommendations

1. **Refactor Call Graph**: 3 direct callers → introduce `UserRegistrationPort` interface
2. **Add Timeout**: `stripe.api.timeout` not configured (uses SDK default 80s)
3. **N+1 Risk**: `findByTier` needs `@EntityGraph` for `orders` relation
4. **Event Schema**: Version `UserRegisteredEvent` with `@Version` annotation

## Traceability

| Requirement | RFC Section | Implementation | Test Coverage |
|-------------|-------------|----------------|---------------|
| User registration | §3.1 | `UserService.register()` | 95% |
| Email uniqueness | §3.1 | `UserRepository.existsByEmail()` | 100% |
