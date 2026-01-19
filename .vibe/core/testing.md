# Testing Strategy

This document defines testing standards and strategies for GitMesh Community Edition.

## Testing Philosophy

### Core Principles

**Test Pyramid:**
The test pyramid shows the ideal distribution of tests:
- Base layer (largest): Unit Tests - Many fast, isolated tests
- Middle layer: Integration Tests - Some tests of component interactions
- Top layer (smallest): E2E Tests - Few tests of complete user flows

This distribution ensures fast feedback while maintaining comprehensive coverage.

- **Many unit tests**: Fast, isolated, test individual functions/classes
- **Some integration tests**: Test component interactions
- **Few E2E tests**: Test critical user flows end-to-end

**Quality Over Quantity:**
- Focus on meaningful tests, not coverage percentage
- Test behavior, not implementation details
- Write tests that catch real bugs
- Avoid brittle tests that break with refactoring

**Test-Driven Development (TDD):**
- Write tests before implementation (when appropriate)
- Red → Green → Refactor cycle
- Tests document expected behavior
- Catch regressions early

## Unit Testing

### Purpose
Test individual functions, classes, or modules in isolation.

### Characteristics
- Fast execution (milliseconds)
- No external dependencies (database, network, filesystem)
- Deterministic (same input → same output)
- Isolated (one test failure doesn't affect others)

### Best Practices

**Structure:**
- Use clear test structure following Arrange-Act-Assert pattern
- Arrange: Set up test data and preconditions
- Act: Execute the function or method being tested
- Assert: Verify the expected outcome
- Group related tests using describe blocks
- Use nested describe blocks for different methods or scenarios
- Keep tests focused on one behavior per test

**Naming:**
- Use descriptive test names that explain what is being tested
- Format: `should [expected behavior] when [condition]`
- Examples:
  - `should return user when valid ID is provided`
  - `should throw error when user not found`
  - `should hash password before storing`
- Make test names readable as documentation

**Test Coverage:**
- Test happy path (expected behavior with valid inputs)
- Test edge cases (boundary conditions, empty inputs, null values)
- Test error cases (invalid input, exceptions, error handling)
- Test business logic thoroughly
- Don't test framework code or third-party libraries
- Focus on meaningful coverage, not just percentage

### Mocking and Stubbing

**When to Mock:**
- External dependencies (database, API, filesystem)
- Slow operations that would make tests slow
- Non-deterministic behavior (random numbers, current time)
- Third-party services that shouldn't be called in tests

**Mocking Principles:**
- Mock external dependencies to isolate unit under test
- Use mocking frameworks (Jest, Sinon, pytest-mock)
- Verify that mocked functions are called with expected arguments
- Return realistic mock data that matches production behavior
- Reset mocks between tests to avoid test pollution

**Avoid Over-Mocking:**
- Don't mock everything - test with real objects when possible
- Avoid mocking internal implementation details
- Test behavior, not implementation
- Use real objects for simple data structures
- Consider using in-memory implementations instead of mocks

## Integration Testing

### Purpose
Test interactions between multiple components or modules.

### Characteristics
- Slower than unit tests (seconds)
- May use real dependencies (test database, test APIs)
- Test component boundaries and contracts
- Verify data flow between components

### Best Practices

**Database Integration:**
- Use a test database separate from development and production
- Use transactions to isolate tests (begin transaction before each test, rollback after)
- Clean up test data after each test to avoid pollution
- Seed test database with known data for predictable tests
- Use database fixtures or factories for consistent test data
- Close database connections properly in cleanup hooks

**API Integration:**
- Test API endpoints with a real server instance
- Use supertest or similar library for HTTP testing
- Test full request/response cycle including middleware
- Verify status codes, response bodies, and headers
- Test authentication and authorization in integration tests
- Clean up created resources after tests

### Test Data Management

**Fixtures:**
- Create reusable test data fixtures for consistent testing
- Define fixtures as constants or in separate fixture files
- Use fixtures for common test scenarios (valid user, admin user, etc.)
- Keep fixtures simple and focused on test needs
- Update fixtures when data models change

**Factories:**
- Use factory functions to generate dynamic test data
- Generate unique values for each test (timestamps, UUIDs)
- Allow overriding specific fields while using defaults
- Use factories to create related objects (user with posts, etc.)
- Keep factories simple and maintainable

## End-to-End (E2E) Testing

### Purpose
Test complete user workflows from UI to database.

### Characteristics
- Slowest tests (seconds to minutes)
- Use real browser and real services
- Test critical user journeys
- Catch integration issues across entire stack

### Best Practices

**Cypress Tests:**
- Test critical user flows end-to-end
- Use data-testid attributes for stable selectors
- Avoid brittle selectors based on CSS classes or structure
- Clean state between tests (reset database, clear cookies/storage)
- Use custom commands for common operations
- Keep tests focused on user behavior, not implementation
- Test happy paths and critical error scenarios

**Test Selectors:**
- Use data-testid attributes for test-specific selectors
- Avoid selectors based on CSS classes (they change frequently)
- Avoid selectors based on DOM structure (fragile)
- Use semantic selectors when data-testid isn't available
- Keep selectors simple and maintainable

**Test Isolation:**
- Reset database to known state before each test
- Clear cookies and local storage between tests
- Use unique test data for each test run
- Avoid dependencies between tests
- Run tests in isolation (each test should pass independently)

## Property-Based Testing

### Purpose
Test properties that should hold for all inputs, not just specific examples.

### Characteristics
- Generates random test inputs
- Tests universal properties
- Catches edge cases humans miss
- Requires more thought about invariants

### Best Practices

**Using fast-check (TypeScript):**
- Define properties that should hold for all inputs
- Use appropriate generators for input types (strings, numbers, arrays, objects)
- Configure sufficient test iterations (100+ for thorough testing)
- Test universal properties like idempotence, commutativity, round-trips
- Use shrinking to find minimal failing examples
- Document what property is being tested

**Using Hypothesis (Python):**
- Use @given decorator with strategy generators
- Define strategies for complex data types
- Test properties that should always hold
- Let Hypothesis find edge cases automatically
- Use assume() to filter invalid inputs
- Document invariants being tested

**Common Properties:**
- **Idempotence**: Applying operation twice gives same result as once (f(f(x)) == f(x))
- **Round-trip**: Encoding then decoding returns original (decode(encode(x)) == x)
- **Invariants**: Properties that never change (sorted array stays sorted after operations)
- **Commutativity**: Order doesn't matter (f(x, y) == f(y, x))
- **Associativity**: Grouping doesn't matter (f(f(x, y), z) == f(x, f(y, z)))

## Test Organization

### File Structure

**Backend (Node.js):**
Test files are organized alongside source files:
- Unit tests: Located next to source files with .test.ts extension (e.g., userService.test.ts)
- Integration tests: Located in __tests__/integration/ directory
- E2E tests: Located in __tests__/e2e/ directory

**Frontend (Vue):**
Test files are organized alongside components:
- Component tests: Located next to components with .test.ts extension
- Store integration tests: Located in __tests__/integration/ directory
- Cypress E2E tests: Located in __tests__/e2e/ directory with .cy.ts extension

**Python Services:**
Test files follow pytest conventions:
- Unit tests: Located next to source files with test_ prefix (e.g., test_user_service.py)
- Integration tests: Located in tests/integration/ directory
- E2E tests: Located in tests/e2e/ directory

### Test Configuration

**Jest (TypeScript/JavaScript):**
- Configure test environment (node, jsdom, etc.)
- Set test file patterns to match test files
- Configure coverage collection from source files
- Exclude test files and type definitions from coverage
- Set coverage thresholds for branches, functions, lines, statements
- Use appropriate preset (ts-jest for TypeScript)

**Pytest (Python):**
- Configure test discovery paths
- Set naming patterns for test files, classes, and functions
- Enable verbose output for detailed test results
- Configure coverage reporting (HTML, terminal)
- Set minimum coverage thresholds
- Add useful pytest options (--cov, --verbose, etc.)

## Testing Checklist

### Before Committing

- [ ] All tests pass locally
- [ ] New code has test coverage
- [ ] Tests are meaningful (not just for coverage)
- [ ] Tests are fast and deterministic
- [ ] No skipped or disabled tests without reason
- [ ] Test names are descriptive
- [ ] No console.log or debug statements in tests

### Code Review

- [ ] Tests verify behavior, not implementation
- [ ] Edge cases are covered
- [ ] Error cases are tested
- [ ] Tests are maintainable
- [ ] Mocks are used appropriately
- [ ] Test data is realistic
- [ ] Tests don't depend on execution order

### CI/CD Pipeline

- [ ] Unit tests run on every commit
- [ ] Integration tests run on every PR
- [ ] E2E tests run before deployment
- [ ] Coverage reports are generated
- [ ] Failing tests block deployment
- [ ] Test results are visible to team

## Testing Tools

### Backend (Node.js/TypeScript)
- **Jest**: Unit and integration testing
- **Supertest**: API testing
- **fast-check**: Property-based testing
- **nock**: HTTP mocking
- **Sinon**: Spies, stubs, mocks

### Frontend (Vue)
- **Vitest**: Unit testing (Vite-native)
- **Vue Test Utils**: Component testing
- **Cypress**: E2E testing
- **Testing Library**: User-centric testing

### Python
- **pytest**: Unit and integration testing
- **Hypothesis**: Property-based testing
- **pytest-mock**: Mocking
- **pytest-asyncio**: Async testing
- **responses**: HTTP mocking

### Database
- **Testcontainers**: Docker containers for tests
- **In-memory databases**: SQLite for fast tests
- **Database fixtures**: Seed data for tests

## Performance Testing

### Load Testing
- Use tools like k6, Artillery, or JMeter
- Test API endpoints under load
- Identify bottlenecks and scalability issues
- Set performance baselines

### Benchmarking

**Performance Testing Principles:**
- Benchmark critical operations to establish baselines
- Test with realistic data volumes
- Measure execution time for performance-sensitive code
- Set performance thresholds in tests
- Run benchmarks in consistent environments
- Compare performance across code changes
- Document performance requirements

## Security Testing

### Security Test Cases
- Test authentication and authorization
- Test input validation and sanitization
- Test for SQL injection vulnerabilities
- Test for XSS vulnerabilities
- Test rate limiting
- Test session management

### Example Security Tests

**Security Test Principles:**
- Test authentication and authorization mechanisms
- Test input validation and sanitization
- Test for SQL injection vulnerabilities
- Test for XSS vulnerabilities
- Test rate limiting functionality
- Test session management security
- Verify security headers are set correctly
- Test error handling doesn't expose sensitive information

## Continuous Improvement

### Test Maintenance
- Remove obsolete tests
- Update tests when requirements change
- Refactor tests to reduce duplication
- Keep tests fast and reliable

### Test Metrics
- Track test execution time
- Monitor test flakiness
- Measure code coverage trends
- Analyze test failure patterns

### Learning from Bugs
- Write test for every bug found
- Analyze why tests didn't catch the bug
- Improve test coverage in weak areas
- Share learnings with team
