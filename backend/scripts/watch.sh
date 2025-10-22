#!/bin/bash
# Watch mode - automatically run tests on file changes
# Usage: bash scripts/watch.sh
# Requires: pip install pytest-watch

cd "$(dirname "$0")/.."

echo "👀 Starting test watch mode..."
echo "    Tests will run automatically on file changes"
echo "    Press Ctrl+C to exit"
echo ""

# Run pytest-watch with unit tests only
ptw -m "unit and not slow" -- -q

