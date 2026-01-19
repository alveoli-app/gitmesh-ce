#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up Vibe Coding environment...${NC}\n"
echo -e "${YELLOW}Vibe coding is about speed and flow — but never at the cost of security or stability.${NC}"
echo -e "${YELLOW}Please vibe code responsibly: don't break existing features, and don't weaken security.${NC}\n"

# Create .vibe directory structure if it doesn't exist
if [ ! -d ".vibe" ]; then
    echo -e "${YELLOW}Creating .vibe directory for shared AI config...${NC}"
    mkdir -p .vibe
fi

# Create .vibe subdirectories for modular structure
echo -e "${YELLOW}Creating .vibe subdirectories...${NC}"
mkdir -p .vibe/core
mkdir -p .vibe/skills/prd
mkdir -p .vibe/evals
mkdir -p .vibe/context
mkdir -p .vibe/ide-configs
echo -e "${GREEN}✓ Created .vibe modular structure${NC}"

# Create necessary IDE subdirectories
mkdir -p .github
mkdir -p .cody
mkdir -p .continue

# Create .vibe-memory directory for task-scoped memory
if [ ! -d ".vibe-memory" ]; then
    echo -e "${YELLOW}Creating .vibe-memory directory for task-scoped memory...${NC}"
    mkdir -p .vibe-memory
    echo -e "${GREEN}✓ Created .vibe-memory directory${NC}"
fi

# Auto-initialize prd.json from basic template if missing
if [ ! -f ".vibe-memory/prd.json" ]; then
    echo -e "${YELLOW}Initializing .vibe-memory/prd.json...${NC}"
    cat > .vibe-memory/prd.json << 'PRDJSON'
{
  "title": "Current Task Name",
  "description": "Brief description of what you're working on",
  "created_at": "",
  "tasks": [
    {
      "id": "T-1",
      "description": "Specific task to complete",
      "status": "not_started",
      "notes": "Current approach or blockers"
    }
  ]
}
PRDJSON
    # Update the created_at timestamp
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    if command -v sed &> /dev/null; then
        sed -i "s/\"created_at\": \"\"/\"created_at\": \"$TIMESTAMP\"/" .vibe-memory/prd.json
    fi
    echo -e "${GREEN}✓ Created .vibe-memory/prd.json${NC}"
    echo -e "${BLUE}  Edit this file to track your current task${NC}"
fi

# Auto-initialize progress.txt with header if missing
if [ ! -f ".vibe-memory/progress.txt" ]; then
    echo -e "${YELLOW}Initializing .vibe-memory/progress.txt...${NC}"
    cat > .vibe-memory/progress.txt << 'PROGRESSTXT'
# Current Work Progress
# =====================
# This file tracks debugging attempts and learnings for the ACTIVE TASK ONLY
# 
# MEMORY MANAGEMENT RULES:
# ------------------------
# 1. When starting NEW UNRELATED work:
#    - AI will ask: "This seems unrelated to [current task]. Clean previous memory?"
#    - If YES: Clear this file and prd.json, start fresh
#    - If NO: Keep existing memory, add new context
#
# 2. While debugging:
#    - Log ONLY failed attempts and errors
#    - Format: [Attempt N] Tried: X, Result: FAILED/SUCCESS, Error: Y
#
# 3. When solution works:
#    - Remove all failed attempts
#    - Keep only final working solution
#    - Mark as [CLEANED]
#
# 4. Keep this file MINIMAL and relevant to current task only
#
# 5. NO EXTRA MARKDOWN FILES:
#    - Do NOT create SUMMARY.md, NOTES.md, CHANGES.md, etc.
#    - All context lives in prd.json and progress.txt ONLY
#
# =====================
# Progress entries start below:
# =====================

PROGRESSTXT
    echo -e "${GREEN}✓ Created .vibe-memory/progress.txt with instructions${NC}"
    echo -e "${BLUE}  This file will track your debugging attempts${NC}"
fi

# Function to create symlink safely
create_symlink() {
    local source=$1
    local target=$2
    
    # Remove existing file/symlink if it exists
    if [ -e "$target" ] || [ -L "$target" ]; then
        echo -e "${YELLOW}Removing existing $target to refresh link...${NC}"
        rm -f "$target"
    fi
    
    # Create symlink
    ln -sf "$source" "$target"
    echo -e "${GREEN}✓ Linked:${NC} $target → $source"
}

echo -e "\n${BLUE}Creating symlinks for AI tooling configs...${NC}\n"

# Cursor IDE
create_symlink ".vibe/ide-configs/cursor.md" ".cursorrules"

# Kiro IDE
create_symlink ".vibe/ide-configs/kiro.md" ".kirorules"

# Claude Code / Cline
create_symlink ".vibe/ide-configs/cline.md" ".clinerules"

# Windsurf IDE
create_symlink ".vibe/ide-configs/windsurf.md" ".windsurfrules"

# Supermaven
create_symlink ".vibe/ide-configs/supermaven.md" ".supermavenrules"

# Aider (YAML format)
create_symlink ".vibe/ide-configs/aider.yml" ".aider.conf.yml"

# GitHub Copilot
create_symlink "../.vibe/ide-configs/copilot.md" ".github/copilot-instructions.md"

# Sourcegraph Cody (JSON format)
create_symlink "../.vibe/ide-configs/cody.json" ".cody/context.json"

# Continue.dev (JSON format)
create_symlink "../.vibe/ide-configs/continue.json" ".continue/config.json"

# Gemini CLI
create_symlink ".vibe/ide-configs/gemini.md" ".geminiconfig"

