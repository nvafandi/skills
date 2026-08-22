# Module: Validation

Validate that all migrated services comply with the engineering standards from `ptpla-cbv-pf-engineering-prompts`.

**Executes after:** `cleanup` module (always runs last)

## Reference Files

- [references/engineering-standards.md](../references/engineering-standards.md) — contains the quality gates checklist and standards from `ptpla-cbv-pf-engineering-prompts`
- [references/service-generation-standards.md](../references/service-generation-standards.md) — contains detailed architectural patterns from `ptpla-cbv-pf-engineering-prompts/prompts/code-guideline/copilot-instructions.md`

## Instructions

Load [references/engineering-standards.md](../references/engineering-standards.md) and [references/service-generation-standards.md](../references/service-generation-standards.md) and validate the migrated code against each item in the Quality Gates Checklist and the detailed architectural patterns.

Execute the following checks in order. If any check fails, stop and fix before continuing.

| # | Check | Validation Method | Pass Criteria |
| --- | ------- | ------------------- | --------------- |
| 1 | **Architecture** | Verify each migrated service has all 5 layers: API (Resource/Controller), Service, Repository, Entity, Config | All layers present |
| 2 | **Naming** | Check package structure follows `com.prudential.pruforce.aob.{function}.{layer}` | Correct package naming |
| 3 | **Injection** | Search for `@Autowired` on fields (not constructors). Search for `@Inject` on fields (should only be on constructors or with `@Inject` on final fields via constructor) | No `@Autowired` field injection; no `@Inject` on non-final fields without constructor injection |
| 4 | **DTOs** | Verify Request/Response DTOs exist and have `@Valid` on request DTOs in resource parameters | Separate Request/Response DTOs with `@Valid` |
| 5 | **Responses** | Search for return types in resources. Verify all are wrapped in `ApiResponse<T>` or use `RestResponse<T>` | All endpoints return wrapped responses |
| 6 | **Exceptions** | Check that custom exceptions extend `DomainException` (or equivalent base) | Custom exceptions extend base exception |
| 7 | **Logging** | Verify `@Slf4j` or `LoggerFactory` usage in service classes | Services have logging |
| 8 | **Tests** | Check for unit tests with mocks and integration tests with `@QuarkusTest` or `@TestHTTPResource` | Both test types present |
| 9 | **Documentation** | Check for OpenAPI annotations (`@Operation`, `@APIResponse`, etc.) and Javadoc | Documentation present |
| 10 | **Configuration** | Search for hardcoded values (magic strings, numbers) in Java code. All should use `@ConfigProperty` | No hardcoded values |
| 11 | **Transactions** | Verify `@Transactional` (jakarta.transaction) on write operations in service/repository | Write operations have transactions |
| 12 | **Validation** | Verify `@NotNull`, `@NotBlank`, `@Size`, `@Valid` annotations on request DTOs | Bean Validation present |

## Report Format

After validation, present results in this format:

```
## Validation Report: [app-name]

### Summary
- Standards: PruForce Engineering Standards (ptpla-cbv-pf-engineering-prompts)
- Checks passed: [X/12]
- Checks failed: [Y/12]

### Failed Checks
| # | Check | File | Issue | Required Fix |
|---|-------|------|-------|---------------|
| 1 | [check name] | [file path] | [description] | [fix recommendation] |

### Compliance Status
- **Fully Compliant:** YES/NO
- **Blocks Migration:** YES/NO
```

## Compliance Rules

- **All 13 checks must PASS** for the migration to be considered complete.
- If any check fails, provide specific file paths and line numbers where the issue occurs.
- Common non-compliant patterns:
  - `@Autowired` on fields → move to constructor injection
  - Raw entity returns → wrap in `ApiResponse<T>`
  - `double` for money → change to `BigDecimal`
  - Missing `@Valid` → add to request DTO parameters
  - Missing `@Transactional` → add to write operations
  - Hardcoded strings/numbers → extract to `@ConfigProperty`

## What to do

1. Load the engineering standards and service generation standards references
2. Perform each validation check against the detailed architectural patterns
3. Document any violations with file paths and line numbers
4. Provide fix recommendations for each violation
5. Stop migration if critical compliance issues are found
6. Proceed to Step 4 (Verify the Migration) when all checks pass