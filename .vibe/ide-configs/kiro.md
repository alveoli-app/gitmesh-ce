# Kiro AI Configuration for GitMesh CE

This configuration optimizes Kiro for spec-driven development, property-based testing, and formal verification on GitMesh Community Edition.

## Core Configuration

### Architecture Understanding
Read and understand the complete system architecture:
- **Backend**: Node.js/Express/TypeScript/Sequelize/PostgreSQL
- **Frontend**: Vue 3/Vite/TypeScript/Tailwind CSS
- **Services**: Python/Temporal/Redis/OpenSearch/SQS
- **Infrastructure**: Docker/Docker Compose/Nginx

**Full details**: See `.vibe/core/architecture.md`

### Coding Standards
Follow strict coding standards for all languages:
- **TypeScript/JavaScript**: ES6+, async/await, explicit types, no `any`
- **Python**: PEP 8, type hints, async/await patterns
- **Shell**: POSIX compliance, error handling with `set -e`

**Full details**: See `.vibe/core/coding-style.md`

### CE/EE Boundaries
**CRITICAL**: Never access, reference, or incorporate Enterprise Edition (EE) code.
- All code in this repository is Community Edition (Apache 2.0)
- If EE code is detected: STOP, ALERT, REPORT
- Contact: security@gitmesh.com

**Full details**: See `.vibe/core/ce-ee-boundaries.md`

### Security Best Practices
Implement security at every layer:
- Validate all user input
- Use parameterized queries (never string concatenation)
- Hash passwords with bcrypt (12+ rounds)
- Never log sensitive data
- Store secrets in environment variables only

**Full details**: See `.vibe/core/security.md`

### Testing Strategy
Write comprehensive tests with emphasis on property-based testing:
- **Unit tests**: Fast, isolated, test individual functions
- **Property-based tests**: Test universal properties across all inputs
- **Integration tests**: Test component interactions
- **E2E tests**: Test critical user flows

**Full details**: See `.vibe/core/testing.md`

### Memory Management
Keep context clean and task-focused:
- Memory is scoped to current task only
- Use `.vibe-memory/prd.json` for task definition
- Use `.vibe-memory/progress.txt` for debugging attempts
- **NEVER** create extra markdown files (SUMMARY.md, NOTES.md, etc.)
- Clean failed attempts when solution works

**Full details**: See `.vibe/core/memory-management.md`

### CRITICAL: Always Update PRD and Progress
**BEFORE starting ANY task, you MUST:**

1. **Update `.vibe-memory/prd.json`**
   - Add or update task entry with status `in_progress`
   - Add notes about your approach
   - Update timestamp

2. **Log to `.vibe-memory/progress.txt`**
   - Log task start with timestamp
   - Document your approach
   - Log failed attempts with errors
   - Log successful solution when found
   - Clean failed attempts after success

**This is MANDATORY for:**
- New features
- Bug fixes
- Refactoring
- Testing
- Documentation
- Any code changes

**Example:**
```
// 1. Update PRD first
{
  "tasks": [{
    "id": "T-1",
    "description": "Add email validation",
    "status": "in_progress",
    "notes": "Using validator.js"
  }]
}

// 2. Log to progress.txt
[2025-01-15 10:30] Started: Adding email validation
Approach: Using validator.js library

// 3. Do the work...

// 4. Log attempts
[Attempt 1] Tried validator.isEmail() - FAILED: undefined
[Attempt 2] Import validator correctly - SUCCESS

// 5. Update PRD when done
{
  "tasks": [{
    "id": "T-1",
    "status": "completed"
  }]
}

// 6. Clean failed attempts
[CLEANED] Final solution: import validator from 'validator'
```

**See `.vibe/core/memory-management.md` for complete workflow.**

## Kiro-Specific Features

### Spec-Driven Development
Kiro excels at structured, requirements-first development:

**Workflow:**
1. **Requirements**: Define clear, testable requirements using EARS patterns
2. **Design**: Create comprehensive design with correctness properties
3. **Tasks**: Break down implementation into discrete, testable tasks
4. **Implementation**: Execute tasks with property-based testing

**Creating a Spec:**
```
"Create a spec for user authentication feature"

Kiro will guide you through:
1. Gathering requirements (EARS format)
2. Designing the solution (with correctness properties)
3. Creating implementation tasks
4. Executing tasks with tests
```

### Property-Based Testing
Kiro emphasizes formal correctness through property-based testing:

**What are Properties?**
Properties are universal statements that should hold for all valid inputs:
- **Round-trip**: `decode(encode(x)) == x`
- **Idempotence**: `f(f(x)) == f(x)`
- **Invariants**: Properties that never change
- **Commutativity**: `f(x, y) == f(y, x)`

