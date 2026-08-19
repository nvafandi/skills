# References

Reference files for the `migrate-spring-to-quarkus` skill. These provide lookup tables, standards, and templates used during migration.

## Files

| File | Purpose |
|---|---|
| [annotation-map.md](annotation-map.md) | Complete Spring → Quarkus annotation mapping tables for DI, REST, Data, Security, Cache, Scheduling, Lifecycle, and Testing |
| [config-map.md](config-map.md) | Spring Boot → Quarkus configuration property mapping (server, datasource, JPA, logging, profiles, CORS, security, etc.) |
| [dependency-map.md](dependency-map.md) | Spring Boot → Quarkus dependency mapping (starters → extensions) for both full and compatibility strategies |
| [engineering-standards.md](engineering-standards.md) | PruForce engineering standards from `ptpla-cbv-pf-engineering-prompts` — architecture, naming, quality gates checklist |
| [quick-reference.md](quick-reference.md) | Code snippets, common issues/solutions, testing checklist, build commands, performance tips, security considerations |
| [service-generation-standards.md](service-generation-standards.md) | Detailed architectural patterns from `ptpla-cbv-pf-engineering-prompts/prompts/code-guideline/copilot-instructions.md` |
| [service-template.md](service-template.md) | Template and workflow for generating new services compliant with both Quarkus and PruForce standards |

## External Documentation

- OpenRewrite: Migrate Spring Boot to Quarkus - https://docs.openrewrite.org/recipes/quarkus/spring/springboottoquarkus
- Quarkus Spring compatibility - https://quarkus.io/guides/spring-compatibility