---
name: generate-srs-existing-code
description: >
  Use this skill when generating a Software Requirements Specification (SRS) from existing source code. Use when the user wants to create, write, or generate software requirements specification, SRS, system requirements, functional and non-functional requirements, requirements engineering documentation, or technical specifications from a codebase. Covers functional requirements, non-functional requirements, API requirements, data requirements, business rules, user classes, external interfaces, and integration requirements. Even if they don't explicitly mention "SRS" or "Software Requirements Specification", use this skill when the user wants to document system requirements from existing code.
license: PT. Prudential Life Indonesia
metadata:
  author: Irsyad Jamal Pratama Putra - https://github.com/Irsyad-Putra1-Consultant_pru
---

# Software Requirements Specification Generation

Generate a complete Software Requirements Specification (SRS) from existing source code, project files, configuration, tests, and documentation.

## Critical Rules

- **Base the document only on the provided codebase and available project documentation.** Do not invent requirements that are not supported by the code.
- **If something is unclear, mark it as `Assumption:` or `Needs clarification:`.** Do not speculate.
- **Requirements inferred from implementation must be labeled as `Derived requirement:`.** Be explicit about the source of inference.
- **Use `shall` for mandatory requirements.** Avoid vague words such as fast, easy, robust, user-friendly, or scalable unless measurable evidence exists.
- **Each requirement must be testable and uniquely identifiable.**
- **Mention source files whenever possible.** Every requirement should be traceable to the code.
- **Use professional English throughout.**

## Analysis Scope

Analyze the following aspects of the codebase:

1. Product/system purpose
2. Business domain
3. Users, actors, roles, and external systems
4. Functional capabilities
5. API routes/endpoints
6. UI routes/screens/components if available
7. Data entities, schemas, DTOs, and persistence behavior
8. Business rules and validation rules
9. Authentication and authorization requirements
10. External interface requirements
11. Integration requirements
12. Background jobs, scheduled tasks, queues, or workers
13. Error handling and system responses
14. Configuration and environment variables
15. Non-functional requirements visible from implementation
16. Security, performance, reliability, maintainability, and observability requirements
17. Deployment/runtime constraints
18. Testing artifacts and acceptance criteria if available
19. Assumptions, constraints, dependencies, and open questions

## Generation Process

### Step 1: Gather Requirements

Before writing the document, clarify:
1. **Project purpose** — What business problem does this system solve?
2. **Repository/module name** — What is the codebase being analyzed?
3. **Version** — Is there a version detectable from build files, tags, or manifests?
4. **Available documentation** — README, API docs, architecture docs, configuration files, tests

### Step 2: Analyze the Codebase

Perform a thorough analysis of the codebase covering all items in the Analysis Scope above. Use the available tools to explore the codebase systematically:

1. Read project-level files (README, pom.xml, build.gradle, package.json, etc.)
2. Explore the directory structure
3. Identify controllers, services, repositories, entities, models, DTOs
4. Identify UI components, screens, templates, routes
5. Identify configuration files and environment variables
6. Identify test files and specifications
7. Identify integration points, external dependencies, background jobs
8. Identify security controls, authentication, authorization mechanisms
9. Identify performance characteristics (pagination, caching, rate limiting, timeouts)
10. Identify observability features (logging, metrics, tracing)

### Step 3: Generate the Document

Produce a single Markdown document named `software-requirements-specification.md` using the required structure below.

## Required Markdown Structure

Generate the Markdown document using the following structure:

