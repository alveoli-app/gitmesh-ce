# Cline (Claude) Configuration for GitMesh CE

Optimized for long-form reasoning, architectural decisions, and complex refactoring on GitMesh Community Edition.

## Core Configuration

### Architecture Understanding
Read and understand the complete system architecture:
- **Backend**: Node.js/Express/TypeScript/Sequelize/PostgreSQL
- **Frontend**: Vue 3/Vite/TypeScript/Tailwind CSS
- **Services**: Python/Temporal/Redis/OpenSearch/SQS
- **Infrastructure**: Docker/Docker Compose/Nginx

**Full details**: `.vibe/core/architecture.md`

### Coding Standards
Follow strict coding standards for all languages:
- **TypeScript/JavaScript**: ES6+, async/await, explicit types, no `any`
- **Python**: PEP 8, type hints, async/await patterns
- **Shell**: POSIX compliance, error handling with `set -e`

**Full details**: `.vibe/core/coding-style.md`

### CE/EE Boundaries
**CRITICAL**: Never access, reference, or incorporate Enterprise Edition (EE) code.
- All code in this repository is Community Edition (Apache 2.0)
- If EE code is detected: STOP, ALERT, REPORT
- Contact: security@gitmesh.com

**Full details**: `.vibe/core/ce-ee-boundaries.md`

### Security Best Practices
Implement security at every layer:
- Validate all user input
- Use parameterized queries (never string concatenation)
- Hash passwords with bcrypt (12+ rounds)
- Never log sensitive data
- Store secrets in environment variables only

**Full details**: `.vibe/core/security.md`

### Testing Strategy
Write comprehensive tests for all code:
- **Unit tests**: Fast, isolated, test individual functions
- **Integration tests**: Test component interactions
- **Property-based tests**: Test universal properties
- **E2E tests**: Test critical user flows

**Full details**: `.vibe/core/testing.md`

### Memory Management
Keep context clean and task-focused:
- Memory is scoped to current task only
- Use `.vibe-memory/prd.json` for task definition
- Use `.vibe-memory/progress.txt` for debugging attempts
- **NEVER** create extra markdown files (SUMMARY.md, NOTES.md, etc.)
- Clean failed attempts when solution works

**Full details**: `.vibe/core/memory-management.md`

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

Update PRD first with task status and notes, then log to progress file with timestamp and approach. During work, log all attempts with outcomes. When complete, update PRD status and clean failed attempts from progress file, keeping only the final solution.

**See `.vibe/core/memory-management.md` for complete workflow.**

## Cline-Specific Features

### Long-Form Reasoning
Cline (powered by Claude) excels at deep, thoughtful analysis:

**Use Cline for:**
- Architectural decisions
- Complex refactoring
- System design
- Trade-off analysis
- Problem decomposition
- Code review

**Reasoning Process:**
1. **Understand**: Deeply analyze the problem
2. **Explore**: Consider multiple approaches
3. **Evaluate**: Weigh trade-offs
4. **Decide**: Choose best approach
5. **Implement**: Execute with care
6. **Validate**: Verify correctness

### Architectural Decisions

**Decision Framework:**

1. Context: Define the problem, constraints, and requirements
2. Options: List viable options with pros and cons for each
3. Analysis: Evaluate performance, maintainability, security, and scalability implications
4. Recommendation: Choose the best option with clear rationale and implementation plan

**Example Decision Process:**

When implementing rate limiting for API endpoints:
- Consider in-memory, Redis-based, and API Gateway approaches
- Analyze each option for performance, scalability, and complexity
- Evaluate trade-offs between simplicity and multi-instance support
- Choose the option that best fits existing infrastructure and requirements
- Document the decision with clear rationale

### Complex Refactoring

**Refactoring Strategy:**

1. Identify Code Smell: Determine what's wrong, why it needs refactoring, and the impact
2. Define Desired State: Describe the target code structure, patterns to follow, and expected benefits
3. Plan Incremental Steps: Break down into small, safe, testable changes
4. Execute with Tests: Write tests first if missing, refactor incrementally, run tests after each step, commit frequently
5. Validate Improvement: Ensure code is cleaner, tests pass, performance is maintained, and team understands changes

**Example Refactoring Approach:**

When encountering duplicate validation logic across controllers:
- Extract validation to shared utilities
- Update one controller to use shared utilities
- Add tests for validation utilities
- Update remaining controllers incrementally
- Remove old validation code
- Document validation patterns

Benefits: DRY principle, easier maintenance, consistent validation, better test coverage

### System Design

**Design Process:**

