---
name: grails-to-quarkus
description: >
  Use this skill when migrating a Grails application to Quarkus. This skill covers the complete migration workflow from Grails 3+ (which is built on Spring Boot) to Quarkus, including OpenRewrite automation for Spring Boot layer and manual migration for Grails-specific code (GORM, controllers, interceptors, services). Use when the user wants to convert, migrate, or port a Grails project to Quarkus.
license: PT. Prudential Life Indonesia
metadata:
  author: Irsyad Jamal Pratama Putra - https://github.com/Irsyad-Putra1-Consultant_pru
---

# Grails to Quarkus Migration

Migrate a Grails application to Quarkus. Grails 3+ is built on top of Spring Boot, so this skill combines:
1. **OpenRewrite automation** for the Spring Boot layer
2. **Manual migration** for Grails-specific code (GORM, controllers, interceptors, services)

## Prerequisites

- **Maven** (`mvn`) or **Gradle** (`gradle`) available
- **Network access** to Code Genome Project repository (`https://artifacts.codegenomeproject.org/maven`) — requires authentication (username + token)
- Target project on disk and readable
- Grails 3.x or higher (Grails 2.x requires separate upgrade path)

> **Defaults**: If user doesn't specify Java version, default to **Java 21**. If no build tool specified, default to **Maven**.

## Project Analysis (Phase 0)

Before starting migration, analyze the Grails project to understand scope:

### 1. Identify Grails Version
Check `gradle.properties` or `build.gradle`:
```properties
# gradle.properties
grailsVersion=3.1.4
```

### 2. Identify Spring Boot Version
Grails 3.x embeds Spring Boot. Check the Grails BOM or `build.gradle`:
```groovy
// Grails 3.1.x → Spring Boot 1.4.x
// Grails 3.2.x → Spring Boot 1.5.x
// Grails 3.3.x → Spring Boot 2.0.x
// Grails 4.0.x → Spring Boot 2.1.x
// Grails 5.x.x → Spring Boot 2.5.x / 2.6.x
// Grails 6.x.x → Spring Boot 3.x
```

### 3. Identify Java Version
Check `build.gradle` or `gradle.properties`:
```groovy
sourceCompatibility = '1.8'
// or
targetCompatibility = '1.8'
```

### 4. Catalog Grails-Specific Features
Scan for these patterns:

| Pattern | Location | Quarkus Equivalent |
|---------|----------|-------------------|
| GORM domain classes | `grails-app/domain/` | JPA entities |
| Grails controllers | `grails-app/controllers/` | Jakarta REST resources |
| Grails interceptors | `grails-app/controllers/` (Interceptor class) | JAX-RS filters/interceptors |
| Grails services | `grails-app/services/` | CDI beans / Quarkus services |
| UrlMappings | `grails-app/controllers/.../UrlMappings.groovy` | JAX-RS `@Path` annotations |
| BootStrap.groovy | `grails-app/init/BootStrap.groovy` | `@ApplicationScoped` bean with `@PostConstruct` |
| Spring resources.groovy | `grails-app/conf/spring/resources.groovy` | CDI `@Produces` or Quarkus config |
| RestBuilder | `grails.plugins.rest.client.RestBuilder` | `quarkus-rest-client` / `quarkus-resteasy-reactive-client` |
| `grailsApplication.config` | Services/Controllers | `@ConfigProperty` / MicroProfile Config |
| `sessionFactory` (Hibernate) | QueryService | `@SessionFactory` / Panache / JDBC |
| `dataSource` | Services | `@DataSource` / Agroal |
| `grails.converters.JSON` | Controllers | Jakarta REST `Response` / JSON-B |
| `request.JSON` | Controllers | Jackson `ObjectNode` / POJO |
| `respond` | Controllers | Return POJO, Jakarta REST handles serialization |

### 5. Check Multi-DataSource Configuration
Grails supports multiple data sources. Check `application.yml`:
```yaml
environments:
  development:
    dataSources:
      dataSource:
        url: jdbc:postgresql://...
      newods:
        url: jdbc:postgresql://...
```

Quarkus uses **Agroal** with multiple named datasources:
```properties
quarkus.datasource.db-kind=postgresql
quarkus.datasource.jdbc.url=jdbc:postgresql://...
quarkus.datasource.newods.db-kind=postgresql
quarkus.datasource.newods.jdbc.url=jdbc:postgresql://...
```

## Migration Workflow

