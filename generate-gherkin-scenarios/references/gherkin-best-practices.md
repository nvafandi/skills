# Gherkin Best Practices

Guidelines for writing effective Gherkin scenarios based on Cucumber best practices.

> **API testing note:** The anti-patterns below target **UI and procedural implementation details** (button clicks, field names, page URLs, database rows). When the system under test is an **API**, the HTTP method, endpoint, request payload, and response status/body ARE the observable behavior. For API features those contract details are **required** (see [step-patterns.md](step-patterns.md) and the SKILL.md "Mandatory API Details" section) — but they must still be expressed declaratively with `Examples` covering happy path, negative case, and edge case.

## Core Principle: Describe Behavior, Not Implementation

Your scenarios should describe the **intended behavior** of the system, not the implementation. In other words, describe _what_, not _how_.

**Ask yourself:** "Will this wording need to change if the implementation changes?"

If the answer is **Yes**, rework it to avoid implementation-specific details.

## Declarative vs Imperative Style

### Declarative Style (Recommended)

Describe the behavior of the application in business terms, hiding implementation details.

```gherkin
Feature: Subscribers see different articles based on their subscription level

  Scenario: Free subscribers see only the free articles
    Given Free Frieda has a free subscription
    When Free Frieda logs in with her valid credentials
    Then she sees a Free article

  Scenario: Subscriber with a paid subscription can access both free and paid articles
    Given Paid Patty has a basic-level paid subscription
    When Paid Patty logs in with her valid credentials
    Then she sees a Free article and a Paid article
```

**Benefits:**
- Scenarios read as "living documentation"
- Focus on customer value, not keystrokes
- Resilient to implementation changes
- Understandable by business stakeholders

### Imperative Style (Avoid)

Describes the exact steps the user takes to interact with the system.

```gherkin
Feature: Subscribers see different articles based on their subscription level

  Scenario: Free subscribers see only the free articles
    Given I am on the login page
    When I type "freeFrieda@example.com" in the email field
    And I type "validPassword123" in the password field
    And I press the "Submit" button
    Then I see "FreeArticle1" on the home page
    And I do not see "PaidArticle1" on the home page
```

**Problems:**
- Tightly coupled to UI implementation
- Breaks when UI changes
- Harder to understand business intent
- Requires more maintenance

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: UI-Specific Details

**Bad:**
```gherkin
When I enter "testuser" in the "username" field
And I enter "password123" in the "password" field
And I click the "login" button
```

**Good:**
```gherkin
When the user logs in with valid credentials
```

### ❌ Anti-Pattern 2: Implementation-Specific Data

**Bad:**
```gherkin
Given I have a user with ID 12345 in the database
```

**Good:**
```gherkin
Given a registered user exists
```

### ❌ Anti-Pattern 3: UI-Procedural Steps

**Bad (UI navigation / browser mechanics):**
```gherkin
Given I navigate to the payments page
When I click the "Pay Now" button
Then I see the success message
```

**Good:**
```gherkin
When a payment is processed for $100
Then the payment is completed successfully
```

**API exception:** For API testing features, the request/response contract replaces UI mechanics and is **required**. Keep it declarative and structured:

```gherkin
# Good - API contract, declarative and structured
Scenario Outline: Process a payment
  Given the API POST /api/v1/payments is available
  When a POST request is sent to /api/v1/payments with payload:
    """
    <REQUEST_BODY>
    """
  Then a <STATUS_CODE> response is returned
  And the response body matches:
    """
    <RESPONSE_BODY>
    """

  Examples:
    | REQUEST_BODY                                              | STATUS_CODE | RESPONSE_BODY                                    |
    | {"amount": 100.00, "currency": "IDR", "card_token": "tok"} | 201         | {"transaction_id": "t-001", "status": "SUCCESS"} |
    | {"amount": 0, "currency": "IDR", "card_token": "tok"}      | 400         | {"message": "amount must be greater than 0"}     |
    | {"amount": 100.00, "currency": "IDR"}                      | 401         | {"message": "unauthorized"}                      |
```

### ❌ Anti-Pattern 4: Missing API Contract in API Features

For API features, every scenario must document the HTTP method, endpoint, request, and response. Missing any of these is a HIGH-severity finding.

**Bad (no HTTP method, endpoint, or response):**
```gherkin
Scenario: Create a payment
  Given a registered customer
  When the payment is submitted
  Then it is successful
```

