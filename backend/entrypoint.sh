#!/bin/bash
# Docker entrypoint script for the Affable backend
# This script:
# 1. Creates database tables if they don't exist
# 2. Seeds sample data if database is empty
# 3. Starts the FastAPI application

set -e

echo "========================================="
echo "Affable Backend - Entrypoint Script"
echo "========================================="

# Wait for database to be ready
echo "Waiting for database to be ready..."
python << 'PYTHON_EOF'
import sys
import time
from sqlalchemy import create_engine, text
from app.config import settings

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Database is ready!")
        break
    except Exception as e:
        retry_count += 1
        if retry_count >= max_retries:
            print(f"Failed to connect to database after {max_retries} retries")
            sys.exit(1)
        print(f"Database not ready, retrying... ({retry_count}/{max_retries})")
        time.sleep(2)
PYTHON_EOF

# Create database tables
echo ""
echo "Creating database tables..."
python << 'PYTHON_EOF'
from app.core.database import Base, engine
from app import models  # Import all models

Base.metadata.create_all(bind=engine)
print("Database tables created/verified!")
PYTHON_EOF

# Seed database with sample data
echo ""
echo "Seeding database with sample data..."
python scripts/seed_data.py

echo ""
echo "========================================="
echo "Starting FastAPI application..."
echo "========================================="
echo ""

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
