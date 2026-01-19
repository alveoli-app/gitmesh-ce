# GitHub Copilot Configuration for GitMesh CE

Optimized for inline suggestions, GitHub integration, and PR workflows on GitMesh Community Edition.

## Core Configuration

### Stack Overview
- **Backend**: Node.js/Express/TypeScript/Sequelize/PostgreSQL
- **Frontend**: Vue 3/Vite/TypeScript/Tailwind CSS
- **Services**: Python/Temporal/Redis/OpenSearch/SQS
- **Infrastructure**: Docker/Docker Compose/Nginx

**Full details**: `.vibe/core/architecture.md`

### Coding Standards
- **TypeScript/JavaScript**: ES6+, async/await, explicit types, no `any`
- **Python**: PEP 8, type hints, async/await patterns
- **Shell**: POSIX compliance, error handling with `set -e`

**Full details**: `.vibe/core/coding-style.md`

### Critical Rules
- ✅ Apache 2.0 only (CE code)
- ❌ Never access EE code
- ✅ Validate all inputs
- ✅ Parameterized queries only
- ✅ Hash passwords (bcrypt, 12+ rounds)
- ❌ No secrets in code

**Full details**: `.vibe/core/ce-ee-boundaries.md`, `.vibe/core/security.md`

## GitHub Copilot Features

### Inline Suggestions
Copilot provides real-time code suggestions as you type:

