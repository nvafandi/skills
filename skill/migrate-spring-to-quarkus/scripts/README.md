# Scripts

Helper scripts for the `migrate-spring-to-quarkus` skill.

## Files

| Script | Purpose |
|---|---|
| [check-spring-annotations.sh](check-spring-annotations.sh) | Search Java source files for Spring annotations and output as JSON (file, line, annotation, context) |
| [check-spring-deps.sh](check-spring-deps.sh) | Search build files (pom.xml, build.gradle, build.gradle.kts) for Spring dependencies and output as JSON |

## Usage

```bash
# Check for Spring annotations in the current directory
bash scripts/check-spring-annotations.sh

# Check for Spring annotations in a specific directory
bash scripts/check-spring-annotations.sh --dir src/main/java

# Check for Spring dependencies in build files
bash scripts/check-spring-deps.sh

# Check for Spring dependencies in a specific project
bash scripts/check-spring-deps.sh --dir /path/to/project
```

Both scripts output a JSON array to stdout and a `{"total": N}` count to stderr.