### Phase 1 — Upgrade Grails to Latest 6.x (if needed)

> **Why**: Grails 6.x uses Spring Boot 3.x and Java 17+, which are prerequisites for OpenRewrite Quarkus migration.

**Grails Version Upgrade Path:**
| Current | Target | Notes |
|---------|--------|-------|
| Grails 3.1.x | Grails 3.3.x | First upgrade to 3.3 |
| Grails 3.3.x | Grails 4.0.x | Major upgrade |
| Grails 4.0.x | Grails 5.0.x | Major upgrade, Spring Boot 2.5+ |
| Grails 5.0.x | Grails 5.3.x | Minor upgrades |
| Grails 5.3.x | Grails 6.0.x | Major upgrade, Spring Boot 3.x, Java 17+ |

**For each Grails upgrade:**
1. Update `gradle.properties`: `grailsVersion=X.Y.Z`
2. Update Gradle wrapper if needed
3. Run `./gradlew clean build`
4. Fix compilation errors
5. Run tests

### Phase 2 — Convert Grails Code to Spring Boot Equivalent

Before running OpenRewrite, convert Grails-specific code to standard Spring Boot patterns:

#### 2a. Convert Grails Controllers to Spring MVC / Jakarta REST

**Grails Controller:**
```groovy
class AobFuseAdapterController {
    static responseFormats = ['json', 'xml']
    def aobFuseAdapterService

    def index() {
        def restResponse = aobFuseAdapterService.process(params, request.JSON)
        response.status = restResponse.status
        respond restResponse.json
    }
}
```

**Spring Boot Equivalent (Option A — Spring MVC):**
```java
@RestController
@RequestMapping("/aobFuseAdapter")
public class AobFuseAdapterController {

    private final AobFuseAdapterService aobFuseAdapterService;

    @PostMapping
    public ResponseEntity<Object> index(@RequestBody Map<String, Object> body,
                                         @RequestParam Map<String, String> params) {
        var restResponse = aobFuseAdapterService.process(params, body);
        return ResponseEntity.status(restResponse.getStatus())
                .body(restResponse.getJson());
    }
}
```

**Spring Boot Equivalent (Option B — Jakarta REST):**
```java
@Path("/aobFuseAdapter")
@Produces(MediaType.APPLICATION_JSON)
public class AobFuseAdapterController {

    @Inject
    AobFuseAdapterService aobFuseAdapterService;

    @POST
    public Response index(String requestBody, @QueryParam params) {
        // parse and call service
        return Response.status(restResponse.getStatus())
                .entity(restResponse.getJson())
                .build();
    }
}
```

#### 2b. Convert Grails Interceptor to JAX-RS Filter

**Grails Interceptor:**
```groovy
class SecurityInterceptor {
    def restRequestService
    GrailsApplication grailsApplication

    SecurityInterceptor() {
        match controller: 'aobFuseAdapter'
        match controller: 'aobSqlAdapter'
    }

    boolean before() {
        // security logic
    }
}
```

**JAX-RS Filter Equivalent:**
```java
@Provider
@Priority(Priorities.AUTHORIZATION)
public class SecurityFilter implements ContainerRequestFilter {

    @Inject
    RestRequestService restRequestService;

    @ConfigProperty(name = "security.endpoint.ipaddress")
    String securityEndpoint;

    @ConfigProperty(name = "security.servicename")
    String serviceName;

    @Override
    public void filter(ContainerRequestContext requestContext) {
        String path = requestContext.getUriInfo().getPath();
        if (path.startsWith("aobFuseAdapter") || path.startsWith("aobSqlAdapter")) {
            // security logic
        }
    }
}
```

#### 2c. Convert Grails Services to CDI Beans

**Grails Service:**
```groovy
class RestRequestService {
    def grailsApplication

    def getRestRequest(url, params) {
        def endPoint = setAddressBasedOnUrl(url)
        def rest = new RestBuilder()
        def response = rest.get(path)
        return response
    }
}
```

**CDI Bean Equivalent:**
```java
@ApplicationScoped
public class RestRequestService {

    @ConfigProperty(name = "aobutil.endpoint.ipaddress")
    String aobutilUrl;

    @ConfigProperty(name = "rhds.endpoint.ipaddress")
    String rhdsUrl;

    @ConfigProperty(name = "bpm.endpoint.ipaddress")
    String bpmUrl;

    @Inject
    @RestClient
    ExternalServiceClient externalServiceClient;

    public Response getRestRequest(String url, Map<String, String> params) {
        // Use quarkus-rest-client
    }
}
```

