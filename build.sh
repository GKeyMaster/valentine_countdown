#!/bin/bash
set -e

echo "Starting build process..."

# Make sure node_modules/.bin is in PATH
export PATH="$PWD/node_modules/.bin:$PATH"

# Try different approaches to run vite
if command -v vite &> /dev/null; then
    echo "Using vite from PATH"
    vite build
elif [ -f "node_modules/.bin/vite" ]; then
    echo "Using vite from node_modules/.bin"
    chmod +x node_modules/.bin/vite
    ./node_modules/.bin/vite build
elif [ -f "build.js" ]; then
    echo "Using custom Node.js build script"
    node build.js
else
    echo "Fallback: using npx"
    npx vite build
fi

echo "Build completed successfully!"