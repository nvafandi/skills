# Module: Tree Map Comparison

Compare the project's directory structure before and after refactoring to visualize changes.

## What to do

### Before Refactoring (Capture Baseline)

Run this module before the refactoring flow begins to capture the project's initial state:

```bash
# Generate before tree map
find . -type f -name "*.java" -o -name "*.xml" -o -name "*.gradle" -o -name "*.pom" | sort > /tmp/before-file-list.txt

# Generate directory tree
tree -a --ignore-node_modules --ignore=.git > /tmp/before-tree.txt 2>/dev/null || ls -R . | grep -E "^.+:" > /tmp/before-tree.txt
```

### After Refactoring (Capture Final State)

Run this module after the refactoring flow completes (after validation):

```bash
# Generate after tree map
find . -type f -name "*.java" -o -name "*.xml" -o -name "*.gradle" -o -name "*.pom" | sort > /tmp/after-file-list.txt

# Generate directory tree
tree -a --ignore-node_modules --ignore=.git > /tmp/after-tree.txt 2>/dev/null || ls -R . | grep -E "^.+:" > /tmp/after-tree.txt
```

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
│   └── {Domain}Resource.java          # REST Resource (controller)
├── service/
│   ├── {Domain}Service.java           # Service interface
│   └── impl/
│       └── {Domain}ServiceImpl.java   # Service implementation
├── repository/
│   ├── {Domain}Repository.java         # Repository interface (extends PanacheRepository)
│   └── impl/
│       └── {Domain}RepositoryImpl.java # Repository implementation
└── config/
    └── {Domain}Config.java            # Configuration
```

### Summary

- **Total change:** +X files, -Y files
- **Net change:** +Z files
- **Key modifications:**
  - Interface/Implementation pattern adopted for services and repositories
  - impl/ directories created for service and repository implementations
  - All annotations migrated to Quarkus equivalents
  - Constructor injection replacing field injection
  - Lombok configured with annotation processor (see references/lombok-rules.md)
````

## Integration with Refactoring Flow

This module should be run during:

1. **Step 1: Analyze** - Capture baseline before any changes
2. **Step 3: Execute Modules** - Run after all other modules complete
3. **Step 5: Validation Report** - Include comparison in final output

## Usage

To run outside the full flow:

- "Run the treemap module to compare before/after states"
- "Generate tree map comparison report"
- "Capture project structure before refactoring"