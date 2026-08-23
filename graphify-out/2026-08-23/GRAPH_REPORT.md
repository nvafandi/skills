# Graph Report - skills  (2026-08-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 53 nodes · 56 edges · 11 communities (5 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `247cea8b`
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

## God Nodes (most connected - your core abstractions)
1. `renderScenario()` - 4 edges
2. `escapeHtml()` - 3 edges
3. `renderPage()` - 3 edges
4. `setup` - 3 edges
5. `run-cucumber-quarkus.sh script` - 3 edges
6. `check-engineering-violations.sh script` - 3 edges
7. `formatDuration()` - 2 edges
8. `references` - 2 edges
9. `log()` - 2 edges
10. `show_help()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (11 total, 6 thin omitted)

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

## Knowledge Gaps
- **19 isolated node(s):** `args`, `BROWSER_CANDIDATES`, `{ execFileSync }`, `failed`, `features` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderScenario()` connect `renderScenario` to `split-cucumber-report.js`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `args`, `BROWSER_CANDIDATES`, `{ execFileSync }` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `split-cucumber-report.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._