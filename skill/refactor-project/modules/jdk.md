# Module: Check JDK Version

Verify that the installed JDK meets the version requirement (Java 21) before proceeding with the refactoring.

## Preconditions

This phase has no preconditions — it must **always** run as the very first step.

## Instructions

- **DO NOT** skip this phase.
- [ ] Check the JDK version (requires Java 21 or later).
- [ ] If the version is **>= 21**, mark this phase as passed and proceed to the next phase
- [ ] If the version is **< 21** or `java` is not found:
    - **Warn the user**: "JDK 21 or later is required for this refactoring. Currently, installed: <detected version or 'none'>. Please install JDK 21 and ensure it is on your PATH before retrying."
    - **Stop the refactoring** — do not proceed to any subsequent phase

## Checking Java Version

Run one of the following commands to detect the installed Java version:

```bash
java -version       # Standard output
java --version      # Single-line version output (Java 9+)
```

Expected output for a compatible JDK:

```
openjdk version "21.0.2" 2024-01-16
```

## Minimum Requirements

| Requirement | Value |
|---|---|
| JDK minimum | 21 (LTS) |
| Recommended | Latest 21.x (e.g., 21.0.2+) |
| Build tools | Maven 3.9+ or Gradle 8.5+ |
