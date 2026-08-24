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
echo "$JAVA_HOME"   # Verify JAVA_HOME points at a JDK 21 installation
```

Expected output for a compatible JDK:

```
openjdk version "21.0.2" 2024-01-16
```

## Verify the Build Tool Uses the Same JDK

The system `java` may be 21 while the Maven/Gradle wrapper resolves a different JVM. Check both:

```bash
./mvnw -version     # Shows "Java version: ..." actually used by Maven
./gradlew -version  # Shows "Launcher JVM" and "JVM" used by Gradle
```

If either reports < 21 but `java --version` is >= 21:

| Situation | Fix |
|---|---|
| `JAVA_HOME` points at an old JDK | Point `JAVA_HOME` at the JDK 21 home before running build commands |
| Gradle picks an older toolchain | Add/verify the [Gradle Java toolchain](https://docs.gradle.org/current/userguide/toolchains.html) (requires the Foojay resolver plugin in `settings.gradle(.kts)`) |
| Maven uses an older toolchain | Configure [Maven Toolchains](https://maven.apache.org/guides/mini/guide-using-toolchains.html) (`~/.m2/toolchains.xml` + `maven-toolchains-plugin`) |

Do **not** edit the project's build files just to work around a wrong local JVM — prefer fixing the environment first; only add toolchain configuration when the user agrees.

## Multiple JDKs Installed

If several JDKs are installed and the default one is < 21:

1. Look for a JDK 21+ already present: check `sdk current java` / `sdk list java` (SDKMAN!), `/usr/lib/jvm/*`, or `/Library/Java/JavaVirtualMachines/*` (macOS).
2. If found, export `JAVA_HOME` to that path for all subsequent build commands in this session instead of asking the user to change their global setup:
   ```bash
   export JAVA_HOME=/path/to/jdk-21
   ./mvnw -version   # confirm
   ```
3. If none exists, stop and ask the user to install JDK 21 (see Minimum Requirements below).

## Decision Table

| Detected situation | Action |
|---|---|
| `java` >= 21 and build tool reports >= 21 | PASS — continue |
| `java` >= 21, build tool < 21 | Fix environment/toolchain per table above, re-check, then PASS |
| `java` < 21 but a JDK 21+ exists locally | Export `JAVA_HOME`, re-check, then PASS |
| No JDK 21+ anywhere | Warn the user and **STOP** the refactoring |
| `java` not found | Warn the user and **STOP** the refactoring |

## Minimum Requirements

| Requirement | Value |
|---|---|
| JDK minimum | 21 (LTS) |
| Recommended | Latest 21.x (e.g., 21.0.2+) |
| Build tools | Maven 3.9+ or Gradle 8.5+ |

> Quarkus 3.x requires Java 17+, but these engineering standards target Java 21 features (records, pattern matching, virtual-thread readiness). Do not lower the requirement without explicit user instruction.
