# Backend Context: GitMesh CE

## Overview

This document provides backend-specific architectural patterns, API design guidelines, and best practices for working with the GitMesh CE backend codebase. It describes the structure, patterns, and principles without providing specific code implementations.

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **ORM**: Sequelize
- **Database**: PostgreSQL
- **Authentication**: Passport.js (OAuth 2.0)
- **API Documentation**: OpenAPI/Swagger
- **Testing**: Jest
- **Process Management**: PM2

## Project Structure

```
backend/
├── src/
│   ├── bin/                    # Service entry points
│   │   ├── api.ts             # Main REST API server
│   │   ├── job-generator.ts   # Temporal workflow scheduler
│   │   ├── nodejs-worker/     # Temporal worker
│   │   └── discord-ws.ts      # Discord WebSocket service
│   ├── api/                    # REST API routes and controllers
│   │   ├── {module}/
│   │   │   ├── index.ts       # Route definitions
│   │   │   ├── {module}Create.ts
│   │   │   ├── {module}Update.ts
│   │   │   ├── {module}Delete.ts
│   │   │   └── {module}List.ts
│   ├── database/               # Sequelize models and migrations
│   │   ├── models/            # Database models
│   │   ├── migrations/        # Schema migrations
│   │   ├── repositories/      # Data access layer
│   │   └── initializers/      # DB setup scripts
│   ├── services/              # Business logic layer
│   ├── middlewares/           # Express middlewares
│   ├── security/              # Auth and security utilities
│   ├── utils/                 # Shared utilities
│   └── documentation/         # OpenAPI specs
├── config/                     # Configuration files
└── package.json
```

## Core Patterns

### 1. Controller-Service-Repository Pattern

The backend follows a three-layer architecture that separates concerns:

**Controllers** (`src/api/{module}/`):
- Handle HTTP request and response lifecycle
- Validate input parameters from requests
- Delegate business logic to service methods
- Return formatted responses using the response handler
- Should remain thin, containing minimal logic

**Services** (`src/services/`):
- Contain all business logic and rules
- Orchestrate operations across multiple repositories
- Handle database transactions
- Validate business rules before data operations
- Trigger side effects like emails or notifications
- Extend from ServiceBase to access common functionality

**Repositories** (`src/database/repositories/`):
- Provide clean data access interface
- Abstract Sequelize query operations
- Handle database-specific operations
- Clean up data for output (remove internal fields)
- Should not contain business logic

### 2. Middleware Chain Pattern

Express middlewares handle cross-cutting concerns in a specific order:

**Middleware Execution Order**:
1. Database middleware - Establishes database connection
2. Authentication middleware - Verifies user identity
3. Tenant middleware - Loads multi-tenancy context
4. Language middleware - Sets internationalization context
5. Response handler middleware - Provides consistent response formatting
6. Error middleware - Catches and formats errors

**Custom Middleware Principles**:
- Each middleware should have a single responsibility
- Use next() to pass control to the next middleware
- Handle errors by passing them to next(error)
- Attach context to the request object for downstream use
- Keep middleware stateless when possible

### 3. Service Options Pattern

All services receive an IServiceOptions interface for context:

**Service Options Include**:
- language: Current user's language preference
- currentUser: Authenticated user object
- currentTenant: Multi-tenancy context
- transaction: Database transaction for atomic operations
- database: Database connection instance

**Usage Principles**:
- Services extend ServiceBase to access options
- Options provide context without global state
- Transaction option ensures data consistency
- Current user enables authorization checks
- Current tenant enforces data isolation

### 4. Error Handling Pattern

Centralized error handling with custom error classes:

**Error Class Hierarchy**:
- Error400: Bad Request - Invalid input
- Error401: Unauthorized - Authentication required
- Error403: Forbidden - Insufficient permissions
- Error404: Not Found - Resource doesn't exist
- Error500: Internal Server Error - Unexpected errors

**Error Handling Principles**:
- Throw specific error types in services
- Error middleware catches all errors
- Extract error code and message
- Return consistent error response format
- Log errors with appropriate context

## API Design Guidelines

### 1. RESTful Endpoints

Follow REST conventions for resource endpoints:

**Standard Resource Operations**:
- GET /api/{resource} - List all resources with pagination
- GET /api/{resource}/:id - Get single resource by ID
- POST /api/{resource} - Create new resource
- PUT /api/{resource}/:id - Update existing resource
- DELETE /api/{resource}/:id - Delete resource

**Naming Conventions**:
- Use plural nouns for resource names
- Use kebab-case for multi-word resources
- Keep URLs lowercase
- Avoid verbs in URLs (use HTTP methods instead)

### 2. Request Validation

