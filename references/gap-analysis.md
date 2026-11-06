# Gap Analysis Reference

## Common Spring → Quarkus Migration Gaps

### 1. Configuration
| Spring | Quarkus |
|--------|---------|
| `@Value("${prop}")` | `@ConfigProperty(name = "prop")` |
| `application.yml` | `application.properties` or `application.yaml` with Quarkus format |
| `@ConfigurationProperties` | `@ConfigProperties` |

### 2. Dependency Injection
| Spring | Quarkus |
|--------|---------|
| `@Component` @`@Service` @`@Repository` | `@ApplicationScoped` @`@Singleton` @`@Repository` (requires extension) |
| `@Autowired` | Constructor injection preferred (no `@Autowired` needed) |
| Field injection | Works but constructor preferred |

### 3. Transaction Management
| Spring | Quarkus |
|--------|---------|
| `@Transactional` (Spring) | `@Transactional` (Quarkus extension) |
| Propagation | Limited support |
| Rollback rules | Simplified |

### 4. Data Access
| Spring Data | Quarkus |
|-------------|---------|
| JPA/Hibernate | Same, Panache recommended |
| `@Query` | Panache query methods or custom JPQL |
| MongoTemplate | Reactive MongoDB client |

### 5. Validation
| Spring | Quarkus |
|--------|---------|
| `@Valid` `@NotBlank` | Same (Hibernate Validator) |
| Custom validators | Same approach |

### 6. Scheduling
| Spring | Quarkus |
|--------|---------|
| `@Scheduled` | `@Scheduled` (SmallRye Scheduler) |
| Cron expressions | Different format (6 fields vs 5) |

### 7. HTTP Layer
| Spring | Quarkus |
|--------|---------|
| `@RestController` | `@Path` JAX-RS annotations |
| `@RequestMapping` | `@Path`, `@GET`, `@POST`, etc. |
| Spring Security | MicroProfile JWT or SmallRye JWT |

### 8. Testing
| Spring | Quarkus |
|--------|---------|
| `@SpringBootTest` | `@QuarkusTest` |
| `@MockBean` | `@InjectMock` |
| `TestRestTemplate` | RestAssured or `@RESTAssuredTest` |

### 9. Common Refactoring Patterns

#### @Component → @ApplicationScoped
```java
// Before (Spring)
@Component
public class MyService { ... }

// After (Quarkus)
@ApplicationScoped
public class MyService { ... }
```

#### @Autowired → Constructor Injection
```java
// Before (Spring)
@Service
public class UserController {
    @Autowired
    private UserService userService;
}

// After (Quarkus) - prefer constructor
@Path("/users")
public class UserController {
    private final UserService userService;
    
    public UserController(UserService userService) {
        this.userService = userService;
    }
}
```

#### @RestController → JAX-RS
```java
// Before (Spring)
@RestController
@RequestMapping("/api/users")
public class UserController {
    @GetMapping("/{id}")
    public User get(@PathVariable Long id) { ... }
}

// After (Quarkus)
@Path("/api/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserController {
    @GET
    @Path("/{id}")
    public User get(@PathParam("id") Long id) { ... }
}
```