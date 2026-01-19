# Services Context: GitMesh CE

## Overview

This document provides Python services-specific architectural patterns, Temporal workflow guidelines, and best practices for working with the GitMesh CE services layer. It describes the structure, patterns, and principles without providing specific code implementations.

## Technology Stack

- **Language**: Python 3.9+
- **Workflow Engine**: Temporal
- **Message Queue**: AWS SQS
- **Search**: OpenSearch
- **Cache**: Redis
- **Storage**: AWS S3
- **Testing**: pytest
- **Type Checking**: mypy
- **Linting**: flake8, black

## Project Structure

```
services/
├── apps/                          # Service applications
│   ├── automations_worker/       # Automation execution
│   ├── data_sink_worker/         # Data ingestion
│   ├── emails_worker/            # Email processing
│   ├── integration_data_worker/  # Integration data processing
│   ├── integration_run_worker/   # Integration execution
│   ├── integration_stream_worker/ # Real-time integration streams
│   ├── integration_sync_worker/  # Integration synchronization
│   ├── search_sync_api/          # Search API
│   ├── search_sync_worker/       # Search indexing
│   └── webhook_api/              # Webhook handling
├── libs/                          # Shared libraries
│   ├── common/                   # Common utilities
│   ├── temporal/                 # Temporal workflows/activities
│   ├── integrations/             # External API integrations
│   ├── opensearch/               # Search functionality
│   ├── redis/                    # Caching layer
│   ├── sqs/                      # Message queue handling
│   ├── logging/                  # Structured logging
│   ├── tracing/                  # Distributed tracing
│   ├── alerting/                 # Alert management
│   ├── feature-flags/            # Feature flag system
│   ├── cubejs/                   # Analytics queries
│   └── types/                    # Shared types
└── scripts/                       # Utility scripts
```


## Core Patterns

### 1. Temporal Workflow Pattern

Workflows define long-running business processes:

**Workflow Principles**:
- Define workflows as async functions
- Use workflow decorator
- Import activities with unsafe imports
- Execute activities with proper configuration
- Set timeouts for activities
- Configure retry policies
- Keep workflows deterministic
- Avoid side effects in workflow code

**Workflow Configuration**:
- start_to_close_timeout: Maximum activity duration
- retry_policy: Retry configuration
- initial_interval: First retry delay
- maximum_interval: Maximum retry delay
- maximum_attempts: Retry limit

### 2. Temporal Activity Pattern

Activities perform individual tasks:

**Activity Principles**:
- Use activity decorator
- Activities can have side effects
- Log using activity.logger
- Handle errors appropriately
- Return results to workflow
- Keep activities focused
- Make activities idempotent when possible

**Activity Best Practices**:
- Fetch data from external sources
- Call external APIs
- Perform database operations
- Log activity execution
- Handle exceptions
- Return structured results

### 3. Worker Pattern

Workers execute workflows and activities:

**Worker Setup**:
- Connect to Temporal server
- Create worker instance
- Register workflows
- Register activities
- Specify task queue
- Run worker

**Worker Configuration**:
- client: Temporal client connection
- task_queue: Queue name for routing
- workflows: List of workflow classes
- activities: List of activity functions

### 4. SQS Message Handler Pattern

Process messages from SQS queues:

**SQS Consumer Pattern**:
- Initialize SQS client
- Configure queue URL
- Define message handler
- Poll for messages
- Process messages
- Delete after successful processing
- Handle errors with retries

**Message Processing**:
- Receive messages in batches
- Parse message body (JSON)
- Call handler function
- Delete on success
- Retry on failure (visibility timeout)

### 5. Integration Pattern

Integrate with external APIs:

**Integration Client Pattern**:
- Create client class
- Initialize with credentials
- Configure base URL
- Use async HTTP client
- Set timeouts
- Handle authentication
- Implement API methods
- Handle errors

**API Client Methods**:
- GET: Retrieve resources
- POST: Create resources
- PUT: Update resources
- DELETE: Remove resources
- Handle pagination
- Parse responses


## Temporal Workflow Guidelines

### 1. Workflow Design Principles

**Determinism Requirements**:
- Workflows must be deterministic
- Use workflow utilities for randomness
- Use workflow.random() instead of random module
- Use workflow.now() instead of time functions
- Avoid non-deterministic operations
- Ensure replay produces same results

**Side Effects Management**:
- Never perform side effects in workflows
- Use activities for all side effects
- Activities can call APIs
- Activities can write to databases
- Activities can send emails
- Workflows orchestrate activities

### 2. Workflow Versioning

