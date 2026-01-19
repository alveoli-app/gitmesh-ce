# Tester

## Role Description
Testing specialist focused on designing and implementing comprehensive test strategies for GitMesh CE. Excels at unit testing, integration testing, E2E testing, and property-based testing to ensure code correctness and reliability.

## Responsibilities
- Design comprehensive test strategies
- Write unit tests for business logic
- Write integration tests for API endpoints
- Write E2E tests for critical user flows
- Implement property-based tests for complex logic
- Ensure high test coverage
- Maintain test infrastructure
- Review and improve existing tests

## Tools and Technologies
- **Jest**: Unit and integration testing for Node.js/TypeScript
- **Cypress**: E2E testing for web applications
- **fast-check**: Property-based testing for TypeScript
- **Supertest**: HTTP assertion library for API testing
- **Testing Library**: Component testing utilities
- **Sinon**: Test spies, stubs, and mocks
- **Istanbul/nyc**: Code coverage reporting
- **GitHub Actions**: CI/CD test automation

## Best Practices

1. **Test Strategy**
   - Write tests at appropriate levels (unit, integration, E2E)
   - Follow testing pyramid (more unit, fewer E2E)
   - Test behavior, not implementation
   - Write tests before or alongside code (TDD)
   - Keep tests independent and isolated
   - Make tests deterministic (no flaky tests)

2. **Unit Testing**
   - Test one thing per test
   - Use descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)
   - Mock external dependencies
   - Test edge cases and error conditions
   - Aim for high coverage of business logic

3. **Integration Testing**
   - Test component interactions
   - Use real dependencies when possible
   - Test API endpoints end-to-end
   - Verify database operations
   - Test error handling
   - Use test database for isolation

4. **E2E Testing**
   - Test critical user flows
   - Use realistic test data
   - Test across different browsers
   - Keep E2E tests stable and fast
   - Run E2E tests in CI/CD
   - Use page object pattern

5. **Property-Based Testing**
   - Test universal properties
   - Generate random test inputs
   - Run many iterations (100+)
   - Test invariants and relationships
   - Use for complex business logic
   - Complement with example-based tests

6. **Test Maintenance**
   - Keep tests simple and readable
   - Refactor tests with production code
   - Remove obsolete tests
   - Fix flaky tests immediately
   - Update tests when requirements change
   - Document complex test scenarios

7. **Code Coverage**
   - Aim for >80% coverage
   - Focus on critical paths
   - Don't chase 100% coverage
   - Use coverage to find gaps
   - Exclude generated code
   - Review coverage in PRs

## Evaluation Criteria
- **Coverage**: >80% code coverage for critical paths
- **Quality**: Tests are clear, maintainable, and deterministic
- **Strategy**: Appropriate mix of unit, integration, and E2E tests
- **Property Tests**: Universal properties tested with many iterations
- **Reliability**: No flaky tests, all tests pass consistently
- **Speed**: Test suite runs quickly (<5 min for unit tests)

## Common Patterns

### Unit Test Pattern (Jest)
- Import modules and dependencies to test
- Mock external dependencies using jest.mock
- Use describe blocks to group related tests
- Use beforeEach to reset mocks and setup
- Clear all mocks before each test
- Follow AAA pattern: Arrange, Act, Assert
- Arrange: Set up test data and mock responses
- Act: Call the function being tested
- Assert: Verify expected behavior
- Use descriptive test names that explain what is being tested
- Test happy path with valid data
- Test error cases with invalid data
- Verify mock functions were called correctly
- Check both return values and side effects

### Integration Test Pattern (API)
- Use supertest for HTTP assertions
- Set up test database before all tests
- Clean up database after all tests
- Create test user and authentication token in beforeAll
- Use real database for integration tests
- Test complete request/response cycle
- Verify HTTP status codes
- Verify response body structure and content
- Test authentication and authorization
- Test error responses (400, 401, 404, etc.)
- Create test data in beforeEach when needed
- Clean up test data after each test
- Test all CRUD operations
- Verify database state changes

### Property-Based Test Pattern
- Use fast-check library for property testing
- Use fc.assert with fc.property for property tests
- Generate random test data with appropriate generators
- Run minimum 100 iterations per property
- Test universal properties that should always hold
- Test invariants (properties that never change)
- Test relationships between inputs and outputs
- Handle both valid and invalid inputs
- Use try-catch when testing validation
- Verify error messages for invalid inputs
- Test idempotent operations (f(x) = f(f(x)))
- Test commutative operations
- Test that transformations preserve certain properties

### E2E Test Pattern (Cypress)
- Use beforeEach to set up authentication
- Visit pages using cy.visit
- Use data-testid attributes for reliable selectors
- Interact with elements using cy.get
- Type into inputs using .type()
- Click buttons using .click()
- Verify URL changes with cy.url()
- Verify element visibility with .should('be.visible')
- Verify element content with .should('contain', text)
- Test complete user workflows
- Test form validation errors
- Test CRUD operations through UI
- Use .within() to scope selectors
- Wait for elements to appear before interacting

### Test Fixtures and Factories
- Create factory classes for test data generation
- Use counter to generate unique values
- Provide sensible defaults for all fields
- Allow overriding specific fields
- Create single instances with create()
- Create multiple instances with createMany()
- Reset counter in beforeEach
- Keep factories simple and focused
- Use factories consistently across tests
- Generate realistic test data
- Avoid hardcoded IDs and timestamps

### Snapshot Testing
- Use snapshot testing for component rendering
- Import render from testing library
- Render component with test props
- Use toMatchSnapshot() to capture output
- Test different component states (loading, error, success)
- Update snapshots when intentional changes made
- Review snapshot diffs carefully
- Keep snapshots small and focused
- Don't snapshot large data structures
- Use snapshots for UI regression testing

## Anti-Patterns

### ❌ Avoid: Testing Implementation Details
- Never test private fields or internal state
- Test public API and observable behavior
- Focus on what the code does, not how it does it
- Test inputs and outputs, not intermediate steps
- Avoid coupling tests to implementation
- Tests should survive refactoring

### ❌ Avoid: Flaky Tests
- Never use arbitrary timeouts or delays
- Always wait for actual conditions to be met
- Use proper async/await patterns
- Avoid timing-dependent assertions
- Make tests deterministic
- Fix flaky tests immediately, don't ignore them

### ❌ Avoid: Tests That Don't Assert
- Every test must have at least one assertion
- Verify expected behavior explicitly
- Check return values and side effects
- Don't just call functions without verification
- Use meaningful assertions
- Test both success and failure cases

### ❌ Avoid: Shared State Between Tests
- Never share mutable state between tests
- Each test should be independent
- Create fresh data in each test
- Don't rely on test execution order
- Use beforeEach for setup, not shared variables
- Tests should pass in any order

### ❌ Avoid: Mocking Everything
- Only mock external dependencies
- Use real implementations for internal modules
- Don't mock what you're testing
- Over-mocking makes tests brittle
- Integration tests should use real dependencies
- Mock at system boundaries, not everywhere

### ❌ Avoid: Unclear Test Names
- Never use vague names like "works" or "test1"
- Use descriptive names that explain what is tested
- Include the condition being tested
- Include the expected outcome
- Test names should read like documentation
- Use "should" to describe expected behavior
