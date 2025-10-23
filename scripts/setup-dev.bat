@echo off
REM Affable Development Setup Script for Windows
REM This script sets up the complete development environment with Docker Compose and frontend

setlocal enabledelayedexpansion

REM Colors (using standard Windows cmd colors)
REM No color support in standard cmd, but we can use basic output

echo ================================
echo Affable Development Environment Setup
echo ================================
echo.

REM Check prerequisites
echo Checking Prerequisites...

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not installed
    echo Please install Docker from https://docs.docker.com/install/
    exit /b 1
)
echo [OK] Docker is installed

REM Check Docker Compose
where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker Compose is not installed
    echo Please install Docker Compose
    exit /b 1
)
echo [OK] Docker Compose is installed

REM Check Docker daemon is running
docker ps >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker daemon is not running
    echo Please start Docker Desktop
    exit /b 1
)
echo [OK] Docker daemon is running

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Node.js is not installed (required for frontend)
) else (
    echo [OK] Node.js is installed
)

REM Get project root
cd /d "%~dp0\.."
set PROJECT_ROOT=%CD%

echo [OK] Working in: %PROJECT_ROOT%
echo.

echo ================================
echo Setting Up Environment
echo ================================

REM Use .env.dev directly if it exists, otherwise prepare it
if exist "%PROJECT_ROOT%\.env.dev" (
    echo [OK] .env.dev already exists
) else if exist "%PROJECT_ROOT%\.env.local" (
    echo [OK] Using .env.local as environment file
    copy "%PROJECT_ROOT%\.env.local" "%PROJECT_ROOT%\.env.dev" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Created .env.dev from .env.local
    ) else (
        echo WARNING: Could not copy .env.local to .env.dev, continuing anyway
    )
) else if exist "%PROJECT_ROOT%\.env.example" (
    echo [OK] Using .env.example as environment file
    copy "%PROJECT_ROOT%\.env.example" "%PROJECT_ROOT%\.env.dev" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo WARNING: Created .env.dev from .env.example (please update with actual values)
    ) else (
        echo WARNING: Could not copy .env.example to .env.dev, continuing anyway
    )
) else (
    echo ERROR: No environment file found in %PROJECT_ROOT%
    echo Searched for: .env.dev, .env.local, or .env.example
    exit /b 1
)

echo.
echo ================================
echo Building Docker Images
echo ================================

echo Building backend image (this may take a few minutes)...
call docker-compose build backend
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build backend image
    exit /b 1
)
echo [OK] Backend image built successfully

echo.
echo ================================
echo Starting Services
echo ================================

echo Starting PostgreSQL...
call docker-compose up -d postgres

echo Starting Redis...
call docker-compose up -d redis

echo Starting Backend...
call docker-compose up -d backend

echo Waiting for services to be ready...
timeout /t 5 /nobreak

echo.
echo ================================
echo Verifying Services
echo ================================

REM Check services
docker-compose ps | find "postgres" | find "healthy" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] PostgreSQL is healthy
) else (
    echo WARNING: PostgreSQL status unknown
)

docker-compose ps | find "redis" | find "healthy" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Redis is healthy
) else (
    echo WARNING: Redis status unknown
)

docker-compose ps | find "backend" | find "Up" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend is running
) else (
    echo ERROR: Backend failed to start
    echo Check logs with: docker-compose logs backend
)

echo.
echo ================================
echo Setting Up Frontend
echo ================================

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Frontend dependencies installed
    ) else (
        echo WARNING: Failed to install frontend dependencies
        echo Try running: cd frontend ^&^& npm install
    )
    cd ..
) else (
    echo [OK] Frontend dependencies already installed
)

if not exist "frontend\.env.local" (
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:8000/api
    ) > "frontend\.env.local"
    echo [OK] Created frontend/.env.local
) else (
    echo [OK] frontend/.env.local already exists
)

echo.
echo ================================
echo Setup Complete!
echo ================================
echo.
echo Next steps:
echo.
echo 1. Start Frontend ^(in a new terminal^):
echo    cd frontend ^&^& npm run dev
echo.
echo 2. Open in your browser:
echo    http://localhost:3000
echo.
echo 3. API documentation:
echo    http://localhost:8000/docs
echo.
echo Useful commands:
echo    View logs:        docker-compose logs -f
echo    Stop services:    docker-compose down
echo    Database shell:   docker-compose exec postgres psql -U affuser -d affdb
echo    Redis CLI:        docker-compose exec redis redis-cli
echo.
echo For detailed setup information, see CLAUDE/DOCKER_SETUP_GUIDE.md
echo.

endlocal
