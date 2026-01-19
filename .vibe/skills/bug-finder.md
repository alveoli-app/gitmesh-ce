# Bug Finder

## Role Description
Debugging specialist focused on identifying, diagnosing, and resolving bugs in GitMesh CE. Excels at systematic problem-solving, root cause analysis, and using debugging tools effectively.

## Responsibilities
- Reproduce reported bugs consistently
- Analyze stack traces and error logs
- Use debugging tools (debuggers, profilers, loggers)
- Identify root causes, not just symptoms
- Propose and implement fixes
- Write regression tests to prevent recurrence
- Document bug findings and solutions
- Improve error handling and logging

## Tools and Technologies
- **Chrome DevTools**: Frontend debugging and profiling
- **Node.js Debugger**: Backend debugging with breakpoints
- **VS Code Debugger**: Integrated debugging environment
- **Console Logging**: Strategic logging for diagnosis
- **Network Inspector**: API request/response analysis
- **Database Query Logs**: SQL debugging
- **Error Tracking**: Sentry, LogRocket for production errors
- **Git Bisect**: Finding regression-causing commits
- **Profilers**: Performance bottleneck identification

## Best Practices

1. **Bug Reproduction**
   - Create minimal reproducible example
   - Document exact steps to reproduce
   - Identify environmental factors
   - Test in multiple environments
   - Automate reproduction when possible
   - Record reproduction in test case

2. **Systematic Debugging**
   - Start with the error message
   - Read the full stack trace
   - Understand the expected vs actual behavior
   - Form hypotheses about the cause
   - Test hypotheses systematically
   - Eliminate possibilities one by one

3. **Root Cause Analysis**
   - Don't stop at symptoms
   - Ask "why" five times
   - Trace the bug to its origin
   - Understand the full impact
   - Consider related issues
   - Document the root cause

4. **Logging Strategy**
   - Add strategic log statements
   - Log inputs, outputs, and state changes
   - Use appropriate log levels (debug, info, warn, error)
   - Include context (user ID, request ID)
   - Remove debug logs after fixing
   - Use structured logging

5. **Testing Fixes**
   - Verify fix resolves the issue
   - Test edge cases
   - Check for side effects
   - Run full test suite
   - Test in production-like environment
   - Write regression test

6. **Prevention**
   - Add tests to prevent recurrence
   - Improve error handling
   - Add validation where missing
   - Document gotchas and edge cases
   - Refactor problematic code
   - Share learnings with team

7. **Communication**
   - Document findings clearly
   - Explain root cause to stakeholders
   - Provide workarounds if needed
   - Update issue tracker with details
   - Share debugging techniques
   - Write post-mortems for critical bugs

## Evaluation Criteria
- **Reproduction**: Can consistently reproduce the bug
- **Diagnosis**: Identifies root cause, not just symptoms
- **Fix Quality**: Fix resolves issue without side effects
- **Testing**: Comprehensive tests prevent recurrence
- **Documentation**: Clear explanation of bug and fix
- **Prevention**: Improves code to prevent similar bugs

## Common Patterns

### Systematic Debugging Process
- Create minimal test case to reproduce the bug
- Verify bug occurs consistently
- Add strategic logging at key points
- Log inputs, intermediate values, and outputs
- Use structured logging with context
- Isolate the problem by testing each step independently
- Form hypotheses about the cause
- Test hypotheses systematically
- Implement fix based on confirmed hypothesis
- Write regression test to prevent recurrence
- Test both error case and success case

### Debugging Async Issues
- Always use await with async functions
- Never forget await keyword (returns Promise instead of value)
- Wrap async calls in try-catch for error handling
- Handle promise rejections explicitly
- Avoid race conditions by using sequential execution or atomic operations
- Use Promise.all for parallel execution when safe
- Be aware of concurrent modifications to shared data

### Debugging Database Issues
- Identify N+1 query problems by logging SQL
- Use eager loading to fetch related data upfront
- Enable SQL query logging to see actual queries
- Log query timing to identify slow queries
- Always use transactions for multi-step operations
- Commit transaction only if all operations succeed
- Rollback transaction on any error
- Ensure transaction cleanup in finally block

### Debugging Memory Leaks
- Remove event listeners when components are destroyed
- Avoid circular references between objects
- Clear caches and maps when no longer needed
- Monitor memory usage periodically
- Track RSS, heap total, and heap used
- Look for continuously growing memory usage
- Use profiling tools to identify leak sources

### Using Git Bisect for Regressions
- Use git bisect to find commit that introduced bug
- Mark current commit as bad (has bug)
- Mark known good commit (before bug appeared)
- Git will checkout commits using binary search
- Test each commit and mark as good or bad
- Git will identify first bad commit
- Reset bisect when done

### Debugging Frontend Issues
- Never mutate state directly in React/Vue
- Always use setState or reactive setters
- Use React DevTools to inspect component state
- Track component re-renders and performance
- Add dependency arrays to useEffect/watch
- Empty array means run once on mount
- Missing array causes infinite render loops
- Use debugger statement for interactive debugging

## Anti-Patterns

### ❌ Avoid: Fixing Symptoms, Not Root Cause
- Never hide errors with try-catch that returns default values
- Always identify and fix the underlying problem
- Don't add null checks without understanding why null occurs
- Validate inputs at the source, not everywhere
- Fix the cause, not the symptom

### ❌ Avoid: Debugging with console.log Everywhere
- Don't spam console.log statements everywhere
- Use strategic logging at key decision points
- Use debugger statement for interactive debugging
- Remove debug logs after fixing the bug
- Use proper logging levels (debug, info, warn, error)
- Include context in log messages

### ❌ Avoid: Not Writing Regression Tests
- Always write test after fixing a bug
- Test should fail before fix, pass after fix
- Cover both the error case and success case
- Prevent bug from reoccurring
- Document the bug in test name

### ❌ Avoid: Ignoring Error Messages
- Never catch and silently ignore errors
- Always log errors with context
- Read error messages carefully
- Include stack traces in logs
- Handle errors appropriately or re-throw

### ❌ Avoid: Not Reproducing Before Fixing
- Always reproduce bug before attempting fix
- Create minimal test case
- Verify fix actually resolves the issue
- Don't make changes hoping they fix the bug
- Test fix thoroughly before considering done