Handle workflow changes with versioning:

**Versioning Principles**:
- Use workflow.patched() for changes
- Provide version identifier
- Support old and new versions
- Maintain backward compatibility
- Test version transitions

**Version Management**:
- Add new code in patched block
- Keep original code outside
- Version identifier is permanent
- Never remove version checks
- Document version changes

### 3. Child Workflows

Compose workflows with child workflows:

**Child Workflow Benefits**:
- Modular workflow design
- Reusable workflow components
- Parallel execution
- Independent retry policies
- Separate workflow history

**Child Workflow Execution**:
- Use execute_child_workflow
- Provide workflow function
- Set unique workflow ID
- Pass arguments
- Wait for completion or run in background

### 4. Signals and Queries

Interact with running workflows:

**Signals**:
- Send data to running workflow
- Modify workflow state
- Trigger workflow actions
- Async communication
- No return value

**Queries**:
- Read workflow state
- Synchronous operation
- Return current state
- Don't modify state
- Fast response

**Signal and Query Decorators**:
- @workflow.signal: Define signal handler
- @workflow.query: Define query handler
- Update internal state in signals
- Return state in queries

### 5. Error Handling

Handle errors with retry policies:

**Retry Policy Configuration**:
- initial_interval: First retry delay
- maximum_interval: Max retry delay
- maximum_attempts: Retry limit
- non_retryable_error_types: Errors to not retry

**Error Handling Strategies**:
- Catch ActivityError in workflow
- Log error details
- Send alerts on failures
- Implement compensation logic
- Re-throw or handle gracefully

## OpenSearch Integration

### 1. Index Management

**OpenSearch Client Setup**:
- Create async client
- Configure hosts
- Set authentication
- Configure SSL
- Handle connection errors

**Index Operations**:
- Create index with mappings
- Define field types
- Configure shards and replicas
- Set index settings
- Handle index errors

**Document Operations**:
- Index documents with ID
- Update documents
- Delete documents
- Bulk operations
- Handle indexing errors

### 2. Search Queries

**Query Types**:
- Match query: Full-text search
- Term query: Exact match
- Bool query: Combine conditions
- Range query: Numeric/date ranges
- Filtered search: Combine query and filters

**Query Structure**:
- must: All conditions must match
- should: At least one should match
- filter: Must match, no scoring
- must_not: Must not match

**Aggregations**:
- Terms aggregation: Group by field
- Date histogram: Time-based grouping
- Stats aggregation: Numeric statistics
- Nested aggregations: Multi-level grouping

## Redis Caching

### 1. Cache Pattern

**Redis Client Setup**:
- Create async Redis client
- Connect with URL
- Handle connection errors
- Close connections properly

**Cache Operations**:
- Get: Retrieve cached value
- Set: Store value with TTL
- Delete: Remove cached value
- Expire: Set expiration time

**Cache Strategy**:
- Check cache first
- Return if cache hit
- Fetch from source on miss
- Store in cache
- Set appropriate TTL
- Handle cache failures gracefully

### 2. Cache Invalidation

**Invalidation Strategies**:
- Delete on update
- Delete on delete
- Set expiration times
- Use cache tags
- Implement cache-aside pattern

**Cache Key Patterns**:
- Use descriptive prefixes
- Include resource ID
- Use consistent format
- Avoid special characters


## Python Best Practices

### 1. Type Hints

Always use type hints:

**Type Hint Benefits**:
- Improved code readability
- Better IDE support
- Catch type errors early
- Self-documenting code
- Enable static type checking

**Type Hint Usage**:
- Function parameters
- Return types
- Variable annotations
- Generic types
- Optional types
- Union types

**Dataclasses**:
- Use for data structures
- Automatic __init__ method
- Type annotations
- Default values
- Immutable with frozen=True

### 2. Async/Await

Use async/await for I/O operations:

**Async Principles**:
- Use async def for async functions
- Use await for async operations
- Don't block event loop
- Use async libraries
- Handle async context managers

**Parallel Execution**:
- Use asyncio.gather for parallel tasks
- Wait for multiple operations
- Handle errors in parallel tasks
- Cancel tasks if needed

### 3. Error Handling

Proper exception handling:

**Custom Exceptions**:
- Create domain-specific exceptions
- Inherit from Exception
- Provide meaningful names
- Include error context

**Exception Handling**:
- Catch specific exceptions
- Re-raise domain errors
- Log unexpected errors
- Wrap with context
- Use try-except-finally

### 4. Logging

Structured logging:

**Logging Configuration**:
- Configure log level
- Set log format
- Add timestamps
- Include logger name

