# Engineering Standards Reference

## Architecture

- **Layer separation**: API → Service → Repository → Entity
- **Dependency direction**: API depends on Service, Service on Repository, Repository on Entity
- **No circular dependencies** between layers
- **Single responsibility**: Each class has one reason to change

## Naming Conventions

- Packages: `com.company.project.{function}.{layer}`
- Classes: PascalCase, suffix by role (`Resource`, `Service`, `Repository`, `Entity`, `Mapper`, `DTO`, `Exception`)
- Methods: camelCase, verb prefix (`get`, `create`, `update`, `delete`, `find`, `calculate`)
- Constants: UPPER_SNAKE_CASE in `constants/` package

## Quality Gates

1. **No Spring leftovers**: No `org.springframework` imports, annotations, XML, properties
2. **Typed API contracts**: Request/Response = typed DTOs (records), never `Map`/`Object`/`JsonNode`
3. **Constructor injection**: Prefer constructor or package-private field injection
4. **BigDecimal for money**: Never `double`/`float` for monetary values
5. **Constants extraction**: Magic values → `constants/{Domain}Constants`, `{Domain}QueryConstants`
6. **JBoss Logging**: `Logger.getLogger(Class.class)` field, no `System.out`/`printStackTrace`
7. **Bean Validation**: All request DTOs validated
8. **@Transactional**: All write operations
9. **OpenAPI docs**: All endpoints annotated
10. **Exception hierarchy**: Custom exceptions extend `DomainException`
11. **Panache patterns**: Active Record or Repository pattern consistently
12. **SOLID compliance**: SRP, OCP, LSP, ISP, DIP verified
13. **Lombok rules**: Per `lombok-rules.md`
14. **Test migration**: `@QuarkusTest`, `@InjectMock`, RestAssured, Testcontainers
15. **No hardcoded env values**: Use `@ConfigProperty`
16. **Micrometer metrics**: Timers/counters/gauges per operation

## Infrastructure Keepalive Patterns

- **Instabox idle suspend** triggered by lack of external inbound activity (not local cron)
- **Use lightweight endpoints**: `/api/health` (11 bytes) not `/v1/models` (200KB+)
- **Cron-job.org limits**: Response too large errors at ~100K bytes; use `saveResponses: false`
- **External ping patterns**: Hit public domain with Cloudflare Access headers from outside the machine
- **Local cron reliability**: `*/25 * * * *` works for internal monitoring; use systemd user timers for guaranteed execution

## External Endpoint Access

- **Cloudflare Access**: Include `CF-Access-Client-Id`, `CF-Access-Client-Secret` headers
- **Bearer token**: Use in `Authorization` header for API endpoints
- **Health check endpoints**: Prefer `/api/health` or status endpoints over data endpoints