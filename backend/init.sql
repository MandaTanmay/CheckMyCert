-- Initialize CheckMyCert database
CREATE DATABASE IF NOT EXISTS checkmycert;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
-- These will be created by Django migrations, but included for reference
