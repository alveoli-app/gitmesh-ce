# Security Scan Evaluation

## Purpose

This evaluation validates that AI-generated code follows security best practices and does not introduce common vulnerabilities into GitMesh CE.

## Validation Criteria

1. **Input Validation**: All user inputs are validated and sanitized
2. **SQL Injection Prevention**: Parameterized queries used, no string concatenation in SQL
3. **XSS Prevention**: Output encoding applied, no unescaped user content in HTML
4. **Authentication**: Proper authentication checks on protected endpoints
5. **Authorization**: Role-based access control enforced
6. **Secret Management**: No hardcoded secrets, credentials, or API keys
7. **Dependency Security**: No known vulnerabilities in dependencies
8. **CSRF Protection**: CSRF tokens used for state-changing operations
9. **Rate Limiting**: API endpoints have appropriate rate limits
10. **Secure Headers**: Security headers configured (CSP, HSTS, X-Frame-Options)

## Pass/Fail Thresholds

### Pass Conditions
- Zero critical or high-severity vulnerabilities
- All user inputs validated
- No hardcoded secrets detected
- All dependencies up-to-date with security patches
- Authentication/authorization properly implemented
- Security headers configured

### Fail Conditions
- Any critical or high-severity vulnerabilities
- Unvalidated user inputs
- Hardcoded secrets or credentials
- Known vulnerable dependencies
- Missing authentication on protected routes
- Missing CSRF protection on state-changing operations

## Common Vulnerability Patterns

### 1. SQL Injection

**Vulnerable Code:**
```typescript
// BAD: String concatenation in SQL
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;
await db.query(query);
```

**Secure Code:**
```typescript
// GOOD: Parameterized query
const query = 'SELECT * FROM users WHERE email = ?';
await db.query(query, [userEmail]);

// GOOD: Using ORM (Sequelize)
await User.findOne({ where: { email: userEmail } });
```

### 2. Cross-Site Scripting (XSS)

**Vulnerable Code:**
```vue
<!-- BAD: Unescaped user content -->
<div v-html="userComment"></div>
```

**Secure Code:**
```vue
<!-- GOOD: Escaped by default -->
<div>{{ userComment }}</div>

<!-- GOOD: Sanitized HTML if needed -->
<div v-html="sanitizeHtml(userComment)"></div>
```

### 3. Hardcoded Secrets

**Vulnerable Code:**
```typescript
// BAD: Hardcoded API key
const apiKey = 'sk_live_abc123xyz789';
const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
```

**Secure Code:**
```typescript
// GOOD: Environment variable
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY not configured');
}
const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
```

### 4. Missing Authentication

**Vulnerable Code:**
```typescript
// BAD: No authentication check
router.get('/api/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  res.json(user);
});
```

**Secure Code:**
```typescript
// GOOD: Authentication middleware
router.get('/api/users/:id', 
  authMiddleware.requireAuth,
  async (req, res) => {
    const user = await User.findByPk(req.params.id);
    res.json(user);
  }
);
```

### 5. Missing Authorization

**Vulnerable Code:**
```typescript
// BAD: No authorization check
router.delete('/api/users/:id', async (req, res) => {
  await User.destroy({ where: { id: req.params.id } });
  res.json({ success: true });
});
```

**Secure Code:**
```typescript
// GOOD: Authorization check
router.delete('/api/users/:id', 
  authMiddleware.requireAuth,
  async (req, res) => {
    const user = await User.findByPk(req.params.id);
    
    // Check if user can delete this resource
    if (user.id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await user.destroy();
    res.json({ success: true });
  }
);
```

### 6. Path Traversal

**Vulnerable Code:**
```typescript
// BAD: Unsanitized file path
router.get('/files/:filename', (req, res) => {
  const filePath = `./uploads/${req.params.filename}`;
  res.sendFile(filePath);
});
```

**Secure Code:**
```typescript
// GOOD: Validated and sanitized path
import path from 'path';

router.get('/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'uploads', filename);
  
  // Ensure path is within uploads directory
  if (!filePath.startsWith(path.join(__dirname, 'uploads'))) {
    return res.status(400).json({ error: 'Invalid file path' });
  }
  
  res.sendFile(filePath);
});
```

### 7. Insecure Deserialization