**Example Property:**
```typescript
// Property: Reversing a string twice returns the original
import fc from 'fast-check';

describe('String utilities', () => {
  it('should preserve string when reversing twice', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const reversed = reverse(reverse(str));
        return reversed === str;
      })
    );
  });
});
```

**When to Use Property-Based Testing:**
- Parsers and serializers (always test round-trip)
- Data transformations (test invariants)
- Sorting and filtering (test properties)
- Validation logic (test error conditions)
- Business rules (test universal properties)

### Formal Verification
Kiro helps you think formally about correctness:

**Correctness Properties:**
Every feature should have explicit correctness properties:
```markdown
## Correctness Properties

Property 1: User creation preserves email uniqueness
*For any* two users created with the same email, the second creation should fail with a unique constraint error.
**Validates: Requirements 1.2**

Property 2: Password hashing is irreversible
*For any* password, hashing it should produce a value that cannot be reversed to the original password.
**Validates: Requirements 2.1**

Property 3: Session tokens expire after timeout
*For any* session token, accessing it after the timeout period should fail with an authentication error.
**Validates: Requirements 3.3**
```

**Implementation:**
Each property becomes a property-based test:
```typescript
// Property 1: Email uniqueness
it('should enforce email uniqueness', async () => {
  fc.assert(
    fc.asyncProperty(fc.emailAddress(), async (email) => {
      await userService.createUser({ email, username: 'user1', password: 'pass' });
      
      await expect(
        userService.createUser({ email, username: 'user2', password: 'pass' })
      ).rejects.toThrow('Email already exists');
    })
  );
});
```

## Spec Workflow

### Phase 1: Requirements Gathering

**EARS Patterns:**
Every requirement must follow one of these patterns:
1. **Ubiquitous**: THE <system> SHALL <response>
2. **Event-driven**: WHEN <trigger>, THE <system> SHALL <response>
3. **State-driven**: WHILE <condition>, THE <system> SHALL <response>
4. **Unwanted event**: IF <condition>, THEN THE <system> SHALL <response>
5. **Optional feature**: WHERE <option>, THE <system> SHALL <response>
6. **Complex**: [WHERE] [WHILE] [WHEN/IF] THE <system> SHALL <response>

**Example Requirements:**
```markdown
### Requirement 1: User Authentication

**User Story:** As a user, I want to log in securely, so that I can access my account.

#### Acceptance Criteria

1. WHEN a user provides valid credentials, THE System SHALL authenticate the user and return a session token
2. WHEN a user provides invalid credentials, THE System SHALL reject authentication and return an error
3. WHILE a session is active, THE System SHALL allow access to protected resources
4. WHEN a session expires, THE System SHALL require re-authentication
```

**Quality Rules:**
- Use active voice
- No vague terms ("quickly", "user-friendly")
- No pronouns ("it", "them")
- Measurable criteria
- One thought per requirement

### Phase 2: Design with Correctness Properties

**Design Structure:**
```markdown
# Design Document

## Overview
[High-level description]

## Architecture
[Component relationships]

## Components and Interfaces
[Detailed component design]

## Data Models
[Data structures and schemas]

## Correctness Properties
[Universal properties that must hold]

Property 1: [Property name]
*For any* [input], [expected behavior]
**Validates: Requirements X.Y**

## Error Handling
[Error scenarios and handling]

## Testing Strategy
[Unit tests, property tests, integration tests]
```

**Prework for Properties:**
Before writing properties, analyze each acceptance criterion:
```
1.1 WHEN a user provides valid credentials, THE System SHALL authenticate
Thoughts: This is about all valid credentials, not specific examples. We can generate random valid credentials and verify authentication succeeds.
Testable: yes - property

1.2 WHEN a user provides invalid credentials, THE System SHALL reject
Thoughts: This is about all invalid credentials. We can generate random invalid credentials and verify rejection.
Testable: yes - property
```

**Property Reflection:**
After prework, eliminate redundancy:
- Combine similar properties
- Remove properties implied by others
- Ensure each property provides unique validation

### Phase 3: Task Creation

**Task Structure:**
```markdown
# Implementation Plan

## Tasks

- [ ] 1. Set up authentication infrastructure
  - Create database schema for users and sessions
  - Set up password hashing with bcrypt
  - _Requirements: 1.1, 1.2_

- [ ] 2. Implement authentication logic
  - [ ] 2.1 Implement user login endpoint
    - Create POST /api/auth/login endpoint
    - Validate credentials
    - Generate session token
    - _Requirements: 1.1, 1.2_
  
  - [ ]* 2.2 Write property test for login
    - **Property 1: Valid credentials authenticate**
    - **Validates: Requirements 1.1**
  
  - [ ]* 2.3 Write property test for invalid credentials
    - **Property 2: Invalid credentials reject**
    - **Validates: Requirements 1.2**

- [ ] 3. Checkpoint - Ensure all tests pass
```

