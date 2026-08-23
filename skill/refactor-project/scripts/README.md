# Scripts

Helper scripts for the `refactor-project` skill.

## Files

| Script | Purpose |
|---|---|
| [check-quarkus-annotations.sh](check-quarkus-annotations.sh) | Search Java source files for Quarkus annotations and output as JSON (file, line, annotation, context) |
| [check-engineering-violations.sh](check-engineering-violations.sh) | Check for common engineering standard violations (Spring leftovers, primitive money, hardcoded values, manual collection loops, private member injection, `@Named` qualifiers, `System.out` direct printing) and output as JSON |

## Usage

```bash
# Check for Quarkus annotations in the current directory
bash scripts/check-quarkus-annotations.sh

# Check for Quarkus annotations in a specific directory
bash scripts/check-quarkus-annotations.sh --dir src/main/java

# Check for engineering violations
bash scripts/check-engineering-violations.sh

# Check for engineering violations in a specific project
bash scripts/check-engineering-violations.sh --dir /path/to/project
```

Both scripts output a JSON array to stdout and a `{"total": N}` count to stderr.