# Backend Testing and Deployment Guide

## Table of Contents
1. [Local Testing](#local-testing)
2. [Running Tests](#running-tests)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Deployment Options](#deployment-options)
5. [Production Setup](#production-setup)
6. [Monitoring & Maintenance](#monitoring--maintenance)

## Local Testing

### Prerequisites
```bash
# Ensure you have Python 3.9+
python --version

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### Environment Setup
Create `.env` file in backend directory:
```env
# Database
DATABASE_URL=sqlite:///./test.db

# Security
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API
API_VERSION=v1
API_HOST=0.0.0.0
API_PORT=8000

# Redis (optional, for production)
REDIS_URL=redis://localhost:6379/0

# Domain
TRACKING_DOMAIN=localhost:8000
WEBHOOK_DOMAIN=http://localhost:8000

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

### Local Development Server
```bash
# Run development server with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using make command
make dev

# Server will be available at http://localhost:8000
# API docs at http://localhost:8000/docs
```

## Running Tests

### Quick Test Run (Unit Tests Only)
```bash
# Fast feedback loop - unit tests only (~30 seconds)
pytest app/tests/ -m unit -v

# Or use make command
make quick-test
```

### Full Test Suite
```bash
# Run all tests (unit + integration + e2e)
pytest app/tests/ -v --tb=short

# Or use make command
make full-test
```

### Test by Category
```bash
# Unit tests only (no database)
pytest app/tests/ -m unit -v

# Integration tests (with database)
pytest app/tests/ -m integration -v

# End-to-end tests (full workflows)
pytest app/tests/ -m e2e -v

# Specific test file
pytest app/tests/test_commission_unit.py -v

# Specific test class
pytest app/tests/test_commission_unit.py::TestPercentageCommission -v

# Specific test
pytest app/tests/test_commission_unit.py::TestPercentageCommission::test_basic_percentage -v
```

### With Coverage Report
```bash
# Generate coverage report (HTML)
pytest app/tests/ --cov=app --cov-report=html

# View report
open htmlcov/index.html  # Mac
# or open htmlcov/index.html in browser

# Show coverage in terminal
pytest app/tests/ --cov=app --cov-report=term-missing
```

### Pre-Commit Validation
```bash
# Run linting, type checking, and formatting
bash scripts/validate.sh

# Or use make command
make validate

# This runs:
# - black (code formatting)
# - flake8 (linting)
# - mypy (type checking)
# - isort (import sorting)
# - pytest (tests)
```

### Watch Mode (Auto-run on changes)
```bash
# Automatically re-run tests when files change
bash scripts/watch.sh

# Or use make command
make watch
```

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing: `pytest app/tests/ -v`
- [ ] No linting errors: `flake8 app/`
- [ ] Code formatted: `black app/`
- [ ] Type hints valid: `mypy app/`
- [ ] Imports sorted: `isort app/`

### Security
- [ ] Update SECRET_KEY to random string
- [ ] Enable HTTPS in production
- [ ] Set CORS_ORIGINS to allowed domains only
- [ ] Review all API endpoints for auth
- [ ] Validate all user inputs
- [ ] Remove debug mode
- [ ] Check environment variables

### Database
- [ ] Database migrations run: `alembic upgrade head`
- [ ] Backup existing data
- [ ] Test database restore
- [ ] Verify connection string

### Dependencies
- [ ] All dependencies in requirements.txt
- [ ] No security vulnerabilities: `pip audit`
- [ ] Pin specific versions
- [ ] Test in clean environment

### Documentation
- [ ] API documentation updated
- [ ] Environment variables documented
- [ ] Deployment instructions clear
- [ ] Rollback procedure documented

### Performance
- [ ] Load testing done
- [ ] Query performance checked
- [ ] Caching strategy implemented
- [ ] Timeout values set

## Deployment Options

### Option 1: Docker (Recommended)

#### 1. Create Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 2. Create docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: .
    container_name: affable-backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/affable
      SECRET_KEY: ${SECRET_KEY}
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - ./app:/app/app  # For development only
    networks:
      - affable-network

  db:
    image: postgres:15-alpine
    container_name: affable-db
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: affable
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - affable-network

  redis:
    image: redis:7-alpine
    container_name: affable-redis
    networks:
      - affable-network

volumes:
  postgres_data:

networks:
  affable-network:
    driver: bridge
```

#### 3. Build and Run with Docker
```bash
# Build image
docker build -t affable-backend:latest .

# Run container
docker run -p 8000:8000 --env-file .env affable-backend:latest

# Or use docker-compose
docker-compose up -d

# View logs
docker logs affable-backend
docker-compose logs -f

# Stop containers
docker-compose down
```

### Option 2: Traditional Deployment (VPS/Server)

#### 1. Setup Server
```bash
# SSH into server
ssh user@your-server.com

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and dependencies
sudo apt install python3.11 python3.11-venv python3.11-dev
sudo apt install postgresql postgresql-contrib
sudo apt install redis-server
sudo apt install nginx
sudo apt install supervisor  # For process management

# Create app directory
sudo mkdir -p /var/www/affable
sudo chown $USER:$USER /var/www/affable
cd /var/www/affable
```

#### 2. Clone Repository
```bash
git clone <your-repo-url> .
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 3. Setup Environment
```bash
# Create .env file
nano .env
# Add production environment variables

# Test the application
python -m pytest app/tests/ -v
```

#### 4. Configure Supervisor (Process Management)
Create `/etc/supervisor/conf.d/affable.conf`:
```ini
[program:affable-backend]
directory=/var/www/affable/backend
command=/var/www/affable/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
autostart=true
autorestart=true
user=www-data
environment=PATH="/var/www/affable/backend/venv/bin"
redirect_stderr=true
stdout_logfile=/var/log/affable/backend.log
```

```bash
# Enable supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start affable-backend
```

#### 5. Configure Nginx (Reverse Proxy)
Create `/etc/nginx/sites-available/affable`:
```nginx
upstream affable_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.affable.link;

    client_max_body_size 20M;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.affable.link;

    ssl_certificate /etc/letsencrypt/live/api.affable.link/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.affable.link/privkey.pem;

    client_max_body_size 20M;

    location / {
        proxy_pass http://affable_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /static/ {
        alias /var/www/affable/backend/static/;
        expires 30d;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/affable /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Setup SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.affable.link
```

### Option 3: Platform-as-a-Service (Easiest)

#### Heroku Deployment
```bash
# 1. Install Heroku CLI
# From: https://devcenter.heroku.com/articles/heroku-cli

# 2. Login
heroku login

# 3. Create app
heroku create affable-backend

# 4. Set environment variables
heroku config:set SECRET_KEY="your-secret-key" --app affable-backend
heroku config:set DATABASE_URL="postgresql://..." --app affable-backend

# 5. Deploy
git push heroku main

# 6. View logs
heroku logs --tail --app affable-backend

# 7. Run migrations
heroku run "alembic upgrade head" --app affable-backend
```

Create `Procfile`:
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

#### Railway.app Deployment
```bash
# 1. Create account at railway.app
# 2. Install Railway CLI
npm i -g @railway/cli

# 3. Connect repository
railway init

# 4. Set environment variables in dashboard
# 5. Deploy automatically from git
```

#### DigitalOcean App Platform
```bash
# 1. Create account at digitalocean.com
# 2. Create new app
# 3. Connect GitHub repository
# 4. Configure environment variables
# 5. Deploy with one click
```

## Production Setup

### Database Configuration
```bash
# For PostgreSQL (production recommended)
DATABASE_URL=postgresql://user:password@db.example.com:5432/affable

# Connection pooling
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10
```

### Security Configuration
```env
# Update all these for production
SECRET_KEY=<generate-with: python -c "import secrets; print(secrets.token_urlsafe(32))">
ALLOWED_ORIGINS=https://app.affable.link,https://www.affable.link
CORS_ALLOW_CREDENTIALS=true

# API Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60  # seconds

# Security Headers
FORCE_HTTPS=true
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=true
```

### Performance Configuration
```env
# Caching
REDIS_URL=redis://redis.example.com:6379/0
CACHE_TTL=3600

# Worker processes
WORKERS=4  # (2 × CPU cores) + 1

# Request timeout
REQUEST_TIMEOUT=60
KEEPALIVE_TIMEOUT=5
```

### Logging Configuration
```python
# Add to app/main.py for production logging
import logging
from pythonjsonlogger import jsonlogger

logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)
```

## Monitoring & Maintenance

### Health Checks
```bash
# Add health check endpoint
curl http://localhost:8000/health

# Automated monitoring
curl -f http://api.affable.link/health || notify_admin
```

### Logging
```bash
# View logs (Docker)
docker-compose logs -f backend

# View logs (VPS/Supervisor)
tail -f /var/log/affable/backend.log

# View logs (Heroku)
heroku logs --tail --app affable-backend
```

### Backup Strategy
```bash
# Daily database backups
0 2 * * * pg_dump affable > /backups/affable_$(date +\%Y\%m\%d).sql

# Upload to cloud storage
aws s3 cp /backups/affable_*.sql s3://your-bucket/backups/
```

### Monitoring & Alerts
Setup monitoring with:
- **Datadog** - Application performance monitoring
- **Sentry** - Error tracking
- **New Relic** - Performance monitoring
- **CloudWatch** - AWS monitoring
- **Prometheus** - Metrics collection

### Database Maintenance
```bash
# Regular maintenance
VACUUM ANALYZE;
REINDEX DATABASE affable;

# Monitor slow queries
log_min_duration_statement = 1000;  # log queries > 1 second
```

### Updates & Patching
```bash
# Check for dependency updates
pip list --outdated

# Update dependencies safely
pip install --upgrade -r requirements.txt

# Run tests after updates
pytest app/tests/ -v

# Deploy updates
git push origin main
```

## Rollback Procedure

### If Deployment Fails
```bash
# Docker: Roll back to previous image
docker run -p 8000:8000 affable-backend:previous

# Git: Revert commit
git revert HEAD
git push origin main

# Heroku: Rollback release
heroku releases --app affable-backend
heroku rollback v10 --app affable-backend
```

## Production Checklist

Before going live:
- [ ] Tests passing on production database
- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Error tracking enabled
- [ ] Logging configured
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Database migrations applied
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Incident response plan ready
- [ ] Rollback procedure tested

## Common Issues

### Port Already in Use
```bash
# Find process using port
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Database Connection Issues
```bash
# Test connection
psql postgresql://user:password@host:5432/dbname

# Check Django ORM connection
python manage.py dbshell
```

### Memory Issues
```bash
# Increase worker memory
# In docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 1G
```

### Permission Denied
```bash
# Fix file permissions
sudo chown -R www-data:www-data /var/www/affable
sudo chmod -R 755 /var/www/affable
```

## Support & Debugging

### Enable Debug Logging
```env
LOG_LEVEL=DEBUG
SQLALCHEMY_ECHO=true
```

### Performance Profiling
```python
# Add to main.py
from pyinstrument import Profiler

profiler = Profiler()
profiler.start()
# ... run code ...
profiler.stop()
print(profiler.output_text(unicode=True, color=True))
```

### Get Help
- Check logs: `docker-compose logs -f`
- Run tests: `pytest app/tests/ -v`
- Check dependencies: `pip list`
- Review commits: `git log --oneline -10`

---

**For questions or issues, see: `backend/TESTING_SUMMARY.txt` and `backend/test_results.RESULTS`**