**Accepting Suggestions:**
- **Tab**: Accept entire suggestion
- **Cmd+→**: Accept word-by-word
- **Esc**: Reject suggestion
- **Alt+]**: Next suggestion
- **Alt+[**: Previous suggestion

**Best Practices:**
- Review suggestions before accepting
- Modify suggestions to match project patterns
- Reject suggestions that violate security rules
- Use suggestions as starting points, not final code

### GitHub Integration
Copilot understands your GitHub context:

**Repository Context:**
- Learns from your codebase patterns
- Suggests code matching your style
- References existing implementations
- Follows project conventions

**Issue Context:**
- Reference issues in comments: `// Fixes #123`
- Copilot suggests relevant code
- Helps implement issue requirements

**PR Context:**
- Suggests code for PR descriptions
- Helps write commit messages
- Assists with code reviews

## GitHub Workflow Patterns

### Issue-Driven Development

**1. Create Issue**
```markdown
## Description
Add password reset functionality for users

## Acceptance Criteria
- [ ] User can request password reset via email
- [ ] System sends reset token to user email
- [ ] User can reset password with valid token
- [ ] Token expires after 1 hour

## Technical Notes
- Use bcrypt for password hashing
- Store reset tokens in database
- Send email via existing email service
```

**2. Create Branch**
```bash
git checkout -b feat/password-reset-123
```

**3. Implement with Copilot**
```typescript
// Fixes #123: Add password reset functionality
export async function requestPasswordReset(email: string): Promise<void> {
  // Copilot suggests implementation based on issue context
}
```

**4. Commit with Reference**
```bash
git commit -m "feat(auth): add password reset functionality

- Add password reset request endpoint
- Generate and store reset tokens
- Send reset email to users

Fixes #123"
```

### Pull Request Workflow

**1. Create PR**
```markdown
## Description
Implements password reset functionality as described in #123

## Changes
- Added `requestPasswordReset` endpoint
- Added `resetPassword` endpoint
- Added reset token generation and validation
- Added email notification for password reset

## Testing
- Added unit tests for password reset service
- Added integration tests for reset endpoints
- Tested email sending manually

## Checklist
- [x] Code follows project style guide
- [x] Tests added and passing
- [x] Documentation updated
- [x] No security vulnerabilities
- [x] No EE code mixed in
```

**2. Address Review Comments**
```typescript
// Reviewer: "Add rate limiting to prevent abuse"
// Copilot suggests rate limiting implementation
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many reset requests'
});
```

**3. Update PR**
```bash
git add .
git commit -m "feat(auth): add rate limiting to password reset

Addresses review comment about preventing abuse"
git push
```

## PR Checklist

### Before Creating PR

- [ ] **Code Quality**
  - [ ] Follows coding standards (`.vibe/core/coding-style.md`)
  - [ ] No linting errors (`npm run lint`)
  - [ ] No TypeScript errors (`npm run build`)
  - [ ] Code is well-documented

- [ ] **Testing**
  - [ ] Unit tests added (`npm test`)
  - [ ] Integration tests added (if applicable)
  - [ ] All tests passing
  - [ ] Coverage meets threshold (70%+)

- [ ] **Security**
  - [ ] No hardcoded secrets
  - [ ] Input validation present
  - [ ] Parameterized queries used
  - [ ] No security vulnerabilities (`npm audit`)

- [ ] **CE/EE Separation**
  - [ ] No EE code referenced
  - [ ] Apache 2.0 license headers
  - [ ] No proprietary dependencies

- [ ] **Documentation**
  - [ ] README updated (if needed)
  - [ ] API docs updated (if needed)
  - [ ] Comments added for complex logic

- [ ] **Git**
  - [ ] Descriptive commit messages
  - [ ] Issue referenced in commits
  - [ ] Branch up to date with main

### During Review

- [ ] **Address Comments**
  - [ ] Respond to all review comments
  - [ ] Make requested changes
  - [ ] Re-request review after changes

- [ ] **CI/CD**
  - [ ] All CI checks passing
  - [ ] No merge conflicts
  - [ ] Branch up to date

### Before Merging

- [ ] **Final Checks**
  - [ ] All conversations resolved
  - [ ] Approved by required reviewers
  - [ ] CI/CD passing
  - [ ] No merge conflicts

- [ ] **Merge Strategy**
  - [ ] Squash commits (for feature branches)
  - [ ] Merge commit (for release branches)
  - [ ] Rebase (for small fixes)

## Common Patterns

### API Endpoint Pattern
```typescript
// Copilot learns this pattern from your codebase
export async function createResource(req: Request, res: Response) {
  try {
    // Validate input
    const data = validateInput(req.body);
    
    // Call service
    const result = await resourceService.create(data);
    
    // Return response
    res.status(201).json(result);
  } catch (error) {
    handleError(error, res);
  }
}
```

### Service Layer Pattern
```typescript
// Copilot suggests similar pattern for new services
export async function createUser(data: CreateUserDto): Promise<User> {
  // Validate
  validateUserData(data);
  
  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 12);
  
  // Create in database
  const user = await User.create({
    ...data,
    password: hashedPassword
  });
  
  // Return without password
  return omit(user.toJSON(), 'password');
}
```

### Test Pattern
```typescript
// Copilot suggests test structure based on existing tests
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      };
      
      const user = await userService.createUser(userData);
      
      expect(user.email).toBe('test@example.com');
      expect(user.password).not.toBe('SecurePass123!');
    });
  });
});
```

### Vue Component Pattern
```vue
<!-- Copilot suggests Vue 3 Composition API pattern -->
<template>
  <div class="user-profile">
    <h2>{{ user.username }}</h2>
    <p>{{ user.email }}</p>
    <button @click="handleEdit">Edit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/store/userStore';

const userStore = useUserStore();
const user = ref<User | null>(null);

onMounted(async () => {
  user.value = await userStore.fetchCurrentUser();
});

function handleEdit() {
  // Navigate to edit page
}
</script>
```

## Commit Message Patterns

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

**Feature Commit:**
```
feat(auth): add password reset functionality

- Add password reset request endpoint
- Generate and store reset tokens
- Send reset email to users
- Add rate limiting to prevent abuse

Fixes #123
```

**Bug Fix Commit:**
```
fix(api): prevent SQL injection in user query

- Replace string concatenation with parameterized query
- Add input validation
- Add security test

Security issue reported by: @security-team
Fixes #456
```

**Test Commit:**
```
test(user): add property-based tests for user creation

- Test email uniqueness property
- Test password hashing property
- Test validation error property

Improves test coverage to 85%
```

**Refactor Commit:**
```
refactor(service): extract common validation logic

- Create shared validation utilities
- Update services to use shared validators
- Add tests for validation utilities

No functional changes
```

## Security Checklist

### Input Validation
- [ ] All user input validated
- [ ] Email format validated
- [ ] Password strength validated
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (output encoding)

### Authentication
- [ ] Passwords hashed with bcrypt (12+ rounds)
- [ ] JWT tokens used for sessions
- [ ] Token expiration implemented
- [ ] Refresh token rotation implemented

### Authorization
- [ ] Role-based access control implemented
- [ ] Permission checks before operations
- [ ] User can only access own data

### Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced
- [ ] Secrets in environment variables
- [ ] No secrets in code or logs

### Dependencies
- [ ] No known vulnerabilities (`npm audit`)
- [ ] Dependencies up to date
- [ ] License compliance checked

## Copilot Tips

### Effective Comments
```typescript
// Good: Specific comment that guides Copilot
// Fetch user by ID and include their organizations and roles
const user = await User.findByPk(userId, {
  include: [
    { model: Organization, as: 'organizations' },
    { model: Role, as: 'roles' }
  ]
});

// Avoid: Vague comment
// Get user
const user = await User.findByPk(userId);
```

### Function Names
```typescript
// Good: Descriptive name
async function fetchUserWithOrganizationsAndRoles(userId: string) {
  // Copilot suggests correct implementation
}

// Avoid: Generic name
async function getData(id: string) {
  // Copilot has less context
}
```

### Context Files
Open related files to give Copilot more context:
- Model file + Service file + Controller file
- Component file + Store file + API file
- Test file + Implementation file

### Review Suggestions
Always review Copilot suggestions for:
- Security issues (hardcoded secrets, SQL injection)
- Type safety (avoid `any` type)
- Error handling (missing try-catch)
- Code style (matches project conventions)

## Resources

### Internal Documentation
- Architecture: `.vibe/core/architecture.md`
- Coding Style: `.vibe/core/coding-style.md`
- Security: `.vibe/core/security.md`
- Testing: `.vibe/core/testing.md`
- Memory: `.vibe/core/memory-management.md`

### Skills
- Backend: `.vibe/skills/backend-engineer.md`
- Frontend: `.vibe/skills/frontend-engineer.md`
- Testing: `.vibe/skills/tester.md`
- Security: `.vibe/skills/security-engineer.md`

### Evaluations
- Code Quality: `.vibe/evals/code-quality.md`
- Test Coverage: `.vibe/evals/test-coverage.md`
- Security: `.vibe/evals/security-scan.md`
- CE/EE: `.vibe/evals/ce-ee-separation.md`

### External Resources
- GitMesh Docs: https://docs.gitmesh.com
- GitHub Copilot Docs: https://docs.github.com/copilot
- Vue 3 Docs: https://vuejs.org
- TypeScript Docs: https://www.typescriptlang.org

## Memory Management

### Task-Scoped Memory
- **prd.json**: Current task definition (`.vibe-memory/prd.json`)
- **progress.txt**: Debugging attempts (`.vibe-memory/progress.txt`)
- **Never create**: SUMMARY.md, NOTES.md, etc.

**Full details**: `.vibe/core/memory-management.md`

### CRITICAL: Always Update PRD and Progress
**BEFORE starting ANY task, you MUST:**

1. **Update `.vibe-memory/prd.json`**
   - Add or update task entry with status `in_progress`
   - Add notes about your approach

2. **Log to `.vibe-memory/progress.txt`**
   - Log task start with timestamp
   - Document your approach
   - Log failed attempts with errors
   - Log successful solution when found
   - Clean failed attempts after success

**This is MANDATORY for all code changes.**

**Example:**
```
// 1. Update PRD
{"tasks": [{"id": "T-1", "description": "Add validation", "status": "in_progress"}]}

// 2. Log to progress.txt
[2025-01-15 10:30] Started: Adding validation

// 3. Do work, log attempts
[Attempt 1] Tried X - FAILED: error
[Attempt 2] Tried Y - SUCCESS

// 4. Update PRD when done
{"tasks": [{"id": "T-1", "status": "completed"}]}

// 5. Clean failed attempts
[CLEANED] Final solution: Y
```

**See `.vibe/core/memory-management.md` for complete workflow.**

## Summary

**GitHub Copilot Strengths:**
- Inline code suggestions
- GitHub context awareness
- Pattern recognition
- Fast code generation

**Best For:**
- Writing boilerplate code
- Following established patterns
- Implementing GitHub issues
- Creating PR descriptions

**Remember:**
- Review all suggestions
- Follow security guidelines
- Use PR checklist
- Reference issues in commits
- Keep CE and EE separate

**When in doubt:**
- Check architecture docs
- Follow existing patterns
- Review security checklist
- Ask for code review

Happy coding with GitHub Copilot! 🚀
