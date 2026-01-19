# Gemini CLI Configuration for GitMesh CE

Optimized for terminal workflow, automation, and script generation on GitMesh Community Edition.

## Core Configuration

### Stack Overview
- **Backend**: Node.js/Express/TypeScript/Sequelize/PostgreSQL
- **Frontend**: Vue 3/Vite/TypeScript/Tailwind CSS
- **Services**: Python/Temporal/Redis/OpenSearch/SQS
- **Infrastructure**: Docker/Docker Compose/Nginx

**Full details**: `.vibe/core/architecture.md`

### Coding Standards
- **TypeScript/JavaScript**: ES6+, async/await, explicit types
- **Python**: PEP 8, type hints, async/await
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

## Terminal Workflow

### CLI Commands

**Development:**
```bash
# Backend
npm run dev              # Start dev server
npm test                 # Run tests
npm run lint             # Check code style
npm run build            # Build for production

# Frontend
npm run dev              # Start Vite dev server
npm run test:unit        # Run unit tests
npm run build            # Production build

# Services
pytest                   # Run Python tests
python -m app.main       # Run service

# Docker
docker-compose up        # Start all services
docker-compose down      # Stop all services
docker-compose logs -f   # Follow logs
```

**Database:**
```bash
# Migrations
./cli scaffold migrate-up      # Run migrations
./cli scaffold migrate-down    # Rollback migrations

# Backup/Restore
./cli db-backup <name>         # Backup database
./cli db-restore <name>        # Restore database
```

**Git:**
```bash
# Feature development
git checkout -b feat/feature-name
git add .
git commit -m "feat: add feature"
git push origin feat/feature-name

# Bug fixes
git checkout -b fix/bug-name
git add .
git commit -m "fix: resolve bug"
git push origin fix/bug-name
```

### Automation Scripts

#### Development Setup Script
```bash
#!/bin/sh
set -e

echo "Setting up GitMesh CE development environment..."

# Install dependencies
echo "Installing backend dependencies..."
cd backend && npm install && cd ..

echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "Installing service dependencies..."
cd services && pip install -r requirements.txt && cd ..

# Setup database
echo "Setting up database..."
./cli scaffold migrate-up

# Start services
echo "Starting services..."
docker-compose up -d postgres redis opensearch

echo "Setup complete! Run 'npm run dev' in backend and frontend directories."
```

#### Test Runner Script
```bash
#!/bin/sh
set -e

echo "Running all tests..."

# Backend tests
echo "Running backend tests..."
cd backend && npm test && cd ..

# Frontend tests
echo "Running frontend tests..."
cd frontend && npm run test:unit && cd ..

# Service tests
echo "Running service tests..."
cd services && pytest && cd ..

echo "All tests passed!"
```

#### Deployment Script
```bash
#!/bin/sh
set -e

echo "Deploying GitMesh CE..."

# Build backend
echo "Building backend..."
cd backend && npm run build && cd ..

# Build frontend
echo "Building frontend..."
cd frontend && npm run build && cd ..

# Run migrations
echo "Running migrations..."
./cli scaffold migrate-up

# Restart services
echo "Restarting services..."
docker-compose restart api frontend

echo "Deployment complete!"
```

#### Code Quality Check Script
```bash
#!/bin/sh
set -e

echo "Running code quality checks..."

# Linting
echo "Checking code style..."
cd backend && npm run lint && cd ..
cd frontend && npm run lint && cd ..

# Type checking
echo "Checking types..."
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

# Security audit
echo "Checking for vulnerabilities..."
cd backend && npm audit && cd ..
cd frontend && npm audit && cd ..

echo "All checks passed!"
```

## CLI Patterns

### Script Templates

