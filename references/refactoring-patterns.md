# Quarkus Refactoring Patterns

## Annotation Migration Patterns

| Pattern | Spring | Quarkus |
|---------|--------|---------|
| Bean stereotype | `@Component`, `@Service`, `@Repository` | `@ApplicationScoped`, `@Singleton`, `@Repository` |
| Request mapping | `@GetMapping`, `@PostMapping` | JAX-RS: `@GET`, `@POST` |
| Path variable | `@PathVariable` | `@PathParam` |
| Request body | `@RequestBody` | Parameter automatically bound |
| Service layer | `@Service` + `@Transactional` | `@ApplicationScoped` + `@Transactional` |

## Dependency Injection Patterns

### Field Injection (works in both)
```java
@Inject
UserService userService;
```

### Constructor Injection (preferred in Quarkus)
```java
public UserController(UserService userService) {
    this.userService = userService;
}
```

## Repository Patterns

### Spring Data JPA
```java
public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByStatus(String status);
}
```

### Quarkus Panache (simpler)
```java
@ApplicationScoped
public class UserRepository implements PanacheRepository<User> {
    public List<User> findByStatus(String status) {
        return find("status", status).list();
    }
}
```

## Web Layer Patterns

### Spring MVC Controller
```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    @GetMapping("/{id}")
    public ResponseEntity<User> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }
}
```

### JAX-RS Resource
```java
@Path("/api/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserController {
    @GET
    @Path("/{id}")
    public User get(@PathParam("id") Long id) {
        return service.findById(id);
    }
}
```

## Common Refactoring Scripts

### Find Spring-specific annotations
```bash
# Find Spring annotations that need migration
grep -r "@Component\|@Service\|@Repository\|@RestController\|@RequestMapping" src/

# Find JPA queries that may need adjustments
grep -r "@Query" src/
```

### Verify Quarkus extensions
```bash
# Check if quarkus-resteasy-reactive is in pom.xml
grep -i "resteasy-reactive" pom.xml

# Check if quarkus-hibernate-orm-panache is available
grep -i "panache" pom.xml
```

## Migration Checklist Items

- [ ] Replace `@Component`/`@Service`/`@Repository` with CDI scopes
- [ ] Convert REST annotations from Spring MVC to JAX-RS
- [ ] Replace `@Value` with `@ConfigProperty`
- [ ] Verify transaction propagation support
- [ ] Update Cron expressions (add seconds field)
- [ ] Replace `@MockBean` with `@InjectMock`
- [ ] Run `./mvnw compile` after each phase
- [ ] Verify all dependencies have Quarkus extensions