Validate all inputs at the controller level:

**Validation Principles**:
- Use schema validation libraries (Joi or similar)
- Validate before passing to services
- Return 400 Bad Request for invalid input
- Provide clear error messages
- Validate data types, formats, and constraints
- Check required fields and optional fields
- Sanitize inputs to prevent injection attacks

### 3. Response Format

Maintain consistent response structure across all endpoints:

**Success Response Structure**:
- data: The resource or result data
- meta: Metadata including timestamp and request ID

**List Response Structure**:
- rows: Array of resources
- count: Total number of resources
- limit: Number of items per page
- offset: Starting position

**Error Response Structure**:
- error: Human-readable error message
- code: HTTP status code
- details: Optional additional error information

### 4. Pagination

Support standard pagination parameters:

**Pagination Parameters**:
- limit: Number of items to return (default 20)
- offset: Number of items to skip (default 0)
- orderBy: Field to sort by (default createdAt)
- orderDirection: Sort direction ASC or DESC (default DESC)

**Implementation Principles**:
- Always provide total count with paginated results
- Set reasonable default and maximum limits
- Return pagination metadata in response
- Use offset-based pagination for simplicity
- Consider cursor-based pagination for large datasets

### 5. Filtering

Support flexible filtering through query parameters:

**Filter Parameter Format**:
- Use filter[field]=value syntax
- Support multiple filters simultaneously
- Use appropriate operators (equals, like, in, range)

**Filtering Principles**:
- Parse filter parameters from query string
- Build WHERE clauses dynamically
- Use case-insensitive matching for text fields
- Support partial matching with wildcards
- Validate filter fields against allowed list

### 6. Rate Limiting

Protect endpoints with rate limiting:

**Rate Limiting Configuration**:
- Set time window (e.g., 15 minutes)
- Set maximum requests per window (e.g., 100)
- Return 429 Too Many Requests when exceeded
- Include rate limit headers in responses

**Rate Limiting Principles**:
- Apply to all public API endpoints
- Use IP-based or user-based limiting
- Provide clear error messages
- Consider different limits for different endpoints
- Allow authenticated users higher limits

## Database Patterns

### 1. Model Definition

Define Sequelize models with TypeScript:

**Model Definition Principles**:
- Use UUID primary keys with auto-generation
- Define all fields with appropriate data types
- Add validation rules at the model level
- Use JSONB for flexible attribute storage
- Include timestamps (createdAt, updatedAt)
- Enable paranoid mode for soft deletes
- Define indexes for frequently queried fields
- Create unique indexes for business constraints
- Define associations in the associate method

**Common Field Types**:
- UUID for identifiers
- STRING for text fields with length limits
- TEXT for long-form content
- INTEGER for numeric values
- BOOLEAN for flags
- JSONB for structured data
- DATE for timestamps

### 2. Migrations

Create migrations for all schema changes:

**Migration Principles**:
- One migration per schema change
- Name migrations with timestamp and description
- Define both up and down methods
- Create tables with all necessary fields
- Add indexes in the same migration
- Define foreign key constraints
- Handle data migrations separately
- Test migrations on development database first
- Never modify existing migrations after deployment

**Migration Operations**:
- createTable: Create new table
- dropTable: Remove table
- addColumn: Add field to existing table
- removeColumn: Remove field from table
- addIndex: Create index
- removeIndex: Drop index
- changeColumn: Modify field definition

### 3. Transactions

Use transactions for data consistency:

**Transaction Principles**:
- Use automatic transaction management when possible
- Wrap related operations in single transaction
- Commit on success, rollback on error
- Pass transaction to all repository calls
- Keep transactions short-lived
- Avoid external API calls within transactions
- Handle transaction errors appropriately

**Transaction Patterns**:
- Automatic: Use sequelize.transaction callback
- Manual: Create, commit, and rollback explicitly
- Service-level: Pass transaction through service options
- Repository-level: Accept transaction in options parameter

### 4. Query Optimization

Optimize queries for performance:

**Eager Loading**:
- Use include to load related data
- Specify required: false for LEFT JOIN
- Specify required: true for INNER JOIN
- Load only needed associations
- Avoid N+1 query problems

**Attribute Selection**:
- Select only needed fields
- Exclude sensitive fields from responses
- Use attributes array to specify fields
- Reduce data transfer size

**Index Usage**:
- Query on indexed fields when possible
- Use composite indexes for multi-field queries
- Ensure WHERE clauses use indexes
- Monitor slow queries and add indexes
- Balance index count with write performance

## Authentication & Authorization

### 1. OAuth Integration

Passport.js strategies for OAuth providers:

