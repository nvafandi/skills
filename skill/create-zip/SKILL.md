---
name: create-zip
description: Use when the user wants to backup, zip, compress, or archive a project. Creates a zip file with format {projectname}-timestamp.zip in the parent directory. Triggers on keywords like "backup", "zip", "compress", "archive".
---

# Create Zip Backup

Create a compressed zip backup of the current project.

## Format

```
{projectname}-{YYYYMMDD-HHMMSS}.zip
```

Example: `my-project-20260827-202207.zip`

## Steps

1. Get the project directory name: `basename $(pwd)`
2. Generate timestamp: `date +%Y%m%d-%H%M%S`
3. Run from the **parent** directory of the project:

```bash
PROJECT_NAME=$(basename $(pwd))
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ZIP_NAME="${PROJECT_NAME}-${TIMESTAMP}.zip"
cd .. && zip -r "$ZIP_NAME" "$PROJECT_NAME" -x "$PROJECT_NAME/target/*"
```

## Excludes

Always exclude:
- `target/` — Maven build output

## Output

Print the zip file path and size:
```bash
ls -lh "../$ZIP_NAME"
```
