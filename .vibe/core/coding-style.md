# Coding Style Guide

This document defines coding standards for GitMesh Community Edition across all supported languages.

## TypeScript/JavaScript Standards

### Language Features
- Use ES6+ features (arrow functions, destructuring, template literals, spread operators)
- Prefer `const` over `let`, avoid `var`
- Use async/await for asynchronous operations instead of callbacks or raw promises
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access

### Code Organization
- One class/interface per file (except for closely related types)
- Group imports: external libraries first, then internal modules
- Export at declaration point, not at end of file
- Use named exports over default exports for better refactoring

### Naming Conventions
- **Variables/Functions**: camelCase (`getUserData`, `isActive`)
- **Classes/Interfaces**: PascalCase (`UserService`, `IUserRepository`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`, `API_BASE_URL`)
- **Private members**: prefix with underscore (`_internalState`)
- **Boolean variables**: use `is`, `has`, `should` prefixes (`isValid`, `hasPermission`)

### Type Safety
- Always use explicit types for function parameters and return values
- Avoid `any` type - use `unknown` if type is truly unknown
- Use union types and type guards for type narrowing
- Prefer interfaces for object shapes, types for unions/intersections

### Error Handling
- Always handle promise rejections with try/catch or .catch()
- Throw typed errors with meaningful messages
- Use custom error classes for domain-specific errors
- Log errors with context before re-throwing

### Async Patterns

**Best Practices:**
- Use async/await for asynchronous operations with proper error handling
- Always wrap async operations in try/catch blocks
- Log errors with context information before re-throwing
- Return promises from async functions
- Avoid callback hell by using async/await instead of nested callbacks
- Handle promise rejections explicitly

**Anti-Patterns to Avoid:**
- Using callbacks for new asynchronous code
- Leaving promises unhandled without .catch() or try/catch
- Mixing callback and promise patterns in the same codebase
- Not logging error context before throwing

### Code Quality
- Keep functions small and focused (single responsibility)
- Avoid deep nesting (max 3 levels)
- Use early returns to reduce nesting
- Comment complex logic, not obvious code
- Use JSDoc for public APIs

## Python Standards

### Style Guide
- Follow PEP 8 style guide strictly
- Use 4 spaces for indentation (no tabs)
- Maximum line length: 100 characters
- Use blank lines to separate logical sections

### Type Hints
- Always use type hints for function parameters and return values
- Use `typing` module for complex types (`List`, `Dict`, `Optional`, `Union`)
- Use `None` return type explicitly for functions with no return value
- Use `TypedDict` for structured dictionaries

### Naming Conventions
- **Variables/Functions**: snake_case (`get_user_data`, `is_active`)
- **Classes**: PascalCase (`UserService`, `DatabaseConnection`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`, `API_BASE_URL`)
- **Private members**: prefix with underscore (`_internal_state`)
- **Protected members**: single underscore (`_protected_method`)
- **Name mangling**: double underscore for truly private (`__private_attr`)

### Code Organization
- One class per file for large classes
- Group related functions in modules
- Use `__init__.py` to expose public API
- Import order: standard library, third-party, local modules

### Error Handling
- Use specific exception types, not bare `except:`
- Always provide context in exception messages
- Use context managers (`with` statement) for resource management
- Log exceptions with full traceback

### Async Patterns

**Best Practices:**
- Use async/await for asynchronous operations with proper error handling
- Always wrap async operations in try/catch blocks
- Log errors with full context using exc_info=True for tracebacks
- Use type hints for async functions with proper return types
- Raise specific exception types with descriptive messages
- Use context managers (with statement) for resource management

**Anti-Patterns to Avoid:**
- Using bare except clauses without specific exception types
- Not logging exceptions with full traceback information
- Forgetting to await async functions
- Not using context managers for file or connection handling

### Code Quality
- Use list comprehensions for simple transformations
- Prefer `pathlib` over `os.path` for file operations
- Use f-strings for string formatting
- Use dataclasses or Pydantic models for structured data
- Document public functions with docstrings (Google or NumPy style)

### Testing
- Use pytest for all tests
- Use type hints in test functions
- Use fixtures for test setup
- Mock external dependencies

## Shell Script Standards

### POSIX Compliance
- Write POSIX-compliant scripts (avoid bash-specific features unless necessary)
- Use `#!/bin/sh` for POSIX scripts, `#!/bin/bash` only when bash features required
- Test scripts with `shellcheck` for portability issues

### Error Handling
- Always use `set -e` to exit on error
- Use `set -u` to catch undefined variables
- Use `set -o pipefail` to catch errors in pipelines
- Provide meaningful error messages before exiting

### Script Structure

**Required Elements:**
- Shebang line at the top (#!/bin/sh or #!/bin/bash)
- Error handling with set -e, set -u, and set -o pipefail
- Script description and usage information in comments
- Constants defined with readonly keyword
- Functions for reusable logic
- Main function that orchestrates script execution
- Proper argument validation with usage messages
- Logging functions for info and error messages

**Best Practices:**
- Use readonly for all constants
- Define functions before using them
- Validate all inputs and arguments at the start
- Provide clear usage information for incorrect invocation
- Use meaningful function and variable names
- Exit with appropriate error codes
- Log to both stdout and log files when appropriate

### Best Practices
- Quote all variables: `"$variable"` not `$variable`
- Use `[[ ]]` for conditionals in bash, `[ ]` for POSIX
- Check command existence before use: `command -v cmd >/dev/null 2>&1`
- Use `readonly` for constants
- Use functions for reusable logic
- Validate all inputs and arguments
- Provide usage information for incorrect invocation

### Naming Conventions
- **Variables**: lowercase_with_underscores
- **Constants**: UPPERCASE_WITH_UNDERSCORES
- **Functions**: lowercase_with_underscores
- **Environment variables**: UPPERCASE_WITH_UNDERSCORES

## General Principles

### Code Review Checklist
- [ ] Code follows language-specific style guide
- [ ] All functions have proper error handling
- [ ] Type hints/annotations are present (TypeScript/Python)
- [ ] No hardcoded secrets or credentials
- [ ] Logging is appropriate (not too verbose, not too sparse)
- [ ] Tests cover new functionality
- [ ] Documentation is updated
- [ ] No commented-out code
- [ ] No console.log/print statements in production code

### Performance Considerations
- Avoid premature optimization
- Profile before optimizing
- Use appropriate data structures
- Cache expensive computations when appropriate
- Use database indexes for frequent queries
- Batch operations when possible

### Security Considerations
- Validate all user inputs
- Sanitize data before database queries
- Use parameterized queries (never string concatenation)
- Never log sensitive data (passwords, tokens, PII)
- Use environment variables for secrets
- Follow principle of least privilege

## IDE Configuration

### Recommended Extensions
- **TypeScript/JavaScript**: ESLint, Prettier
- **Python**: Pylint, Black, mypy
- **Shell**: ShellCheck

### Linting Configuration
- ESLint for TypeScript/JavaScript (see `.eslintrc.js`)
- Pylint/Flake8 for Python (see `.flake8`)
- ShellCheck for shell scripts

### Formatting
- Prettier for TypeScript/JavaScript (see `.prettierrc`)
- Black for Python (line length: 100)
- No automatic formatting for shell scripts (manual review)
