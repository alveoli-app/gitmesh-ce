# Supermaven AI Configuration for GitMesh CE

Optimized for code completion, pattern recognition, and context-aware suggestions on GitMesh Community Edition.

## Core Configuration

### Stack Overview
- **Backend**: Node.js/Express/TypeScript/Sequelize/PostgreSQL
- **Frontend**: Vue 3/Vite/TypeScript/Tailwind CSS
- **Services**: Python/Temporal/Redis/OpenSearch/SQS
- **Infrastructure**: Docker/Docker Compose/Nginx

**Full details**: `.vibe/core/architecture.md`

### Coding Standards
- **TypeScript/JavaScript**: ES6+, async/await, explicit types, no `any`
- **Python**: PEP 8, type hints, async/await
- **Shell**: POSIX compliance, error handling

**Full details**: `.vibe/core/coding-style.md`

### Critical Rules
- ✅ Apache 2.0 only (CE code)
- ❌ Never access EE code
- ✅ Validate all inputs
- ✅ Parameterized queries
- ✅ Hash passwords (bcrypt, 12+ rounds)
- ❌ No secrets in code

**Full details**: `.vibe/core/ce-ee-boundaries.md`, `.vibe/core/security.md`

## Supermaven-Specific Features

### Code Completion
Supermaven excels at intelligent, context-aware code completion:

**Completion Triggers:**
- Type function name → Get full implementation
- Type comment → Get matching code
- Start pattern → Get completion
- Import statement → Get correct path

**Best Practices:**
- Write descriptive comments before code
- Use consistent naming patterns
- Follow established code structure
- Accept completions that match patterns

### Pattern Recognition
Supermaven learns from your codebase patterns:

**Recognized Patterns:**
- API endpoint structure
- Service layer patterns
- Database query patterns
- Error handling patterns
- Test structure patterns
- Vue component patterns

**How to Help Supermaven:**
- Keep consistent code structure
- Use similar naming conventions
- Follow established patterns
- Organize code logically

## Common Patterns Library

### Backend Patterns

#### API Endpoint Pattern
```typescript
// Pattern: Express route handler
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

**Completion Trigger**: Type `export async function create`

#### Service Layer Pattern
```typescript
// Pattern: Service method with validation
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

**Completion Trigger**: Type `export async function create` in service file

#### Database Query Pattern
```typescript
// Pattern: Sequelize query with relations
export async function findUserWithRelations(userId: string): Promise<User> {
  const user = await User.findByPk(userId, {
    include: [
      { model: Organization, as: 'organizations' },
      { model: Role, as: 'roles' }
    ]
  });
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  return user;
}
```

**Completion Trigger**: Type `const user = await User.findByPk`

#### Error Handling Pattern
```typescript
// Pattern: Try-catch with specific errors
try {
  const result = await operation();
  return result;
} catch (error) {
  if (error instanceof ValidationError) {
    throw new BadRequestError(error.message);
  }
  if (error instanceof NotFoundError) {
    throw error;
  }
  logger.error('Unexpected error', { error });
  throw new InternalServerError('Operation failed');
}
```

**Completion Trigger**: Type `try {` in async function

#### Middleware Pattern
```typescript
// Pattern: Express middleware
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    handleError(error, res);
  }
}
```

**Completion Trigger**: Type `export function` in middleware file

### Frontend Patterns

#### Vue Component Pattern
```vue
<template>
  <div class="component-name">
    <h2>{{ title }}</h2>
    <button @click="handleAction" :disabled="loading">
      {{ buttonText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const title = ref('Component Title');
const loading = ref(false);

const buttonText = computed(() => 
  loading.value ? 'Loading...' : 'Click Me'
);

async function handleAction() {
  loading.value = true;
  try {
    await performAction();
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.component-name {
  padding: 1rem;
}
</style>
```

**Completion Trigger**: Type `<script setup lang="ts">` in .vue file

