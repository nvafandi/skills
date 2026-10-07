---
name: storytelling-to-prd
description: >
  Converts narrative storytelling about an application into a comprehensive 
  Product Requirements Document (PRD) from a business perspective. Captures 
  the "why", "what", and "for whom" of features through structured storytelling 
  sessions.
argument-hint: "[story-input-file|interactive]"
license: MIT
metadata:
  author: Nurvan Afandi
  version: 1.0.0
---

# Storytelling to PRD

Transforms raw storytelling narratives into structured Product Requirements Documents 
with business context, user journeys, success metrics, and feature specifications.

## Purpose

Bridge the gap between stakeholder vision and actionable product specifications by 
capturing the narrative context that drives feature decisions.

## Input Sources

- Verbal/written storytelling sessions
- Stakeholder interviews
- Business case documents
- Competitive analysis narratives
- User feedback stories

## Output: PRD Structure

```markdown
# Product Requirements Document: {Product Name}

## 1. Executive Summary
- Product Vision Statement
- Problem Statement
- Target Audience
- Key Value Proposition

## 2. Business Context
- Market Opportunity
- Competitive Landscape
- Business Goals & KPIs
- Success Metrics (OKRs)

## 3. User Personas
- Primary Personas (with jobs-to-be-done)
- Secondary Personas
- Anti-Personas (who we're not building for)

## 4. User Journeys & Stories
- Epic-level journeys
- Detailed user stories (INVEST criteria)
- Acceptance criteria (Gherkin format)
- Edge cases & unhappy paths

## 5. Feature Specifications
- Feature breakdown (MoSCoW prioritization)
- Functional requirements
- Non-functional requirements
- Dependencies & constraints

## 6. Business Rules & Logic
- Core business rules
- Validation rules
- Calculation formulas
- State transitions

## 7. UX/UI Requirements
- Wireframe references
- Accessibility requirements
- Responsive behavior
- Design system compliance

## 8. Release Strategy
- MVP scope
- Phase 2+ roadmap
- Rollout plan (canary, phased, big bang)
- Rollback criteria

## 9. Risks & Assumptions
- Technical risks
- Business risks
- Regulatory/compliance
- Assumptions log

## 10. Appendices
- Glossary
- Research references
- Stakeholder sign-off
```

## Process

### Phase 1: Story Ingestion
1. Accept storytelling input (file, transcript, or interactive)
2. Extract key entities: actors, actions, objects, outcomes
3. Identify emotional drivers and pain points
4. Map narrative arcs to feature concepts

### Phase 2: Structure & Synthesis
1. Organize extracted elements into PRD sections
2. Convert stories → user stories with acceptance criteria
3. Identify gaps requiring clarification
4. Prioritize using MoSCoW + business value

### Phase 3: Validation & Refinement
1. Generate clarifying questions for ambiguous areas
2. Cross-reference with existing product strategy
3. Validate metrics are measurable
4. Produce final PRD with traceability matrix

## Usage

```bash
# From file
opencode run storytelling-to-prd -- story-input.md

# Interactive session
opencode run storytelling-to-prd -- interactive

# With existing PRD to extend
opencode run storytelling-to-prd -- story-input.md --existing-prd current-prd.md
```

## Integration

- **Output feeds**: `prd-to-rfc`, `backend-architect-review`
- **References**: `coding-guidelines/references/coding-standards.md` (for NFRs)
- **Triggers**: `task-breakdown` after architect approval