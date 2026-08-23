# Graph Report - skills  (2026-08-23)

## Corpus Check
- 74 files · ~59,051 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 76 nodes · 78 edges · 17 communities (9 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6492de17`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- split-cucumber-report.js
- setup
- run-cucumber-quarkus.sh
- renderScenario
- check-engineering-violations.sh
- generate-feature.sh
- setup-quarkus-cucumber.sh
- check-spring-annotations.sh
- check-spring-deps.sh
- check-quarkus-annotations.sh
- evaluate-session.sh
- Quarkus Project Refactoring
- Phase 2: Build System
- Phase 3: Code Migration
- Phase 4: Cleanup
- Phase 5: Verify
- Step 6: Refactoring Review (Self-Reflection)

## God Nodes (most connected - your core abstractions)
1. `Quarkus Project Refactoring` - 14 edges
2. `renderScenario()` - 4 edges
3. `Phase 2: Build System` - 3 edges
4. `Phase 3: Code Migration` - 3 edges
5. `Phase 4: Cleanup` - 3 edges
6. `escapeHtml()` - 3 edges
7. `renderPage()` - 3 edges
8. `setup` - 3 edges
9. `run-cucumber-quarkus.sh script` - 3 edges
10. `check-engineering-violations.sh script` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (17 total, 8 thin omitted)

### Community 0 - "split-cucumber-report.js"
Cohesion: 0.11
Nodes (15): args, BROWSER_CANDIDATES, { execFileSync }, failed, features, files, fs, JSON_REPORT (+7 more)

### Community 1 - "setup"
Cohesion: 0.33
Nodes (5): references, setup, $schema, description, path

### Community 2 - "run-cucumber-quarkus.sh"
Cohesion: 0.83
Nodes (3): log(), run-cucumber-quarkus.sh script, show_help()

### Community 3 - "renderScenario"
Cohesion: 0.67
Nodes (4): escapeHtml(), formatDuration(), renderPage(), renderScenario()

### Community 4 - "check-engineering-violations.sh"
Cohesion: 0.83
Nodes (3): add_result(), check-engineering-violations.sh script, show_help()

### Community 11 - "Quarkus Project Refactoring"
Cohesion: 0.20
Nodes (9): Available Scripts, Critical Rules, Phase 1: Analyze, Quarkus Project Refactoring, Reference Files, Step 2: Git branch (optional), Step 4: Verify the Refactoring, Step 5: Validation Report (+1 more)

### Community 12 - "Phase 2: Build System"
Cohesion: 0.67
Nodes (3): Decision Gate Table, Execution Protocol, Phase 2: Build System

### Community 13 - "Phase 3: Code Migration"
Cohesion: 0.67
Nodes (3): Decision Gate Table, Execution Protocol, Phase 3: Code Migration

### Community 14 - "Phase 4: Cleanup"
Cohesion: 0.67
Nodes (3): Decision Gate Table, Execution Protocol, Phase 4: Cleanup

## Knowledge Gaps
- **35 isolated node(s):** `Critical Rules`, `Reference Files`, `Available Scripts`, `Phase 1: Analyze`, `Step 2: Git branch (optional)` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Quarkus Project Refactoring` connect `Quarkus Project Refactoring` to `Phase 2: Build System`, `Phase 3: Code Migration`, `Phase 4: Cleanup`, `Phase 5: Verify`, `Step 6: Refactoring Review (Self-Reflection)`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `Phase 2: Build System` connect `Phase 2: Build System` to `Quarkus Project Refactoring`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Phase 3: Code Migration` connect `Phase 3: Code Migration` to `Quarkus Project Refactoring`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `Critical Rules`, `Reference Files`, `Available Scripts` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `split-cucumber-report.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._