#### Pinia Store Pattern
```typescript
// Pattern: Pinia store definition
export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);
  
  async function fetchUser(userId: string) {
    loading.value = true;
    try {
      const response = await api.get(`/users/${userId}`);
      user.value = response.data;
    } finally {
      loading.value = false;
    }
  }
  
  function clearUser() {
    user.value = null;
  }
  
  return { user, loading, fetchUser, clearUser };
});
```

**Completion Trigger**: Type `export const use` in store file

#### Composable Pattern
```typescript
// Pattern: Vue composable
export function useApi<T>(url: string) {
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  
  async function fetch() {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.get(url);
      data.value = response.data;
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  }
  
  return { data, loading, error, fetch };
}
```

**Completion Trigger**: Type `export function use` in composables file

### Python Service Patterns

#### Temporal Workflow Pattern
```python
@workflow.defn
class DataSyncWorkflow:
    @workflow.run
    async def run(self, integration_id: str) -> dict:
        # Fetch config
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

**Completion Trigger**: Type `@workflow.defn` in workflow file

#### Activity Pattern
```python
@activity.defn
async def fetch_integration_config(integration_id: str) -> dict:
    """Fetch integration configuration from database."""
    async with get_db_connection() as conn:
        result = await conn.fetchrow(
            "SELECT * FROM integrations WHERE id = $1",
            integration_id
        )
        
        if not result:
            raise ValueError(f"Integration {integration_id} not found")
        
        return dict(result)
