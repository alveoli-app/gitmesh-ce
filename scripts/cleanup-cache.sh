#!/usr/bin/env bash
# Cleanup script to remove problematic cache files

set -e

CLI_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_ROOT="$(dirname "$CLI_HOME")"

echo "Cleaning up cache files..."

# Remove old compiled JavaScript files from backend to force TypeScript recompilation
echo "  - Removing old compiled JavaScript files from backend..."
find "$PROJECT_ROOT/backend/src" -name "*.js" -type f -delete 2>/dev/null || true
find "$PROJECT_ROOT/backend/src" -name "*.js.map" -type f -delete 2>/dev/null || true

# Remove CubeJS cache files
# echo "  - Removing CubeJS cache files..."
find "$PROJECT_ROOT" -name ".cubestore" -type d -exec rm -rf {} + 2>/dev/null || true

# Clean pnpm cache
# echo "  - Cleaning pnpm cache..."
pnpm store prune 2>/dev/null || true

# Remove node_modules in problematic locations
# echo "  - Cleaning node_modules in services..."
find "$PROJECT_ROOT/services" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove any temporary files
# echo "  - Removing temporary files..."
find "$PROJECT_ROOT" -name "*.tmp" -type f -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name ".DS_Store" -type f -delete 2>/dev/null || true

echo "Cache cleanup completed!"