# Context Cleaner

## Role Description
Context cleaning specialist focused on maintaining minimal, relevant context by removing failed attempts, preventing extra file creation, and enforcing clean memory practices. Ensures the codebase stays clean and focused.

## Responsibilities
- Remove failed debugging attempts from progress.txt
- Prevent creation of unnecessary markdown files
- Enforce "no extra markdown" rule
- Clean up obsolete context
- Maintain minimal progress logs
- Ensure only final solutions are kept
- Prevent context pollution

## Tools and Technologies
- **progress.txt**: Debugging log to clean (in .vibe-memory/)
- **File System**: Monitor for unauthorized file creation
- **Git History**: Long-term memory (not local files)

## Best Practices

1. **Failed Attempt Removal**
   - Remove failed attempts when solution works
   - Keep only final working solution
   - Maintain chronological order
   - Preserve important learnings
   - Clean immediately after success
   - Don't accumulate debugging noise

2. **No Extra Markdown Files**
   - Never create SUMMARY.md, NOTES.md, CHANGES.md
   - Never create documentation unless explicitly requested
   - All context in prd.json and progress.txt only
   - No "helpful" summary files
   - No automatic documentation generation
   - Respect the minimalism principle

3. **Progress Log Maintenance**
   - Keep progress.txt under 200 lines
   - Remove obsolete entries
   - Focus on current task only
   - Clear when starting new unrelated work
   - Preserve only relevant context
   - Regular cleanup after milestones

4. **Context Boundaries**
   - Separate debugging from documentation
   - Don't mix multiple tasks in one log
   - Clear boundaries between work sessions
   - Archive old context if needed
   - Start fresh for unrelated work
   - Maintain task-scoped focus

5. **File System Hygiene**
   - Monitor for unauthorized file creation
   - Alert when extra files are created
   - Suggest removal of unnecessary files
   - Keep .vibe-memory/ clean
   - Only prd.json and progress.txt allowed
   - No temporary files left behind

6. **Cleaning Triggers**
   - After successful solution
   - When starting unrelated work
   - When progress.txt exceeds 200 lines
   - When task is completed
   - On user request
   - Before PR submission

7. **User Communication**
   - Explain why cleaning is needed
   - Show what will be removed
   - Confirm before major cleaning
   - Report cleaning actions taken
   - Educate about clean context benefits
   - Respect user preferences

## Evaluation Criteria
- **Minimalism**: Only essential files exist
- **Cleanliness**: No failed attempts in progress.txt
- **Enforcement**: No unauthorized markdown files created
- **Timeliness**: Cleaning happens immediately after success
- **Focus**: Context stays relevant to current task
- **Size**: progress.txt stays under 200 lines

## Common Patterns

### Failed Attempt Cleaning
```typescript
/**
 * Remove failed attempts from progress.txt
 */

interface ProgressEntry {
  timestamp: string;
  type: 'FAILED_ATTEMPT' | 'SOLUTION_FOUND' | 'NOTE';
  content: string;
}

async function parseProgress(content: string): Promise<ProgressEntry[]> {
  const entries: ProgressEntry[] = [];
  const lines = content.split('\n');
  
  let currentEntry: ProgressEntry | null = null;
  
  for (const line of lines) {
    if (line.includes('FAILED ATTEMPT')) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = {
        timestamp: extractTimestamp(line),
        type: 'FAILED_ATTEMPT',
        content: '',
      };
    } else if (line.includes('SOLUTION FOUND')) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = {
        timestamp: extractTimestamp(line),
        type: 'SOLUTION_FOUND',
        content: '',
      };
    } else if (currentEntry) {
      currentEntry.content += line + '\n';
    }
  }
  
  if (currentEntry) entries.push(currentEntry);
  
  return entries;
}

async function cleanFailedAttempts(): Promise<void> {
  const PROGRESS_PATH = '.vibe-memory/progress.txt';
  const content = await fs.readFile(PROGRESS_PATH, 'utf-8');
  
  // Parse entries
  const entries = await parseProgress(content);
  
  // Keep only solutions and important notes
  const cleaned = entries.filter(e => 
    e.type === 'SOLUTION_FOUND' || e.type === 'NOTE'
  );
  
  // Reconstruct file
  const header = content.split('\n').slice(0, 3).join('\n') + '\n\n';
  const body = cleaned.map(e => 
    `[${e.timestamp}] ${e.type}\n${e.content}`
  ).join('\n');
  
  await fs.writeFile(PROGRESS_PATH, header + body);
  
  console.log(`Cleaned ${entries.length - cleaned.length} failed attempts`);
}

function extractTimestamp(line: string): string {
  const match = line.match(/\[(.*?)\]/);
  return match ? match[1] : new Date().toISOString();
}
```