**Vulnerable Code:**
```typescript
// BAD: Deserializing untrusted data
const userData = JSON.parse(req.body.data);
const user = Object.assign(new User(), userData);
```

**Secure Code:**
```typescript
// GOOD: Validate before deserializing
const schema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().max(100).required()
});

const { error, value } = schema.validate(req.body);
if (error) {
  return res.status(400).json({ error: error.details });
}

const user = await User.create(value);
```

## Remediation Guidance

### Running Security Scans

**Dependency Vulnerabilities:**
```bash
# Backend
cd backend
pnpm audit
pnpm audit fix

# Frontend
cd frontend
pnpm audit
pnpm audit fix

# Services
cd services
pip-audit
```

**Static Analysis:**
```bash
# Backend/Frontend (ESLint security plugin)
cd backend
pnpm run lint

# Services (Bandit for Python)
cd services
bandit -r apps/ libs/
```

**Secret Detection:**
```bash
# Install gitleaks
brew install gitleaks  # macOS
# or download from https://github.com/gitleaks/gitleaks

# Scan for secrets
gitleaks detect --source . --verbose
```

### Input Validation

**Use validation libraries:**
```typescript
import Joi from 'joi';

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  age: Joi.number().integer().min(0).max(150)
});

router.post('/api/users', async (req, res) => {
  const { error, value } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details });
  }
  
  // Use validated data
  const user = await User.create(value);
  res.json(user);
});
```

### Output Encoding

**Vue.js (automatic escaping):**
```vue
<!-- Escaped by default -->
<div>{{ userInput }}</div>

<!-- Use DOMPurify for HTML content -->
<div v-html="$sanitize(userHtml)"></div>
```

**Backend (escape for different contexts):**
```typescript
import escapeHtml from 'escape-html';

// HTML context
const safeHtml = escapeHtml(userInput);

// JSON context
const safeJson = JSON.stringify(userInput);
```

### Secure Headers

**Express.js configuration:**
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Automation

### Pre-Commit Security Checks
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for secrets
gitleaks protect --staged --verbose

# Run security linting
cd backend && pnpm run lint:security
cd frontend && pnpm run lint:security

# Check dependencies
cd backend && pnpm audit --audit-level=high
cd frontend && pnpm audit --audit-level=high
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Security Scan - Dependencies
  run: |
    cd backend && pnpm audit --audit-level=high
    cd frontend && pnpm audit --audit-level=high

- name: Security Scan - Secrets
  uses: gitleaks/gitleaks-action@v2

- name: Security Scan - Static Analysis
  run: |
    cd backend && pnpm run lint:security
    cd services && bandit -r apps/ libs/

- name: Security Scan - SAST
  uses: github/codeql-action/analyze@v2
```

### Dependency Updates
```yaml
# Dependabot configuration (.github/dependabot.yml)
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10

  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10

  - package-ecosystem: "pip"
    directory: "/services"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

## Security Checklist

Before submitting PR, verify:

- [ ] All user inputs validated with schema validation
- [ ] SQL queries use parameterized statements or ORM
- [ ] No hardcoded secrets, credentials, or API keys
- [ ] Authentication required on protected endpoints
- [ ] Authorization checks enforce proper access control
- [ ] Output properly encoded for context (HTML, JSON, etc.)
- [ ] CSRF protection enabled for state-changing operations
- [ ] Rate limiting configured on API endpoints
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Dependencies scanned for vulnerabilities
- [ ] No secrets detected by gitleaks
- [ ] Static analysis passes without security warnings

## Severity Levels

### Critical
- SQL injection vulnerabilities
- Authentication bypass
- Hardcoded secrets in code
- Remote code execution

### High
- XSS vulnerabilities
- Authorization bypass
- Insecure deserialization
- Path traversal

### Medium
- Missing rate limiting
- Weak password requirements
- Missing security headers
- Information disclosure

### Low
- Verbose error messages
- Missing input length limits
- Outdated dependencies (no known exploits)

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email security contact: security@gitmesh.com
3. Include detailed description and reproduction steps
4. Wait for acknowledgment before public disclosure

## Related Evaluations
- **code-quality.md**: Ensures secure coding practices
- **test-coverage.md**: Validates security test coverage
- **ce-ee-separation.md**: Prevents proprietary code leakage
