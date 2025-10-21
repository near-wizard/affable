-- Database Initialization Script
-- This runs first before schema.sql

-- Create database if not exists (run this manually if needed)
-- CREATE DATABASE affiliate_platform;

-- Connect to database
\c affable_postgres_prod;

-- Set timezone
SET timezone = 'UTC';

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types if needed
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'suspended', 'inactive', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully at %', NOW();
END $$;