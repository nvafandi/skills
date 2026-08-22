# Spring Boot to Quarkus Configuration Map

## Server

| Spring Boot | Quarkus |
|---|---|
| `server.port=8080` | `quarkus.http.port=8080` |
| `server.servlet.context-path=/api` | `quarkus.http.root-path=/api` |
| `server.ssl.key-store` | `quarkus.http.ssl.certificate.key-store-file` |
| `server.compression.enabled=true` | `quarkus.http.enable-compression=true` |
| `server.error.include-message=always` | Configure via exception mappers |

**PaaS `$PORT`:** platforms that inject a `$PORT` env var (Heroku, Railway, Cloud Run, Fly) require the app to bind it — use `quarkus.http.port=${PORT:8080}`, the same expression style as Spring's `server.port=${PORT:8080}`.

## Datasource

Use the `%prod.` prefix on datasource properties so that Quarkus Dev Services can automatically provision a database in dev and test modes. Without the prefix, hardcoded connection values override Dev Services in all profiles.

This applies when there are no separate `application-{profile}.properties` files. If profile-specific files exist, place the production datasource config in `application-prod.properties` instead.

| Spring Boot | Quarkus |
|---|---|
| `spring.datasource.url` | `%prod.quarkus.datasource.jdbc.url` |
| `spring.datasource.username` | `%prod.quarkus.datasource.username` |
| `spring.datasource.password` | `%prod.quarkus.datasource.password` |
| `spring.datasource.driver-class-name` | `quarkus.datasource.db-kind` (auto-detected, no `%prod.` needed) |

**`db-kind` is a build-time property — a runtime profile cannot switch the JDBC driver.** Quarkus picks the driver and dialect from `quarkus.datasource.db-kind` during the build (augmentation), not at runtime. If the Spring app switches databases by profile (e.g. H2 in dev, PostgreSQL in prod) and both `quarkus-jdbc-h2` and `quarkus-jdbc-postgresql` are on the classpath, a runtime-only `quarkus.profile=prod` swaps the JDBC **URL** but keeps the build-time driver — boot then fails with `Driver does not support the provided URL`. Build the artifact with the target profile active (`quarkusBuild -Dquarkus.profile=prod`, or pass it as a container build arg), or make the prod `db-kind` the unprofiled default and override to H2 under `%dev`/`%test`.

## JPA / Hibernate

