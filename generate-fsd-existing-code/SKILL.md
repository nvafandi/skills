---
name: generate-fsd-existing-code
description: >
  Use this skill when generating a Functional Specification Document (FSD) from existing source code. Use when the user wants to create, write, or generate functional specification documentation, FSD, functional requirements, system behavior documentation, or business requirements from a codebase. Covers project purpose, features, API endpoints, UI screens, business rules, data entities, use cases, and functional flows. Even if they don't explicitly mention "FSD" or "Functional Specification", use this skill when the user wants to document system functionality from existing code.
license: PT. Prudential Life Indonesia
metadata:
  author: Irsyad Jamal Pratama Putra - https://github.com/Irsyad-Putra1-Consultant_pru
---

# Functional Specification Document Generation

Generate a complete Functional Specification Document (FSD) from existing source code, project files, configuration, and documentation.

## Critical Rules

- **Base the document only on the existing codebase and available project documentation.** Do not invent features that are not present in the code.
- **If something is unclear, mark it as `Assumption:` or `Needs clarification:`.** Do not speculate.
- **Use clear, structured, professional writing.** The document must be understandable by business stakeholders, product owners, QA engineers, software engineers, technical leads, architects, DevOps engineers, and future maintainers.
- **Mention source files whenever possible.** Every claim should be traceable to the code.
- **If a feature is inferred from naming or structure, label it as an assumption.**
- **Do not hallucinate undocumented behavior.** Prefer precise functional descriptions over generic statements.
- **Use professional English throughout.**

## Analysis Scope

Analyze the following aspects of the codebase:

1. Project purpose and business domain
2. Application modules and features
3. User roles and actors
4. Functional flows
5. API routes/endpoints
6. UI pages/screens/components if available
7. Business rules
8. Validation rules
9. Data entities and relationships
10. Authentication and authorization behavior
11. Notifications, reports, exports, or integrations
12. Background processes, scheduled tasks, queues, or workers
13. Error scenarios and user-facing messages
14. Configuration that affects functionality
15. Functional limitations and open questions
16. Test cases or specifications if available

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

### Step 3: Generate the Document

Produce a single Markdown document named `functional-specification-document.md` using the required structure below.

## Required Markdown Structure

Generate the Markdown document using the following structure:

```
# Functional Specification Document

## 1. Document Information

Include:
- Document title
- Generated date
- Project name
- Repository/module name if detectable
- Version if detectable
- Author: Generated from existing code analysis

## 2. Executive Summary

Provide a concise functional summary of the system based on the existing implementation.

Include:
- Main business purpose
- Main users or consuming systems
- Primary functional capabilities
- Business value delivered by the system

## 3. System Context

Explain how the system fits into the broader business or technical environment.

Include:
- Application type (web app, mobile app, REST API, back-office system, batch service, microservice, CLI, library, etc.)
- Main business domain
- Internal and external consumers
- Upstream and downstream systems if detectable
- External integrations if any

Also include a MermaidJS system context diagram.

## 4. Stakeholders and Actors

Identify all users, roles, services, or external systems that interact with the application.

Use this table:

| Actor | Type | Description | Evidence / Source File |
|---|---|---|---|

## 5. Functional Scope

Describe the functional scope of the application.

Use two subsections:
- In Scope
- Out of Scope / Not Detected

## 6. Feature Overview

List all detected features/modules using this table:

| Feature ID | Feature Name | Description | Source Files / Modules |
|---|---|---|---|

## 7. Feature Details

For each detected feature, document using this format:

### Feature F-001: `{Feature Name}`
- Description
- User / Actor
- Trigger
- Preconditions
- Main Flow
- Alternative Flows
- Error / Exception Flows
- Business Rules
- Validation Rules
- Data Used
- Source References

## 8. Functional Flow Diagrams

Generate MermaidJS diagrams for the most important functional flows.

## 9. Use Case Specification

Identify and document use cases from the existing implementation.

For each use case include:
- Use Case ID
- Primary Actor
- Goal
- Trigger
- Preconditions
- Postconditions
- Main Success Scenario
- Extensions / Alternative Scenarios
- Failure Scenarios
- MermaidJS sequence diagram

## 10. API Functional Specification

If API endpoints are found, document each endpoint from a functional perspective.

For each endpoint include:
- Method and path
- Functional purpose
- Actor/consumer
- Handler/controller
- Authentication required
- Authorization rules
- Request parameters and body
- Response body
- Success and error status codes
- Validation rules
- Business rules
- Related feature ID
- Related data entities
- Source files

## 11. UI / Screen Functional Specification

If UI screens are found, document them.

## 12. Business Rules

List all business rules detected using this table:

| Rule ID | Business Rule | Applies To | Source File / Evidence |
|---|---|---|---|

## 13. Validation Rules

Document all detected validation rules using this table:

| Validation ID | Field/Input | Rule | Error Behavior | Source File |
|---|---|---|---|---|

## 14. Data Requirements

Analyze all entities, models, schemas, migrations, DTOs, or database-related files.

Include a MermaidJS ER diagram if database relationships are found.

## 15. Authentication and Authorization Behavior

Analyze functional access control behavior.

## 16. Notifications, Reports, and Exports

Document any notification, reporting, import, export, email, file generation, dashboard, or messaging functionality.

## 17. External Integrations

Document any external systems, APIs, SDKs, queues, cloud services, file storage, email services, payment gateways, or third-party services.

## 18. Background Jobs / Scheduled Tasks

If background jobs, queues, cron jobs, event consumers, or schedulers exist, document them.

## 19. Functional Error Handling

Document functional errors and expected system behavior.

## 20. Non-Functional Notes Impacting Functionality

Only include non-functional aspects that directly affect functional behavior.

## 21. Traceability Matrix

Map detected features to code artifacts and tests.

## 22. Known Functional Limitations

List functional limitations based on the existing code.

## 23. Assumptions and Open Questions

List all assumptions and unclear areas.

## 24. Appendix

Include important files analyzed, key classes/functions, and glossary if needed.
```

## Diagram Requirements

All diagrams must use valid MermaidJS syntax inside Markdown code blocks:

```markdown
```mermaid
```
```

Generate at minimum:
1. System context diagram
2. Functional flow diagram
3. Use case sequence diagram
4. Entity relationship diagram (if data models exist)
5. Optional user journey diagram (if UI or user-facing flows exist)
6. Optional integration diagram (if external integrations exist)

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
- The output must be ready to save as `functional-specification-document.md`.

## Accuracy Rules

- Base the document only on the provided codebase and available project documentation.
- Do not hallucinate undocumented behavior.
- Mention source files whenever possible.
- If a feature is inferred from naming or structure, label it as an assumption.
- If information is missing, write `Needs clarification`.
- Prefer precise functional descriptions over generic statements.
- Use professional English.