#### 2d. Convert QueryService (Hibernate SessionFactory) to JDBC/Panache

**Grails QueryService:**
```groovy
class QueryService {
    def sessionFactory

    def executeQuery(query) {
        final session = sessionFactory.currentSession
        final sqlQuery = session.createSQLQuery(query)
        sqlQuery.resultTransformer = AliasToEntityMapResultTransformer.INSTANCE
        return sqlQuery.list()
    }
}
```

**JDBC Template Equivalent:**
```java
@ApplicationScoped
public class QueryService {

    @Inject
    JdbcTemplate jdbcTemplate;

    public List<Map<String, Object>> executeQuery(String query) {
        return jdbcTemplate.queryForList(query);
    }

    public List<Map<String, Object>> executeQuery(String query, Map<String, Object> params) {
        namedParameterJdbcTemplate.queryForList(query, params);
    }
}
```

**Or Panache (if using JPA entities):**
```java
@ApplicationScoped
public class QueryService {

    public List<Map<String, Object>> executeQuery(String query) {
        return Persistence.createEntityManagerFactory("aob")
                .createNativeQuery(query)
                .getResultList();
    }
}
```

#### 2e. Convert RestBuilder to quarkus-rest-client

**Grails RestBuilder:**
```groovy
def rest = new RestBuilder()
def response = rest.get(path) {
    header "Authorization", token
}
return response
```

**Quarkus REST Client:**
```java
@Path("/auth")
@RegisterRestClient
public interface AuthServiceClient {

    @GET
    @Path("/agent/verify")
    Response verifyAgent(@HeaderParam("Authorization") String token);
}
```

#### 2f. Convert BootStrap.groovy

**Grails BootStrap:**
```groovy
class BootStrap {
    def init = { servletContext ->
        TimeZone.setDefault(TimeZone.getTimeZone("UTC+07:00"))
    }
}
```

**CDI Equivalent:**
```java
@ApplicationScoped
public class Bootstrap {

    @PostConstruct
    void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC+07:00"));
    }
}
```

#### 2g. Convert Spring resources.groovy

**Grails Spring DSL:**
```groovy
import com.prudential.pruforce.common.base.CorsFilter

beans = {
    corsFilter(CorsFilter)
}
```

**CDI Equivalent:**
```java
@ApplicationScoped
public class BeanConfig {

    @Produces
    @ApplicationScoped
    public CorsFilter corsFilter() {
        return new CorsFilter();
    }
}
```

### Phase 3 — Run OpenRewrite Spring Boot → Quarkus Migration

After converting Grails code to Spring Boot patterns, run OpenRewrite:

#### Gradle

```groovy
plugins {
    id "org.openrewrite.rewrite" version "latest.release"
}

rewrite {
    activeRecipe("org.openrewrite.quarkus.spring.SpringBootToQuarkus")
    setExportDatatables(true)
}

repositories {
    mavenCentral()
    maven {
        url = "https://artifacts.codegenomeproject.org/maven"
        credentials {
            username = "USERNAME"
            password = "TOKEN"
        }
    }
}

dependencies {
    rewrite("org.openrewrite.recipe:rewrite-spring-to-quarkus:0.11.1")
}
```

Then run:
```bash
./gradlew rewriteRun
```

#### Maven

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.openrewrite.maven</groupId>
      <artifactId>rewrite-maven-plugin</artifactId>
      <version>6.46.1</version>
      <configuration>
        <activeRecipes>
          <recipe>org.openrewrite.quarkus.spring.SpringBootToQuarkus</recipe>
        </activeRecipes>
      </configuration>
      <dependencies>
        <dependency>
          <groupId>org.openrewrite.recipe</groupId>
          <artifactId>rewrite-spring-to-quarkus</artifactId>
          <version>0.11.1</version>
        </dependency>
      </dependencies>
    </plugin>
  </plugins>
</build>
```

### Phase 4 — Post-Migration: Convert Remaining Grails Code

After OpenRewrite, manually convert remaining Grails-specific code:

#### 4a. Convert UrlMappings to JAX-RS Paths

**Grails UrlMappings:**
```groovy
class UrlMappings {
    static mappings = {
        "/$controller/$action?/$id?(.$format)?" { constraints { } }
        "/aobFuseAdapter/public/$action?"(controller: 'aobFuseAdapterX')
        "/"(controller: "default", action: "index")
        "401"(controller: "error", action: "unauthorize")
        "404"(controller: "error", action: "notFound")
        "500"(controller: "error", action: "serverError")
    }
}
```

**JAX-RS Equivalent:**
```java
// Each controller method gets @Path annotation
@Path("/aobFuseAdapter")
public class AobFuseAdapterController { ... }

