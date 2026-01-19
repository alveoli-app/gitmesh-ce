# Cursor AI Configuration for GitMesh CE

This configuration optimizes Cursor for multi-file context, chat interface, and collaborative development on GitMesh Community Edition.

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
Write comprehensive tests for all code:
- **Unit tests**: Fast, isolated, test individual functions
- **Integration tests**: Test component interactions
- **Property-based tests**: Test universal properties
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

Update PRD first with task status and notes, then log to progress file with timestamp and approach. During work, log all attempts with outcomes. When complete, update PRD status and clean failed attempts from progress file, keeping only the final solution.

**See `.vibe/core/memory-management.md` for complete workflow.**

## Cursor-Specific Features

### Multi-File Context
Cursor excels at understanding multiple files simultaneously. Use this to:
- Analyze relationships between components
- Refactor across multiple files safely
- Understand data flow through the system
- Identify inconsistencies in naming or patterns

**Best Practices:**
- Open related files together (e.g., model + service + controller)
- Use Cmd+P to quickly navigate between files
- Reference files in chat: "Looking at UserService.ts and UserController.ts..."
- Ask for cross-file analysis: "How does this change affect other components?"

### Chat Interface
Use Cursor's chat for:
- **Planning**: "What's the best approach to implement X?"
- **Debugging**: "Why is this test failing?"
- **Refactoring**: "How can I improve this code?"
- **Learning**: "Explain how this authentication flow works"

**Effective Prompts:**
```
Good: "I need to add rate limiting to the login endpoint. Show me how to use express-rate-limit with our existing middleware pattern."

Good: "This query is slow. Analyze the database schema and suggest indexes."

Avoid: "Fix this" (too vague)
Avoid: "Make it better" (no clear goal)
```

### Inline Suggestions
Accept or modify Cursor's inline suggestions:
- **Tab**: Accept suggestion
- **Cmd+→**: Accept word-by-word
- **Esc**: Reject suggestion
- **Edit**: Modify suggestion before accepting

**When to Accept:**
- Boilerplate code (imports, type definitions)
- Common patterns (error handling, validation)
- Test setup (describe blocks, beforeEach)

**When to Review:**
- Business logic
- Security-sensitive code
- Database queries
- API endpoints

## Skill Activation

Activate specialized skills for different tasks:

### Backend Development
**Activate**: `.vibe/skills/backend-engineer.md`
```
"Activate backend-engineer skill. I need to implement a new API endpoint for user management."
```

### Frontend Development
**Activate**: `.vibe/skills/frontend-engineer.md`
```
"Activate frontend-engineer skill. I need to create a Vue component for displaying user profiles."
```

### ML/AI Development
**Activate**: `.vibe/skills/ml-engineer.md`
```
"Activate ml-engineer skill. I need to implement signal classification logic."
```

### DevOps/Infrastructure
**Activate**: `.vibe/skills/devops-engineer.md`
```
"Activate devops-engineer skill. I need to optimize our Docker configuration."
```

### Security Audit
**Activate**: `.vibe/skills/security-engineer.md`
```
"Activate security-engineer skill. Review this authentication code for vulnerabilities."
```

### Debugging
**Activate**: `.vibe/skills/bug-finder.md`
```
"Activate bug-finder skill. Help me diagnose why users are getting logged out randomly."
```

### Performance Optimization
**Activate**: `.vibe/skills/optimizer.md`
```
"Activate optimizer skill. This API endpoint is slow, help me identify bottlenecks."
```

### Testing
**Activate**: `.vibe/skills/tester.md`
```
"Activate tester skill. I need comprehensive tests for this user service."
```

## Evaluation Framework

Before submitting a PR, run these evaluations:

### Code Quality
**Eval**: `.vibe/evals/code-quality.md`
- Run ESLint/Prettier for TypeScript/JavaScript
- Run Pylint/Black for Python
- Check for code smells and anti-patterns
- Verify naming conventions

### Test Coverage
**Eval**: `.vibe/evals/test-coverage.md`
- Run `npm test -- --coverage` for backend
- Run `npm run test:unit` for frontend
- Verify coverage meets thresholds (70%+)
- Check that critical paths are tested

### Security Scan
**Eval**: `.vibe/evals/security-scan.md`
- Run `npm audit` for dependency vulnerabilities
- Check for hardcoded secrets
- Verify input validation
- Review authentication/authorization

### CE/EE Separation
**Eval**: `.vibe/evals/ce-ee-separation.md`
- Scan for EE code patterns
- Verify no proprietary dependencies
- Check license headers (Apache 2.0)
- Validate no EE references

### Performance
**Eval**: `.vibe/evals/performance.md`
- Profile slow operations
- Check database query performance
- Verify no N+1 queries
- Test under load (if applicable)

## Context Files

Use context files for domain-specific knowledge:

### Backend Context
**File**: `.vibe/context/backend-context.md`
- API design patterns
- Database schema and relationships
- Authentication/authorization flows
- Error handling patterns

### Frontend Context
**File**: `.vibe/context/frontend-context.md`
- Vue 3 component patterns
- State management with Pinia
- Routing and navigation
- UI/UX guidelines

### Services Context
**File**: `.vibe/context/services-context.md`
- Python service architecture
- Temporal workflow patterns
- Message queue handling
- Background job processing

### Infrastructure Context
**File**: `.vibe/context/infrastructure-context.md`
- Docker configuration
- Deployment procedures
- CI/CD pipelines
- Monitoring and logging

## Workflow Patterns