**Logging Best Practices**:
- Use structured logging
- Include context in extra dict
- Log at appropriate levels
- Log errors with exc_info
- Don't log sensitive data

### 5. Configuration Management

Use environment variables:

**Configuration Pattern**:
- Create config dataclass
- Load from environment
- Provide defaults
- Validate on startup
- Document required variables

**Environment Variables**:
- Database URLs
- Service endpoints
- API credentials
- Feature flags
- Timeouts and limits

## Testing Patterns

### 1. Unit Tests

**Unit Test Structure**:
- Use pytest framework
- Mark async tests with decorator
- Mock external dependencies
- Test business logic
- Verify method calls
- Test error conditions

**Test Organization**:
- Arrange: Set up test data
- Act: Execute function
- Assert: Verify results

**Mocking**:
- Mock external services
- Mock database calls
- Use AsyncMock for async functions
- Verify mock interactions

### 2. Integration Tests

**Integration Test Principles**:
- Test workflow execution
- Use Temporal test environment
- Test complete flows
- Verify activity execution
- Test error scenarios

**Test Environment**:
- Start test environment
- Create worker with workflows
- Execute workflow
- Verify results
- Clean up after tests

### 3. Fixtures

**Pytest Fixtures**:
- Create reusable test setup
- Provide test dependencies
- Use scope for lifecycle
- Yield for cleanup
- Share across tests

**Common Fixtures**:
- Event loop for async tests
- Database connections
- Redis clients
- Sample test data
- Mock services

## Performance Optimization

### 1. Connection Pooling

**Database Connection Pool**:
- Create connection pool
- Set min and max connections
- Configure timeouts
- Reuse connections
- Monitor pool usage

**Pool Configuration**:
- Minimum pool size
- Maximum pool size
- Connection timeout
- Idle timeout
- Command timeout

### 2. Batch Processing

**Batch Processing Principles**:
- Process in batches
- Set batch size
- Process in parallel
- Add delays between batches
- Handle batch errors

**Batch Benefits**:
- Reduce overhead
- Improve throughput
- Control resource usage
- Better error handling

### 3. Caching Strategy

**Caching Decorator**:
- Create reusable caching logic
- Generate cache keys
- Check cache first
- Execute on miss
- Store result
- Set TTL

**Cache Key Generation**:
- Include function name
- Include arguments
- Use consistent format
- Handle complex types

## Common Pitfalls

### 1. Blocking I/O in Async Code

**Blocking Operations**:
- Never use blocking sleep
- Don't use synchronous I/O
- Avoid CPU-intensive operations
- Use async alternatives

**Solutions**:
- Use asyncio.sleep for delays
- Use async libraries
- Offload CPU work to threads
- Use async context managers

### 2. Not Closing Resources

**Resource Management**:
- Always close connections
- Use context managers
- Clean up in finally blocks
- Handle cleanup errors

**Async Context Managers**:
- Use async with statement
- Automatic resource cleanup
- Exception-safe cleanup
- Proper error handling

### 3. Unhandled Exceptions in Tasks

**Task Error Handling**:
- Always await tasks
- Catch task exceptions
- Log task failures
- Don't ignore errors

**Task Management**:
- Create tasks explicitly
- Store task references
- Await or cancel tasks
- Handle task exceptions

## Debugging Tips

### 1. Enable Debug Logging

**Logging Configuration**:
- Set log level to DEBUG
- Enable Temporal logging
- Log to console
- Include timestamps

### 2. Use Temporal Web UI

**Temporal Web UI Features**:
- View workflow executions
- See workflow history
- Debug workflow failures
- Query workflow state
- View activity results
- Inspect workflow inputs/outputs

**Web UI Access**:
- Default URL: http://localhost:8080
- View all workflows
- Filter by status
- Search by workflow ID
- View execution timeline

### 3. Profile Performance

**Performance Profiling**:
- Use cProfile module
- Enable profiler
- Run expensive operations
- Disable profiler
- Analyze statistics
- Sort by cumulative time
- Identify bottlenecks

## Additional Resources

- [Temporal Python SDK Documentation](https://docs.temporal.io/dev-guide/python)
- [Python Async/Await Guide](https://docs.python.org/3/library/asyncio.html)
- [OpenSearch Python Client](https://opensearch.org/docs/latest/clients/python/)
- [Redis Python Client](https://redis-py.readthedocs.io/)
- [pytest Documentation](https://docs.pytest.org/)
- [Python Type Hints](https://docs.python.org/3/library/typing.html)