@Path("/aobFuseAdapter/public")
public class AobFuseAdapterXController { ... }

// Error handling via ExceptionMapper
@Provider
public class GlobalExceptionMapper implements ExceptionMapper<Exception> { ... }
```

#### 4b. Convert `request.JSON` to Jackson

**Grails:**
```groovy
def get() {
    def path = request.JSON.path
    def agentCode = request.JSON.agentCode
}
```

**Quarkus/Jakarta REST:**
```java
@POST
@Path("/get")
public Response get(String requestBody) {
    ObjectMapper mapper = new ObjectMapper();
    JsonNode json = mapper.readTree(requestBody);
    String path = json.get("path").asText();
    String agentCode = json.get("agentCode").asText();
}
```

Or use a POJO:
```java
public class FuseRequest {
    private String path;
    private String agentCode;
    // getters/setters
}

@POST
public Response get(FuseRequest request) {
    String path = request.getPath();
}
```

#### 4c. Convert `respond` to Return Response

**Grails:**
```groovy
respond restResponse.json
```

**Quarkus:**
```java
return Response.ok(restResponse.getJson()).build();
```

#### 4d. Convert `grailsApplication.config` to @ConfigProperty

**Grails:**
```groovy
def securityEndpoint = grailsApplication.config.security.endpoint.ipaddress
```

**Quarkus:**
```java
@ConfigProperty(name = "security.endpoint.ipaddress")
String securityEndpoint;
```

#### 4e. Convert `render` to Response

**Grails:**
```groovy
render([message: "Get fuse service is failed"] as JSON)
```

**Quarkus:**
```java
return Response.status(500)
        .entity(Map.of("message", "Get fuse service is failed"))
        .build();
```

#### 4f. Convert Multi-DataSource Queries

**Grails:**
```groovy
class NewodsQueryService {
    def sessionFactory_newods

    def executeQueryGetObject(query, param) {
        final session = sessionFactory_newods.currentSession
        // ...
    }
}
```

**Quarkus:**
```java
@ApplicationScoped
public class NewodsQueryService {

    @Inject
    @DataSource("newods")
    AgroalDataSource newodsDataSource;

    public Map<String, Object> executeQueryGetObject(String query, Map<String, Object> params) {
        try (Connection conn = newodsDataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(query)) {
            // set parameters
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return convertResultSetToMap(rs);
            }
        }
        return null;
    }
}
```

#### 4g. Convert `groovy.sql.Sql` to JDBC

**Grails:**
```groovy
def sql = new Sql(dataSource)
sql.execute("INSERT INTO pushnotification(...) VALUES (?, ?, ?, ?)", params)
```

**Quarkus:**
```java
@Inject
JdbcTemplate jdbcTemplate;

public void insertPushNotification(Map<String, Object> params) {
    jdbcTemplate.update(
        "INSERT INTO pushnotification(userid, alert, payload, opened) VALUES (?, ?, ?, ?)",
        params.get("userid"), params.get("alert"), params.get("payload"), params.get("opened")
    );
}
```

### Phase 5 — Final Migration to Quarkus

After all Grails code is converted to Spring Boot patterns:

1. **Update build file** to use Quarkus dependencies
2. **Replace Spring Boot parent** with Quarkus BOM
3. **Update application.properties** (convert from `application.yml`)
4. **Replace Spring Boot starters** with Quarkus extensions
5. **Run OpenRewrite** if not done in Phase 3
6. **Remove Grails dependencies**

### Phase 6 — Configuration Migration

**Grails `application.yml`:**
```yaml
server:
  port: 9098
  contextPath: '/aobInterceptor'

environments:
  development:
    dataSources:
      dataSource:
        url: jdbc:postgresql://10.170.49.168:5432/aob
        username: postgres
        password: postgres
    security:
      endpoint:
        ipaddress: http://10.170.49.214
```

**Quarkus `application.properties`:**
```properties
quarkus.http.port=9098
quarkus.http.root-path=/aobInterceptor

%dev.quarkus.datasource.jdbc.url=jdbc:postgresql://10.170.49.168:5432/aob
%dev.quarkus.datasource.username=postgres
%dev.quarkus.datasource.password=postgres