**Good (contract fully specified):**
```gherkin
Scenario: Create a payment
  Given the API POST /api/v1/payments is available
  When a POST request is sent to /api/v1/payments with payload:
    """
    { "amount": 100.00, "currency": "IDR", "card_token": "tok-001" }
    """
  Then a 201 response is returned
  And the response body is:
    """
    { "transaction_id": "t-001", "status": "SUCCESS" }
    """
```

### ❌ Anti-Pattern 5: Long, Detailed Scenarios

**Bad:**
```gherkin
Scenario: User completes checkout
  Given the user has items in the cart
  And the user is on the checkout page
  And the user enters shipping address "123 Main St"
  And the user selects "Next Day" shipping
  And the user enters credit card number "4111-1111-1111-1111"
  And the user clicks "Place Order"
  Then the order is confirmed
  And a confirmation email is sent
```

**Good:** Break into multiple focused scenarios:
```gherkin
Scenario: User completes checkout with valid payment
  Given the user has items in the cart
  When the user completes checkout with valid payment
  Then the order is confirmed

Scenario: User selects Next Day shipping
  Given the user is at checkout
  When the user selects Next Day shipping
  Then the shipping cost is calculated accordingly

Scenario: User receives order confirmation
  Given an order is placed
  Then a confirmation email is sent
```

## Writing Effective Scenarios

### Use Consistent Personas

Create reusable personas to make scenarios more readable:

| Persona | Description |
|---|---|
| Free Frieda | Free tier subscriber |
| Paid Patty | Paid tier subscriber |
| Admin Alex | System administrator |

### Keep Scenarios Independent

Each scenario should be able to run independently without depending on previous scenarios.

**Bad:**
```gherkin
Scenario: User updates profile
  Given a user exists
  When I update the profile
  Then the profile is updated

  Scenario: User logs in
    Given the profile was updated  # Depends on previous scenario!
```

**Good:**
```gherkin
Scenario: User updates profile
  Given a user exists
  When the user updates their profile
  Then the profile is updated

  Scenario: User logs in
    Given a user exists
    When the user logs in
    Then they see their dashboard
```

### One Assertion Per Scenario (Preferred)

Each scenario should verify one primary behavior. Multiple `And Then` steps are acceptable if they're consequences of the same behavior.

### Use Background for Common Setup

```gherkin
Feature: Payment Processing

  Background:
    Given the payment service is running
    And the database is accessible

  Scenario: Process valid payment
    ...

  Scenario: Process invalid payment
    ...
```

## Scenario Naming

Use descriptive scenario names that explain the behavior:

**Good:**
- "Free subscriber sees only free articles"
- "Payment is rejected when balance is insufficient"
- "Expired subscription cannot access paid content"

**Bad:**
- "Test case 1"
- "Payment test"
- "User login"

## Tags

Use tags to organize and filter scenarios:

```gherkin
@smoke @payment
Scenario: Process valid payment
  ...

@regression @subscription
Scenario: Free subscriber sees only free articles
  ...
```

Common tag categories:
- `@smoke` — Critical paths to test on every deployment
- `@regression` — Full regression suite
- `@domain-{name}` — Domain-specific (e.g., `@domain-payment`)
- `@priority-{n}` — Priority level (e.g., `@priority-high`)
- `@api` — API-level feature/scenario
- `@http-{method}` — HTTP method under test (e.g., `@http-post`)
- `@positive`, `@negative` — Result type (e.g., `@positive` for happy path, `@negative` for error path)
- `@edge-case` — Boundary/edge scenarios

## Feature File Organization

```
src/test/resources/features/
├── payment/
│   ├── process-payment.feature
│   ├── refund-payment.feature
│   └── validate-payment.feature
├── subscription/
│   ├── create-subscription.feature
│   └── cancel-subscription.feature
└── user/
    ├── login.feature
    └── profile-management.feature
```

## Review Checklist

Before finalizing a feature file, verify:

- [ ] Feature header describes the capability, not the implementation
- [ ] Scenarios describe behavior in business terms
- [ ] No UI-specific details (field names, button clicks, page URLs)
- [ ] No hardcoded test data that belongs in step definitions
- [ ] Scenarios are independent (no dependencies between scenarios)
- [ ] Scenario names clearly describe the behavior
- [ ] Background used only for truly common setup
- [ ] Tags are appropriate and consistent
- [ ] Can be understood by non-technical stakeholders
- [ ] **For API features: every scenario states the HTTP method, endpoint, request, and response**
- [ ] **For API features: `Examples` cover happy path, negative case, and edge case**
- [ ] **For API features: API contract comment placed in the Feature header**
