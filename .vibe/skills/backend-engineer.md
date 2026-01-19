# Backend Engineer

## Role Description
Backend engineer specializing in Node.js, TypeScript, Express, and PostgreSQL development for GitMesh CE. Focuses on API design, database operations, business logic, and service integration.

## Responsibilities
- Design and implement RESTful APIs using Express and TypeScript
- Write database migrations and models using Sequelize ORM
- Implement business logic in service layer following separation of concerns
- Integrate with external services (Redis, OpenSearch, SQS, Temporal)
- Ensure proper error handling and validation across all endpoints
- Write comprehensive tests (unit, integration, property-based)
- Maintain API documentation using OpenAPI/Swagger

## Tools and Technologies
- **Node.js**: Runtime environment for backend services
- **TypeScript**: Type-safe JavaScript for all backend code
- **Express**: Web framework for API routing and middleware
- **Sequelize**: ORM for PostgreSQL database operations
- **PostgreSQL**: Primary relational database
- **Redis**: Caching and session management
- **OpenSearch**: Full-text search and analytics
- **SQS**: Message queue for async processing
- **Jest**: Testing framework for unit and integration tests
- **Docker**: Containerization for local development

## Best Practices

1. **API Design**
   - Use RESTful conventions (GET, POST, PUT, DELETE)
   - Return appropriate HTTP status codes (200, 201, 400, 404, 500)
   - Use consistent error response format
   - Implement pagination for list endpoints
   - Version APIs when making breaking changes

2. **TypeScript Usage**
   - Use strict type checking (`strict: true` in tsconfig.json)
   - Define interfaces for all request/response types
   - Avoid `any` type; use `unknown` when type is truly unknown
   - Use async/await instead of callbacks or raw promises
   - Leverage TypeScript utility types (Partial, Pick, Omit)

3. **Database Operations**
   - Use transactions for multi-step operations
   - Write reversible migrations (up and down)
   - Index frequently queried columns
   - Use connection pooling efficiently
   - Avoid N+1 queries; use eager loading with `include`

4. **Service Layer**
   - Keep controllers thin; move logic to services
   - Use dependency injection for testability
   - Implement proper error handling with custom error classes
   - Validate input at service boundaries
   - Return domain objects, not database models

5. **Error Handling**
   - Use try-catch blocks for async operations
   - Create custom error classes (ValidationError, NotFoundError, etc.)
   - Log errors with context (user ID, request ID, stack trace)
   - Never expose internal errors to clients
   - Use error middleware for centralized handling

6. **Security**
   - Validate and sanitize all user input
   - Use parameterized queries to prevent SQL injection
   - Implement rate limiting on public endpoints
   - Never log sensitive data (passwords, tokens, PII)
   - Use environment variables for secrets

7. **Testing**
   - Write unit tests for business logic
   - Write integration tests for API endpoints
   - Use property-based tests for complex logic
   - Mock external dependencies (Redis, SQS, etc.)
   - Aim for >80% code coverage

## Evaluation Criteria
- **Code Quality**: TypeScript strict mode enabled, no `any` types, proper error handling
- **API Design**: RESTful conventions, consistent responses, proper status codes
- **Database**: Efficient queries, proper indexing, reversible migrations
- **Testing**: Comprehensive test coverage, both unit and integration tests
- **Security**: Input validation, no SQL injection, secrets in env vars
- **Performance**: Efficient queries, proper caching, connection pooling

## Common Patterns

### API Endpoint Pattern
- Controllers should be thin and delegate to service layer
- Catch errors in controllers and handle specific error types appropriately
- Return proper HTTP status codes (201 for creation, 400 for validation errors)
- Let unhandled errors bubble up to error middleware
- Services should validate input at boundaries
- Services should contain business logic, not controllers
- Services should return domain objects, not raw database models
- Always include tenant context from authenticated user

### Database Transaction Pattern
- Accept optional transaction parameter to support nested transactions
- Create new transaction if none provided
- Wrap all database operations in try-catch block
- Commit transaction only if you created it
- Always rollback transaction on error if you created it
- Re-throw errors after rollback to propagate failure
- Perform all related operations within same transaction
- Check for entity existence before performing operations

### Error Handling Pattern
- Create custom error classes for different error types (ValidationError, NotFoundError, etc.)
- Extend base Error class and set appropriate name property
- Implement centralized error middleware for consistent error responses
- Log all errors with context (path, method, user info, stack trace)
- Map error types to appropriate HTTP status codes
- Return generic error messages to clients for internal errors
- Include specific error messages only for client errors (4xx)

### Async/Await Pattern
- Always use async/await for asynchronous operations
- Never use callbacks or raw promises with then/catch chains
- Use try-catch blocks to handle errors in async functions
- Await all promises to ensure proper error propagation
- Return promises from async functions
- Check for null/undefined after database lookups
- Throw appropriate errors when entities not found

## Anti-Patterns

### ❌ Avoid: Business Logic in Controllers
- Controllers should only handle HTTP concerns (request/response)
- Move all business logic to service layer
- Controllers should delegate to services immediately
- Services should handle validation, business rules, and data operations
- Keep controllers thin and focused on routing

### ❌ Avoid: Using `any` Type
- Never use `any` type as it defeats TypeScript's purpose
- Use `unknown` when type is truly unknown and narrow it with type guards
- Define proper interfaces for all data structures
- Use TypeScript utility types (Partial, Pick, Omit) when appropriate
- Enable strict mode in tsconfig.json to catch type issues

### ❌ Avoid: N+1 Queries
- Never fetch related data in loops
- Use eager loading with `include` to fetch related data upfront
- Use joins when appropriate for complex queries
- Profile queries to identify N+1 problems
- Consider using DataLoader pattern for GraphQL or complex scenarios

### ❌ Avoid: Exposing Internal Errors
- Never send stack traces or internal error details to clients
- Log detailed errors server-side with full context
- Return generic "Internal server error" messages for 5xx errors
- Only expose specific error messages for client errors (4xx)
- Use error middleware to centralize error response formatting

### ❌ Avoid: Hardcoded Configuration
- Never hardcode connection strings, passwords, or API keys
- Use environment variables for all configuration
- Provide sensible defaults with fallback values
- Use configuration management libraries (config, dotenv)
- Never commit secrets to version control
