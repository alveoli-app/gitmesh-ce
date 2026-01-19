# Windsurf AI Configuration for GitMesh CE

Optimized for rapid iteration, flow state, and contextual awareness on GitMesh Community Edition.

## Quick Start

### Stack
- **Backend**: Node.js/Express/TypeScript/Sequelize/PostgreSQL
- **Frontend**: Vue 3/Vite/TypeScript/Tailwind
- **Services**: Python/Temporal/Redis/OpenSearch
- **Infra**: Docker/Nginx

### Standards
- **TS/JS**: ES6+, async/await, explicit types
- **Python**: PEP 8, type hints
- **Shell**: POSIX, `set -e`

### Critical Rules
- ✅ Apache 2.0 only (CE code)
- ❌ Never touch EE code
- ✅ Validate all inputs
- ✅ Parameterized queries only
- ✅ Hash passwords (bcrypt, 12+ rounds)
- ❌ No secrets in code

## Flow-Optimized Workflow

### Rapid Feature Development
```
1. Quick context → Read architecture
2. Fast implementation → Write code
3. Instant validation → Run tests
4. Smooth iteration → Refine & repeat
```

### Flow State Principles
- **Minimize context switching**: Stay in one file/component
- **Incremental progress**: Small, testable changes
- **Fast feedback**: Run tests frequently
- **Clear goals**: Know what you're building

### Quick Commands
```bash
# Backend
npm test                    # Run all tests
npm run dev                 # Start dev server
npm run lint                # Check code style

# Frontend
npm run dev                 # Start Vite dev server
npm run test:unit           # Run unit tests
npm run build               # Production build

# Services
pytest                      # Run Python tests
python -m app.main          # Run service

# Docker
docker-compose up           # Start all services
docker-compose logs -f api  # Follow API logs
```

## Quick Reference Patterns

### API Endpoint (Backend)
```typescript
// Route: src/api/user/index.ts
router.post('/', authMiddleware, createUser);

// Controller: src/api/user/userController.ts
export async function createUser(req: Request, res: Response) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    handleError(error, res);
  }
}

// Service: src/services/userService.ts
export async function createUser(data: CreateUserDto): Promise<User> {
  const hashedPassword = await bcrypt.hash(data.password, 12);
  return await User.create({ ...data, password: hashedPassword });
}
```

### Vue Component (Frontend)
```vue
<template>
  <div class="container">
    <h2>{{ title }}</h2>
    <button @click="handleAction">Action</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const title = ref('Component Title');

function handleAction() {
  // Handle action
}
</script>

<style scoped>
.container {
  padding: 1rem;
}
</style>
```

### Temporal Workflow (Services)
```python
@workflow.defn
class MyWorkflow:
    @workflow.run
    async def run(self, data: dict) -> dict:
        result = await workflow.execute_activity(
            my_activity,
            data,
            start_to_close_timeout=timedelta(minutes=5)
        )
        return result
```

### Test Pattern
```typescript
describe('UserService', () => {
  it('should create user', async () => {
    const user = await userService.createUser({
      email: 'test@example.com',
      username: 'testuser',
      password: 'SecurePass123!'
    });
    
    expect(user.email).toBe('test@example.com');
    expect(user.password).not.toBe('SecurePass123!');
  });
});
```

## Flow Optimization Tips

### Stay in the Zone
1. **Close distractions**: Focus on one task
2. **Use shortcuts**: Learn keyboard shortcuts
3. **Batch similar work**: Group related changes
4. **Avoid premature optimization**: Make it work first

### Fast Iteration Cycle
```
Write code (2 min)
  ↓
Run tests (10 sec)
  ↓
Fix issues (1 min)
  ↓
Commit (30 sec)
  ↓
Repeat
```

