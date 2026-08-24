# Module: Tree Map Comparison

Compare the project's directory structure before and after refactoring to visualize changes.

## What to do

### Before Refactoring (Capture Baseline)

Run this module before the refactoring flow begins to capture the project's initial state:

```bash
# Generate before tree map
# -prune keeps target/, build/, .git/, node_modules/ out of the snapshot
find . \( -name target -o -name build -o -name .git -o -name node_modules \) -prune \
  -o -type f \( -name "*.java" -o -name "*.xml" -o -name "*.gradle" -o -name "*.gradle.kts" -o -name "*.properties" -o -name "*.yml" \) -print \
  | sort > /tmp/before-file-list.txt

# Generate directory tree
tree -a --ignore-node_modules --ignore=.git > /tmp/before-tree.txt 2>/dev/null || ls -R . | grep -E "^.+:" > /tmp/before-tree.txt
```

### After Refactoring (Capture Final State)

Run this module after the refactoring flow completes (after validation):

```bash
# Generate after tree map (same prune + pattern list as the baseline)
find . \( -name target -o -name build -o -name .git -o -name node_modules \) -prune \
  -o -type f \( -name "*.java" -o -name "*.xml" -o -name "*.gradle" -o -name "*.gradle.kts" -o -name "*.properties" -o -name "*.yml" \) -print \
  | sort > /tmp/after-file-list.txt

# Generate directory tree
tree -a --ignore-node_modules --ignore=.git > /tmp/after-tree.txt 2>/dev/null || ls -R . | grep -E "^.+:" > /tmp/after-tree.txt
```

> The `-prune` guards and the parenthesized pattern list matter: without them, directories whose names end in `.xml` match and build output (`target/`, `build/`) pollutes both snapshots, producing false "new/removed" entries in the comparison.
>
> Both runs MUST use identical prune/pattern lists — a mismatch invalidates the comparison.

### Generate Comparison Report

```bash
# Compare file counts and types
echo "=== BEFORE vs AFTER Comparison ==="
echo "Before files: $(wc -l < /tmp/before-file-list.txt)"
echo "After files: $(wc -l < /tmp/after-file-list.txt)"
echo ""

# Show new files (in after but not in before)
echo "=== NEW FILES ==="
comm -23 /tmp/after-file-list.txt /tmp/before-file-list.txt | sed 's|^\./||'

# Show removed files (in before but not in after)
echo "=== REMOVED FILES ==="
comm -13 /tmp/after-file-list.txt /tmp/before-file-list.txt | sed 's|^\./||'

# Show changed files (present in both but possibly different content)
echo "=== PRESERVED FILES ==="
comm -12 /tmp/after-file-list.txt /tmp/before-file-list.txt | sed 's|^\./||'
```

## Tree Map Report Format

Generate a structured markdown report:

````markdown
## Tree Map Comparison: [project-name]

### Before Refactoring

```
$ tree -a --ignore-node_modules --ignore=.git
[output captured to /tmp/before-tree.txt]
```

**File count:** N files

### After Refactoring

```
$ tree -a --ignore-node_modules --ignore=.git
[output captured to /tmp/after-tree.txt]
```

**File count:** M files

### Changes

| Category | Count | Details |
|----------|-------|---------|
| **New Files** | N | [list of new files] |
| **Removed Files** | M | [list of removed files] |
| **Preserved Files** | P | [list of files that exist in both states] |

### Expected Structure After Refactoring

The following directory structure is expected after successful Quarkus refactoring:

```
src/main/java/com/prudential/pruforce/aob/{function}/
├── api/
│   ├── rest/
│   │   └── {Domain}Resource.java      # REST Resource (controller)
│   ├── dto/
│   │   ├── request/
│   │   │   ├── Create{Domain}Request.java
│   │   │   └── Update{Domain}Request.java
│   │   └── response/
│   │       └── {Domain}Response.java
│   └── ApiResponse.java               # Shared response wrapper
├── service/
│   ├── {Domain}Service.java           # Service interface
│   └── impl/
│       └── {Domain}ServiceImpl.java   # Service implementation
├── repository/
│   ├── {Domain}Repository.java        # Repository interface (extends PanacheRepository)
│   └── impl/
│       └── {Domain}RepositoryImpl.java # Repository implementation
├── entity/
│   └── {Domain}.java                  # JPA entity (audit fields, @Version — see references/entity-mapper-metrics.md)
├── mapper/
│   └── {Domain}Mapper.java            # DTO ↔ Entity conversion (see references/entity-mapper-metrics.md)
├── exception/
│   ├── {Domain}Exception.java         # Base domain exception
│   └── GlobalExceptionHandler.java    # @ServerExceptionMapper
├── constants/
│   ├── {Domain}Constants.java         # Domain magic values (statuses, labels, limits)
│   └── {Domain}QueryConstants.java    # JPQL/native query literals
├── config/
│   └── {Domain}Config.java            # Configuration
└── util/
    └── {Domain}Utils.java             # Only if truly reusable logic exists
```

### Summary

- **Total change:** +X files, -Y files
- **Net change:** +Z files
- **Key modifications:**
  - Interface/Implementation pattern adopted for services and repositories
  - impl/ directories created for service and repository implementations
  - DTOs split into request/response packages under api/dto with Bean Validation
  - Mapper layer converts DTO ↔ Entity (see references/entity-mapper-metrics.md)
  - Custom exceptions extend DomainException, handled by GlobalExceptionHandler
  - Hardcoded values and query literals extracted to constants/ package
  - All annotations migrated to Quarkus equivalents
  - Constructor injection replacing field injection
  - Lombok configured with annotation processor (see references/lombok-rules.md)
````

## Integration with Refactoring Flow

This module should be run during:

1. **Phase 3: Analysis Report** — Capture baseline before any changes (Stage A, no edits yet)
2. **Phase 18: Validation & Tree Map Comparison** — Capture final state after verification passes, generate the comparison, and include it in the refactoring output

## Usage

To run outside the full flow:

- "Run the treemap module to compare before/after states"
- "Generate tree map comparison report"
- "Capture project structure before refactoring"