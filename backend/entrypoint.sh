#!/bin/bash

set -e

echo "🚀 Starting Affable Backend Initialization..."

# Ensure environment variables are set
POSTGRES_DB=${POSTGRES_DB:-affdb}
POSTGRES_USER=${POSTGRES_USER:-affuser}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-affpass}

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
echo "   Using: postgres://${POSTGRES_USER}@postgres:5432/${POSTGRES_DB}"

# Simple wait mechanism using nc or timeout
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    retry_count=$((retry_count + 1))

    # Try to connect to PostgreSQL port
    if timeout 5 bash -c "cat </dev/null >>/dev/tcp/postgres/5432" 2>/dev/null; then
        echo "✓ PostgreSQL port is accessible"
        break
    fi

    if [ $retry_count -lt $max_retries ]; then
        echo "PostgreSQL not ready yet (attempt $retry_count/$max_retries)..."
        sleep 2
    fi
done

if [ $retry_count -eq $max_retries ]; then
    echo "⚠️  PostgreSQL not responding after $max_retries attempts"
    echo "   Continuing anyway - FastAPI will handle connection errors..."
    sleep 3
fi

echo "✓ PostgreSQL connection check complete"

# Check if migrations directory exists and run migrations
if [ -d "app/migrations" ]; then
    echo "🔄 Running database migrations..."
    alembic upgrade head || {
        echo "⚠️  Alembic migrations not available or failed, skipping..."
    }
else
    echo "ℹ️  No migrations directory found"
    # In development mode, create tables from ORM models
    if [ "$ENV" = "development" ] || [ -z "$ENV" ]; then
        echo "🔧 Creating database tables from ORM models..."
        python /app/scripts/init_db.py || {
            echo "⚠️  Could not initialize database tables"
        }
    fi
fi

# Initialize sample data if needed (optional)
if [ "$INIT_SAMPLE_DATA" = "true" ]; then
    echo "📊 Initializing sample data..."
    if [ -f "/app/scripts/seed_data.py" ]; then
        python /app/scripts/seed_data.py
    else
        echo "⚠️  Seed script not found, skipping sample data"
    fi
fi

echo "✓ Backend initialization complete!"
echo "🌐 Starting Uvicorn server on 0.0.0.0:8000..."

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
