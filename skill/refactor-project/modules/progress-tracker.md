# Module: Progress Tracker

Persistent run history for the `refactor-project` skill. Records every refactoring session across all projects so previous runs are visible before starting a new one.

## File Location

The tracker lives alongside the skill:

```
~/.config/opencode/skills/refactor-project/progress-tracker.md
```

If the file does not exist, create it on first run.

## When to Update

| Moment | Action |
|---|---|
| **Start of run (Phase 1)** | Check if a previous run exists for the same project path. If yes, present the history and ask whether to resume, archive, or start fresh. |
| **Phase 3 gate passed** | Append a new run entry with status `in-progress`. |
| **Every phase (P04–P18)** | Update the run entry: flip the phase checkbox, update status line. |
| **Phase 19 complete** | Mark the run entry as `completed` (or `partial` if items are deferred). |
| **Phase 20 (if git)** | Record the branch name and PR URL. |

## Template

````markdown
# Refactor Project — Run History

> Auto-maintained by skill `refactor-project`. Each row is one refactoring run.

| # | Date | Project | Phases | Status | Agent / Model | Branch | Notes |
|---|---|---|---|---|---|---|---|
| 1 | 2026-08-30 14:00 | /home/user/my-app | 20/20 | completed | opencode / mimo-v2.5 | `feature/PLAIPRO-123` | Full run, 0 TODOs |
| 2 | 2026-08-31 09:30 | /home/user/other-app | 14/20 | partial | opencode / mimo-v2.5 | none | Stopped at P14, deferred P15–P20 |

---

## Run Detail — #1: my-app

| Field | Value |
|---|---|
| Project root | `/home/user/my-app` |
| Started | 2026-08-30 14:00 |
| Completed | 2026-08-30 18:45 |
| Duration | ~4h 45m |
| Phases completed | 20/20 |
| Verification checks | 6/6 PASS |
| Validation checks | 15/15 PASS |
| TODOs remaining | 0 |
| Branch | `feature/PLAIPRO-123` |
| PR | Draft #42 (never merged) |

### Phase Results

| Phase | Result | Files | Compile |
|---|---|---|---|
| P01 Inventory | PASS | 0 | — |
| P02 Source Scan | PASS | 0 | — |
| P03 Analysis | PASS | 1 (refactor-plan.md) | — |
| P04 Git Branch | PASS | 0 | — |
| P05 JDK | PASS | 0 | — |
| P06 Build | PASS | 2 | PASS |
| P07 Package | SKIP | 0 | — |
| P08 CDI | PASS | 6 | PASS |
| P09 API | PASS | 8 | PASS |
| P10 Service | PASS | 5 | PASS |
| P11 Repository | PASS | 4 | PASS |
| P12 Exceptions | PASS | 3 | PASS |
| P13 Documentation | PASS | 12 | PASS |
| P14 Metrics | SKIP | 0 | — |
| P15 Tests | PASS | 4 | PASS |
| P16 Cleanup | PASS | 0 | PASS |
| P17 Verification | PASS | 0 | PASS |
| P18 Validation | PASS | 0 | PASS |
| P19 Report | PASS | 1 | — |
| P20 Commit | PASS | 0 | — |

### Deferred Items

_(none)_

---

## Run Detail — #2: other-app

_(abbreviated)_
````

## Rules

1. **Append-only for runs** — never delete or reorder existing run entries. Corrections are new entries or edits within the same run detail block.
2. **One run detail per run** — each run gets its own `## Run Detail — #N: {short-name}` section below the summary table.
3. **Status values**: `in-progress`, `completed`, `partial`, `failed`, `abandoned`.
4. **Short project name** = the last path segment (e.g., `/home/user/my-app` → `my-app`).
5. **Link from refactor-plan.md** — the in-project `refactor-plan.md` §1 should note the tracker run number: `Tracker run: #N`.
6. **Present on session start** — before beginning a new run for a project that already has history, show the previous runs and ask the user what to do.

## Detection Logic

When starting a new run:

1. Read `~/.config/opencode/skills/refactor-project/progress-tracker.md`
2. Search the summary table for rows matching the current project path
3. If matches found → present them and ask:
   - **Resume** — continue from where the last run stopped (load the existing `refactor-plan.md`)
   - **Archive** — archive the old `refactor-plan.md`, start fresh
   - **Fresh** — start a new run ignoring previous history
4. If no matches → proceed silently, create the entry on Phase 3

## Integration with refactor-plan.md

The `refactor-plan.md` in the project root is the **per-run execution document**. The progress tracker is the **cross-run history**. They complement each other:

| Document | Scope | Lifetime | Location |
|---|---|---|---|
| `refactor-plan.md` | Single run | Until next run overwrites | `<project-root>/refactor-plan.md` |
| `progress-tracker.md` | All runs | Permanent | `~/.config/opencode/skills/refactor-project/progress-tracker.md` |
