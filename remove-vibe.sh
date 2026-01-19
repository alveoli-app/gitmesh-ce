#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Removing Vibe Coding symlinks...${NC}\n"

# Remove root directory symlinks
echo -e "${YELLOW}Removing root directory symlinks...${NC}"
rm -f .cursorrules
rm -f .kirorules
rm -f .clinerules
rm -f .windsurfrules
rm -f .supermavenrules
rm -f .aider.conf.yml
rm -f .geminiconfig
rm -f .symlinks
echo -e "${GREEN}✓ Root symlinks removed${NC}"

# Remove GitHub Copilot symlink (keep .github directory)
echo -e "${YELLOW}Removing GitHub Copilot symlink...${NC}"
rm -f .github/copilot-instructions.md
echo -e "${GREEN}✓ GitHub Copilot symlink removed${NC}"

# Remove Cody symlink and directory
echo -e "${YELLOW}Removing Cody symlink and directory...${NC}"
rm -f .cody/context.json
rmdir .cody 2>/dev/null || echo -e "${BLUE}  (.cody directory not empty, keeping it)${NC}"
echo -e "${GREEN}✓ Cody symlink removed${NC}"

# Remove Continue.dev symlink and directory
echo -e "${YELLOW}Removing Continue.dev symlink and directory...${NC}"
rm -f .continue/config.json
rmdir .continue 2>/dev/null || echo -e "${BLUE}  (.continue directory not empty, keeping it)${NC}"
echo -e "${GREEN}✓ Continue.dev symlink removed${NC}"

echo -e "\n${GREEN}✨ All Vibe Coding symlinks removed${NC}"
echo -e "${BLUE}The .vibe/ directory and .vibe-memory/ are preserved.${NC}"
echo -e "${YELLOW}To restore symlinks, run: ./setup-vibe.sh${NC}\n"