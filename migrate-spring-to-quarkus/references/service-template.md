# Service Generation Template

This reference provides a template and workflow for generating new services that comply with both Quarkus migration standards and PruForce engineering standards.

## Service Generation Request Template

Before asking Copilot to generate a new service, fill in this template:

```
Generate a complete [DomainName] service following the guidelines in copilot-instructions.md:

- Package: com.prudential.pruforce.aob.{function}
- Framework: Quarkus
- Database: PostgreSQL
- Operations: [e.g., CRUD + custom search]
- Business rules: [describe your specific business rules here]
```

## Step-by-Step Prompt Structure

1. **Specify the framework** — Quarkus (not Spring Boot)
2. **Specify the package** — `com.prudential.pruforce.aob.{function}`
3. **Specify the database** — PostgreSQL/MySQL
4. **Specify operations** — CRUD, custom queries, batch operations
5. **Describe business rules** — validation logic, state transitions, calculations

## Questions to Ask Before Generating

Before generating any service, clarify these questions:

1. **Domain name:** What entity/domain is this service for?
2. **Operations:** What CRUD operations are needed? (Create, Read, Update, Delete, custom)
3. **Framework:** Quarkus (with JAX-RS, CDI, Panache)
4. **Database:** PostgreSQL / MySQL / H2
5. **Auth:** JWT / OAuth / None
6. **Additional features:** Caching? Events? Scheduling?

## Example: Payment Service Generation

```
Generate a complete Payment service following the guidelines in copilot-instructions.md with:
- Package: com.prudential.pruforce.aob.payment
- Framework: Quarkus
- Database: PostgreSQL
- Operations: CRUD + custom search by status and date range
- Business rules:
  - Amount must be greater than 0
  - Use BigDecimal for all monetary fields
  - Status transitions: PENDING → COMPLETED, PENDING → FAILED, FAILED → CANCELLED
  - All responses wrapped in ApiResponse<T>
  - Constructor injection only, no field injection
```

## What You'll Get From Copilot

- `{Domain}Resource.java` — REST controller with JAX-RS annotations
- `{Domain}Service.java` — Service class with `@ApplicationScoped`
- `{Domain}Repository.java` — Panache repository
- `{Domain}.java` — JPA Entity with audit fields
- `Create{Domain}Request.java` — Request DTO with Bean Validation
- `{Domain}Response.java` — Response DTO
- `{Domain}Mapper.java` — DTO ↔ Entity mapper
- `{Domain}NotFoundException.java` — Custom exception
- `GlobalExceptionHandler.java` — Global exception handler
- `ApiResponse.java` — Response wrapper
- Unit tests with Mockito
- Integration tests with `@QuarkusTest`
- OpenAPI documentation annotations

## Tips for Best Results

1. **Be specific** — Include exact package name, framework, and database
2. **List all operations** — Don't assume Copilot knows what you need
3. **Describe business rules** — Include validation logic, state transitions, calculations
4. **Reference the standards** — Always mention `copilot-instructions.md` and `service-generation-standards.md`
5. **Request Quarkus specifically** — Don't let Copilot default to Spring Boot
6. **Verify after generation** — Use the validation checklist below

## Validation Checklist After Generation

- [ ] Package structure follows `com.prudential.pruforce.aob.{function}.{layer}`
- [ ] All layers created (api, service, repository, entity, mapper, exception)
- [ ] REST Controller follows `{Domain}Resource` pattern with JAX-RS
- [ ] All endpoints return `ApiResponse<T>` wrapper
- [ ] Service uses `@ApplicationScoped` (not `@Service`)
- [ ] Service uses constructor injection only (no field injection)
- [ ] Repository implements `PanacheRepository<T>`
- [ ] Entity includes audit fields (createdAt, updatedAt, version)
- [ ] DTOs have Bean Validation annotations (`@NotNull`, `@NotBlank`, `@Valid`)
- [ ] Custom exceptions extend `DomainException`
- [ ] Global exception handler registered
- [ ] Mapper converts DTO ↔ Entity correctly
- [ ] Service layer has logging with `@Slf4j`
- [ ] Configuration externalized (no hardcoded values)
- [ ] Unit tests written with Mockito
- [ ] Integration tests included with `@QuarkusTest`
- [ ] OpenAPI documentation on endpoints
- [ ] README.md with service overview and API endpoints
- [ ] `application-{profile}.yml` for different environments
- [ ] `pom.xml` with Quarkus dependencies

## Common Workflows

### Workflow 1: Generate a Complete New Service
```
1. Read: service-generation-standards.md (sections 1-4)
2. Use: service-template.md (copy template)
3. Ask: Copilot (paste filled template)
4. Verify: service-template.md (validation checklist)
5. Reference: quick-reference.md (dependencies, config)
```

### Workflow 2: Add a New Endpoint to Existing Service
```
1. Read: service-generation-standards.md (sections 3, 5, 8)
2. Copy: Code snippet from quick-reference.md
3. Ask: Copilot to add endpoint following patterns
4. Verify: New endpoint matches existing patterns
```

### Workflow 3: Implement Custom Repository Query
```
1. Read: service-generation-standards.md (section 9)
2. Copy: Repository pattern from quick-reference.md
3. Ask: Copilot to add custom query
4. Test: Add corresponding unit test
```

### Workflow 4: Troubleshoot an Issue
```
1. Reference: quick-reference.md (common issues section)
2. Compare: Your code against service-generation-standards.md patterns
3. Ask: Copilot to fix specific issue
4. Verify: Issue is resolved