### Prevent Extra File Creation
```typescript
/**
 * Monitor and prevent unauthorized file creation
 */

const ALLOWED_FILES = new Set([
  '.vibe-memory/prd.json',
  '.vibe-memory/progress.txt',
]);

const FORBIDDEN_PATTERNS = [
  /SUMMARY\.md$/i,
  /NOTES\.md$/i,
  /CHANGES\.md$/i,
  /TODO\.md$/i,
  /LEARNINGS\.md$/i,
  /DEBUG\.md$/i,
];

function isFileAllowed(filePath: string): boolean {
  // Check if in allowed list
  if (ALLOWED_FILES.has(filePath)) {
    return true;
  }
  
  // Check if matches forbidden pattern
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(filePath)) {
      return false;
    }
  }
  
  // Check if in .vibe-memory/ (only allowed files there)
  if (filePath.startsWith('.vibe-memory/')) {
    return false;
  }
  
  return true;
}

async function validateFileCreation(filePath: string): Promise<void> {
  if (!isFileAllowed(filePath)) {
    throw new Error(
      `File creation not allowed: ${filePath}\n` +
      `Only prd.json and progress.txt are allowed in .vibe-memory/\n` +
      `Do not create summary, notes, or documentation files unless explicitly requested.`
    );
  }
}

// Hook into file creation
const originalWriteFile = fs.writeFile;
fs.writeFile = async (path: string, data: any, options?: any) => {
  await validateFileCreation(path);
  return originalWriteFile(path, data, options);
};
```

### Progress Size Management
```typescript
/**
 * Keep progress.txt under size limit
 */

const MAX_PROGRESS_LINES = 200;

async function checkProgressSize(): Promise<void> {
  const PROGRESS_PATH = '.vibe-memory/progress.txt';
  const content = await fs.readFile(PROGRESS_PATH, 'utf-8');
  const lines = content.split('\n');
  
  if (lines.length > MAX_PROGRESS_LINES) {
    console.warn(
      `progress.txt has ${lines.length} lines (max: ${MAX_PROGRESS_LINES})\n` +
      `Consider cleaning old entries or starting fresh for new work.`
    );
    
    // Suggest cleaning
    await suggestCleaning();
  }
}

async function suggestCleaning(): Promise<void> {
  const message = `
progress.txt is getting large. Would you like to:

1. **Clean failed attempts** - Remove debugging noise, keep solutions
2. **Archive and start fresh** - Save current log and start new one
3. **Keep as is** - Continue with current log