| Spring Boot | Quarkus |
|---|---|
| `spring.jpa.hibernate.ddl-auto=update` | `quarkus.hibernate-orm.schema-management.strategy=update` |
| `spring.jpa.show-sql=true` | `quarkus.hibernate-orm.log.sql=true` |
| `spring.jpa.properties.hibernate.dialect` | `quarkus.hibernate-orm.dialect` (usually auto-detected) |
| `spring.jpa.properties.hibernate.format_sql` | `quarkus.hibernate-orm.log.format-sql=true` |
| `spring.jpa.open-in-view=false` | Not applicable (no OSIV in Quarkus) |
| `spring.jpa.defer-datasource-initialization` | Use Flyway or `import.sql` |
| `spring.jpa.hibernate.naming.physical-strategy` | `quarkus.hibernate-orm.physical-naming-strategy` |
| `spring.jpa.hibernate.naming.implicit-strategy` | `quarkus.hibernate-orm.implicit-naming-strategy` |
| `spring.jpa.properties.hibernate.jdbc.batch_size` | `quarkus.hibernate-orm.jdbc.statement-batch-size` |
| `spring.jpa.properties.hibernate.jdbc.fetch_size` | `quarkus.hibernate-orm.jdbc.statement-fetch-size` |
| `spring.jpa.properties.hibernate.cache.use_second_level_cache` | `quarkus.hibernate-orm.second-level-caching-enabled` |
| `spring.jpa.properties.hibernate.cache.region.factory_class` | Not needed — Caffeine/JCache auto-integrated |
| `spring.jpa.properties.hibernate.jdbc.time_zone` | `quarkus.hibernate-orm.jdbc.timezone` |
| `spring.jpa.properties.hibernate.default_schema` | `quarkus.hibernate-orm.database.default-schema` |
| `spring.jpa.properties.hibernate.default_catalog` | `quarkus.hibernate-orm.database.default-catalog` |
| `spring.jpa.properties.hibernate.order_inserts` | `quarkus.hibernate-orm.unsupported-properties."hibernate.order_inserts"` |
| `spring.jpa.properties.hibernate.order_updates` | `quarkus.hibernate-orm.unsupported-properties."hibernate.order_updates"` |
| `spring.jpa.properties.hibernate.jdbc.batch_versioned_data` | `quarkus.hibernate-orm.unsupported-properties."hibernate.jdbc.batch_versioned_data"` |
| `spring.jpa.properties.hibernate.query.in_clause_parameter_padding` | `quarkus.hibernate-orm.query.in-clause-parameter-padding` |
| `spring.jpa.properties.hibernate.query.plan_cache_max_size` | `quarkus.hibernate-orm.query.query-plan-cache-max-size` |
| `spring.jpa.properties.hibernate.default_batch_fetch_size` | `quarkus.hibernate-orm.fetch.batch-size` |
| `spring.jpa.properties.hibernate.max_fetch_depth` | `quarkus.hibernate-orm.fetch.max-depth` |
| `spring.jpa.properties.hibernate.cache.use_query_cache` | `quarkus.hibernate-orm.second-level-caching-enabled` (query caching via `@QueryHint`) |
| `spring.jpa.properties.hibernate.globally_quoted_identifiers` | `quarkus.hibernate-orm.quote-identifiers.strategy=all` |
| `spring.jpa.properties.hibernate.validator.apply_to_ddl` | `quarkus.hibernate-orm.validation.mode=ddl` |
| `spring.jpa.properties.hibernate.temp.use_jdbc_metadata_defaults` | Not needed — Quarkus auto-configures |
| `spring.jpa.properties.hibernate.jdbc.lob.non_contextual_creation` | Not needed — Quarkus auto-configures |

**Naming strategy warning:** Spring Boot defaults to `SpringPhysicalNamingStrategy` which converts camelCase to snake_case (`firstName` → `first_name`). Quarkus uses Hibernate 6's JPA-compliant default which **preserves Java names as-is** (`firstName` → `firstName`). If your database uses snake_case column names (common with Spring Boot apps), you must either:
- Set a physical naming strategy: `quarkus.hibernate-orm.physical-naming-strategy=org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy`
- Or update `@Column(name="...")` annotations on each entity field
- **Also update `import.sql` / `data.sql` files** — column names must match the naming strategy

### Hibernate ORM Rules (from quarkus.io/guides/hibernate-orm)

**1. No `persistence.xml` needed.** Quarkus configures Hibernate ORM via `application.properties` — do NOT create a `META-INF/persistence.xml`. If one exists in the classpath, set `quarkus.hibernate-orm.persistence-xml.ignore=true`. **Never mix** `persistence.xml` with `quarkus.hibernate-orm.*` properties — Quarkus raises an exception.

**2. Schema management — never `drop-and-create` or `update` in production.** Always set:
```properties
%prod.quarkus.hibernate-orm.schema-management.strategy = none
%prod.quarkus.hibernate-orm.sql-load-script = no-file
```
In dev/test, `drop-and-create` + `import.sql` is the default with Dev Services.

**3. `import.sql` requires semicolons.** Each SQL statement must be terminated with `;`. Quarkus reconfigures Hibernate to require this (unlike vanilla Hibernate which uses newline). Multi-line statements are supported.

