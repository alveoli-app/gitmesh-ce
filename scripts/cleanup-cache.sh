#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Cleanup CubeJS store (requires root permissions usually)
echo "Cleaning up CubeJS store..."
if [ -d "$PROJECT_ROOT/services/libs/cubejs/.cubestore" ]; then
    # Use docker to remove root-owned files
    docker run --rm -v "$PROJECT_ROOT/services/libs/cubejs:/work" alpine rm -rf /work/.cubestore
fi

# Cleanup stale compiled JS files
echo "Cleaning up stale compiled JS files in services/libs..."
if [ -d "$PROJECT_ROOT/services/libs" ]; then
    find "$PROJECT_ROOT/services/libs" -type f \( -name "*.js" -o -name "*.js.map" \) -not -path "*/node_modules/*" -not -path "*/cubejs/*" -delete
fi

echo "Cleaning up stale compiled JS files in backend/src..."
if [ -d "$PROJECT_ROOT/backend/src" ]; then
    find "$PROJECT_ROOT/backend/src" -type f \( -name "*.js" -o -name "*.js.map" \) -not -path "*/node_modules/*" -not -path "*/database/migrations/*" -delete
fi

echo "Cleanup complete."