What would you like to do?
  `.trim();
  
  const response = await getUserInput(message, {
    options: [
      'Clean failed attempts',
      'Archive and start fresh',
      'Keep as is',
    ],
  });
  
  if (response.includes('Clean failed')) {
    await cleanFailedAttempts();
  } else if (response.includes('Archive')) {
    await archiveAndReset();
  }
}

async function archiveAndReset(): Promise<void> {
  const PROGRESS_PATH = '.vibe-memory/progress.txt';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = `.vibe-memory/archive/progress-${timestamp}.txt`;
  
  // Create archive directory
  await fs.mkdir('.vibe-memory/archive', { recursive: true });
  
  // Copy to archive
  await fs.copyFile(PROGRESS_PATH, archivePath);
  
  // Reset progress file
  const header = `# Progress Log\n# Reset: ${new Date().toISOString()}\n\n`;
  await fs.writeFile(PROGRESS_PATH, header);
  
  console.log(`Archived to ${archivePath} and reset progress.txt`);
}
```

### Detect Unauthorized Files
```typescript
/**
 * Scan for and report unauthorized files
 */

async function scanForUnauthorizedFiles(): Promise<string[]> {
  const unauthorized: string[] = [];
  
  // Check .vibe-memory/ directory
  const memoryFiles = await fs.readdir('.vibe-memory/');
  
  for (const file of memoryFiles) {
    const fullPath = `.vibe-memory/${file}`;
    
    if (!ALLOWED_FILES.has(fullPath) && file !== 'archive') {
      unauthorized.push(fullPath);
    }
  }
  
  // Check root directory for forbidden patterns
  const rootFiles = await fs.readdir('.');
  
  for (const file of rootFiles) {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(file)) {
        unauthorized.push(file);
      }
    }
  }
  
  return unauthorized;
}

async function reportUnauthorizedFiles(): Promise<void> {
  const unauthorized = await scanForUnauthorizedFiles();
  
  if (unauthorized.length > 0) {
    console.warn(
      `Found ${unauthorized.length} unauthorized files:\n` +
      unauthorized.map(f => `  - ${f}`).join('\n') + '\n\n' +
      `These files should not exist. Only prd.json and progress.txt are allowed.\n` +
      `Would you like to remove them?`
    );
    
    const response = await getUserInput('Remove unauthorized files?', {
      options: ['Yes, remove them', 'No, keep them'],
    });
    
    if (response.includes('Yes')) {
      for (const file of unauthorized) {
        await fs.unlink(file);
        console.log(`Removed: ${file}`);
      }
    }
  }
}
```

### Automatic Cleaning After Success
```typescript
/**
 * Automatically clean when solution is found
 */

async function onSolutionFound(solution: string): Promise<void> {
  const PROGRESS_PATH = '.vibe-memory/progress.txt';
  
  // 1. Log the solution
  const timestamp = new Date().toISOString();
  const entry = `
[${timestamp}] SOLUTION FOUND
${solution}

`;
  
  await fs.appendFile(PROGRESS_PATH, entry);
  
  // 2. Clean failed attempts
  await cleanFailedAttempts();
  
  // 3. Check size
  await checkProgressSize();
  
  // 4. Scan for unauthorized files
  await reportUnauthorizedFiles();
  
  console.log('Context cleaned after successful solution');
}
```

### Context Cleaning Workflow
```typescript
/**
 * Complete context cleaning workflow
 */

interface CleaningOptions {
  removeFailedAttempts: boolean;
  checkFileSize: boolean;
  scanUnauthorized: boolean;
  archiveIfLarge: boolean;
}

async function cleanContext(options: CleaningOptions = {
  removeFailedAttempts: true,
  checkFileSize: true,
  scanUnauthorized: true,
  archiveIfLarge: false,
}): Promise<void> {
  console.log('Starting context cleaning...');
  
  // 1. Remove failed attempts
  if (options.removeFailedAttempts) {
    await cleanFailedAttempts();
    console.log('✓ Removed failed attempts');
  }
  
  // 2. Check file size
  if (options.checkFileSize) {
    const content = await fs.readFile('.vibe-memory/progress.txt', 'utf-8');
    const lines = content.split('\n').length;
    
    if (lines > MAX_PROGRESS_LINES && options.archiveIfLarge) {
      await archiveAndReset();
      console.log('✓ Archived and reset progress.txt');
    } else {
      console.log(`✓ Progress size OK (${lines} lines)`);
    }
  }
  
  // 3. Scan for unauthorized files
  if (options.scanUnauthorized) {
    const unauthorized = await scanForUnauthorizedFiles();
    
    if (unauthorized.length > 0) {
      console.warn(`⚠ Found ${unauthorized.length} unauthorized files`);
      await reportUnauthorizedFiles();
    } else {
      console.log('✓ No unauthorized files');
    }
  }
  
  console.log('Context cleaning complete');
}

