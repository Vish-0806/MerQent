-- Initialize PostgreSQL Extensions for MerQent
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO merqent_user;
