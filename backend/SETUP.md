# Backend Setup Guide

Get your backend development environment ready for testing.

## Prerequisites

- Python 3.11+
- pip or poetry
- PostgreSQL 15+ (for full integration tests)
- Redis 7+ (for cache/async tasks)

## Quick Setup

### 1. Create Virtual Environment

```bash
cd backend

# Create venv
python -m venv venv

# Activate venv
# On macOS/Linux:
source venv/bin/activate

# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# On Windows (cmd):
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
# Install all dependencies (production + dev)
pip install -r requirements.txt -r requirements-dev.txt

# Or using the Makefile:
make install
```

### 3. Verify Installation

```bash
# Check pytest is installed
pytest --version

# List available tests
pytest --collect-only app/tests/test_tracking.py

# Run a quick test
pytest app/tests/test_tracking.py -v --collect-only
```

## Development Setup with Docker

If you prefer containerized development:

```bash
# From project root
docker-compose up -d

# Bash into backend container
docker-compose exec backend bash

# Inside container, tests run normally
pytest app/tests/test_tracking.py
```

## Configuration

### Environment Variables

Create or update `.env` in the backend directory:

```bash
# Copy from example
cp .env.example .env

# Edit .env with your settings
# For local development, defaults should work
```

### Database

For integration tests with real database:

```bash
# Ensure PostgreSQL is running
# Update DATABASE_URL in .env to your PostgreSQL connection

# Run migrations
alembic upgrade head

# Or use Docker:
docker-compose up -d postgres redis
```

## First Test Run

### Minimal (In-Memory Database)

```bash
# Unit tests use SQLite in-memory (no setup needed)
pytest -m unit -q

# Expected: Tests pass within seconds
```

### Full Setup (with PostgreSQL)

```bash
# Requires PostgreSQL running
pytest -v

# Coverage report
pytest --cov=app --cov-report=term-missing
```

## Using the Makefile

```bash
# Install dependencies
make install

# Run quick tests
make quick-test

# Run all tests
make test

# Full validation
make validate

# Watch mode (requires pytest-watch)
make watch
```

## Using the Scripts

```bash
# Quick unit tests only
bash scripts/quick-test.sh

# Full validation with coverage
bash scripts/full-validate.sh

# Pre-commit checks
bash scripts/validate.sh

# Watch mode
bash scripts/watch.sh
```

## Troubleshooting

### ImportError: No module named 'fastapi'

**Solution**: Install dependencies
```bash
pip install -r requirements.txt -r requirements-dev.txt
```

### pytest: command not found

**Solution**: Ensure venv is activated
```bash
# macOS/Linux
source venv/bin/activate

# Windows
.\venv\Scripts\activate
```

### Database connection errors

**Solution**: Use in-memory tests or configure PostgreSQL
```bash
# Use SQLite (in-memory) - works without PostgreSQL
pytest -m unit

# Or set DATABASE_URL in .env
export DATABASE_URL="postgresql://user:password@localhost/dbname"
pytest
```

### Redis connection errors

**Solution**: Start Redis or disable Redis tests
```bash
# Start Redis
redis-server

# Or configure in .env:
REDIS_URL=redis://localhost:6379/0
```

## Next Steps

1. **Read TESTING.md** for comprehensive testing guide
2. **See TEST_QUICK_REFERENCE.md** for common commands
3. **Check test_template.py** for examples of writing tests
4. **Run `make help`** to see all available commands

## Common Commands

```bash
# Run all tests with coverage
pytest --cov=app

# Run fast tests
pytest -m "unit and not slow"

# Run specific test
pytest app/tests/test_tracking.py::TestRedirectEndpoint::test_redirect_creates_click

# Code quality checks
make format      # Format code
make lint        # Check style
make type-check  # Type checking
make imports     # Sort imports

# All at once (pre-commit)
make validate
```