### Keyboard Shortcuts
- **Cmd+P**: Quick file open
- **Cmd+Shift+F**: Search in files
- **Cmd+D**: Select next occurrence
- **Cmd+/**: Toggle comment
- **Cmd+B**: Toggle sidebar
- **F12**: Go to definition
- **Shift+F12**: Find references

### Code Snippets
Create snippets for common patterns:
```json
{
  "API Endpoint": {
    "prefix": "api-endpoint",
    "body": [
      "export async function ${1:functionName}(req: Request, res: Response) {",
      "  try {",
      "    const result = await ${2:service}.${3:method}(req.body);",
      "    res.status(200).json(result);",
      "  } catch (error) {",
      "    handleError(error, res);",
      "  }",
      "}"
    ]
  }
}
```

## Context Files

### Backend Context
**File**: `.vibe/core/architecture.md` (Backend section)
- API patterns
- Database schema
- Auth flows

### Frontend Context
**File**: `.vibe/core/architecture.md` (Frontend section)
- Vue 3 patterns
- State management
- Routing

### Quick Architecture
```
Request → Nginx → API → Service → Database
                    ↓
                  Queue → Worker → External API
```

## Skills (Quick Activation)

### Backend
```
"Activate backend-engineer skill"
```
Focus: Node.js, Express, TypeScript, Sequelize

### Frontend
```
"Activate frontend-engineer skill"
```
Focus: Vue 3, Vite, Tailwind, Pinia

### Debugging
```
"Activate bug-finder skill"
```
Focus: Diagnostics, root cause analysis

### Performance
```
"Activate optimizer skill"
```
Focus: Profiling, optimization, caching

## Evaluations (Pre-PR)

### Quick Checks
```bash
# Code quality
npm run lint
npm run format

# Tests
npm test

# Security
npm audit

# Build
npm run build
```

### Eval Files
- `.vibe/evals/code-quality.md` - Linting, formatting
- `.vibe/evals/test-coverage.md` - Coverage thresholds
- `.vibe/evals/security-scan.md` - Vulnerability checks
- `.vibe/evals/ce-ee-separation.md` - License compliance

## Common Tasks

### Add New API Endpoint
```
1. Create route in src/api/{module}/index.ts
2. Add controller in src/api/{module}/{module}Controller.ts
3. Add service logic in src/services/{module}Service.ts
4. Add tests in src/services/{module}Service.test.ts
5. Run tests: npm test
```

### Add New Vue Component
```
1. Create component in src/components/{Component}.vue
2. Add to parent component
3. Add tests in src/components/{Component}.test.ts
4. Run tests: npm run test:unit
```

### Fix Bug
```
1. Reproduce bug
2. Write failing test
3. Fix code
4. Verify test passes
5. Commit with test
```

### Optimize Performance
```
1. Profile (Chrome DevTools, Node profiler)
2. Identify bottleneck
3. Optimize (cache, index, algorithm)
4. Measure improvement
5. Document change
```

## Memory Management

### Task-Scoped Memory
- **prd.json**: Current task only
- **progress.txt**: Failed attempts + solution
- **Clean when**: Starting unrelated work
- **Never create**: SUMMARY.md, NOTES.md, etc.

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

### Quick Memory Check
```
1. Read .vibe-memory/prd.json
2. Is new task related?
   - Yes → Continue
   - No → Ask to clean
3. Update as you work
4. Clean failed attempts when done
```

## Troubleshooting

### Quick Fixes

**Tests failing?**
```bash
npm test -- --verbose
# Check error message
# Fix code or test
# Re-run
```

**Build failing?**
```bash
npm run build
# Check TypeScript errors
# Fix type issues
# Re-run
```

**Server not starting?**
```bash
# Check logs
docker-compose logs -f api

# Check ports
lsof -i :8080

# Restart
docker-compose restart api
```

**Database issues?**
```bash
# Check connection
docker-compose ps postgres

# Run migrations
./cli scaffold migrate-up

# Reset database
./cli scaffold migrate-down
./cli scaffold migrate-up
```

## Tips for Flow State

### Before Starting
- [ ] Clear goal defined
- [ ] Context loaded (architecture, patterns)
- [ ] Tests ready to run
- [ ] Distractions minimized

### During Work
- [ ] Small, incremental changes
- [ ] Test after each change
- [ ] Commit frequently
- [ ] Stay focused on one thing

### When Stuck
1. Take a 5-minute break
2. Review architecture docs
3. Ask specific question
4. Try different approach

### Maintaining Flow
- **Avoid**: Context switching, premature optimization, over-engineering
- **Embrace**: Small steps, fast feedback, simple solutions
- **Remember**: Make it work, make it right, make it fast (in that order)

## Quick Links

### Docs
- Architecture: `.vibe/core/architecture.md`
- Coding Style: `.vibe/core/coding-style.md`
- Security: `.vibe/core/security.md`
- Testing: `.vibe/core/testing.md`

### External
- Vue 3: https://vuejs.org
- TypeScript: https://www.typescriptlang.org
- Temporal: https://docs.temporal.io
- GitMesh: https://docs.gitmesh.com

## Summary

**Windsurf Strengths:**
- Rapid iteration
- Flow state optimization
- Contextual awareness
- Fast feedback loops

**Best For:**
- Quick feature implementation
- Bug fixes
- Refactoring
- Performance optimization

**Remember:**
- Stay in flow
- Small, testable changes
- Fast feedback
- Keep it simple

**When in doubt:**
- Check quick reference
- Run tests
- Review architecture
- Ask specific question

Happy coding in the flow! 🌊
