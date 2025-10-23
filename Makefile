.PHONY: help setup build up down logs logs-backend logs-postgres logs-redis \
        shell-backend shell-db shell-redis db-backup db-restore test lint format \
        clean reset stop start restart status

help:
	@echo "Affable Development Commands"
	@echo "============================"
	@echo ""
	@echo "Setup & Initialization:"
	@echo "  make setup          - Complete setup with environment, build, and start"
	@echo "  make build          - Build backend Docker image"
	@echo ""
	@echo "Service Management:"
	@echo "  make up             - Start all services (PostgreSQL, Redis, Backend)"
	@echo "  make down           - Stop all services (keeps data)"
	@echo "  make down-reset     - Stop all services and delete all data"
	@echo "  make start          - Start services (alias for 'up')"
	@echo "  make stop           - Stop services (alias for 'down')"
	@echo "  make restart        - Restart all services"
	@echo "  make status         - Show service status"
	@echo ""
	@echo "Logs & Monitoring:"
	@echo "  make logs           - View logs from all services"
	@echo "  make logs-backend   - View logs from backend only"
	@echo "  make logs-postgres  - View logs from PostgreSQL only"
	@echo "  make logs-redis     - View logs from Redis only"
	@echo ""
	@echo "Shell Access:"
	@echo "  make shell-backend  - Access backend container shell"
	@echo "  make shell-db       - Connect to PostgreSQL database"
	@echo "  make shell-redis    - Connect to Redis CLI"
	@echo ""
	@echo "Database Management:"
	@echo "  make db-backup      - Backup PostgreSQL database to backup.sql"
	@echo "  make db-restore     - Restore PostgreSQL database from backup.sql"
	@echo ""
	@echo "Code Quality:"
	@echo "  make test           - Run backend tests"
	@echo "  make lint           - Run code linting"
	@echo "  make format         - Format code"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean          - Remove unused Docker resources"
	@echo "  make reset          - Complete reset (stop, remove volumes, rebuild)"
	@echo "  make help           - Show this help message"
	@echo ""

# Setup & Initialization
setup:
	@echo "Setting up Affable development environment..."
	@if [ -f .env.local ]; then cp .env.local .env.dev; fi
	@if [ ! -f .env.dev ]; then cp .env.example .env.dev; fi
	@chmod +x backend/entrypoint.sh 2>/dev/null || true
	@docker-compose build backend
	@docker-compose up -d
	@echo ""
	@echo "✓ Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Start frontend: cd frontend && npm install && npm run dev"
	@echo "  2. Open http://localhost:3000 in your browser"
	@echo "  3. View logs: make logs"
	@echo ""

# Service Management
build:
	@echo "Building backend Docker image..."
	@docker-compose build backend

up:
	@echo "Starting services..."
	@docker-compose up -d
	@echo "✓ Services started"
	@make status

down:
	@echo "Stopping services..."
	@docker-compose down
	@echo "✓ Services stopped"

down-reset:
	@echo "Stopping services and removing data..."
	@docker-compose down -v
	@echo "✓ Services stopped and volumes removed"

start: up

stop: down

restart:
	@echo "Restarting services..."
	@docker-compose restart
	@echo "✓ Services restarted"
	@make status

status:
	@docker-compose ps

# Logs & Monitoring
logs:
	@docker-compose logs -f

logs-backend:
	@docker-compose logs -f backend

logs-postgres:
	@docker-compose logs -f postgres

logs-redis:
	@docker-compose logs -f redis

# Shell Access
shell-backend:
	@docker-compose exec backend bash

shell-db:
	@docker-compose exec postgres psql -U affuser -d affdb

shell-redis:
	@docker-compose exec redis redis-cli

# Database Management
db-backup:
	@echo "Backing up database..."
	@docker-compose exec -T postgres pg_dump -U affuser affdb > backup.sql
	@echo "✓ Database backed up to backup.sql"

db-restore:
	@if [ -f backup.sql ]; then \
		echo "Restoring database from backup.sql..."; \
		docker-compose exec -T postgres psql -U affuser affdb < backup.sql; \
		echo "✓ Database restored"; \
	else \
		echo "Error: backup.sql not found"; \
		exit 1; \
	fi

# Code Quality
test:
	@echo "Running tests..."
	@docker-compose exec backend pytest -v

lint:
	@echo "Running linting..."
	@docker-compose exec backend flake8 app/

format:
	@echo "Formatting code..."
	@docker-compose exec backend black app/
	@docker-compose exec backend isort app/

# Utilities
clean:
	@echo "Cleaning up Docker resources..."
	@docker system prune -f
	@echo "✓ Cleanup complete"

reset: down-reset build
	@echo "✓ Complete reset done"
	@echo "Run 'make up' to start fresh"

# Quick access
.DEFAULT_GOAL := help
