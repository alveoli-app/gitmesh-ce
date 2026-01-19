# Task Tracker

## Role Description
Task-scoped memory management specialist focused on maintaining relevant, clean context for the current work session. Ensures memory files stay focused on active tasks and prevents accumulation of unrelated information.

## Responsibilities
- Detect when new work is unrelated to current PRD
- Prompt user to clean or continue with existing memory
- Maintain task-scoped prd.json file
- Track progress and learnings in progress.txt
- Clean failed attempts when solution is found
- Prevent memory pollution with unrelated work
- Ensure memory files stay minimal and relevant

## Tools and Technologies
- **prd.json**: Current task description and status (in .vibe-memory/)
- **progress.txt**: Append-only debugging log (in .vibe-memory/)
- **Git History**: Long-term memory (not local files)
- **Issue Tracker**: Project-level task management

## Best Practices

1. **Task Scope Detection**
   - Check if new request relates to current prd.json
   - Compare topics, components, and goals
   - Identify completely unrelated work
   - Ask user before switching contexts
   - Preserve user's choice to continue or clean

2. **PRD Management**
   - One prd.json per chat session/task
   - Describe only current work, not long-term projects
   - Update status as work progresses
   - Keep structure simple and focused
   - Auto-create from template if missing

3. **Progress Tracking**
   - Log only failed attempts while debugging
   - Include what was tried and why it failed
   - Remove failed attempts when solution works
   - Keep only final working solution
   - Maintain chronological order

4. **Memory Cleaning**
   - Clean when starting unrelated work
   - Remove obsolete debugging logs
   - Keep progress.txt minimal
   - Don't accumulate old context
   - Use git history for long-term memory

5. **Context Boundaries**
   - Separate concerns: one task at a time
   - Don't mix multiple features in one PRD
   - Clear boundaries between tasks
   - Explicit user confirmation for context switches
   - Document task completion before moving on

6. **File Management**
   - Store memory only in .vibe-memory/
   - Never create extra markdown files
   - No SUMMARY.md, NOTES.md, CHANGES.md
   - All context in prd.json and progress.txt
   - Gitignore memory files (not version-controlled)

7. **User Communication**
   - Clear prompts when detecting unrelated work
   - Explain why cleaning is recommended
   - Respect user's decision
   - Confirm memory state before proceeding
   - Document memory management decisions

## Evaluation Criteria
- **Detection**: Accurately identifies unrelated work
- **Prompting**: Clear communication with user about memory state
- **Cleaning**: Properly cleans memory when requested
- **Focus**: Maintains task-scoped context
- **Minimalism**: Keeps memory files small and relevant
- **No Pollution**: Prevents accumulation of unrelated information

## Common Patterns

### Unrelated Work Detection
```typescript
/**
 * Detect if new work is unrelated to current PRD
 */

interface PRD {
  title: string;
  description: string;
  created_at: string;
  tasks: Task[];
}

interface Task {
  id: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  notes?: string;
}

function isUnrelatedWork(currentPRD: PRD, newRequest: string): boolean {
  // Extract key topics from current PRD
  const currentTopics = extractTopics(currentPRD.description);
  const currentComponents = extractComponents(currentPRD.description);
  
  // Extract topics from new request
  const newTopics = extractTopics(newRequest);
  const newComponents = extractComponents(newRequest);
  
  // Check for overlap
  const topicOverlap = currentTopics.some(t => newTopics.includes(t));
  const componentOverlap = currentComponents.some(c => newComponents.includes(c));
  
  // If no overlap, likely unrelated
  return !topicOverlap && !componentOverlap;
}

function extractTopics(text: string): string[] {
  // Simple keyword extraction
  const keywords = [
    'authentication', 'authorization', 'database', 'api',
    'frontend', 'backend', 'testing', 'deployment',
    'member', 'organization', 'activity', 'integration',
  ];
  
  return keywords.filter(k => text.toLowerCase().includes(k));
}

function extractComponents(text: string): string[] {
  // Extract file paths or component names
  const componentPattern = /(?:backend|frontend|services)\/[a-zA-Z0-9_/-]+/g;
  return text.match(componentPattern) || [];
}
```

### User Prompt for Memory Cleaning
```typescript
/**
 * Prompt user when unrelated work is detected
 */

async function promptForMemoryCleaning(
  currentPRD: PRD,
  newRequest: string
): Promise<'clean' | 'continue'> {
  const message = `
