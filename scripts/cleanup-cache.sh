#!/bin/bash

# Cleanup stale compiled JS files
echo "Cleaning up stale compiled JS files in services/libs..."
find ../services/libs -type f \( -name "*.js" -o -name "*.js.map" \) -not -path "*/node_modules/*" -delete

echo "Cleaning up stale compiled JS files in backend/src..."
find ../backend/src -type f \( -name "*.js" -o -name "*.js.map" \) -not -path "*/node_modules/*" -delete

echo "Cleanup complete."