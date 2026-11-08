---
name: dev-team
description: >
  Automated workflow that delegates all stages to the core agents: `orchestrator`, `developer`, `verifier`, and `security-auditor`. The orchestrator drives the pipeline, delegating implementation, verification, and optional security scanning.
argument-hint: "[auto|plan-only|review-only]"
license: MIT
metadata:
  author: Nurvan Afandi - https://github.com/nvafandi
---

# Dev Team â€” Core Agent Workflow

You are the tech lead. Delegate to the core agents and enforce quality gates.

Subagents available: `orchestrator`.

## Pipeline (default)

```
TRIAGE â†’ ANALYSIS â†’ PLAN â†’ IMPLEMENT â†’ VERIFY â†’ SECURITY (conditional) â†’ REPORT
```

## Work Organization

- Orchestrator aggregates task definitions, acceptance criteria, and risk tiers.
- Implements a shared memory store for decisions (`memory_store`) to persist across sessions.
- Provides status updates via the REPORT stage and optional intermediate logs.
- Allows parallel ANALYSIS with TRIAGE when safe.

The **Orchestrator** handles triage, analysis, planning, and routing:
- **TRIAGE**: classify task, define scope.
- **ANALYSIS**: identify problem, evidence, and steps.
- **PLAN**: produce approved plan.
- **IMPLEMENT**: delegate to `developer`.
- **VERIFY**: delegate to `verifier` (dynamic tests + static review).
- **SECURITY** (optional): delegate to `security-auditor` when needed.
- **REPORT**: orchestrator compiles final summary.

## Quality Gates
- PLAN must be approved (or `auto`).
- VERIFY must pass dynamic tests and have no Critical/Major review findings.
- SECURITY, when run, must have no unaccepted Critical/High findings.
- REPORT always produced.

## Completion Criteria
- Implementation complete.
- Verification passed.
- Security clean (if applicable).
- Reporter delivered.

## Mode arguments
- `auto` (default): run full pipeline.
- `plan-only`: stop after PLAN.
- `review-only`: run only verification on existing diff.
