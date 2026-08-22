# Module: Code

Migrate all Java source code from Spring patterns to Quarkus equivalents.

Load [references/annotation-map.md](../references/annotation-map.md) before starting. It contains the complete annotation mapping tables for DI, REST, Data, Security, Cache, Scheduling, and Lifecycle.

Load [references/engineering-standards.md](../references/engineering-standards.md) before starting. It contains the architectural and coding standards from `ptpla-cbv-pf-engineering-prompts` that all migrated services must follow.

Load [references/service-generation-standards.md](../references/service-generation-standards.md) before starting. It contains detailed patterns for project structure, package naming, layered architecture, DTOs, entities, mappers, services, repositories, exception handling, dependency injection, validation, configuration, logging, database queries, and testing standards from `ptpla-cbv-pf-engineering-prompts/prompts/code-guideline/copilot-instructions.md`.

## What to do

- [ ] Migrate entities (JPA → Panache if full Quarkus strategy)
- [ ] Migrate repositories (Spring Data → Panache if full Quarkus strategy)
- [ ] Simplify service layer (remove unnecessary interface+impl)
- [ ] Migrate controllers/resources (Spring MVC → JAX-RS if full Quarkus strategy)
- [ ] Migrate DI annotations (`@Autowired` → `@Inject`, `@Component` → `@ApplicationScoped`, etc.)
- [ ] Migrate `Model.addAttribute()` → Qute `Template.data()` or `@CheckedTemplate`
- [ ] Migrate `return "redirect:..."` → `Response.seeOther()`
- [ ] Remove `@SpringBootApplication` main class
- [ ] Compile: `./mvnw clean compile -DskipTests` (Maven) or `./gradlew clean compileJava -x test` (Gradle)

Use the annotation-map.md reference for the full mapping. Use the service-generation-standards.md reference for detailed implementation patterns of each layer. Below are the key patterns with before/after examples.

## Entity Layer (Full Quarkus strategy)

```java
// BEFORE: Spring Data JPA
@Entity
public class Todo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private boolean completed;
    // getters + setters
}

// AFTER: Panache Active Record
@Entity
public class Todo extends PanacheEntity {
    public String title;
    public boolean completed;
    // id provided by PanacheEntity — remove @Id and @GeneratedValue
    // public fields — remove getters/setters
}
```

## Repository Layer (Full Quarkus strategy)

Two patterns available — choose based on project conventions:

**Active Record** (queries on the entity):
```java
// Static methods on the entity
public static List<Todo> findByCompleted(boolean completed) {
    return list("completed", completed);
}
// Usage: Todo.listAll(), Todo.findById(id), Todo.findByCompleted(true)
```

**Repository class** (separate from entity):
```java
@ApplicationScoped
public class TodoRepository implements PanacheRepository<Todo> {
    public List<Todo> findByCompleted(boolean completed) {
        return list("completed", completed);
    }
}
```

