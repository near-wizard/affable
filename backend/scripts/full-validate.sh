#!/bin/bash
# Full validation - comprehensive test with coverage
# Usage: bash scripts/full-validate.sh

set -e

cd "$(dirname "$0")/.."

echo "📊 Running full validation with coverage..."
echo ""

# Run all tests with coverage
python -m pytest \
  --cov=app \
  --cov-report=html \
  --cov-report=term-missing \
  --cov-branch \
  -v \
  --tb=short

echo ""
echo "✨ Full validation complete!"
echo ""
echo "📈 Coverage report generated in: htmlcov/index.html"
echo "   Open with: open htmlcov/index.html"
