# Gherkin Step Patterns

Common step patterns for writing Gherkin scenarios across different domains.

## REST API Patterns

### Mandatory API Contract Elements

For every API scenario, the steps **MUST** capture these five elements:

| Element | Example Step |
|---|---|
| **HTTP method** | `When a POST request is sent to ...` |
| **Endpoint** | `... to /api/v1/payments ...` |
| **Request** | `And the request payload is { "amount": 100.00 }` |
| **Response** | `Then a 201 response is returned` |
| **Examples** | `Examples:` table with request/response/status pairs |

### API Contract Header Comment

Place the contract as a comment under the Feature header:

```gherkin
# API Contract
#   POST /api/v1/payments
#   Request:  { "amount": decimal, "currency": "IDR", "card_token": string }
#   Response:
#     201 -> { "transaction_id": string, "status": "SUCCESS" }
#     400 -> { "message": string }
```

### Happy Path (Success)

```gherkin
Scenario: Create a payment successfully
  Given the API POST /api/v1/payments is available
  When a request is sent with payload:
    """
    { "amount": 100.00, "currency": "IDR", "card_token": "tok-001" }
    """
  Then a 201 response is returned
  And the response body is:
    """
    { "transaction_id": "t-001", "status": "SUCCESS" }
    """
```

### Error Path (Expected Failure)

```gherkin
Scenario: Payment is rejected when the payload is invalid
  Given the API POST /api/v1/payments is available
  When a request is sent with payload:
    """
    { "amount": -5.00, "currency": "IDR" }
    """
  Then a 400 response is returned
  And the response body is:
    """
    { "message": "amount must be greater than 0" }
    """
```

### Edge Case (Boundary Condition)

```gherkin
Scenario: Request without authentication token
  Given the API GET /api/v1/payments is available
  When a request is sent without an authentication token
  Then a 401 response is returned
  And the response body is:
    """
    { "message": "unauthorized" }
    """
```

### Scenario Outline with Examples (Request → Response Matrix)

```gherkin
Scenario Outline: Process payments with different request/response pairs
  Given the API <HTTP_METHOD> <ENDPOINT> is available
  When a request is sent with payload:
    """
    <REQUEST_BODY>
    """
  Then a <STATUS_CODE> response is returned
  And the response body matches:
    """
    <RESPONSE_BODY>
    """

  Examples:
    | HTTP_METHOD | ENDPOINT        | REQUEST_BODY                                              | STATUS_CODE | RESPONSE_BODY                                    |
    | POST        | /api/v1/payments | {"amount": 100.00, "currency": "IDR", "card_token": "tok-001"} | 201         | {"transaction_id": "t-001", "status": "SUCCESS"} |
    | POST        | /api/v1/payments | {"amount": 0, "currency": "IDR", "card_token": "tok-001"}     | 400         | {"message": "amount must be greater than 0"}     |
    | POST        | /api/v1/payments | {"amount": 100.00, "currency": "IDR"}                         | 400         | {"message": "card_token is required"}             |
```

### Authentication

```gherkin
Given a user is authenticated
Given the user has a valid API token
Given the user is logged in as an admin
```

### CRUD Operations

```gherkin
# Create
Scenario: Create a resource
  Given the API POST /api/v1/resources is available
  When a request is sent with payload:
    """
    { "name": "resource-1" }
    """
  Then a 201 response is returned
  And the response contains the created resource

# Read
Scenario: Retrieve a resource by ID
  Given the API GET /api/v1/resources/{id} is available
  When a GET request is sent to /api/v1/resources/1
  Then a 200 response is returned
  And the resource is returned

# Update
Scenario: Update a resource
  Given the API PUT /api/v1/resources/{id} is available
  When a PUT request is sent to /api/v1/resources/1 with payload:
    """
    { "name": "resource-1-updated" }
    """
  Then a 200 response is returned
  And the resource is updated successfully

# Delete
Scenario: Delete a resource
  Given the API DELETE /api/v1/resources/{id} is available
  When a DELETE request is sent to /api/v1/resources/1
  Then a 204 response is returned
  And the resource is deleted successfully
```

### Pagination

