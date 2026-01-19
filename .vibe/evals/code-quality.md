# Code Quality Evaluation

## Purpose

This evaluation validates that AI-generated code meets GitMesh CE quality standards for readability, maintainability, and adherence to project conventions.

## Validation Criteria

1. **Linting Compliance**: Code passes all ESLint (TypeScript/JavaScript) and Flake8 (Python) checks without errors
2. **Formatting Standards**: Code follows Prettier (TypeScript/JavaScript) and Black (Python) formatting rules
3. **Type Safety**: TypeScript code includes proper type annotations, no `any` types without justification
4. **Error Handling**: All async operations include proper try-catch blocks or error handling
5. **Code Complexity**: Functions have reasonable cyclomatic complexity (< 10 for most cases)
6. **Naming Conventions**: Variables, functions, and classes follow project naming standards
7. **Documentation**: Public APIs include JSDoc/docstring comments
8. **Import Organization**: Imports are organized and unused imports are removed

## Pass/Fail Thresholds

### Pass Conditions
- Zero linting errors
- Zero formatting violations
- All TypeScript code properly typed (< 5% `any` usage)
- All error paths handled
- Average cyclomatic complexity < 8
- All public APIs documented

### Fail Conditions
- Any linting errors present
- Formatting violations detected
- Excessive use of `any` types (> 10%)
- Missing error handling in async code
- Functions with complexity > 15
- Undocumented public APIs

## Remediation Guidance

### Linting Errors
```bash
# TypeScript/JavaScript
cd backend
pnpm run lint:fix

cd frontend
pnpm run lint:fix

# Python
cd services
flake8 --config=.flake8 .
```

### Formatting Issues
```bash
# TypeScript/JavaScript
cd backend
pnpm run format

cd frontend
pnpm run format

# Python
cd services
black .
```

### Type Safety Issues
- Replace `any` with specific types or union types
- Use `unknown` for truly unknown types, then narrow with type guards
- Add type annotations to function parameters and return values
- Use generics for reusable type-safe functions

### Error Handling
```typescript
// Bad
async function fetchData() {
  const result = await api.call();
  return result;
}

// Good
async function fetchData() {
  try {
    const result = await api.call();
    return result;
  } catch (error) {
    logger.error('Failed to fetch data', error);
    throw new ApiError('Data fetch failed', error);
  }
}
```

### Complexity Reduction
- Extract complex logic into smaller functions
- Use early returns to reduce nesting
- Replace complex conditionals with lookup tables or strategy patterns
- Break large functions into multiple focused functions

## Automation

### Pre-Commit Checks
```bash
# Run before committing
make lint
make format-check
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Lint Backend
  run: cd backend && pnpm run lint

- name: Lint Frontend
  run: cd frontend && pnpm run lint

- name: Check Formatting
  run: |
    cd backend && pnpm run format-check
    cd frontend && pnpm run format-check
```

### IDE Integration
- Enable ESLint and Prettier extensions in VS Code/Cursor/Windsurf
- Configure format-on-save for automatic formatting
- Enable inline linting warnings

## Common Violations

### TypeScript/JavaScript
- Missing semicolons (if required by project)
- Unused variables or imports
- Console.log statements in production code
- Missing return type annotations
- Implicit any types

### Python
- Line length > 100 characters
- Missing type hints on function signatures
- Unused imports
- Incorrect indentation (spaces vs tabs)
- Missing docstrings on public functions

## Quality Metrics

Track these metrics over time:
- Linting error count (target: 0)
- Type coverage percentage (target: > 95%)
- Average cyclomatic complexity (target: < 8)
- Documentation coverage (target: > 90% of public APIs)

## Related Evaluations
- **test-coverage.md**: Ensures code is properly tested
- **security-scan.md**: Validates security best practices
- **performance.md**: Checks for performance issues