**Pagination** (replaces Spring's `Page<T>` + `Pageable`):
```java
PanacheQuery<Todo> query = find("completed", completed);
query.page(Page.of(page, size));
long totalCount = query.count();
List<Todo> items = query.list();
```

**Spring compat strategy**: Keep `JpaRepository`/`CrudRepository` — they work with `quarkus-spring-data-jpa`.

## Hibernate ORM Migration Rules (from quarkus.io/guides/hibernate-orm)

When migrating entities and persistence code, follow these rules:

### 1. No `persistence.xml`
Quarkus configures Hibernate ORM via `application.properties` — do NOT create a `META-INF/persistence.xml`. If one exists in the classpath, set `quarkus.hibernate-orm.persistence-xml.ignore=true`. **Never mix** `persistence.xml` with `quarkus.hibernate-orm.*` properties — Quarkus raises an exception.

### 2. `@Transactional` is required for writes
Mark CDI bean methods with `jakarta.transaction.Transactional` (not Spring's). The `EntityManager` will enlist and flush at commit. Recommended at application entry point boundaries (REST endpoints).

```java
@ApplicationScoped
public class TodoService {
    @Inject EntityManager em;

    @Transactional
    public void createTodo(String title) {
        Todo todo = new Todo();
        todo.setTitle(title);
        em.persist(todo);
    }
}
```

### 3. No OSIV — lazy loading fails outside transactions
Quarkus has no Open Session in View. Lazy loading outside transactions throws `LazyInitializationException`. Fix by:
- Fetching eagerly with `JOIN FETCH` in JPQL queries
- Using `@Transactional` on the reading method
- Using `@EntityGraph` for specific fetch plans

### 4. `import.sql` requires semicolons
Each SQL statement must be terminated with `;`. Quarkus reconfigures Hibernate to require this (unlike vanilla Hibernate which uses newline). Multi-line statements are supported.

### 5. Schema management — never `drop-and-create` or `update` in production
Always set in production:
```properties
%prod.quarkus.hibernate-orm.schema-management.strategy = none
%prod.quarkus.hibernate-orm.sql-load-script = no-file
```
In dev/test, `drop-and-create` + `import.sql` is the default with Dev Services.

### 6. Second-level cache is enabled by default
Mark entities with `@Cacheable`, collections with `@Cache(usage = CacheConcurrencyStrategy.READ_ONLY)`, and queries with `org.hibernate.cacheable` hint. Tune regions via `quarkus.hibernate-orm.cache."<region>".memory.object-count` and `quarkus.hibernate-orm.cache."<region>".expiration.max-idle`.

```java
@Entity
@Cacheable
public class Country {
    @Id
    public Long id;

    @OneToMany
    @Cache(usage = CacheConcurrencyStrategy.READ_ONLY)
    List<City> cities;
}
```

### 7. Multiple persistence units
Use map-based config in `application.properties`:
```properties
quarkus.datasource."users".db-kind=h2
quarkus.datasource."users".jdbc.url=jdbc:h2:mem:users;DB_CLOSE_DELAY=-1
quarkus.hibernate-orm."users".datasource=users
quarkus.hibernate-orm."users".packages=org.acme.model.user
```
Inject with `@Inject @PersistenceUnit("users") EntityManager em;` — use `io.quarkus.hibernate.orm.PersistenceUnit`, not the Jakarta one. Attach entities via `packages` property or package-level `@PersistenceUnit` annotation — never mix both approaches.

### 8. Entities in external JARs
Add an empty `META-INF/beans.xml` to the external JAR for Jandex indexing and build-time enhancement.

### 9. Envers for auditing
Add `quarkus-hibernate-envers` extension. No additional configuration properties exposed.

### 10. Jakarta Data repositories
Requires `org.hibernate.orm:hibernate-processor` annotation processor and `jakarta.data:jakarta.data-api` dependency. Create repositories with `@Repository` interface extending `CrudRepository`:

```java
@Repository
public interface MyRepository extends CrudRepository<MyEntity, Integer> {
    @Query("select e from MyEntity e where e.name like :name")
    List<MyEntity> findByName(String name);
}
```

### 11. Static metamodel
The `hibernate-processor` annotation processor generates `{Entity}_` classes for type-safe queries:

```java
var builder = session.getCriteriaBuilder();
var criteria = builder.createQuery(MyEntity.class);
var e = criteria.from(MyEntity_.class);
criteria.where(e.get(MyEntity_.name).equalTo(name));
var query = session.createQuery(criteria);
var result = query.list();
```

### 12. Validation modes
`quarkus.hibernate-orm.validation.mode` controls Bean Validation integration:
- `auto` (default) — `callback` + `ddl` if `quarkus-hibernate-validator` present, else `none`
- `callback` — lifecycle event validation
- `ddl` — constraints applied to DDL generation
- `none` — disabled

### 13. Offline startup for containers
If the database isn't reachable at startup (e.g., Kubernetes), set `quarkus.hibernate-orm.database.start-offline=true`. This skips the DB connection check and version validation. Ensure the schema is created before the app starts (use Flyway/Liquibase).

### 14. Metrics
Enable `quarkus.hibernate-orm.metrics.enabled=true` to expose Hibernate metrics on `/q/metrics` (requires a metrics extension like `quarkus-micrometer`).

## Lombok Migration Rules

Lombok (`org.projectlombok:lombok`) must be **removed entirely** during migration. It is **not compatible with Quarkus native mode** and is **not managed by the Quarkus BOM**. Rewrite every Lombok annotation to standard Java / Jakarta / Quarkus equivalents — do NOT keep Lombok in the migrated codebase.

### 1. DTOs → Java records

Java records (Java 16+) replace `@Data`, `@Value`, `@Builder`, `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@ToString`, and `@EqualsAndHashCode` for immutable data carriers:

```java
// BEFORE: Spring + Lombok
@Data
@Builder
public class TodoResponse {
    private Long id;
    private String title;
    private boolean completed;
}

// AFTER: Quarkus + Java record
public record TodoResponse(
    Long id,
    String title,
    boolean completed
) {
    public static TodoResponse from(Todo todo) {
        return new TodoResponse(todo.getId(), todo.getTitle(), todo.isCompleted());
    }
}
```

> Records are implicitly `final`, have canonical constructors, `equals`/`hashCode`/`toString`, and accessor methods (`id()`, `title()`, `completed()`) — replacing most Lombok boilerplate. For mutable DTOs where records don't fit, write explicit getters/setters instead.

### 2. Entities → explicit getters/setters

JPA entities need a no-arg constructor and cannot be records (JPA requires mutability + no-arg constructor). Write explicit getters/setters and a no-arg constructor:

```java
// BEFORE: Spring + Lombok
@Entity
@Data
@NoArgsConstructor
public class Todo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private boolean completed;
}

// AFTER: Quarkus + plain Java
@Entity
public class Todo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private boolean completed;

    // JPA requires a no-arg constructor
    public Todo() {}

    // explicit getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
}
```

### 3. `@RequiredArgsConstructor` → explicit constructor injection

`@RequiredArgsConstructor` is commonly used with `@Autowired` for field injection. Quarkus prefers constructor injection:

```java
// BEFORE: Spring + Lombok
@Service
@RequiredArgsConstructor
public class TodoService {
    private final TodoRepository repository;
    private final ObjectMapper mapper;
}

// AFTER: Quarkus + explicit constructor injection
@ApplicationScoped
public class TodoService {
    private final TodoRepository repository;
    private final ObjectMapper mapper;

    public TodoService(TodoRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }
}
```

### 4. `@Slf4j` → JBoss Logging

Replace Lombok's `@Slf4j` with Quarkus's JBoss Logging. Two options:

```java
// BEFORE: Spring + Lombok
@Service
@Slf4j
public class TodoService {
    public void doSomething() {
        log.info("Doing something");
    }
}

// AFTER option 1: static logger (matches @Slf4j usage)
@ApplicationScoped
public class TodoService {
    private static final Logger LOG = Logger.getLogger(TodoService.class);

    public void doSomething() {
        LOG.info("Doing something");
    }
}

// AFTER option 2: injected logger (Quarkus CDI)
@ApplicationScoped
public class TodoService {
    @Inject
    Logger log;

    public void doSomething() {
        log.info("Doing something");
    }
}
```

### 5. `@NonNull` → Objects.requireNonNull or Bean Validation

```java
// BEFORE: Spring + Lombok
public void save(@NonNull Todo todo) { ... }

// AFTER option 1: explicit null check
public void save(Todo todo) {
    Objects.requireNonNull(todo, "todo must not be null");
    ...
}

// AFTER option 2: Jakarta Bean Validation (on DTO fields)
public record CreateTodoRequest(
    @NotNull String title
) {}
```

### 6. `@Builder` → manual builder or record

For immutable objects, records surface all constructor params — no builder needed. If a builder is truly required (e.g., many optional params), write a manual builder:

```java
// BEFORE: Spring + Lombok
@Builder
public class SearchCriteria {
    private String title;
    private Boolean completed;
    private Integer page;
    private Integer size;
}

// AFTER: manual builder
public class SearchCriteria {
    private final String title;
    private final Boolean completed;
    private final Integer page;
    private final Integer size;

    private SearchCriteria(Builder b) {
        this.title = b.title;
        this.completed = b.completed;
        this.page = b.page;
        this.size = b.size;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String title;
        private Boolean completed;
        private Integer page;
        private Integer size;
        public Builder title(String v) { this.title = v; return this; }
        public Builder completed(Boolean v) { this.completed = v; return this; }
        public Builder page(Integer v) { this.page = v; return this; }
        public Builder size(Integer v) { this.size = v; return this; }
        public SearchCriteria build() { return new SearchCriteria(this); }
    }
}
```

## JasperReports → OpenPDF Migration Rules

JasperReports (`net.sf.jasperreports:jasperreports`) is replaced with **OpenPDF** (`com.github.librepdf:openpdf`) for PDF generation. OpenPDF is the open-source LGPL/MPL successor of iText 4 and supports creating, editing, rendering, encrypting PDFs, and generating PDFs from HTML (via `openpdf-html`, a fork of Flying Saucer).

### 1. Replace Jasper APIs with OpenPDF APIs

The core OpenPDF package in 3.0 is `org.openpdf.text.*` (was `com.lowagie.text.*` in the iText 4 lineage). Replace `JasperPrint`/`JasperExportManager` with OpenPDF's `Document`/`PdfWriter`:

```java
// BEFORE: Spring + JasperReports
JasperPrint jasperPrint = JasperFillManager.fillReport(
    "reports/invoice.jasper",
    parameters,        // Map<String, Object>
    dataSource         // JRDataSource / Connection
);
byte[] pdfBytes = JasperExportManager.exportReportToPdf(jasperPrint);

// AFTER: Quarkus + OpenPDF
Document document = new Document(PageSize.A4, 36, 36, 54, 36);
ByteArrayOutputStream baos = new ByteArrayOutputStream();
PdfWriter.getInstance(document, baos);
document.open();

Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
document.add(new Paragraph("Invoice", titleFont));
document.add(new Paragraph("Customer: " + customerName));
document.add(new Paragraph("Total: " + totalAmount));

document.close();
byte[] pdfBytes = baos.toByteArray();
```

### 2. HTML → PDF with openpdf-html

For styled reports (invoices, statements), generate PDF from HTML/CSS templates instead of building documents programmatically:

```java
// Requires: com.github.librepdf:openpdf-html
String html = """
    <html><body>
        <h1>Invoice #%d</h1>
        <table>
            <tr><th>Item</th><th>Price</th></tr>
            %s
        </table>
    </body></html>
    """.formatted(invoiceNumber, tableRows);

ITextRenderer renderer = new ITextRenderer();
renderer.setDocumentFromString(html);
renderer.layout();
ByteArrayOutputStream baos = new ByteArrayOutputStream();
renderer.createPDF(baos);
byte[] pdfBytes = baos.toByteArray();
```

### 3. Servicing PDF generation in a REST resource

```java
// BEFORE: Spring + JasperReports
@RestController
public class InvoiceController {
    @GetMapping("/invoices/{id}/pdf")
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        Invoice invoice = invoiceService.findById(id);
        JasperPrint print = JasperFillManager.fillReport(
            "invoices/invoice.jasper",
            Map.of("invoice", invoice),
            new JRBeanCollectionDataSource(List.of(invoice))
        );
        byte[] pdf = JasperExportManager.exportReportToPdf(print);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=invoice.pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}

// AFTER: Quarkus + OpenPDF
@Path("/invoices")
@ApplicationScoped
public class InvoiceResource {
    @Inject InvoiceService invoiceService;

    @GET
    @Path("/{id}/pdf")
    @Produces("application/pdf")
    public Response download(@PathParam("id") Long id) {
        Invoice invoice = invoiceService.findById(id);
        byte[] pdf = generatePdf(invoice);
        return Response.ok(pdf)
            .header("Content-Disposition", "attachment; filename=invoice.pdf")
            .type("application/pdf")
            .build();
    }

    private byte[] generatePdf(Invoice invoice) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, baos);
        document.open();
        document.add(new Paragraph("Invoice #" + invoice.getNumber(),
            new Font(Font.HELVETICA, 18, Font.BOLD)));
        document.add(new Paragraph("Total: " + invoice.getTotal()));
        document.close();
        return baos.toByteArray();
    }
}
```

### 4. `com.lowagie.*` → `org.openpdf.*` import migration

If the codebase directly uses iText APIs (e.g., in custom Jasper export code), update the imports:

| Old import (iText/Jasper) | New import (OpenPDF 3.0) |
|---|---|
| `com.lowagie.text.Document` | `org.openpdf.text.Document` |
| `com.lowagie.text.Paragraph` | `org.openpdf.text.Paragraph` |
| `com.lowagie.text.pdf.PdfWriter` | `org.openpdf.text.pdf.PdfWriter` |
| `com.lowagie.text.Font` | `org.openpdf.text.Font` |
| `com.lowagie.text.PageSize` | `org.openpdf.text.PageSize` |
| `com.lowagie.text.Rectangle` | `org.openpdf.text.Rectangle` |
| `com.lowagie.text.pdf.PdfPCell` | `org.openpdf.text.pdf.PdfPCell` |
| `com.lowagie.text.pdf.PdfPTable` | `org.openpdf.text.pdf.PdfPTable` |

> **Watch out:** OpenPDF 3.0 requires Java 21+. OpenPDF is **not managed by the Quarkus BOM** — specify the version explicitly in the build file. For native mode, ensure PDF fonts are registered (use `openpdf-fonts-extra` for UTF-8 Liberation fonts) and test PDF output in native image builds.

## Service Layer

Spring services often use interface + implementation unnecessarily. Simplify:

```java
// BEFORE: Spring — interface + impl
public interface TodoService { List<Todo> findAll(); }

@Service
public class TodoServiceImpl implements TodoService {
    @Autowired private TodoRepository repository;
    @Override public List<Todo> findAll() { return repository.findAll(); }
}

// AFTER: Quarkus — single class
@ApplicationScoped
public class TodoService {
    @Inject TodoRepository repository;
    public List<Todo> findAll() { return repository.listAll(); }
}
```

**Decision guide:**
- Service only delegates to repository → eliminate it, inject repository directly in the resource
- Service has real business logic → keep as `@ApplicationScoped`, remove the interface
- Interface used for testing/mocking → not needed, `@InjectMock` works on concrete classes

**Spring compat strategy**: `@Service` is supported by `quarkus-spring-di` — no changes needed.

## Controller → Resource (Full Quarkus strategy)

```java
// BEFORE: Spring MVC
@Controller
public class TodoController {
    @GetMapping("/todos")
    public String list(Model model) {
        model.addAttribute("todos", todoService.findAll());
        return "todos";
    }

    @PostMapping("/todos")
    public String create(@ModelAttribute Todo todo) {
        todoService.save(todo);
        return "redirect:/todos";
    }
}

// AFTER: Quarkus + JAX-RS + Qute
@Path("/todos")
@ApplicationScoped
public class TodoResource {
    @Inject TodoService todoService;

    @CheckedTemplate
    public static class Templates {
        public static native TemplateInstance todos(List<Todo> todos);
    }

    @GET
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance list() {
        return Templates.todos(todoService.findAll());
    }

    @POST
    @Transactional
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response create(@BeanParam Todo todo) {
        todoService.save(todo);
        return Response.seeOther(URI.create("/todos")).build();
    }
}
```

**Qute strict data map** — unlike Thymeleaf, Qute throws `TemplateException` if a key referenced in the template is missing from the data map. Every `.data()` call site must provide the **same complete set of keys**, including on empty-result paths.

**Spring compat strategy**: `@RestController` works with `quarkus-spring-web` (but NOT plain `@Controller`).

## Main Class Removal

If the main class **only** contains `SpringApplication.run(...)`, delete it — Quarkus auto-generates a main class.

If it contains additional logic, migrate before deleting:

- `@Bean` methods → move to an `@ApplicationScoped` class with `@Produces`
- `CommandLineRunner` → `@QuarkusMain` with `QuarkusApplication`, or `@TopCommand` (Picocli) if it parses CLI arguments
- `ApplicationRunner` → `@QuarkusMain` implementing `QuarkusApplication`
- `@EnableScheduling`, `@EnableCaching`, etc. → not needed, Quarkus enables these via extensions

### @Bean methods

```java
// BEFORE: Spring — @Bean in main class
@SpringBootApplication
public class MyApp {
    public static void main(String[] args) { SpringApplication.run(MyApp.class, args); }

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper().registerModule(new JavaTimeModule());
    }
}

// AFTER: Quarkus — @Produces in a dedicated class
@ApplicationScoped
public class AppConfig {
    @Produces
    public ObjectMapper objectMapper() {
        return new ObjectMapper().registerModule(new JavaTimeModule());
    }
}
```

### CommandLineRunner → @QuarkusMain

Use `@QuarkusMain` when the runner executes startup logic without parsing CLI arguments.

```java
// BEFORE: Spring — CommandLineRunner
@SpringBootApplication
public class MyApp implements CommandLineRunner {
    @Autowired DataLoader dataLoader;

    public static void main(String[] args) { SpringApplication.run(MyApp.class, args); }

    @Override
    public void run(String... args) {
        dataLoader.seed();
    }
}

// AFTER: Quarkus — @QuarkusMain
@QuarkusMain
public class MyApp implements QuarkusApplication {
    @Inject DataLoader dataLoader;

    @Override
    public int run(String... args) {
        dataLoader.seed();
        Quarkus.waitForExit();
        return 0;
    }
}
```

### CommandLineRunner with CLI arguments → @TopCommand (Picocli)

Use `@TopCommand` when the runner parses command-line arguments.

```java
// BEFORE: Spring — CommandLineRunner parsing args
@SpringBootApplication
public class MyCli implements CommandLineRunner {
    public static void main(String[] args) { SpringApplication.run(MyCli.class, args); }

    @Override
    public void run(String... args) {
        String file = args[0];
        process(file);
    }
}

// AFTER: Quarkus — Picocli @TopCommand
@TopCommand
@CommandLine.Command(name = "mycli", mixinStandardHelpOptions = true)
public class MyCli implements Runnable {
    @CommandLine.Parameters(index = "0", description = "File to process")
    String file;

    @Override
    public void run() {
        process(file);
    }
}
// Requires: quarkus-picocli extension
```

### ApplicationRunner → @QuarkusMain

```java
// BEFORE: Spring — ApplicationRunner
@SpringBootApplication
public class MyApp implements ApplicationRunner {
    @Autowired MigrationService migrations;

    public static void main(String[] args) { SpringApplication.run(MyApp.class, args); }

    @Override
    public void run(ApplicationArguments args) {
        if (args.containsOption("migrate")) {
            migrations.execute();
        }
    }
}

// AFTER: Quarkus — @QuarkusMain
@QuarkusMain
public class MyApp implements QuarkusApplication {
    @Inject MigrationService migrations;

    @Override
    public int run(String... args) {
        List<String> argList = List.of(args);
        if (argList.contains("--migrate")) {
            migrations.execute();
        }
        Quarkus.waitForExit();
        return 0;
    }
}
```

## Engineering Standards Compliance

While migrating code, ensure all migrated services comply with the standards in [references/engineering-standards.md](../references/engineering-standards.md) and [references/service-generation-standards.md](../references/service-generation-standards.md). Key requirements:

### From engineering-standards.md
- Use constructor injection only (no field injection)
- All monetary fields must be `BigDecimal`
- All endpoint responses must be wrapped in `ApiResponse<T>`
- Custom exceptions must extend `DomainException`
- Follow layered architecture pattern
- Bean Validation on all request DTOs
- Use `ApiResponse.success()` / `ApiResponse.error()` for responses

### From service-generation-standards.md (detailed layer patterns)
- **Package Structure:** `com.prudential.pruforce.aob.{function}.{layer}` (api, service, repository, entity, mapper, exception, config, util)
- **File Naming:** `{Domain}Resource.java`, `{Domain}Service.java`, `{Domain}ServiceImpl.java`, `{Domain}Repository.java`, `{Domain}Mapper.java`, `Create{Domain}Request.java`, `{Domain}Response.java`
- **API Layer:** Accept requests, validate with `@Valid`, call service, return `ApiResponse<T>`
- **Service Layer:** Business logic, `@Transactional`, logging with `@Slf4j`, mapper usage, constructor injection
- **Repository Layer:** Spring Data `JpaRepository` or Quarkus `PanacheRepository`, derived queries, custom `@Query` with `@Param`, pagination support
- **Entity:** `@Id @GeneratedValue`, audit fields (`createdAt`, `updatedAt`, `version`), `@CreationTimestamp`, `@UpdateTimestamp`, `@Version`, indexes, `precision=19, scale=2` for money
- **Mapper:** Separate per domain, `toEntity()`, `toResponse()`, `toResponseList()`, `toResponsePage()`
- **Exception Hierarchy:** Base `DomainException`, specific exceptions (`*NotFoundException`, `*ValidationException`, `*ProcessingException`), global handler returning `ApiResponse`
- **Validation:** Bean Validation on Request DTOs (`@NotNull`, `@NotBlank`, `@Size`, `@Valid`), custom `ConstraintValidator` for complex logic
- **Configuration:** Externalize secrets, use profiles, no hardcoded values
- **Logging:** `@Slf4j`, structured logging, never log sensitive data
- **Testing:** Unit tests with Mockito, integration tests with `@QuarkusTest`/`@SpringBootTest`

## Watch out

- **Missing `@Transactional`**: Quarkus uses `jakarta.transaction.Transactional`, not Spring's
- **Bean discovery**: Quarkus uses build-time CDI; beans must have a scope annotation
- **No OSIV**: Quarkus doesn't have Open Session in View; lazy loading outside transactions will fail
- **No component scanning**: Beans in external JARs need a Jandex index or `quarkus.index-dependency`
- **JAX-RS path conflicts**: Spring allows overlapping `@RequestMapping` paths — JAX-RS does not. Check for duplicate `@Path` values

## Spring Compat Extension Limitations

When using the compatibility strategy (`quarkus-spring-*` extensions), be aware of these **verified limitations from the Quarkus source code**:

| Extension | What does NOT work |
|---|---|
| `quarkus-spring-di` | `@Primary`, `@Conditional*`, `@Profile`, `@Lazy` not processed. SpEL `#{...}` in `@Value` throws error. `@Bean` must be inside `@Configuration` class. |
| `quarkus-spring-web` | Only `@RestController` — plain `@Controller` not supported. Only one `@RestControllerAdvice` per app. `@CrossOrigin`, `@InitBinder`, `@ModelAttribute` not supported. No reactive types (`Mono`, `Flux`). |
| `quarkus-spring-security` | Limited SpEL in `@PreAuthorize`: only `hasRole`, `hasAnyRole`, `permitAll`, `denyAll`, `isAuthenticated`, `@bean.method()`, param comparison. Cannot mix `and`/`or` operators. Cannot combine `@Secured` with `@PreAuthorize`. |
| `quarkus-spring-data-jpa` | SpEL `#{...}` in `@Query` not supported. No `Distinct` queries. Limited custom repository fragment support. |
| `quarkus-spring-cache` | Single cache name only (no arrays). `key`, `condition`, `unless`, `keyGenerator`, `cacheManager` parameters NOT supported. No `@Caching` or `@CacheConfig`. |
| `quarkus-spring-scheduled` | `fixedDelay` NOT supported (only `fixedRate`). Cannot combine `initialDelay` with `cron`. |