### Feature Development
```
1. Understand requirements
   - Read user story or issue
   - Ask clarifying questions
   - Identify affected components

2. Plan implementation
   - Activate relevant skill
   - Review architecture docs
   - Design approach

3. Implement changes
   - Write code with tests
   - Follow coding standards
   - Use multi-file context

4. Validate changes
   - Run all tests
   - Run evaluations
   - Manual testing

5. Submit PR
   - Write clear description
   - Reference issue/story
   - Request review
```

### Bug Fixing
```
1. Reproduce bug
   - Understand symptoms
   - Identify affected code
   - Create minimal reproduction

2. Diagnose root cause
   - Activate bug-finder skill
   - Use debugging tools
   - Analyze logs

3. Implement fix
   - Write failing test first
   - Fix the bug
   - Verify test passes

4. Prevent regression
   - Add comprehensive tests
   - Document the issue
   - Update related docs
```

### Refactoring
```
1. Identify code smell
   - Duplication
   - Complexity
   - Poor naming

2. Plan refactoring
   - Define desired state
   - Identify affected files
   - Plan incremental steps

3. Refactor safely
   - Use multi-file context
   - Run tests after each step
   - Commit frequently

4. Validate improvement
   - Run all tests
   - Check performance
   - Review with team
```

## Common Patterns

### API Endpoint Pattern
```typescript
// Controller (src/api/user/userController.ts)
export async function createUser(req: Request, res: Response) {
  try {
    const userData = req.body;
    const user = await userService.createUser(userData);
    res.status(201).json(user);
  } catch (error) {
    handleError(error, res);
  }
}

// Service (src/services/userService.ts)
export async function createUser(userData: CreateUserDto): Promise<User> {
  // Validate input
  validateUserData(userData);
  
  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 12);
  
  // Create user
  const user = await User.create({
    ...userData,
    password: hashedPassword
  });
  
  return user;
}

// Test (src/services/userService.test.ts)
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
<!-- Component (src/components/UserProfile.vue) -->
<template>
  <div class="user-profile">
    <h2>{{ user.username }}</h2>
    <p>{{ user.email }}</p>
    <button @click="handleEdit">Edit Profile</button>
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

<style scoped>
.user-profile {
  padding: 1rem;
}
</style>
```

### Temporal Workflow Pattern
```python
# Workflow (services/apps/integration_worker/workflows/sync_workflow.py)
@workflow.defn
class SyncWorkflow:
    @workflow.run
    async def run(self, integration_id: str) -> SyncResult:
        # Fetch integration config
        config = await workflow.execute_activity(
            fetch_integration_config,
            integration_id,
            start_to_close_timeout=timedelta(seconds=30)
        )
        
        # Sync data
        result = await workflow.execute_activity(
            sync_integration_data,
            config,
            start_to_close_timeout=timedelta(minutes=10)
        )
        
        return result
```

## Troubleshooting

### Common Issues

**Issue**: Cursor suggestions are slow
**Solution**: 
- Close unused files
- Restart Cursor
- Check system resources

**Issue**: Context seems incorrect
**Solution**:
- Verify you're in the right directory
- Check which files are open
- Refresh Cursor's index

**Issue**: Tests failing after changes
**Solution**:
- Run tests locally first
- Check for breaking changes
- Review test output carefully

**Issue**: Can't find specific code
**Solution**:
- Use Cmd+P for file search
- Use Cmd+Shift+F for text search
- Ask in chat: "Where is the user authentication logic?"

## Tips and Tricks

### Keyboard Shortcuts
- **Cmd+K**: Open chat
- **Cmd+L**: Clear chat
- **Cmd+P**: Quick file open
- **Cmd+Shift+P**: Command palette
- **Cmd+Shift+F**: Search in files
- **Cmd+.**: Quick fix
- **F12**: Go to definition
- **Shift+F12**: Find references

### Effective Chat Usage
```
Good: "Show me how to add a new integration following our existing pattern"
Good: "Explain the data flow from webhook to database"
Good: "What's the best way to test this async function?"

Avoid: "Write code" (be specific)
Avoid: "Fix everything" (focus on one thing)
```

### Multi-File Editing
- Select code in multiple files
- Ask: "Refactor this pattern across all files"
- Review changes carefully before accepting

### Code Review
- Open PR files in Cursor
- Ask: "Review these changes for issues"
- Check for security, performance, style

## Resources

### Documentation
- GitMesh Docs: https://docs.gitmesh.com
- Vue 3 Docs: https://vuejs.org
- TypeScript Docs: https://www.typescriptlang.org
- Temporal Docs: https://docs.temporal.io

### Internal Docs
- Architecture: `.vibe/core/architecture.md`
- Coding Style: `.vibe/core/coding-style.md`
- Security: `.vibe/core/security.md`
- Testing: `.vibe/core/testing.md`

### Community
- GitHub Discussions: https://github.com/gitmesh/community/discussions
- Discord: https://discord.gg/gitmesh

## Summary

**Remember:**
- Use multi-file context for comprehensive understanding
- Activate skills for specialized tasks
- Run evaluations before submitting PRs
- Keep memory clean and task-focused
- Follow coding standards strictly
- Never mix CE and EE code

**When in doubt:**
- Ask in chat with specific questions
- Review core configuration files
- Consult architecture documentation
- Reach out to the team

**Cursor excels at:**
- Multi-file refactoring
- Understanding complex codebases
- Generating boilerplate code
- Explaining existing code
- Suggesting improvements

Use these strengths to build high-quality features for GitMesh CE!