%dev.security.endpoint.ipaddress=http://10.170.49.214
```

### Phase 7 — Verification

1. **Build**: `./gradlew clean build` / `./mvnw clean compile`
2. **No Grails deps**: Search build file for `org.grails` — should be zero
3. **Has Quarkus**: Search build file for `io.quarkus` — Quarkus BOM and extensions present
4. **No Spring Boot deps**: Search build file for `org.springframework.boot` — should be zero (unless using compatibility)
5. **Startup**: `./gradlew quarkusDev` / `./mvnw quarkus:dev`
6. **Health check**: `curl http://localhost:9098/q/health` returns UP
7. **API test**: Test all endpoints match original behavior

## Migration Checklist

### Pre-Migration
- [ ] Grails version identified
- [ ] Spring Boot version identified (via Grails BOM)
- [ ] Java version identified
- [ ] All Grails-specific patterns cataloged
- [ ] Multi-datasource configuration documented
- [ ] Dependencies listed

### Phase 1: Grails Upgrade
- [ ] Grails upgraded to 6.x (if needed)
- [ ] Java upgraded to 17+ (if needed)
- [ ] Build passes after upgrade

### Phase 2: Code Conversion
- [ ] Controllers converted to Spring MVC / Jakarta REST
- [ ] Interceptors converted to JAX-RS filters
- [ ] Services converted to CDI beans
- [ ] RestBuilder converted to quarkus-rest-client
- [ ] QueryService converted to JDBC/Panache
- [ ] BootStrap.groovy converted
- [ ] Spring resources.groovy converted
- [ ] UrlMappings converted to @Path annotations
- [ ] `request.JSON` converted to Jackson
- [ ] `respond`/`render` converted to Response
- [ ] `grailsApplication.config` converted to @ConfigProperty
- [ ] Multi-datasource converted to Agroal

### Phase 3: OpenRewrite
- [ ] OpenRewrite plugin configured
- [ ] SpringBootToQuarkus recipe run
- [ ] Build passes after OpenRewrite

### Phase 4: Quarkus Configuration
- [ ] application.yml converted to application.properties
- [ ] Quarkus extensions added
- [ ] Grails dependencies removed
- [ ] JBoss/Wildfly deployment config removed

### Phase 5: Verification
- [ ] Build passes
- [ ] Application starts
- [ ] All endpoints respond correctly
- [ ] Security interceptor working
- [ ] Multi-datasource queries working
- [ ] REST client calls working

## Key Differences: Grails vs Quarkus

| Feature | Grails | Quarkus |
|---------|--------|---------|
| Language | Groovy (primary) | Java (primary), Kotlin, Scala |
| DI Framework | Spring (via Grails) | CDI (Jakarta EE) |
| REST Framework | Grails REST plugin | JAX-RS (RESTEasy Reactive) |
| ORM | GORM / Hibernate | Hibernate ORM / Panache |
| Config | `application.yml` Grails DSL | `application.properties` |
| Build | Gradle with Grails plugin | Maven/Gradle with Quarkus plugin |
| Dev Mode | `grails run-app` | `quarkus:dev` |
| Testing | `@SpringBootTest` / Grails testing | `@QuarkusTest` |
| Multi-DS | `dataSources` in YAML | Named datasources in properties |
| REST Client | `RestBuilder` | `@RegisterRestClient` |
| Interceptors | Grails Interceptors | JAX-RS Filters |
| Security | Grails Spring Security | Quarkus Security |

## Troubleshooting

### Grails upgrade fails
- Check Grails migration guide: https://grails.org/guide/
- Upgrade one major version at a time
- Fix compilation errors before proceeding

### OpenRewrite recipe doesn't run
- Ensure Spring Boot version is 3.x (check Grails BOM)
- Ensure Java version is 17+
- Remove Grails-specific dependencies first

### Multi-datasource not working
- Use `@DataSource("name")` qualifier in Quarkus
- Configure each datasource in `application.properties`
- Ensure Agroal extension is included

### REST calls failing
- Replace `RestBuilder` with `@RegisterRestClient`
- Configure base URL in `application.properties`
- Use `@RestClient` injection

### SQL queries failing
- Replace `sessionFactory.currentSession` with `JdbcTemplate`
- Replace `AliasToEntityMapResultTransformer` with `RowMapper`
- Use named parameters instead of positional