#### Basic Script Template
```bash
#!/bin/sh
set -e
set -u

# Script description
# Usage: ./script.sh <arg1> <arg2>

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly LOG_FILE="/var/log/script.log"

# Functions
log_info() {
    echo "[INFO] $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[ERROR] $*" >&2 | tee -a "$LOG_FILE"
}

main() {
    if [ $# -lt 2 ]; then
        log_error "Usage: $0 <arg1> <arg2>"
        exit 1
    fi
    
    local arg1="$1"
    local arg2="$2"
    
    log_info "Starting script with args: $arg1, $arg2"
    
    # Script logic here
    
    log_info "Script completed successfully"
}

# Execute main function
main "$@"
```

#### Database Migration Script
```bash
#!/bin/sh
set -e

# Run database migrations
# Usage: ./migrate.sh <up|down>

readonly DIRECTION="${1:-up}"

log_info() {
    echo "[INFO] $*"
}

log_error() {
    echo "[ERROR] $*" >&2
}

run_migrations() {
    local direction="$1"
    
    log_info "Running migrations: $direction"
    
    cd backend
    
    if [ "$direction" = "up" ]; then
        npm run sequelize-cli:source -- db:migrate
    elif [ "$direction" = "down" ]; then
        npm run sequelize-cli:source -- db:migrate:undo
    else
        log_error "Invalid direction: $direction (use 'up' or 'down')"
        exit 1
    fi
    
    cd ..
    
    log_info "Migrations completed"
}

run_migrations "$DIRECTION"
```

#### Service Health Check Script
```bash
#!/bin/sh
set -e

# Check health of all services
# Usage: ./health-check.sh

check_service() {
    local service="$1"
    local url="$2"
    
    if curl -f -s "$url" > /dev/null; then
        echo "✓ $service is healthy"
        return 0
    else
        echo "✗ $service is unhealthy"
        return 1
    fi
}

main() {
    echo "Checking service health..."
    
    check_service "API" "http://localhost:8080/health"
    check_service "Frontend" "http://localhost:8081"
    check_service "PostgreSQL" "http://localhost:5432"
    check_service "Redis" "http://localhost:6379"
    check_service "OpenSearch" "http://localhost:9200"
    
    echo "Health check complete"
}

main
```

## Automation Examples

### Git Hooks

#### Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit

set -e

echo "Running pre-commit checks..."

# Run linter
npm run lint

# Run tests
npm test

# Check for secrets
if git diff --cached | grep -i "password\|api_key\|secret"; then
    echo "Error: Potential secret detected in commit"
    exit 1
fi

echo "Pre-commit checks passed"
```

#### Pre-push Hook
```bash
#!/bin/sh
# .git/hooks/pre-push

set -e

echo "Running pre-push checks..."

# Run all tests
npm test

# Check build
npm run build

# Security audit
npm audit

echo "Pre-push checks passed"
```

### CI/CD Scripts

#### CI Test Script
```bash
#!/bin/sh
set -e

echo "Running CI tests..."

# Install dependencies
npm ci

# Run linter
npm run lint

# Run tests with coverage
npm test -- --coverage

# Check coverage threshold
if [ -f coverage/coverage-summary.json ]; then
    coverage=$(jq '.total.lines.pct' coverage/coverage-summary.json)
    if [ "$(echo "$coverage < 70" | bc)" -eq 1 ]; then
        echo "Error: Coverage below 70%: $coverage%"
        exit 1
    fi
fi

echo "CI tests passed"
```

#### CD Deployment Script
```bash
#!/bin/sh
set -e

echo "Running CD deployment..."

# Build application
npm run build

# Run database migrations
./cli scaffold migrate-up

# Deploy to server
rsync -avz --delete dist/ user@server:/var/www/app/

# Restart services
ssh user@server 'systemctl restart app'

echo "Deployment complete"
```

## CLI Tips

### Useful Aliases
```bash
# Add to ~/.bashrc or ~/.zshrc

# GitMesh shortcuts
alias gm-dev='docker-compose up'
alias gm-test='npm test'
alias gm-lint='npm run lint'
alias gm-build='npm run build'
alias gm-logs='docker-compose logs -f'

# Git shortcuts
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline --graph'