```gherkin
Scenario Outline: Retrieve resources with pagination
  Given multiple resources exist
  When a GET request is sent to /api/v1/resources?page=<page>&size=<size>
  Then a 200 response is returned
  And the response contains <item_count> items

  Examples:
    | page | size | item_count |
    | 1    | 10   | 10         |
    | 2    | 10   | 5          |
    | 99   | 10   | 0          |
```

### Filtering and Search

```gherkin
Scenario: Search for resources by attribute
  Given resources with different attributes exist
  When a GET request is sent to /api/v1/resources?status=active
  Then a 200 response is returned
  And only active resources are returned
```

## Service Layer Patterns

### Business Operations

```gherkin
Given the system is in a valid state
When a business operation is performed
Then the operation completes successfully
And the system state is updated accordingly
```

### Validation

```gherkin
Given the input is invalid
When the operation is attempted
Then the operation is rejected
And a validation error is returned
```

### Error Handling

```gherkin
Given the system encounters an error condition
When the operation is attempted
Then the operation fails gracefully
And an appropriate error message is returned
```

## Domain-Specific Patterns

### Payment Domain

```gherkin
Scenario: Process a payment successfully
  Given the API POST /api/v1/payments is available
  When a request is sent with a valid payment payload
  Then a 201 response is returned
  And the payment status is SUCCESS

Scenario: Reject a payment with insufficient balance
  Given the API POST /api/v1/payments is available
  When a request is sent with an amount exceeding the balance
  Then a 402 response is returned
  And an insufficient-balance error is returned
```

### Subscription Domain

```gherkin
Scenario: Access premium content with an active subscription
  Given the API GET /api/v1/premium/content is available
  When a request is sent with a valid subscription token
  Then a 200 response is returned
  And the premium content is accessible

Scenario: Deny access with an expired subscription
  Given the API GET /api/v1/premium/content is available
  When a request is sent with an expired subscription token
  Then a 403 response is returned
  And an upgrade prompt is shown
```

### User Management

```gherkin
Scenario: Register a new user
  Given the API POST /api/v1/users is available
  When a request is sent with valid registration data
  Then a 201 response is returned
  And a confirmation is sent

Scenario: Login with invalid credentials
  Given the API POST /api/v1/auth/login is available
  When a request is sent with invalid credentials
  Then a 401 response is returned
  And an error message is shown
```

## Generic Patterns

### State Transitions

```gherkin
Given an entity is in state A
When an action is performed
Then the entity transitions to state B
```

### Conditional Behavior

```gherkin
Given condition X is true
When action Y is performed
Then outcome Z occurs
```

### Batch Operations

```gherkin
Given multiple items exist
When a batch operation is performed
Then all items are processed
And results are returned for each item
```

## Step Phrasing Guidelines

### Use Active Voice

```gherkin
# Good
When the user submits the form

# Bad
When the form is submitted by the user
```

### Be Specific About Actors

```gherkin
# Good
Given Free Frieda has a free subscription
When Free Frieda logs in

# Bad
Given a user has a subscription
When the user logs in
```

### Name the HTTP Method, Endpoint, Request, and Response for API Steps

For API scenarios, the step must make the contract explicit:

```gherkin
# Good
When a POST request is sent to /api/v1/payments with payload:
  """
  { "amount": 100.00, "currency": "IDR" }
  """
Then a 201 response is returned
And the response body is:
  """
  { "transaction_id": "t-001", "status": "SUCCESS" }
  """

# Bad (missing contract details)
When the payment is processed
Then it succeeds
```

### Use Business Terms

```gherkin
# Good
Then the payment is completed
And the user receives a confirmation

# Bad
Then HTTP 200 is returned
And a row is inserted into the transactions table
```

## API Scenario Completeness Checklist

Before finalizing an API scenario, verify:

- [ ] HTTP method is stated (GET, POST, PUT, PATCH, DELETE)
- [ ] Endpoint path is stated (e.g., `/api/v1/payments`)
- [ ] Request payload / parameters are specified
- [ ] Expected response status code is specified
- [ ] Expected response body is specified
- [ ] `Examples` cover happy path, error path, and edge cases