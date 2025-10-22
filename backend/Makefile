.PHONY: help test quick-test validate full-validate watch format lint type-check imports clean install

help:
	@echo "Affable Backend Testing & Validation"
	@echo ""
	@echo "Quick Commands:"
	@echo "  make test           - Run all tests"
	@echo "  make quick-test     - Run fast unit tests only (~5 seconds)"
	@echo "  make validate       - Pre-commit validation (quality + tests)"
	@echo "  make full-validate  - Full validation with coverage report"
	@echo "  make watch          - Watch mode (auto-run tests on changes)"
	@echo ""
	@echo "Code Quality:"
	@echo "  make format         - Format code with black"
	@echo "  make lint           - Check code style with flake8"
	@echo "  make type-check     - Check types with mypy"
	@echo "  make imports        - Sort imports with isort"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean          - Remove test cache and build artifacts"
	@echo "  make install        - Install dev dependencies"
	@echo ""
	@echo "See TESTING.md for detailed documentation"

install:
	pip install -r requirements.txt -r requirements-dev.txt

test:
	pytest -v

quick-test:
	pytest -m "unit and not slow" -q --tb=short

validate:
	bash scripts/validate.sh

full-validate:
	bash scripts/full-validate.sh

watch:
	bash scripts/watch.sh

format:
	black app/

lint:
	flake8 app/ --max-line-length=100 --exclude=__pycache__

type-check:
	mypy app/ --ignore-missing-imports

imports:
	isort app/

clean:
	rm -rf .pytest_cache __pycache__ htmlcov .coverage .mypy_cache
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

# Development targets
dev-setup: install
	echo "Development environment ready!"
	echo "Run 'make help' for available commands"

dev: quick-test
	@echo "✅ Quick tests passed. Ready for development!"

# Pre-commit hook (can be used in .git/hooks/pre-commit)
pre-commit: validate
	@echo "✅ Ready to commit!"