# Create .symlinks documentation file
echo -e "\n${BLUE}Creating .symlinks documentation...${NC}"
cat > .symlinks << 'EOF'
# Vibe Coding Symlinks Reference
# This file is auto-generated by setup-vibe.sh
# DO NOT COMMIT - listed in .gitignore

========================================
ACTIVE SYMLINKS FOR AI CODING TOOLS
========================================

Root Directory Symlinks:
------------------------
.cursorrules          -> .vibe/ide-configs/cursor.md       [Cursor IDE]
.kirorules            -> .vibe/ide-configs/kiro.md         [Kiro IDE]
.clinerules           -> .vibe/ide-configs/cline.md        [Claude Code/Cline]
.windsurfrules        -> .vibe/ide-configs/windsurf.md     [Windsurf IDE]
.supermavenrules      -> .vibe/ide-configs/supermaven.md   [Supermaven]
.aider.conf.yml       -> .vibe/ide-configs/aider.yml       [Aider]
.geminiconfig         -> .vibe/ide-configs/gemini.md       [Gemini CLI]

Subdirectory Symlinks:
---------------------
.github/copilot-instructions.md  -> ../.vibe/ide-configs/copilot.md   [GitHub Copilot]
.cody/context.json               -> ../.vibe/ide-configs/cody.json    [Sourcegraph Cody]
.continue/config.json            -> ../.vibe/ide-configs/continue.json [Continue.dev]

========================================
VIBE SYSTEM STRUCTURE
========================================

.vibe/
├── core/                    # Shared base configurations
│   ├── architecture.md      # System architecture
│   ├── coding-style.md      # Language-specific style guides
│   ├── ce-ee-boundaries.md  # CE/EE separation rules
│   ├── security.md          # Security best practices
│   ├── testing.md           # Testing strategies
│   └── memory-management.md # Task-scoped memory rules
├── skills/                  # Engineering personas
│   ├── backend-engineer.md
│   ├── frontend-engineer.md
│   ├── ml-engineer.md
│   ├── devops-engineer.md
│   ├── security-engineer.md
│   ├── bug-finder.md
│   ├── optimizer.md
│   ├── tester.md
│   └── prd/
│       ├── task-tracker.md
│       └── context-cleaner.md
├── evals/                   # Quality validation
│   ├── code-quality.md
│   ├── test-coverage.md
│   ├── security-scan.md
│   ├── performance.md
│   └── ce-ee-separation.md
├── context/                 # Domain-specific context
│   ├── backend-context.md
│   ├── frontend-context.md
│   ├── services-context.md
│   └── infrastructure-context.md
└── ide-configs/             # IDE-specific configs
    ├── cursor.md
    ├── kiro.md
    ├── cline.md
    ├── windsurf.md
    ├── supermaven.md
    ├── aider.yml
    ├── copilot.md
    ├── cody.json
    ├── continue.json
    └── gemini.md

.vibe-memory/                # Task-scoped memory (gitignored)
├── prd.json                 # Current task tracking
└── progress.txt             # Debugging attempts log

========================================
TROUBLESHOOTING
========================================

Check if symlinks exist:
  ls -la | grep "^l"

Verify a specific symlink:
  readlink .cursorrules

Re-create all symlinks:
  ./setup-vibe.sh

Manual symlink creation:
  ln -sf .vibe/ide-configs/cursor.md .cursorrules

========================================
HOW IT WORKS
========================================

1. Real configs live in .vibe/ (version controlled)
2. Symlinks created locally (NOT version controlled)
3. AI tools read from symlinks -> .vibe/ configs
4. Edit .vibe/ files, changes apply everywhere
5. Each IDE config includes references to core/, skills/, evals/, context/

========================================
Generated: $(date)
========================================
EOF

echo -e "${GREEN}✓ Created .symlinks reference file${NC}"

# Create .gitignore entry to ignore symlinks but keep .vibe/
if ! grep -q "# Vibe Coding Symlinks" .gitignore 2>/dev/null; then
    echo -e "\n${BLUE}Updating .gitignore for Vibe Coding symlinks...${NC}"
    cat >> .gitignore << 'EOF'

# Vibe Coding Symlinks (actual configs are in .vibe/)
.symlinks
.cursorrules
.kirorules
.clinerules
.windsurfrules
.supermavenrules
.aider.conf.yml
.geminiconfig
.github/copilot-instructions.md
.cody/context.json
.continue/config.json

# Vibe Memory (task-scoped, not version-controlled)
.vibe-memory/
EOF
    echo -e "${GREEN}✓ .gitignore updated${NC}"
fi

echo -e "\n${GREEN}✨ Vibe Coding setup complete!${NC}"
echo -e "${BLUE}Your AI tools now read shared configurations from the .vibe/ directory.${NC}"
echo -e "${YELLOW}Edit files in .vibe/ to update behavior across all AI tools — and remember:${NC}"
echo -e "${YELLOW}vibe fast, but code responsibly: protect security, respect tests, and avoid breaking users.${NC}\n"

# List all created symlinks
echo -e "${BLUE}Created symlinks:${NC}"
ls -la | grep "^l" | grep -E "\.(cursorrules|clinerules|windsurfrules|supermavenrules|aider)" || echo "  (checking root directory)"
ls -la .github/ 2>/dev/null | grep "^l" || true
ls -la .cody/ 2>/dev/null | grep "^l" || true
ls -la .continue/ 2>/dev/null | grep "^l" || true

echo -e "\n${GREEN}Happy vibe coding — responsibly. ${NC}\n"

# Red color for warnings
echo -e "${RED}To remove all Vibe symlinks, run: ./remove-vibe.sh${NC}"