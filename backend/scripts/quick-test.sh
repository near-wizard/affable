#!/bin/bash
# Quick test run - unit tests only (fast validation)
# Usage: bash scripts/quick-test.sh

set -e

cd "$(dirname "$0")/.."

echo "⚡ Running quick unit tests..."
echo ""

# Run only unit tests, exclude slow tests
python -m pytest -m "unit and not slow" -q --tb=short

echo ""
echo "✅ Quick tests passed!"
