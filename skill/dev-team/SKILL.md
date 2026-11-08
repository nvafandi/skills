---
name: dev-team
description: >
  Automated workflow that delegates all stages to the core agents:
  `orchestrator`, `analyst`, `developer`, `tester`, `reviewer`, and
  `security-auditor`. The orchestrator drives the pipeline, delegating analysis,
  implementation, testing, review, and optional security scanning.
argument-hint: "[auto|plan-only|review-only]"
license: MIT
metadata:
  author: Nurvan Afandi - https://github.com/nvafandi
---

# Dev Team — Core Agent Workflow

You are the tech lead. Delegate to the core agents and enforce quality gates.

Subagents available: `orchestrator`, `analyst`, `developer`, `tester`, `reviewer`, `security-auditor`.

## Pipeline (default)

```
TRIAGE → ANALYSIS → PLAN → IMPLEMENT → TEST → SECURITY (conditional) → REVIEW → REPORT
```

## Work Organization

- Orchestrator owns task intake, triage, routing, gates, and report.
- Analyst produces evidence-backed problem framing, causal chain, options, and
  recommended steps.
- Developer implements the approved plan and runs the fastest self-check.
- Tester runs Gate 1: dynamic test execution and coverage checks.
- Reviewer (experienced tech lead) checks plan conformance, acceptance criteria,
  and static quality; gives final review sign-off.
- Security auditor runs the scanner matrix and manual threat review when
  triggered.
- Shared memory stores key decisions (`memory_store`) across sessions.
- Status updates surface in REPORT and optional intermediate logs.
- ANALYSIS can run in parallel with TRIAGE when safe.

## Stage owners

- **TRIAGE**: `orchestrator` — classify task, define scope and acceptance
  criteria.
- **ANALYSIS**: `analyst` — problem statement, evidence, causal chain, options,
  recommended steps.
- **PLAN**: `orchestrator` — convert findings into approved plan with DoD.
- **IMPLEMENT**: `developer` — code, callers, tests, fixtures, docs.
- **TEST**: `tester` — dynamic tests, regression, edge cases, coverage gaps.
- **SECURITY** (conditional): `security-auditor`.
- **REVIEW**: `reviewer` — plan conformance, acceptance criteria, static review.
- **REPORT**: `orchestrator` — final standardized report.

## Quality Gates

- ANALYSIS findings present before PLAN for Tier 2-5.
- PLAN must be approved (or `auto`).
- TEST must pass dynamic tests and report coverage gaps.
- SECURITY, when run, must have no unaccepted Critical/High findings.
- REVIEW must have no open Critical/Major and acceptance criteria verified.
- REPORT always produced.

## Completion Criteria
- Implementation complete.
- Tests pass.
- Security clean (if applicable).
- Reviewer signed off.
- Orchestrator delivered the final report.

## Mode arguments
- `auto` (default): run full pipeline.
- `plan-only`: stop after PLAN.
- `review-only`: run only review on the existing diff.