**4. `sql-load-script` defaults differ by mode:**
- Dev/test: `import.sql` (in `src/main/resources`)
- Production: `no-file` (won't execute any SQL import)
- Override with `%dev.quarkus.hibernate-orm.sql-load-script = import-dev.sql` etc.

**5. Dialect is auto-selected** for supported databases based on `quarkus.datasource.db-kind`. Set `quarkus.datasource.db-version` to target a specific database version for better SQL generation. For unsupported databases, set `quarkus.hibernate-orm.dialect` explicitly (e.g., `Cockroach` for `CockroachDialect`). For built-in dialects use the name **without** the `Dialect` suffix; for third-party dialects use the fully-qualified class name.

**6. Second-level cache is enabled by default** in Quarkus (Caffeine/JCache auto-integrated). Mark entities with `@Cacheable`, collections with `@Cache(usage = CacheConcurrencyStrategy.READ_ONLY)`, and queries with `org.hibernate.cacheable` hint. Tune regions via `quarkus.hibernate-orm.cache."<region>".memory.object-count` and `quarkus.hibernate-orm.cache."<region>".expiration.max-idle`. Defaults: 10000 entries, 100s max-idle.

**7. Offline startup for containers.** If the database isn't reachable at startup (e.g., Kubernetes), set `quarkus.hibernate-orm.database.start-offline=true`. This skips the DB connection check and version validation. Ensure the schema is created before the app starts (use Flyway/Liquibase).

**8. Entities in external JARs** need an empty `META-INF/beans.xml` for Jandex indexing and build-time enhancement.

**9. Metrics.** Enable `quarkus.hibernate-orm.metrics.enabled=true` to expose Hibernate metrics on `/q/metrics` (requires a metrics extension like `quarkus-micrometer`).

**10. Envers.** Add `quarkus-hibernate-envers` extension for entity auditing. No additional configuration properties exposed.

**11. Validation modes.** `quarkus.hibernate-orm.validation.mode` controls Bean Validation integration:
- `auto` (default) — `callback` + `ddl` if `quarkus-hibernate-validator` present, else `none`
- `callback` — lifecycle event validation
- `ddl` — constraints applied to DDL generation
- `none` — disabled

**12. Multiple persistence units.** Use map-based config:
```properties
quarkus.datasource."users".db-kind=h2
quarkus.datasource."users".jdbc.url=jdbc:h2:mem:users;DB_CLOSE_DELAY=-1
quarkus.hibernate-orm."users".datasource=users
quarkus.hibernate-orm."users".packages=org.acme.model.user
```
Inject with `@Inject @PersistenceUnit("users") EntityManager em;` (use `io.quarkus.hibernate.orm.PersistenceUnit`, not the Jakarta one). Attach entities via `packages` property or package-level `@PersistenceUnit` annotation — never mix both approaches.

**13. `@Transactional` on CDI beans.** Mark CDI bean methods with `jakarta.transaction.Transactional` — the `EntityManager` will enlist and flush at commit. Recommended at application entry point boundaries (REST endpoints).

**14. No OSIV.** Quarkus has no Open Session in View. Lazy loading outside transactions will fail with `LazyInitializationException`. Fetch eagerly or use `@Transactional` on the reading method.

**15. `quarkus.hibernate-orm.request-scoped.enabled`** (default `true`) allows read-only EntityManager access without a transaction in request scope. Disabling is recommended to avoid inconsistent results.

## Flyway

| Spring Boot | Quarkus |
|---|---|
| `spring.flyway.enabled=true` | `quarkus.flyway.migrate-at-start=true` |
| `spring.flyway.locations=classpath:db/migration` | `quarkus.flyway.locations=db/migration` |
| `spring.flyway.baseline-on-migrate=true` | `quarkus.flyway.baseline-on-migrate=true` |
| `spring.flyway.baseline-version` | `quarkus.flyway.baseline-version` |
| `spring.flyway.baseline-description` | `quarkus.flyway.baseline-description` |
| `spring.flyway.schemas` | `quarkus.flyway.schemas` |
| `spring.flyway.table` | `quarkus.flyway.table` |
| `spring.flyway.url` | `quarkus.flyway.jdbc.url` |
| `spring.flyway.user` | `quarkus.flyway.jdbc.username` |
| `spring.flyway.password` | `quarkus.flyway.jdbc.password` |
| `spring.flyway.driver-class-name` | `quarkus.flyway.jdbc.driver` |
| `spring.flyway.validate-on-migrate` | `quarkus.flyway.validate-on-migrate` |
| `spring.flyway.out-of-order` | `quarkus.flyway.out-of-order` |
| `spring.flyway.clean-on-validation-error` | `quarkus.flyway.clean-on-validation-error` |
| `spring.flyway.clean-disabled` | `quarkus.flyway.clean-disabled` |
| `spring.flyway.ignore-missing-migrations` | `quarkus.flyway.ignore-missing-migrations` |
| `spring.flyway.ignore-ignored-migrations` | `quarkus.flyway.ignore-ignored-migrations` |
| `spring.flyway.ignore-pending-migrations` | `quarkus.flyway.ignore-pending-migrations` |
| `spring.flyway.ignore-future-migrations` | `quarkus.flyway.ignore-future-migrations` |
| `spring.flyway.ignore-migration-patterns` | `quarkus.flyway.ignore-migration-patterns` |
| `spring.flyway.target` | `quarkus.flyway.target` |
| `spring.flyway.mixed` | `quarkus.flyway.mixed` |
| `spring.flyway.encoding` | `quarkus.flyway.encoding` |
| `spring.flyway.group` | `quarkus.flyway.group` |
| `spring.flyway.placeholder-replacement` | `quarkus.flyway.placeholder-replacement` |
| `spring.flyway.placeholder-prefix` | `quarkus.flyway.placeholder-prefix` |
| `spring.flyway.placeholder-suffix` | `quarkus.flyway.placeholder-suffix` |
| `spring.flyway.placeholders` | `quarkus.flyway.placeholders` |
| `spring.flyway.create-schemas` | `quarkus.flyway.create-schemas` |

**Quarkus Flyway note:** `quarkus.flyway.migrate-at-start` controls whether migrations run on startup. Flyway Dev UI provides a "Create Initial Migration" button to generate `V1.0.0__{appname}.sql` from the Hibernate-generated schema, and a "Generate Migration File" button for incremental migrations from entity changes.

## Logging

| Spring Boot | Quarkus |
|---|---|
| `logging.level.root=INFO` | `quarkus.log.level=INFO` |
| `logging.level.com.example=DEBUG` | `quarkus.log.category."com.example".level=DEBUG` |
| `logging.file.name=app.log` | `quarkus.log.file.enable=true` + `quarkus.log.file.path=app.log` |
| `logging.pattern.console` | `quarkus.log.console.format` |

## Profiles

| Spring Boot | Quarkus |
|---|---|
| `application-{profile}.properties` | `application-{profile}.properties` (same convention) |
| `spring.profiles.active=dev` | `quarkus.profile=dev` or `-Dquarkus.profile=dev` |
| `SPRING_PROFILES_ACTIVE=prod` (env var) | `QUARKUS_PROFILE=prod` (env var) |
| `@Profile("dev")` | `@IfBuildProfile("dev")` |
| `application-test.properties` | `%test.` prefix in `application.properties`, or `application-test.properties` |

Environment overrides use relaxed binding: SmallRye Config maps `FOO_BAR_BAZ` onto `foo.bar-baz`, so most `UPPER_SNAKE` env vars from a Spring deployment keep working (e.g. `APP_MAX_SESSIONS` → `app.max-sessions`).

## CORS

| Spring Boot | Quarkus |
|---|---|
| `@CrossOrigin` or `WebMvcConfigurer` | `quarkus.http.cors=true` |
| -- | `quarkus.http.cors.origins=http://localhost:3000` |
| -- | `quarkus.http.cors.methods=GET,POST,PUT,DELETE` |

## Cache

| Spring Boot | Quarkus |
|---|---|
| `spring.cache.type=caffeine` | Extension `quarkus-cache` (Caffeine-based by default) |
| `@Cacheable("name")` | `@io.quarkus.cache.CacheResult(cacheName = "name")` |
| `@CacheEvict("name")` | `@io.quarkus.cache.CacheInvalidate(cacheName = "name")` |

## Security

| Spring Boot | Quarkus |
|---|---|
| `spring.security.user.name` | `quarkus.security.users.embedded.users.<name>.password` |
| `spring.security.oauth2.client.*` | `quarkus.oidc.*` |
| `spring.security.oauth2.resourceserver.jwt.issuer-uri` | `quarkus.oidc.auth-server-url` |

## Actuator / Health

| Spring Boot | Quarkus |
|---|---|
| `management.endpoints.web.exposure.include=*` | Endpoints auto-exposed at `/q/` |
| `management.endpoint.health.show-details=always` | `quarkus.smallrye-health.ui.always-include=true` |
| `/actuator/health` | `/q/health` |
| `/actuator/metrics` | `/q/metrics` |
| `/actuator/info` | `/q/info` (with `quarkus-info`) |

## Static Resources

| Spring Boot | Quarkus |
|---|---|
| `src/main/resources/static/` | `src/main/resources/META-INF/resources/` |
| `src/main/resources/public/` | `src/main/resources/META-INF/resources/` |
| `spring.web.resources.static-locations` | Quarkus always uses `META-INF/resources/` |

## Templating (Thymeleaf → Qute)

| Spring Boot (Thymeleaf) | Quarkus (Qute) |
|---|---|
| `spring.thymeleaf.prefix=classpath:/templates/` | Templates in `src/main/resources/templates/` (same) |
| `spring.thymeleaf.cache=false` | Automatic in dev mode |
| Missing variable → empty string (silent) | Missing variable → **exception** (strict by default) |

**Qute strict rendering** — this is a significant behavior difference:

| Property | Default | Effect |
|---|---|---|
| `quarkus.qute.strict-rendering` | `true` | Missing variables throw `TemplateException` at runtime |
| `quarkus.qute.property-not-found-strategy` | — | Only applies when `strict-rendering=false`: `noop` (empty, like Thymeleaf), `throw-exception`, `output-original` |

**Migration approach:** Start with `strict-rendering=false` and `property-not-found-strategy=output-original` to find all missing variables, then fix them and enable strict mode.

**`@CheckedTemplate`** validates expressions at **build time** — no Thymeleaf equivalent. Use `@CheckedTemplate(requireTypeSafeExpressions = false)` to relax during migration.

## Spring Cloud Config Server

| Spring Boot | Quarkus (`quarkus-spring-cloud-config-client`) |
|---|---|
| `spring.cloud.config.uri` | `quarkus.spring-cloud-config.url` (default: `http://localhost:8888`) |
| `spring.cloud.config.name` | `quarkus.spring-cloud-config.name` |
| `spring.cloud.config.label` | `quarkus.spring-cloud-config.label` |
| `spring.cloud.config.username` | `quarkus.spring-cloud-config.username` |
| `spring.cloud.config.password` | `quarkus.spring-cloud-config.password` |
| `spring.cloud.config.fail-fast` | `quarkus.spring-cloud-config.fail-fast` (default: false) |
| `spring.profiles.active` | `quarkus.spring-cloud-config.profiles` |

## Spring Extension Toggle Properties

Each Spring compat extension can be disabled at build time:

| Property | Default | Effect |
|---|---|---|
| `quarkus.spring-di.enabled` | `true` | Disable Spring DI annotation processing |
| `quarkus.spring-cache.enabled` | `true` | Disable Spring Cache annotation processing |