1. Requirements Analysis: Identify functional and non-functional requirements, constraints, and assumptions
2. High-Level Design: Define system components, interactions, data flow, and technology choices
3. Detailed Design: Specify component interfaces, data models, API contracts, and error handling
4. Trade-Off Analysis: Balance performance vs simplicity, consistency vs availability, cost vs scalability
5. Implementation Plan: Phase development starting with core functionality, then additional features, then optimization

## Architectural Patterns

### Layered Architecture

Structure: Presentation Layer (API Controllers) → Business Logic Layer (Services) → Data Access Layer (Repositories) → Database Layer

Benefits:
- Clear separation of concerns
- Easy to test each layer independently
- Flexible to change implementations
- Maintainable and scalable

Implementation approach:
- Controllers handle HTTP requests and responses
- Services implement business logic and validation
- Repositories manage data access
- Each layer depends only on the layer below

### Event-Driven Architecture

Structure: Event Producer → Message Queue → Event Consumer

Benefits:
- Decoupled components
- Asynchronous processing
- Scalable and resilient
- Easy to add new consumers

Implementation approach:
- Producers publish events to message queue
- Consumers subscribe to relevant events
- Events contain all necessary data
- Consumers process events independently

### Repository Pattern

Structure: Service → Repository Interface → Repository Implementation → Database

Benefits:
- Abstraction over data access
- Easy to test with mock repositories
- Flexible to change database
- Consistent data access patterns

Implementation approach:
- Define repository interface with standard methods
- Implement interface for specific database
- Services depend on interface, not implementation
- Easy to swap implementations for testing

## Refactoring Strategies

### Extract Method

Transform long functions into smaller, focused functions:
- Identify sections of code that perform distinct operations
- Extract each section into a named function
- Replace original code with function calls
- Each function should have a single, clear purpose

Benefits:
- Improved readability
- Easier to test individual operations
- Reduced code duplication
- Better error handling

### Replace Conditional with Polymorphism

Transform complex conditionals into strategy pattern:
- Define interface for strategy
- Create concrete strategy classes
- Store strategies in a map or registry
- Replace conditional with strategy lookup

Benefits:
- Eliminates complex if-else chains
- Easy to add new strategies
- Each strategy is independently testable
- Follows Open/Closed Principle

## Decision Frameworks

### Technology Selection

Process:
1. Requirements: Define problem, constraints, and non-functional requirements
2. Options: List 3-5 viable options and research each
3. Evaluation Criteria: Consider performance, scalability, maintainability, community support, learning curve, cost, and license
4. Scoring: Rate each option on each criterion (1-5), weight criteria by importance, calculate weighted scores
5. Decision: Choose highest scoring option, document rationale, plan migration if needed

### Performance Optimization

Process:
1. Measure: Profile the application, identify bottlenecks, quantify impact
2. Analyze: Determine root cause, understand constraints
3. Options: Consider caching, database optimization, algorithm improvement, parallel processing, infrastructure scaling
4. Implement: Start with highest impact, make one change at a time, measure after each change
5. Validate: Confirm performance improved, check for regressions, verify acceptable trade-offs

## Skills and Evaluations

### Skills
- Backend: `.vibe/skills/backend-engineer.md`
- Frontend: `.vibe/skills/frontend-engineer.md`
- Security: `.vibe/skills/security-engineer.md`
- Optimizer: `.vibe/skills/optimizer.md`

### Evaluations
- Code Quality: `.vibe/evals/code-quality.md`
- Test Coverage: `.vibe/evals/test-coverage.md`
- Security: `.vibe/evals/security-scan.md`
- Performance: `.vibe/evals/performance.md`

## Best Practices

### Architectural Decisions
- Document all major decisions
- Consider multiple options
- Analyze trade-offs
- Get team input
- Review periodically

### Refactoring
- Make small, incremental changes
- Keep tests passing
- Commit frequently
- Document changes
- Review with team

### System Design
- Start with requirements
- Design for change
- Keep it simple
- Document assumptions
- Plan for scale

## Resources

### Internal Documentation
- Architecture: `.vibe/core/architecture.md`
- Coding Style: `.vibe/core/coding-style.md`
- Security: `.vibe/core/security.md`
- Testing: `.vibe/core/testing.md`

### External Resources
- GitMesh Docs: https://docs.gitmesh.com
- Design Patterns: https://refactoring.guru/design-patterns
- Clean Code: https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882

## Summary

**Cline Strengths:**
- Long-form reasoning
- Architectural decisions
- Complex refactoring
- System design
- Trade-off analysis

**Best For:**
- Making architectural decisions
- Planning complex refactoring
- Designing new systems
- Analyzing trade-offs
- Code review

**Remember:**
- Think deeply before acting
- Consider multiple options
- Analyze trade-offs
- Document decisions
- Validate with team

**When in doubt:**
- Use decision frameworks
- Review architectural patterns
- Consult team members
- Document reasoning

Happy architecting with Cline! 🏗️