**Task Rules:**
- Each task references specific requirements
- Property tests are sub-tasks (marked with *)
- Checkpoints at reasonable breaks
- Incremental, testable progress

### Phase 4: Implementation

**Execute Tasks:**
```
"Execute task 2.1 from the authentication spec"

Kiro will:
1. Read requirements and design
2. Implement the task
3. Write tests (including property tests)
4. Validate against requirements
5. Mark task complete
```

**Property Test Execution:**
When implementing property tests:
1. Generate random inputs (100+ iterations)
2. Test the property holds for all inputs
3. If test fails, analyze counterexample
4. Fix implementation or refine property
5. Re-run until passing

## Property-Based Testing Patterns

### Common Patterns

**1. Round-Trip Properties:**
```typescript
// Serialization round-trip
it('should preserve data through serialization', () => {
  fc.assert(
    fc.property(fc.object(), (obj) => {
      const serialized = JSON.stringify(obj);
      const deserialized = JSON.parse(serialized);
      return JSON.stringify(deserialized) === serialized;
    })
  );
});
```

**2. Invariant Properties:**
```typescript
// Sorting preserves length
it('should preserve array length when sorting', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted.length === arr.length;
    })
  );
});
```

**3. Idempotence Properties:**
```typescript
// Deduplication is idempotent
it('should be idempotent when deduplicating', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      const deduped1 = deduplicate(arr);
      const deduped2 = deduplicate(deduped1);
      return JSON.stringify(deduped1) === JSON.stringify(deduped2);
    })
  );
});
```

**4. Error Condition Properties:**
```typescript
// Invalid input always errors
it('should reject all invalid emails', () => {
  fc.assert(
    fc.property(
      fc.string().filter(s => !s.includes('@')),
      (invalidEmail) => {
        expect(() => validateEmail(invalidEmail)).toThrow();
      }
    )
  );
});
```

### Generators

**Custom Generators:**
```typescript
// Generate valid user data
const userArbitrary = fc.record({
  email: fc.emailAddress(),
  username: fc.string({ minLength: 3, maxLength: 20 })
    .filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
  password: fc.string({ minLength: 12 })
});

// Use in tests
it('should create any valid user', () => {
  fc.assert(
    fc.asyncProperty(userArbitrary, async (userData) => {
      const user = await userService.createUser(userData);
      expect(user.email).toBe(userData.email);
    })
  );
});
```

**Constrained Generators:**
```typescript
// Generate valid date ranges
const dateRangeArbitrary = fc.tuple(
  fc.date(),
  fc.date()
).map(([d1, d2]) => {
  const start = d1 < d2 ? d1 : d2;
  const end = d1 < d2 ? d2 : d1;
  return { start, end };
});
```

## Testing Strategy

### Test Pyramid for Kiro

```
        /\
       /  \      E2E Tests (Few)
      /____\     - Critical user flows
     /      \    Integration Tests (Some)
    /________\   - Component interactions
   /          \  Property Tests (Many)
  /____________\ - Universal properties
 /              \ Unit Tests (Many)
/________________\ - Specific examples
```

**Balance:**
- **Unit tests**: Specific examples and edge cases
- **Property tests**: Universal properties across all inputs
- **Integration tests**: Component boundaries
- **E2E tests**: Critical user journeys

### Test Configuration

**Jest with fast-check:**
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
};
```

**Test Setup:**
```typescript
// test/setup.ts
import fc from 'fast-check';

// Configure fast-check
fc.configureGlobal({
  numRuns: 100, // Run each property 100 times
  verbose: true,
  seed: Date.now()
});
```

### Test Tagging

**Tag Property Tests:**
```typescript
// Feature: user-authentication, Property 1: Valid credentials authenticate
it('should authenticate any valid credentials', () => {
  fc.assert(
    fc.asyncProperty(validCredentialsArbitrary, async (creds) => {
      const token = await authService.login(creds.email, creds.password);
      expect(token).toBeDefined();
    })
  );
});
```

## Skill Activation

Activate specialized skills for different tasks:

### Backend Development
**Activate**: `.vibe/skills/backend-engineer.md`
```
"Activate backend-engineer skill for implementing the authentication API"
```

### Frontend Development
**Activate**: `.vibe/skills/frontend-engineer.md`
```
"Activate frontend-engineer skill for creating the login form component"
```

### Testing Specialist
**Activate**: `.vibe/skills/tester.md`
```
"Activate tester skill for comprehensive test coverage of authentication"
```

### Security Engineer
**Activate**: `.vibe/skills/security-engineer.md`
```
"Activate security-engineer skill to review authentication security"
```

## Evaluation Framework

Before submitting a PR, run these evaluations:

### Code Quality
**Eval**: `.vibe/evals/code-quality.md`
- ESLint/Prettier for TypeScript
- Pylint/Black for Python
- No code smells

### Test Coverage
**Eval**: `.vibe/evals/test-coverage.md`
- 70%+ code coverage
- All properties tested
- Critical paths covered

### Security Scan
**Eval**: `.vibe/evals/security-scan.md`
- No hardcoded secrets
- Input validation present
- Authentication/authorization correct

### CE/EE Separation
**Eval**: `.vibe/evals/ce-ee-separation.md`
- No EE code patterns
- Apache 2.0 license headers
- No proprietary dependencies

## Common Patterns

### Spec Creation Pattern
```
1. User: "Create a spec for password reset feature"