**OAuth Strategy Configuration**:
- Configure client ID and secret from environment
- Set callback URL for OAuth redirect
- Implement strategy callback to find or create user
- Handle access tokens and refresh tokens
- Extract user profile information
- Map external profile to internal user model

**Supported OAuth Providers**:
- GitHub
- Google
- LinkedIn
- Other OAuth 2.0 providers

### 2. JWT Tokens

JSON Web Token authentication:

**JWT Token Principles**:
- Generate tokens on successful authentication
- Include user ID and email in payload
- Set appropriate expiration time (e.g., 7 days)
- Sign tokens with secret key from environment
- Verify tokens on protected endpoints
- Extract user information from decoded token
- Handle expired tokens gracefully
- Refresh tokens before expiration

**Token Security**:
- Never expose JWT secret
- Use strong secret keys
- Set reasonable expiration times
- Validate token signature
- Check token expiration
- Revoke tokens on logout

### 3. Role-Based Access Control

Permission checking in services:

**Permission System**:
- Define permissions as constants
- Use descriptive permission names (resource:action)
- Check permissions in service methods
- Throw 403 Forbidden for insufficient permissions
- Load user roles and permissions from database
- Cache permissions for performance

**Permission Patterns**:
- resource:create - Create new resource
- resource:read - View resource
- resource:update - Modify resource
- resource:delete - Remove resource
- resource:admin - Full access to resource

**Authorization Principles**:
- Check permissions before business logic
- Fail fast on permission denial
- Log permission denials for security audit
- Provide clear error messages
- Support role hierarchy
- Allow permission inheritance

## Background Jobs with Temporal

### 1. Workflow Definition

Define Temporal workflows for long-running processes:

**Workflow Principles**:
- Define workflows as async functions
- Use proxyActivities to call activities
- Set appropriate timeouts for activities
- Keep workflows deterministic
- Avoid side effects in workflow code
- Use workflow utilities for time and randomness

**Workflow Configuration**:
- Set start-to-close timeout for activities
- Configure retry policies
- Define workflow ID for idempotency
- Specify task queue for routing

### 2. Activity Implementation

Implement activities for individual tasks:

**Activity Principles**:
- Activities perform actual work
- Can have side effects (API calls, database writes)
- Should be idempotent when possible
- Handle errors appropriately
- Log activity execution
- Return results to workflow

**Activity Best Practices**:
- Keep activities focused on single task
- Use activity context for logging
- Implement proper error handling
- Set reasonable timeouts
- Make activities retryable
- Avoid long-running operations

### 3. Schedule Workflows

Schedule workflows from job generator:

**Workflow Scheduling**:
- Connect to Temporal server
- Start workflows with unique IDs
- Specify task queue for workers
- Pass arguments to workflow
- Handle scheduling errors
- Monitor workflow execution

**Scheduling Patterns**:
- One-time execution
- Recurring schedules (cron-like)
- Event-triggered workflows
- Batch processing workflows

## Testing Patterns

### 1. Unit Tests

Test services in isolation:

**Unit Test Principles**:
- Test services independently
- Mock repository dependencies
- Test business logic thoroughly
- Verify method calls and arguments
- Test error conditions
- Use descriptive test names

**Test Structure**:
- Arrange: Set up test data and mocks
- Act: Execute the method being tested
- Assert: Verify expected outcomes

**Mocking Guidelines**:
- Mock external dependencies
- Mock repositories to isolate service logic
- Verify mock interactions
- Return realistic mock data
- Test both success and failure paths

### 2. Integration Tests

Test API endpoints end-to-end:

**Integration Test Principles**:
- Test complete request-response cycle
- Use test database for isolation
- Set up authentication tokens
- Test all HTTP methods
- Verify response status codes
- Verify response body structure
- Test error responses

**Test Setup**:
- Initialize test database before tests
- Clean up data after tests
- Create test fixtures
- Generate authentication tokens
- Configure test environment

**Test Coverage**:
- Test happy path scenarios
- Test validation errors
- Test authentication failures
- Test authorization failures
- Test edge cases

## Performance Best Practices

### 1. Connection Pooling

Configure PostgreSQL connection pool:

**Connection Pool Configuration**:
- Set maximum pool size (e.g., 20 connections)
- Set minimum pool size (e.g., 5 connections)
- Configure acquire timeout (e.g., 30 seconds)
- Configure idle timeout (e.g., 10 seconds)
- Enable logging in development only
- Configure SSL for production

**Pool Management**:
- Reuse connections from pool
- Return connections after use
- Monitor pool utilization
- Adjust pool size based on load
- Handle connection errors gracefully

### 2. Caching with Redis

Cache frequently accessed data:

