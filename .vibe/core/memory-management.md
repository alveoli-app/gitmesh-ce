# Memory Management

This document defines how AI assistants should manage context and memory during development tasks.

## Core Principles

### Task-Scoped Memory
- Memory is scoped to the **current task** only
- When starting unrelated work, clean previous memory
- Use git history for long-term memory, not local files
- Keep context minimal and relevant

### No Extra Files
- **NEVER** create summary files, notes, or documentation unless explicitly requested
- **NO** `SUMMARY.md`, `NOTES.md`, `CHANGES.md`, `TODO.md`, etc.
- All context lives in `prd.json` and `progress.txt` only
- Exception: Files explicitly requested by user

### Clean Context
- Remove failed attempts when solution works
- Keep only relevant information
- Don't accumulate debugging history
- Maintain minimal, focused context

## Memory Files

### Location
All memory files are stored in `.vibe-memory/` directory:
- `.vibe-memory/prd.json` - Current task definition
- `.vibe-memory/progress.txt` - Debugging attempts and learnings

**Important:**
- `.vibe-memory/` is gitignored (not version-controlled)
- Files are auto-created by `setup-vibe.sh` if missing
- Template available at `prd.json.example` (version-controlled)

### prd.json Structure

**Purpose:** Define the current task scope and status.

**Format:**
The file should contain a JSON object with these fields:
- title: Current task name (string)
- description: What user asked to do in this chat session (string)
- created_at: ISO 8601 timestamp (string)
- tasks: Array of task objects, each containing:
  - id: Task identifier like "T-1", "T-2" (string)
  - description: Specific task to complete (string)
  - status: One of "not_started", "in_progress", "completed", "blocked" (string)
  - notes: Current approach or blockers (string)

**Scope:**
- Describes **only** the current task
- Not a long-term project tracker
- One PRD per chat session/task
- Replace when starting unrelated work

**Example Structure:**
A typical PRD for fixing a Redis connection issue would include:
- Title describing the specific problem (e.g., "Fix Redis Connection Pool Exhaustion")
- Description explaining the user's request and context
- Created timestamp marking when work started
- Tasks array with 2-4 specific subtasks
- Each task with clear description, current status, and relevant notes

### progress.txt Structure

**Purpose:** Track debugging attempts and learnings for the current task.

**Format:**
The progress.txt file tracks debugging attempts with this structure:
- Header indicating it tracks current work progress
- Note that it's cleaned when starting new unrelated work
- Each attempt entry includes:
  - Attempt number in brackets
  - What was tried
  - Result (FAILED or SUCCESS)
  - Error message if failed
  - Learning or insight gained
- When solution works, mark as [CLEANED] and remove failed attempts
- Keep only final solution

**Rules:**
- Log **only** failed attempts while debugging
- Include: what was tried, result, error message, learning
- When solution works: **remove all failed attempts**, keep only final solution
- Keep minimal and relevant to current task
- Clean when starting unrelated work

## CRITICAL: Update PRD and Progress on Every Task

**BEFORE starting ANY task, you MUST:**

1. **Update `.vibe-memory/prd.json`**
   - Add or update task entry in the tasks array
   - Set status to `in_progress`
   - Add notes about approach
   - Update timestamp if needed

2. **Log to `.vibe-memory/progress.txt`**
   - Log task start with timestamp
   - Document approach or plan
   - Log failed attempts with errors
   - Log successful solution when found
   - Clean failed attempts after success

**This applies to:**
- New feature implementation
- Bug fixes
- Refactoring
- Testing
- Documentation
- Any code changes

**Example Workflow:**
When adding email validation to user creation:
1. Update PRD with new task entry (id: 'T-1', description: 'Add email validation to user creation', status: 'in_progress', notes: 'Using validator.js library')
2. Log to progress: "[Started] Adding email validation to user creation"
3. Do the work
4. Log attempts: "[Attempt 1] Tried validator.isEmail() - FAILED: undefined"
5. Log success: "[Attempt 2] Import validator correctly - SUCCESS"
6. Update PRD when done (status: 'completed', notes: 'Implemented with validator.js v13.11.0')
7. Clean failed attempts from progress.txt

## Workflow

### Starting New Work

**Step 1: Check Existing Memory**
1. Read .vibe-memory/prd.json (if exists)
2. Determine if new task is related to existing PRD
3. If related: Continue with existing memory
4. If unrelated: Ask user to clean or continue

**Step 2: Ask User (if unrelated)**
Present the user with this question:
"This task seems unrelated to the current PRD: [current task title].

Options:
1. Clean memory and start fresh (recommended for unrelated work)
2. Continue with existing memory (if tasks are related)

What would you like to do?"

**Step 3: Clean or Continue**
- **If clean**: Clear prd.json and progress.txt, start fresh
- **If continue**: Keep existing memory, add new context

### During Work

**Track Progress:**
1. Update prd.json task status as you work
2. Log failed attempts in progress.txt
3. Keep context minimal and focused

**Failed Attempt Example:**
Log format for failed attempts:
- [Attempt N] Tried: Description of what was attempted
- Result: FAILED - Brief description of failure
- Error: Actual error message received
- Learning: Insight gained from the failure

Example: An attempt to use async/await with Promise.all for parallel processing that failed due to race condition causing data corruption, with error "Duplicate key violation", learning that sequential processing or proper locking is needed.

**Don't Log:**
- Successful attempts (only final solution)
- Obvious things (e.g., "tried reading the file")
- Implementation details (save for code comments)
- Long stack traces (summarize the error)

### When Solution Works

