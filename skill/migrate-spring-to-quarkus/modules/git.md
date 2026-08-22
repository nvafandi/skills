# Module: Git / Branch Management

**Optional module.** Set up an isolated migration branch before making changes, and commit + open a draft PR after the migration is verified. Requires user confirmation at every step.

## Prerequisites

Verify the target project is a git repository:

```bash
git -C <project-path> rev-parse --is-inside-work-tree
```

If this fails, **skip this module entirely** — inform the user that git management is not available because the project is not a git repository.

## What to do

### Pre-migration (before executing modules)

- [ ] Verify the project is a git repository
- [ ] Ensure agent session files are excluded from version control
- [ ] Determine the JIRA ticket number for this migration
- [ ] Propose branch name (`feature/JIRA-TICKET-NUMBER`) to the user and wait for confirmation
- [ ] Create the migration branch from `master`

### Post-migration (after verification)

- [ ] Write `migration-report.md` at the repo root
- [ ] Show the user a summary of changes and ask for confirmation before committing
- [ ] Ask the user for confirmation before pushing and creating the draft PR

## Exclude agent session files

Before any commit, ensure that agent session directories are listed in the project's `.gitignore`. These directories may contain sensitive data (tokens, credentials) logged during tool execution.

Append the following entries to `.gitignore` if they are not already present:

```
# AI agent session/local files — may contain tokens and secrets
.claude/
.cursor/
.codex/
.opencode/
.copilot/
.cline/
.continue/
.windsurf/
.junie/
.pi/
.roo/
.augment/
.aider*
CLAUDE.local.md
```

This prevents session logs from being committed and pushed to the remote repository.

## Create the migration branch

Determine the JIRA ticket number for this migration (e.g., `PLAIPRO-32219`).

Propose the branch name to the user:

> I'll create branch `feature/JIRA-TICKET-NUMBER` from `master`. OK, or do you prefer a different name?

Wait for the user to confirm or provide a custom name. Then create the branch:

```bash
git checkout master
git checkout -b <confirmed-branch-name>
```

Branch name format: `feature/JIRA-TICKET-NUMBER` (e.g., `feature/PLAIPRO-32219`).

## Repository Naming Conventions

| Service Type | Repo Format | Example |
|---|---|---|
| Old (Spring Boot) service | `*-services` | `payment-services` |
| New (Quarkus) service | `*-qrks` | `payment-qrks` |

When migrating, the old service repo (`*-services`) is checked out from `master`, and the migration branch is created as `feature/JIRA-TICKET-NUMBER`.

## Commit Message Conventions

Use conventional commit format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat:` — New feature
- `fix:` — Bug fix
- `chore:` — Maintenance, refactoring, tooling
- `docs:` — Documentation changes
- `style:` — Code formatting, whitespace
- `refactor:` — Code restructuring without behavior change
- `perf:` — Performance improvements
- `test:` — Test additions or fixes

**For migration commits:**
```
chore: migrate Spring Boot to Quarkus

Migrated by {agent} using skill migrate-spring-to-quarkus
- Strategy: full Quarkus migration
- Modules completed: build, code, testing, cleanup, validation
- Checks passed: 6/6
```

## Branch Naming Conventions

| Purpose | Pattern | Example |
|---|---|---|
| Migration | `feature/JIRA-TICKET-NUMBER` | `feature/PLAIPRO-32219` |
| Feature | `feature/{description}` | `feature/add-payment-service` |
| Bugfix | `bugfix/{description}` | `bugfix/fix-transaction-rollback` |
| Hotfix | `hotfix/{description}` | `hotfix/fix-security-vulnerability` |

Migration branches use `feature/JIRA-TICKET-NUMBER` format, checked out from `master`.

## Commit

### Pre-commit: check for secrets

Before staging files, scan the working directory for accidentally exposed secrets. Search for patterns like:

- Hardcoded tokens or API keys (e.g., `ghp_`, `ghs_`, `sk-`, `Bearer`, `AKIA`)
- Password or credential values in plain text
- Private keys (`-----BEGIN.*PRIVATE KEY-----`)
- `.env` files or agent session logs that slipped past `.gitignore`

```bash
grep -rn --include='*.java' --include='*.properties' --include='*.yml' --include='*.md' --include='*.json' \
  -E '(ghp_|ghs_|sk-|AKIA|Bearer [A-Za-z0-9]|password\s*=\s*[^\$]|BEGIN.*PRIVATE KEY)' .
```

If any matches are found, flag them to the user before proceeding. Do **not** commit files containing secrets.

### Stage and commit

After migration and verification are complete, show the user a summary of staged changes and ask for confirmation:

> Migration complete. Ready to commit all changes (including `migration-report.md`) with message:
>
> ```
> Migrate Spring Boot to Quarkus
>
> Migrated by Claude using skill spring-to-quarkus
> ```
>
> Proceed?

Only commit after the user confirms.

## Push and create draft PR

Ask the user for confirmation before pushing:

> Ready to push `<branch-name>` to `origin` and create a draft PR. Proceed?

```bash
git push origin <branch-name>
gh pr create --draft \
  --title "<branch-name>: Spring Boot → Quarkus migration" \
  --body "$(cat migration-report.md)"
```

The draft PR is a permanent record — never merge it. `master` always keeps the original Spring Boot code. Use labels to categorize runs (e.g., `strategy:native`, `strategy:spring-compat`).