**Caching Strategy**:
- Check cache before database query
- Cache on cache miss
- Set appropriate TTL (time-to-live)
- Invalidate cache on updates
- Use consistent cache key format
- Handle cache failures gracefully

**Cache Key Patterns**:
- Use descriptive prefixes (e.g., "member:")
- Include resource ID in key
- Use consistent naming convention
- Avoid special characters

**Cache Invalidation**:
- Delete cache on resource update
- Delete cache on resource deletion
- Consider cache-aside pattern
- Use cache tags for bulk invalidation

### 3. Async Processing

Offload heavy tasks to background jobs:

**Async Processing Principles**:
- Never block API responses with heavy work
- Queue background jobs immediately
- Return job ID or status to client
- Process jobs asynchronously
- Monitor job completion
- Handle job failures with retries

**Use Cases for Async Processing**:
- Data imports and exports
- Email sending
- External API calls
- Report generation
- Batch processing
- Data synchronization

## Security Best Practices

### 1. Input Validation

Always validate and sanitize inputs:

**Validation Principles**:
- Validate all user inputs
- Sanitize string inputs
- Normalize email addresses
- Escape special characters
- Validate data formats (email, URL, etc.)
- Check data types and ranges
- Reject invalid inputs early

**Sanitization Guidelines**:
- Remove or escape HTML tags
- Normalize whitespace
- Trim leading/trailing spaces
- Convert to appropriate case
- Remove dangerous characters

### 2. SQL Injection Prevention

Use parameterized queries:

**SQL Injection Protection**:
- Always use ORM parameterized queries
- Never concatenate user input into SQL
- Use Sequelize query methods (safe by default)
- Avoid raw SQL queries with user input
- If raw queries needed, use parameter binding
- Validate and sanitize all inputs

**Safe Query Practices**:
- Use WHERE clauses with parameters
- Use prepared statements
- Bind parameters separately from query
- Never trust user input

### 3. Secret Management

Never commit secrets to version control:

**Secret Management Principles**:
- Use environment variables for secrets
- Never hardcode API keys or passwords
- Use .env files for local development
- Add .env to .gitignore
- Use secret management services in production
- Rotate secrets regularly
- Use different secrets per environment

**Environment Variable Usage**:
- Load from process.env
- Provide defaults for non-sensitive values
- Validate required secrets on startup
- Document required environment variables

## Common Pitfalls

### 1. Connection Leaks

Always close connections and clean up resources:

**Resource Management**:
- Use try-finally blocks for cleanup
- Close connections in finally block
- Use connection pools properly
- Return connections to pool after use
- Monitor for connection leaks
- Set connection timeouts

**Prevention Strategies**:
- Use automatic resource management
- Implement proper error handling
- Test resource cleanup in tests
- Monitor connection pool metrics

### 2. N+1 Query Problem

Use eager loading to avoid multiple queries:

**N+1 Problem Description**:
- Occurs when loading related data in loops
- Results in N+1 database queries (1 + N)
- Severely impacts performance
- Common with ORM lazy loading

**Solution - Eager Loading**:
- Use include to load related data
- Load associations in single query
- Use JOIN operations
- Specify which associations to load
- Avoid loading data in loops

**Performance Impact**:
- N+1: 1 + N queries (very slow)
- Eager loading: 1 query (fast)
- Always prefer eager loading for lists

### 3. Unhandled Promise Rejections

Always handle errors in async code:

**Error Handling Principles**:
- Wrap async calls in try-catch
- Handle promise rejections
- Log errors with context
- Re-throw or handle appropriately
- Never ignore errors silently
- Use error middleware for API errors

**Async Error Patterns**:
- Use try-catch in async functions
- Use .catch() on promises
- Handle errors at appropriate level
- Provide meaningful error messages
- Log errors for debugging

## Debugging Tips

### 1. Enable SQL Logging

Configure database logging for development:

**SQL Logging Configuration**:
- Enable in development environment
- Disable in production for performance
- Log all SQL queries
- Log query execution time
- Review slow queries
- Identify N+1 problems

### 2. Use Debug Module

Implement structured debugging:

**Debug Module Usage**:
- Import debug module
- Create namespaced loggers
- Log important operations
- Include relevant context
- Use different namespaces per module
- Enable/disable via environment variable

### 3. Check Logs

Monitor application logs:

**Log Monitoring**:
- Use CLI tool to view service logs
- Check API server logs
- Check worker logs
- Look for error patterns
- Monitor log levels
- Set up log aggregation

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Sequelize Documentation](https://sequelize.org/)
- [Temporal Documentation](https://docs.temporal.io/)
- [Jest Testing Guide](https://jestjs.io/docs/getting-started)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