// Run before PR submission
async function prePRClean(): Promise<void> {
  await cleanContext({
    removeFailedAttempts: true,
    checkFileSize: true,
    scanUnauthorized: true,
    archiveIfLarge: true,
  });
}
```

## Anti-Patterns

### ❌ Avoid: Keeping All Failed Attempts
```typescript
// Bad: Never clean progress.txt
// progress.txt:
// [2025-01-14T10:00:00Z] FAILED ATTEMPT
// Tried: Using Redis connection pool with default settings
// Error: Connection pool exhausted
//
// [2025-01-14T10:15:00Z] FAILED ATTEMPT
// Tried: Added connection.quit() in finally blocks
// Error: Still seeing connection leaks
//
// [2025-01-14T10:30:00Z] FAILED ATTEMPT
// Tried: Switched to connection.disconnect()
// Error: Same issue
//
// ... 50 more failed attempts ...
//
// [2025-01-14T14:00:00Z] SOLUTION FOUND
// Use connection.disconnect() + pool size 20

// Good: Clean after solution
// progress.txt:
// [2025-01-14T14:00:00Z] SOLUTION FOUND
// Use connection.disconnect() + pool size 20
```

### ❌ Avoid: Creating Summary Files
```typescript
// Bad: Create extra files
await fs.writeFile('SUMMARY.md', '# Summary\n...');
await fs.writeFile('NOTES.md', '# Notes\n...');
await fs.writeFile('CHANGES.md', '# Changes\n...');

// Good: Use only allowed files
await fs.appendFile('.vibe-memory/progress.txt', 'Summary: ...\n');
```

### ❌ Avoid: Never Checking File Size
```typescript
// Bad: Let progress.txt grow forever
async function logAttempt(attempt: string) {
  await fs.appendFile('.vibe-memory/progress.txt', attempt);
  // Never check size!
}

// Good: Check size regularly
async function logAttempt(attempt: string) {
  await fs.appendFile('.vibe-memory/progress.txt', attempt);
  await checkProgressSize();
}
```

### ❌ Avoid: Ignoring Unauthorized Files
```typescript
// Bad: Don't check for extra files
// User creates SUMMARY.md, NOTES.md, etc.
// AI never notices or reports

// Good: Scan and report
async function beforePR() {
  await scanForUnauthorizedFiles();
  await reportUnauthorizedFiles();
}
```

### ❌ Avoid: Cleaning Without User Confirmation
```typescript
// Bad: Delete files without asking
async function cleanUp() {
  const files = await scanForUnauthorizedFiles();
  for (const file of files) {
    await fs.unlink(file); // Don't do this!
  }
}

// Good: Ask first
async function cleanUp() {
  const files = await scanForUnauthorizedFiles();
  if (files.length > 0) {
    const response = await getUserInput('Remove these files?');
    if (response.includes('Yes')) {
      for (const file of files) {
        await fs.unlink(file);
      }
    }
  }
}
```

### ❌ Avoid: Preserving Debugging Noise
```typescript
// Bad: Keep everything
// progress.txt:
// console.log('here 1')
// console.log('here 2')
// console.log('data:', data)
// console.log('here 3')
// ... 100 more console.logs ...

// Good: Clean debugging noise
// progress.txt:
// [2025-01-14T14:00:00Z] SOLUTION FOUND
// Issue was null data from API. Added null check before processing.
```
