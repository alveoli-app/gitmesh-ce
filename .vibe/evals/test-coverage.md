# Test Coverage Evaluation

## Purpose

This evaluation validates that AI-generated code includes comprehensive test coverage across unit, integration, and end-to-end testing layers.

## Validation Criteria

1. **Unit Test Coverage**: All new functions and classes have unit tests (target: > 80% line coverage)
2. **Integration Test Coverage**: API endpoints and service integrations have integration tests
3. **Property-Based Tests**: Complex logic includes property-based tests where applicable
4. **Edge Case Coverage**: Tests include boundary conditions, null/undefined, empty collections
5. **Error Path Coverage**: Tests validate error handling and failure scenarios
6. **Test Quality**: Tests are readable, maintainable, and test one thing at a time
7. **Test Independence**: Tests can run in any order without dependencies
8. **Mock Usage**: Mocks are used appropriately (external services, not internal logic)

## Pass/Fail Thresholds

### Pass Conditions
- Line coverage > 80% for new code
- Branch coverage > 75% for new code
- All public APIs have unit tests
- Critical paths have integration tests
- Error scenarios are tested
- Tests pass consistently (no flaky tests)

### Fail Conditions
- Line coverage < 70% for new code
- Branch coverage < 60% for new code
- Public APIs without tests
- No error scenario testing
- Flaky tests (intermittent failures)
- Tests that depend on execution order

## Coverage Thresholds by Component

### Backend (Node.js/TypeScript)
- **Services**: 85% line coverage, 80% branch coverage
- **API Routes**: 80% line coverage, 75% branch coverage
- **Utilities**: 90% line coverage, 85% branch coverage
- **Database Repositories**: 75% line coverage, 70% branch coverage

### Frontend (Vue 3/TypeScript)
- **Components**: 70% line coverage, 65% branch coverage
- **Stores**: 85% line coverage, 80% branch coverage
- **Utilities**: 90% line coverage, 85% branch coverage
- **Composables**: 80% line coverage, 75% branch coverage

### Services (Python)
- **Workers**: 80% line coverage, 75% branch coverage
- **Integrations**: 75% line coverage, 70% branch coverage
- **Libraries**: 85% line coverage, 80% branch coverage

## Remediation Guidance

### Running Coverage Reports

**Backend:**
```bash
cd backend
pnpm test -- --coverage
# View report: open coverage/lcov-report/index.html
```

**Frontend:**
```bash
cd frontend
pnpm test:unit -- --coverage
# View report: open coverage/index.html
```

**Services:**
```bash
cd services
pytest --cov=apps --cov=libs --cov-report=html
# View report: open htmlcov/index.html
```

### Improving Coverage

**Identify Uncovered Lines:**
```bash
# Backend/Frontend
pnpm test -- --coverage --coverageReporters=text

# Services
pytest --cov=apps --cov-report=term-missing
```

**Add Missing Tests:**
```typescript
// Example: Testing error paths
describe('UserService', () => {
  it('should handle database connection errors', async () => {
    // Mock database failure
    jest.spyOn(db, 'query').mockRejectedValue(new Error('Connection failed'));
    
    // Verify error handling
    await expect(userService.findById('123'))
      .rejects.toThrow('Failed to fetch user');
  });
  
  it('should handle invalid user IDs', async () => {
    await expect(userService.findById(''))
      .rejects.toThrow('Invalid user ID');
  });
});
```

**Property-Based Testing:**
```typescript
import fc from 'fast-check';

describe('String utilities', () => {
  it('should preserve length when reversing strings', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const reversed = reverseString(str);
        return reversed.length === str.length;
      })
    );
  });
});
```

### Test Quality Improvements

**Bad Test (tests multiple things):**
```typescript
it('should create user and send email and log event', async () => {
  const user = await createUser(data);
  expect(user).toBeDefined();
  expect(emailService.send).toHaveBeenCalled();
  expect(logger.info).toHaveBeenCalled();
});
```

**Good Tests (focused, one assertion per test):**
```typescript
describe('createUser', () => {
  it('should create user with valid data', async () => {
    const user = await createUser(validData);
    expect(user.email).toBe(validData.email);
  });
  
  it('should send welcome email after creation', async () => {
    await createUser(validData);
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'welcome' })
    );
  });
  
  it('should log user creation event', async () => {
    await createUser(validData);
    expect(logger.info).toHaveBeenCalledWith('User created', expect.any(Object));
  });
});
```

## Automation

### Pre-Commit Coverage Check
```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
cd backend && pnpm test -- --coverage --coverageThreshold='{"global":{"lines":80}}'
cd frontend && pnpm test:unit -- --coverage --coverageThreshold='{"global":{"lines":70}}'
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Run Tests with Coverage
  run: |
    cd backend && pnpm test -- --coverage
    cd frontend && pnpm test:unit -- --coverage

- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./backend/coverage/lcov.info,./frontend/coverage/lcov.info
    fail_ci_if_error: true

- name: Check Coverage Thresholds
  run: |
    cd backend && pnpm test -- --coverage --coverageThreshold='{"global":{"lines":80,"branches":75}}'
```

### Coverage Badges
Add to README.md:
```markdown
[![Backend Coverage](https://codecov.io/gh/org/repo/branch/main/graph/badge.svg?flag=backend)](https://codecov.io/gh/org/repo)
[![Frontend Coverage](https://codecov.io/gh/org/repo/branch/main/graph/badge.svg?flag=frontend)](https://codecov.io/gh/org/repo)
```

## Test Types and When to Use Them

### Unit Tests
- **Purpose**: Test individual functions/classes in isolation
- **When**: Always for new functions, classes, utilities
- **Example**: Testing a string formatting function

### Integration Tests
- **Purpose**: Test interactions between components
- **When**: API endpoints, database operations, service integrations
- **Example**: Testing POST /api/users endpoint with database

### Property-Based Tests
- **Purpose**: Test universal properties across many inputs
- **When**: Complex logic, parsers, serializers, data transformations
- **Example**: Testing that parse(serialize(x)) === x for all x

### End-to-End Tests
- **Purpose**: Test complete user workflows
- **When**: Critical user paths, authentication flows
- **Example**: Testing user signup → login → dashboard flow

## Common Coverage Gaps

1. **Error Handling**: Missing tests for catch blocks and error paths
2. **Edge Cases**: Not testing null, undefined, empty arrays, boundary values
3. **Async Code**: Missing tests for promise rejections and timeouts
4. **Conditional Logic**: Not testing all branches of if/else statements
5. **Default Parameters**: Not testing functions with default values
6. **Type Guards**: Not testing type narrowing logic

## Quality Metrics

Track these metrics over time:
- Overall line coverage (target: > 80%)
- Overall branch coverage (target: > 75%)
- Test execution time (target: < 5 minutes for unit tests)
- Flaky test rate (target: 0%)
- Test-to-code ratio (target: 1:1 or higher)

## Related Evaluations
- **code-quality.md**: Ensures tests follow quality standards
- **performance.md**: Validates test execution performance
- **security-scan.md**: Checks for security test coverage