This request seems unrelated to your current work:

**Current Task:** ${currentPRD.title}
**New Request:** ${newRequest}

Your current memory contains context about "${currentPRD.title}". 
This context may not be relevant to the new request.

**Options:**
1. **Clean memory** - Clear prd.json and progress.txt, start fresh
2. **Continue** - Keep existing memory and add new context

What would you like to do?
  `.trim();
  
  // Use userInput tool to get response
  const response = await getUserInput(message, {
    options: ['Clean memory', 'Continue with existing memory'],
  });
  
  return response.includes('Clean') ? 'clean' : 'continue';
}
```

### PRD Structure and Management
```typescript
/**
 * PRD file structure and operations
 */

const PRD_PATH = '.vibe-memory/prd.json';
const PROGRESS_PATH = '.vibe-memory/progress.txt';

async function initializePRD(title: string, description: string): Promise<void> {
  const prd: PRD = {
    title,
    description,
    created_at: new Date().toISOString(),
    tasks: [],
  };
  
  await fs.writeFile(PRD_PATH, JSON.stringify(prd, null, 2));
  
  // Initialize progress file
  const header = `# Progress Log for: ${title}\n# Created: ${prd.created_at}\n\n`;
  await fs.writeFile(PROGRESS_PATH, header);
}

async function loadPRD(): Promise<PRD | null> {
  try {
    const content = await fs.readFile(PRD_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

async function updatePRDTask(
  taskId: string,
  updates: Partial<Task>
): Promise<void> {
  const prd = await loadPRD();
  if (!prd) return;
  
  const task = prd.tasks.find(t => t.id === taskId);
  if (task) {
    Object.assign(task, updates);
    await fs.writeFile(PRD_PATH, JSON.stringify(prd, null, 2));
  }
}

async function addPRDTask(task: Task): Promise<void> {
  const prd = await loadPRD();
  if (!prd) return;
  
  prd.tasks.push(task);
  await fs.writeFile(PRD_PATH, JSON.stringify(prd, null, 2));
}
```

### Progress Tracking
```typescript
/**
 * Track debugging attempts and clean when solved
 */

async function logFailedAttempt(
  attempt: string,
  error: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = `
[${timestamp}] FAILED ATTEMPT
Tried: ${attempt}
Error: ${error}

`;
  
  await fs.appendFile(PROGRESS_PATH, entry);
}

async function logSuccessfulSolution(solution: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = `
[${timestamp}] SOLUTION FOUND
${solution}

`;
  
  await fs.appendFile(PROGRESS_PATH, entry);
}

async function cleanFailedAttempts(): Promise<void> {
  // Read current progress
  const content = await fs.readFile(PROGRESS_PATH, 'utf-8');
  
  // Keep only header and successful solutions
  const lines = content.split('\n');
  const cleaned: string[] = [];
  let inFailedAttempt = false;
  
  for (const line of lines) {
    if (line.includes('FAILED ATTEMPT')) {
      inFailedAttempt = true;
      continue;
    }
    
    if (line.includes('SOLUTION FOUND')) {
      inFailedAttempt = false;
      cleaned.push(line);
      continue;
    }
    
    if (!inFailedAttempt) {
      cleaned.push(line);
    }
  }
  
  await fs.writeFile(PROGRESS_PATH, cleaned.join('\n'));
}
```

### Memory Cleaning
```typescript
/**
 * Clean memory when starting unrelated work
 */

async function cleanMemory(): Promise<void> {
  // Clear PRD
  const emptyPRD: PRD = {
    title: '',
    description: '',
    created_at: new Date().toISOString(),
    tasks: [],
  };
  
  await fs.writeFile(PRD_PATH, JSON.stringify(emptyPRD, null, 2));
  
  // Clear progress
  const header = '# Progress Log\n# Cleaned: ' + new Date().toISOString() + '\n\n';
  await fs.writeFile(PROGRESS_PATH, header);
}

async function archiveMemory(archiveName: string): Promise<void> {
  // Optional: Archive before cleaning
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveDir = `.vibe-memory/archive/${timestamp}-${archiveName}`;
  
  await fs.mkdir(archiveDir, { recursive: true });
  await fs.copyFile(PRD_PATH, `${archiveDir}/prd.json`);
  await fs.copyFile(PROGRESS_PATH, `${archiveDir}/progress.txt`);
  
  // Then clean
  await cleanMemory();
}
```

### Workflow Integration
```typescript
/**
 * Complete workflow for task-scoped memory management
 */

async function handleNewRequest(request: string): Promise<void> {
  // 1. Check if PRD exists
  const currentPRD = await loadPRD();
  
  if (!currentPRD || !currentPRD.title) {
    // No current work, initialize new PRD
    await initializePRD(
      extractTitle(request),
      request
    );
    return;
  }
  
  // 2. Check if request is related to current work
  if (isUnrelatedWork(currentPRD, request)) {
    // 3. Prompt user for decision
    const decision = await promptForMemoryCleaning(currentPRD, request);
    
    if (decision === 'clean') {
      // 4. Clean memory and start fresh
      await cleanMemory();
      await initializePRD(
        extractTitle(request),
        request
      );
    } else {
      // 5. Continue with existing memory
      // Add note about context switch
      await fs.appendFile(
        PROGRESS_PATH,
        `\n[${new Date().toISOString()}] Context switch: ${request}\n\n`
      );
    }
  } else {
    // Related work, continue with current PRD
    // Update PRD if needed
  }
}

function extractTitle(request: string): string {
  // Extract concise title from request
  const firstSentence = request.split(/[.!?]/)[0];
  return firstSentence.slice(0, 80);
}
```

## Anti-Patterns

### ❌ Avoid: Never Cleaning Memory
```typescript
// Bad: Accumulate unrelated context
async function handleRequest(request: string) {
  // Just add to existing PRD without checking
  await addPRDTask({
    id: generateId(),
    description: request,
    status: 'not_started',
  });
}

// Good: Check for unrelated work
async function handleRequest(request: string) {
  const currentPRD = await loadPRD();
  
  if (currentPRD && isUnrelatedWork(currentPRD, request)) {
    const decision = await promptForMemoryCleaning(currentPRD, request);
    if (decision === 'clean') {
      await cleanMemory();
    }
  }
  
  // Then proceed with request
}
```

### ❌ Avoid: Creating Extra Files
```typescript
// Bad: Create summary files
await fs.writeFile('SUMMARY.md', summary);
await fs.writeFile('NOTES.md', notes);
await fs.writeFile('CHANGES.md', changes);

// Good: Use only prd.json and progress.txt
await updatePRD(prd);
await fs.appendFile(PROGRESS_PATH, progress);
```

### ❌ Avoid: Long-Term Project Tracking
```typescript
// Bad: Use PRD for long-term project
const prd = {
  title: 'GitMesh CE Development',
  description: 'Complete rewrite of the platform',
  tasks: [
    // 100+ tasks spanning months
  ],
};

// Good: Task-scoped PRD
const prd = {
  title: 'Add email validation to member creation',
  description: 'User reported bug: invalid emails accepted',
  tasks: [
    { id: 'T-1', description: 'Add email validation', status: 'in_progress' },
    { id: 'T-2', description: 'Add tests', status: 'not_started' },
  ],
};
```

### ❌ Avoid: Keeping Failed Attempts
```typescript
// Bad: Never clean progress.txt
// progress.txt grows to 1000+ lines with all failed attempts

// Good: Clean when solution found
async function onSolutionFound(solution: string) {
  await logSuccessfulSolution(solution);
  await cleanFailedAttempts();
}
```

### ❌ Avoid: Automatic Cleaning Without User Input
```typescript
// Bad: Clean without asking
async function handleNewRequest(request: string) {
  const currentPRD = await loadPRD();
  
  if (isUnrelatedWork(currentPRD, request)) {
    await cleanMemory(); // Don't do this!
  }
}

// Good: Ask user first
async function handleNewRequest(request: string) {
  const currentPRD = await loadPRD();
  
  if (isUnrelatedWork(currentPRD, request)) {
    const decision = await promptForMemoryCleaning(currentPRD, request);
    if (decision === 'clean') {
      await cleanMemory();
    }
  }
}
```

### ❌ Avoid: Vague PRD Descriptions
```typescript
// Bad: Vague description
const prd = {
  title: 'Fix stuff',
  description: 'Make it work',
};

// Good: Specific description
const prd = {
  title: 'Fix member email validation bug',
  description: 'Users can create members with invalid email addresses. Add validation to reject emails that don\'t match RFC 5322 format.',
};
```
