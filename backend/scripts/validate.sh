#!/bin/bash
# Pre-commit validation - code quality + tests
# Usage: bash scripts/validate.sh

set -e

cd "$(dirname "$0")/.."

echo "🔍 Running pre-commit validation..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track if any step failed
FAILED=0

# 1. Black formatting check
echo -n "📝 Checking code formatting with Black... "
if python -m black --check app/ 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "   Run: python -m black app/"
    FAILED=1
fi

# 2. Flake8 linting
echo -n "🐟 Checking code style with Flake8... "
if python -m flake8 app/ --max-line-length=100 --exclude=__pycache__ 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "   Run: python -m flake8 app/"
    FAILED=1
fi

# 3. MyPy type checking
echo -n "📦 Checking types with MyPy... "
if python -m mypy app/ --ignore-missing-imports 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "   Run: python -m mypy app/"
    FAILED=1
fi

# 4. isort import ordering
echo -n "📚 Checking import ordering with isort... "
if python -m isort --check-only app/ 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "   Run: python -m isort app/"
    FAILED=1
fi

# 5. Run tests
echo ""
echo "✅ Running tests..."
if python -m pytest -x --tb=short -q; then
    echo -e "${GREEN}Tests passed!${NC}"
else
    echo -e "${RED}Tests failed!${NC}"
    FAILED=1
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✨ All checks passed! Ready to commit.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please fix and try again.${NC}"
    exit 1
fi