```

**Completion Trigger**: Type `@activity.defn` in activity file

### Test Patterns

#### Unit Test Pattern
```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      };
      
      // Act
      const user = await userService.createUser(userData);
      
      // Assert
      expect(user.email).toBe('test@example.com');
      expect(user.password).not.toBe('SecurePass123!');
    });
    
    it('should throw error for invalid email', async () => {
      // Arrange
      const userData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'SecurePass123!'
      };
      
      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects.toThrow('Invalid email format');
    });
  });
});
```

**Completion Trigger**: Type `describe('` in test file

#### Integration Test Pattern
```typescript
describe('User API Integration', () => {
  it('should create user via POST /api/users', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      })
      .expect(201);
    
    expect(response.body).toMatchObject({
      email: 'test@example.com',
      username: 'testuser'
    });
    expect(response.body.password).toBeUndefined();
  });
});
```

**Completion Trigger**: Type `it('should` in integration test file

## Completion Triggers

### Function Definitions
```typescript
// Trigger: "export async function get"
export async function getUserById(userId: string): Promise<User> {
  // Supermaven completes with common pattern
}

// Trigger: "export function validate"
export function validateEmail(email: string): boolean {
  // Supermaven completes with validation logic
}
```

### Import Statements
```typescript
// Trigger: "import { "
import { Request, Response } from 'express';

// Trigger: "import "
import bcrypt from 'bcrypt';
```

### Type Definitions
```typescript
// Trigger: "interface User"
interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
}

// Trigger: "type "
type CreateUserDto = Omit<User, 'id' | 'createdAt'>;
```

### Comments to Code
```typescript
// Trigger: "// Hash password with bcrypt"
// Hash password with bcrypt
const hashedPassword = await bcrypt.hash(password, 12);

// Trigger: "// Validate email format"
// Validate email format
if (!emailRegex.test(email)) {
  throw new ValidationError('Invalid email format');
}
```

## Anti-Patterns to Avoid

### Don't Accept These Completions

❌ **Hardcoded Secrets**
```typescript
// BAD - Don't accept
const apiKey = 'sk_live_abc123xyz';
```

❌ **String Concatenation in SQL**
```typescript
// BAD - Don't accept
const query = `SELECT * FROM users WHERE id = '${userId}'`;
```

❌ **Plain Text Passwords**
```typescript
// BAD - Don't accept
await User.create({ password: plainPassword });
```

❌ **Any Type**
```typescript
// BAD - Don't accept
function processData(data: any) { }
```

❌ **Unhandled Promises**
```typescript
// BAD - Don't accept
fetchData(); // No await or .catch()
```

### Modify Before Accepting

⚠️ **Generic Error Messages**
```typescript
// Modify to be specific
throw new Error('Error'); // Too generic
throw new Error('User not found'); // Better
```

⚠️ **Missing Validation**
```typescript
// Add validation
const user = await User.create(data); // Missing validation
validateUserData(data); // Add this
const user = await User.create(data);
```

⚠️ **No Error Handling**
```typescript
// Add try-catch
const result = await operation(); // No error handling
try {
  const result = await operation();
} catch (error) {
  handleError(error);
}
```

## Context-Aware Suggestions

### File Context
Supermaven uses file context to provide relevant completions:

**In Controller Files:**
- Suggests Express patterns
- Includes error handling
- Uses service layer calls

**In Service Files:**
- Suggests business logic patterns
- Includes validation
- Uses database operations

**In Test Files:**
- Suggests test structure
- Includes assertions
- Uses test data patterns

### Project Context
Supermaven learns from your entire codebase:

**Naming Conventions:**
- Follows your naming patterns
- Uses consistent terminology
- Matches your style

**Code Structure:**
- Follows your file organization
- Uses your patterns
- Matches your architecture

## Tips for Better Completions

### Write Clear Comments
```typescript
// Good: Specific comment
// Fetch user by ID and include their organizations
const user = await User.findByPk(userId, {
  include: [{ model: Organization }]
});

// Avoid: Vague comment
// Get user
const user = await User.findByPk(userId);
```

### Use Descriptive Names
```typescript
// Good: Descriptive function name
async function fetchUserWithOrganizations(userId: string) {
  // Supermaven suggests correct implementation
}

// Avoid: Generic name
async function getData(id: string) {
  // Supermaven has less context
}
```

### Follow Established Patterns
```typescript
// If your codebase uses this pattern:
export async function createResource(data: CreateDto): Promise<Resource> {
  validate(data);
  return await Resource.create(data);
}

// Supermaven will suggest similar pattern for new resources
export async function createUser(data: CreateUserDto): Promise<User> {
  // Completion follows established pattern
}
```

### Accept and Refine
1. Accept completion if mostly correct
2. Refine details (error messages, validation)
3. Add missing pieces (logging, metrics)
4. Test the result

## Skills and Evaluations

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

## Memory Management

- **prd.json**: Current task definition
- **progress.txt**: Debugging attempts
- **Never create**: SUMMARY.md, NOTES.md, etc.

**Full details**: `.vibe/core/memory-management.md`

### CRITICAL: Always Update PRD and Progress
**BEFORE starting ANY task, you MUST:**

1. **Update `.vibe-memory/prd.json`** - Add task with status `in_progress`
2. **Log to `.vibe-memory/progress.txt`** - Log start, attempts, solution

**This is MANDATORY for all code changes.**

**Example:**
```
// 1. Update PRD: {"tasks": [{"id": "T-1", "status": "in_progress"}]}
// 2. Log: [Started] Task description
// 3. Work: [Attempt 1] FAILED, [Attempt 2] SUCCESS
// 4. Complete: {"tasks": [{"id": "T-1", "status": "completed"}]}
// 5. Clean: Remove failed attempts
```

## Quick Reference

### Backend
```typescript
// API: Route → Controller → Service → Model
// Auth: JWT tokens, bcrypt passwords
// DB: Sequelize ORM, PostgreSQL
// Tests: Jest, Supertest
```

### Frontend
```vue
<!-- Component: Template → Script → Style -->
<!-- State: Pinia stores -->
<!-- Routing: Vue Router -->
<!-- Tests: Vitest, Vue Test Utils -->
```

### Services
```python
# Workflows: Temporal workflows
# Activities: Temporal activities
# Queue: SQS messages
# Tests: pytest
```

## Summary

**Supermaven Strengths:**
- Intelligent code completion
- Pattern recognition
- Context-aware suggestions
- Fast, accurate predictions

**Best For:**
- Writing boilerplate code
- Following established patterns
- Completing common operations
- Reducing typing

**Remember:**
- Write clear comments
- Use descriptive names
- Follow patterns
- Review completions
- Modify when needed

**When in doubt:**
- Check pattern library
- Review architecture
- Validate completion
- Test the result

Happy coding with Supermaven! 🚀