```
# Software Requirements Specification

## 1. Document Information

Include:
- Document title
- Generated date
- Project name
- Repository/module name if detectable
- Version if detectable
- Author: Generated from existing code analysis

## 2. Introduction

### 2.1 Purpose
### 2.2 Scope
### 2.3 Intended Audience
### 2.4 Definitions, Acronyms, and Abbreviations
### 2.5 References

## 3. Overall Description

### 3.1 Product Perspective
Include a MermaidJS context diagram.

### 3.2 Product Functions
### 3.3 User Classes and Characteristics
### 3.4 Operating Environment
### 3.5 Design and Implementation Constraints
### 3.6 User Documentation
### 3.7 Assumptions and Dependencies

## 4. System Features and Functional Requirements

For each feature, document:
- Feature ID (SF-001, SF-002, etc.)
- Description
- Source Evidence
- Functional Requirements (FR-001, FR-002, etc.)
- Inputs
- Processing
- Outputs
- Business Rules
- Validation Rules
- Error Handling Requirements
- Acceptance Criteria (AC-001, AC-002, etc.)

## 5. External Interface Requirements

### 5.1 User Interfaces
### 5.2 Hardware Interfaces
### 5.3 Software Interfaces
### 5.4 Communication Interfaces

## 6. API Requirements

For each API endpoint, document:
- Requirement ID (FR-API-001, etc.)
- Method and path
- Purpose
- Actor/consumer
- Handler/controller
- Authentication required
- Authorization rules
- Request parameters and body
- Response body
- Success and error status codes
- Validation rules
- Related feature ID
- Source files

## 7. Data Requirements

For each entity/model, document:
- Data requirement ID (DR-001, etc.)
- Entity/model name
- Source file
- Purpose
- Fields/properties
- Data types
- Required/optional status
- Default values
- Relationships
- Constraints or indexes
- Persistence behavior

Include a MermaidJS ER diagram if database relationships are found.

## 8. Business Rules

List all business rules using this table:

| Rule ID | Business Rule | Applies To | Source File / Evidence |
|---|---|---|---|

## 9. Non-Functional Requirements

### 9.1 Performance Requirements (NFR-PERF-XXX)
### 9.2 Security Requirements (NFR-SEC-XXX)
### 9.3 Reliability and Availability Requirements (NFR-REL-XXX)
### 9.4 Maintainability Requirements (NFR-MAINT-XXX)
### 9.5 Observability Requirements (NFR-OBS-XXX)
### 9.6 Portability and Deployment Requirements (NFR-DEP-XXX)

## 10. Authentication and Authorization Requirements

## 11. Integration Requirements

Document each integration with requirement ID (IR-001, etc.).

Include a MermaidJS integration diagram if integrations are detected.

## 12. Background Processing Requirements

Document each job with requirement ID (BGR-001, etc.).

## 13. Functional Flow and Sequence Diagrams

## 14. Error Handling and Response Requirements

## 15. Configuration Requirements

## 16. Constraints

## 17. Acceptance Criteria Summary

## 18. Requirements Traceability Matrix

## 19. Known Gaps and Limitations

## 20. Assumptions and Open Questions

## 21. Appendix
```

## Requirement Writing Rules

Follow these rules for all requirement statements:

- Use `shall` for mandatory requirements.
- Avoid vague words such as fast, easy, robust, user-friendly, or scalable unless measurable evidence exists.
- Each requirement must be testable.
- Each requirement must be uniquely identifiable.
- Requirements must be based on implementation evidence.
- If inferred from code behavior, prefix with `Derived requirement:`.
- If unclear or incomplete, mark as `Needs clarification:`.

## Diagram Requirements

All diagrams must use valid MermaidJS syntax inside Markdown code blocks:

```markdown
```mermaid
```
```

Generate at minimum:
1. System context diagram
2. Functional flow diagram
3. Sequence diagram for key requirement flow
4. Entity relationship diagram (if data models exist)
5. Integration diagram (if external integrations exist)
6. Optional deployment/runtime diagram (if deployment files exist)

### MermaidJS Rules

- Use simple node names
- Avoid special characters that may break Mermaid syntax
- Use descriptive labels
- Do not include invalid syntax
- Keep diagrams readable
- If the system is complex, split diagrams into multiple smaller diagrams
- Validate MermaidJS syntax mentally before returning the document

## Output Rules

- Return only the final Markdown content.
- Do not include explanations outside the Markdown document.
- Do not wrap the entire output in triple backticks.
- The output must be ready to save as `software-requirements-specification.md`.

## Accuracy Rules

- Base the document only on the provided codebase and available project documentation.
- Do not hallucinate undocumented requirements.
- Mention source files whenever possible.
- If a requirement is inferred from naming, structure, or implementation behavior, label it as a derived requirement.
- If information is missing, write `Needs clarification`.
- Prefer precise, testable requirement descriptions over generic statements.
- Use professional English.