# Docker shortcuts
alias dc='docker-compose'
alias dcu='docker-compose up'
alias dcd='docker-compose down'
alias dcl='docker-compose logs -f'
```

### Shell Functions
```bash
# Add to ~/.bashrc or ~/.zshrc

# Create new feature branch
gm-feature() {
    git checkout -b "feat/$1"
}

# Create new fix branch
gm-fix() {
    git checkout -b "fix/$1"
}

# Run tests for specific file
gm-test-file() {
    npm test -- "$1"
}

# Check service logs
gm-service-logs() {
    docker-compose logs -f "$1"
}
```

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
```bash
# 1. Update PRD
echo '{"tasks": [{"id": "T-1", "description": "Add validation", "status": "in_progress"}]}' > .vibe-memory/prd.json

# 2. Log to progress.txt
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Started: Adding validation" >> .vibe-memory/progress.txt

# 3. Do work, log attempts
echo "[Attempt 1] Tried X - FAILED: error" >> .vibe-memory/progress.txt
echo "[Attempt 2] Tried Y - SUCCESS" >> .vibe-memory/progress.txt

# 4. Update PRD when done
echo '{"tasks": [{"id": "T-1", "status": "completed"}]}' > .vibe-memory/prd.json

# 5. Clean failed attempts (keep only final solution)
```

**See `.vibe/core/memory-management.md` for complete workflow.**

### CLI Memory Workflow
```bash
# Check current task
cat .vibe-memory/prd.json

# Update progress
echo "[Attempt 1] Tried: ..." >> .vibe-memory/progress.txt

# Clean memory when starting new task
rm .vibe-memory/prd.json .vibe-memory/progress.txt
```

## Skills and Evaluations

### Skills
- Backend: `.vibe/skills/backend-engineer.md`
- Frontend: `.vibe/skills/frontend-engineer.md`
- DevOps: `.vibe/skills/devops-engineer.md`
- Security: `.vibe/skills/security-engineer.md`

### Evaluations
- Code Quality: `.vibe/evals/code-quality.md`
- Test Coverage: `.vibe/evals/test-coverage.md`
- Security: `.vibe/evals/security-scan.md`
- CE/EE: `.vibe/evals/ce-ee-separation.md`

## Quick Reference

### Common Commands
```bash
# Development
npm run dev              # Start dev server
npm test                 # Run tests
npm run lint             # Check style
npm run build            # Build

# Docker
docker-compose up        # Start services
docker-compose down      # Stop services
docker-compose logs -f   # Follow logs

# Database
./cli scaffold migrate-up    # Run migrations
./cli db-backup <name>       # Backup
./cli db-restore <name>      # Restore

# Git
git status               # Check status
git add .                # Stage changes
git commit -m "msg"      # Commit
git push                 # Push changes
```

### Script Checklist
- [ ] Shebang line (`#!/bin/sh`)
- [ ] Error handling (`set -e`)
- [ ] Undefined variable check (`set -u`)
- [ ] Usage documentation
- [ ] Input validation
- [ ] Logging functions
- [ ] Error messages
- [ ] Exit codes

## Resources

### Internal Documentation
- Architecture: `.vibe/core/architecture.md`
- Coding Style: `.vibe/core/coding-style.md`
- Security: `.vibe/core/security.md`
- Testing: `.vibe/core/testing.md`

### External Resources
- GitMesh Docs: https://docs.gitmesh.com
- Bash Guide: https://mywiki.wooledge.org/BashGuide
- POSIX Shell: https://pubs.opengroup.org/onlinepubs/9699919799/

## Summary

**Gemini CLI Strengths:**
- Terminal workflow automation
- Script generation
- CLI command assistance
- Batch operations

**Best For:**
- Writing automation scripts
- Creating deployment scripts
- Generating CLI commands
- Batch processing tasks

**Remember:**
- Use POSIX-compliant shell scripts
- Add error handling (`set -e`)
- Validate all inputs
- Log important operations
- Test scripts before use

**When in doubt:**
- Check script templates
- Review existing scripts
- Test in safe environment
- Use shellcheck for validation

Happy automating with Gemini CLI! 🚀