2. Kiro: Gathers requirements
   - Asks clarifying questions
   - Writes EARS-formatted requirements
   - Gets user approval

3. Kiro: Creates design
   - Analyzes acceptance criteria
   - Writes correctness properties
   - Designs architecture
   - Gets user approval

4. Kiro: Creates tasks
   - Breaks down implementation
   - Adds property test tasks
   - Includes checkpoints
   - Gets user approval

5. User: "Execute task 1.1"

6. Kiro: Implements task
   - Writes code
   - Writes tests
   - Validates requirements
   - Marks complete
```

### Property Test Pattern
```typescript
// 1. Define the property
// Property: Password hashing is irreversible

// 2. Create generator
const passwordArbitrary = fc.string({ minLength: 12 });

// 3. Write property test
it('should not reverse password hash', () => {
  fc.assert(
    fc.asyncProperty(passwordArbitrary, async (password) => {
      const hash = await hashPassword(password);
      
      // Hash should not equal password
      expect(hash).not.toBe(password);
      
      // Hash should be verifiable
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
      
      // Wrong password should not verify
      const isInvalid = await verifyPassword(password + 'x', hash);
      expect(isInvalid).toBe(false);
    })
  );
});
```

### Debugging Failed Properties
```
1. Property test fails with counterexample
   Example: { email: "", username: "a", password: "short" }

2. Analyze counterexample
   - Empty email is invalid
   - Username too short
   - Password too short

3. Options:
   a) Fix implementation (add validation)
   b) Fix generator (constrain inputs)
   c) Fix property (refine specification)

4. Re-run test with fix

5. If passes, mark complete
```

## Troubleshooting

### Common Issues

**Issue**: Property test fails with unexpected input
**Solution**:
- Analyze the counterexample
- Determine if it's a bug or invalid input
- Fix implementation or constrain generator

**Issue**: Property test is too slow
**Solution**:
- Reduce numRuns (but keep ≥100)
- Optimize the property check
- Use smaller generators

**Issue**: Can't think of properties
**Solution**:
- Look for round-trip operations
- Identify invariants
- Check for idempotence
- Test error conditions

**Issue**: Spec is too detailed
**Solution**:
- Focus on requirements, not implementation
- Let design handle "how"
- Keep tasks actionable

## Tips and Tricks

### Effective Spec Creation
```
Good: "Create a spec for user authentication with OAuth support"
Good: "Design a rate limiting system for API endpoints"
Good: "Implement signal deduplication with property-based tests"

Avoid: "Build the whole backend" (too broad)
Avoid: "Fix the bug" (not spec-appropriate)
```

### Property Discovery
Ask yourself:
- What should always be true?
- What operations are reversible?
- What operations are idempotent?
- What invariants must hold?
- What errors should always occur?

### Test-Driven Development
```
1. Write property test (fails)
2. Implement minimal code (passes)
3. Refactor (still passes)
4. Add more properties (repeat)
```

### Incremental Specs
Start small, iterate:
```
Iteration 1: Basic authentication (login/logout)
Iteration 2: Add password reset
Iteration 3: Add OAuth providers
Iteration 4: Add 2FA
```

## Resources

### Property-Based Testing
- fast-check docs: https://fast-check.dev
- Hypothesis docs: https://hypothesis.readthedocs.io
- Property-Based Testing book: https://www.propertesting.com

### Formal Methods
- EARS patterns: https://alistairmavin.com/ears/
- Formal specification: https://www.hillelwayne.com/post/spec-notation/

### Internal Docs
- Architecture: `.vibe/core/architecture.md`
- Testing: `.vibe/core/testing.md`
- Security: `.vibe/core/security.md`

## Summary

**Remember:**
- Start with requirements (EARS format)
- Design with correctness properties
- Implement with property-based tests
- Validate against requirements
- Keep specs focused and actionable

**Kiro excels at:**
- Structured, requirements-first development
- Property-based testing
- Formal verification
- Incremental, testable progress
- Catching edge cases

**When in doubt:**
- Review the spec workflow
- Analyze acceptance criteria for properties
- Write property tests for universal behavior
- Use unit tests for specific examples

Use Kiro's strengths to build correct, well-tested features for GitMesh CE!