**Clean Failed Attempts:**
1. Remove all failed attempt entries from progress.txt
2. Keep only final solution with brief explanation
3. Update prd.json task status to "completed"

**Final Solution Example:**
Log format for final solution:
- [SOLUTION] Title of the solution
- Bullet points describing the approach
- Key implementation details
- Performance or security notes
- Configuration parameters used

### Completing Work

**Before Finishing:**
1. Ensure prd.json reflects current state
2. Clean progress.txt (remove failed attempts)
3. Verify no extra markdown files created
4. Update task status to "completed"

**Don't Create:**
- Summary files
- Change logs
- Documentation (unless requested)
- Notes files
- TODO lists (use prd.json tasks)

## Unrelated Work Detection

### Indicators of Unrelated Work

**Different Domain:**
- Current: "Fix Redis connection pool"
- New: "Add user authentication feature"
- **Action:** Clean memory

**Different Component:**
- Current: "Debug frontend routing issue"
- New: "Optimize database queries"
- **Action:** Clean memory

**Different Phase:**
- Current: "Implement feature X"
- New: "Fix bug in feature Y"
- **Action:** Clean memory

**Related Work:**
- Current: "Fix Redis connection pool"
- New: "Add Redis connection monitoring"
- **Action:** Continue with existing memory

### Decision Tree

Decision process for handling new work:
- Is new task related to current PRD?
  - Yes → Continue with existing memory
    - Add new tasks to prd.json
  - No → Ask user to clean or continue
    - User chooses clean
      - Clear prd.json and progress.txt
    - User chooses continue
      - Keep existing memory, add context

## Anti-Patterns

### Don't Do This

**❌ Creating Extra Files:**
Never create these types of files:
- SUMMARY.md
- NOTES.md
- CHANGES.md
- TODO.md
- PROGRESS.md
- LEARNINGS.md

**❌ Accumulating Failed Attempts:**
Don't keep all failed attempts in progress.txt. When a solution works, remove the failed attempts and keep only the final solution.

**❌ Long-Term Project Tracking:**
Don't use PRD for tracking entire projects. PRD is for the current task only, not for tracking "Build backend", "Build frontend", "Deploy to production" as separate tasks.

**❌ Logging Everything:**
Don't log every successful step. Only log failed attempts and the final solution. Don't log obvious operations like "Reading the file", "Parsing the JSON", "Validating the data" when they succeed.

### Do This Instead

**✅ Minimal Memory:**
Keep only two files in .vibe-memory/:
- prd.json: Current task definition with tasks array
- progress.txt: Failed attempts and final solution

**✅ Clean When Done:**
Before finishing any task:
1. Remove failed attempts from progress.txt
2. Keep only final solution
3. Update prd.json status to completed
4. Verify no extra files were created

**✅ Ask Before Cleaning:**
When detecting unrelated work, ask the user:
"This task seems unrelated to current PRD. Should I:
1. Clean memory and start fresh
2. Continue with existing memory"

## Memory Lifecycle

### Initialization
1. setup-vibe.sh creates .vibe-memory/ directory
2. Auto-creates prd.json from template if missing
3. Auto-creates progress.txt with header if missing

### Active Use
1. Update prd.json as tasks progress
2. Log failed attempts in progress.txt
3. Keep context minimal and focused

### Completion
1. Clean failed attempts from progress.txt
2. Keep only final solution
3. Update prd.json status to completed
4. Verify no extra files created

### New Task
1. Check if new task is related
2. If unrelated: Ask user to clean or continue
3. If clean: Clear prd.json and progress.txt
4. If continue: Keep existing memory

## Best Practices

### For AI Assistants

**Do:**
- Check existing memory before starting work
- Ask user when detecting unrelated work
- Clean failed attempts when solution works
- Keep context minimal and relevant
- Use git history for long-term memory

**Don't:**
- Create extra markdown files
- Accumulate debugging history
- Track long-term projects in PRD
- Log successful attempts
- Keep failed attempts after solution works

### For Users

**Do:**
- Clean memory when starting unrelated work
- Review prd.json periodically
- Use git for long-term tracking
- Request documentation explicitly if needed

**Don't:**
- Expect AI to track long-term projects
- Accumulate unrelated context
- Rely on memory files for documentation

## Examples

### Example 1: Related Work

**Current PRD:**
A PRD for implementing user authentication with one completed task for creating a login endpoint.

**New Request:** "Add password reset functionality"

**Action:** Continue with existing memory (related to authentication)

### Example 2: Unrelated Work

**Current PRD:**
A PRD for implementing user authentication with tasks in progress.

**New Request:** "Optimize database query performance"

**Action:** Ask user to clean memory (unrelated to authentication)

### Example 3: Cleaning Failed Attempts

**Before (during debugging):**
Multiple attempts logged showing:
- Attempt 1: Using bcrypt with default rounds - FAILED (too slow)
- Attempt 2: Reducing bcrypt rounds to 8 - FAILED (security rejected)
- Attempt 3: Using argon2 instead of bcrypt - SUCCESS

**After (solution found):**
Only the final solution kept:
- [SOLUTION] Password Hashing
- Switched from bcrypt to argon2
- Performance: 50ms per hash (10x faster)
- Security: Approved by security team
- Configuration: argon2id with default parameters

## Summary

**Remember:**
- Memory is task-scoped, not project-scoped
- Clean memory when starting unrelated work
- Remove failed attempts when solution works
- Never create extra markdown files
- Use git history for long-term memory
- Keep context minimal and relevant

**When in doubt:**
- Ask user if work is related
- Clean memory for unrelated work
- Keep only final solution in progress.txt
- Verify no extra files created
