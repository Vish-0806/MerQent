#!/usr/bin/env bash
# ====================================================================
# MerQent Local Development Environment Setup Script (POSIX / Bash)
# Automates prerequisite verification, environment initialization,
# Docker infrastructure startup, Prisma Client generation, and seeding.
# ====================================================================

set -euo pipefail

echo "============================================================"
echo "   MerQent — Local Development Environment Setup"
echo "============================================================"

# 1. Verify Prerequisites
echo ""
echo "[1/6] Verifying system prerequisites..."

if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is not installed. Please install Node.js 20 LTS."
    exit 1
fi
echo "  ✔ Node.js: $(node -v)"

if ! command -v pnpm >/dev/null 2>&1; then
    echo "❌ pnpm is not installed. Run: npm install -g pnpm@9.5.0"
    exit 1
fi
echo "  ✔ pnpm: $(pnpm -v)"

# 2. Environment File Verification
echo ""
echo "[2/6] Verifying environment configuration..."
if [ ! -f ".env" ]; then
    echo "  ℹ .env not found. Initializing from .env.example..."
    cp .env.example .env
    echo "  ✔ Created .env template with safe defaults."
else
    echo "  ✔ .env file present."
fi

# 3. Install Monorepo Dependencies
echo ""
echo "[3/6] Installing monorepo dependencies via pnpm..."
pnpm install
echo "  ✔ Dependencies up to date."

# 4. Docker Infrastructure
echo ""
echo "[4/6] Verifying local Docker infrastructure..."
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "  ✔ Docker daemon is running."
    echo "  🚀 Starting PostgreSQL 16 + pgvector, Redis, and MinIO..."
    docker compose -f infrastructure/docker/docker-compose.yml up -d
    echo "  ✔ Infrastructure containers started."
else
    echo "  ⚠ Docker daemon is not currently running. Skipping container startup."
    echo "  ℹ Ensure your database is accessible via DATABASE_URL in .env."
fi

# 5. Generate Prisma Client
echo ""
echo "[5/6] Generating Prisma Client..."
pnpm run db:generate
echo "  ✔ Prisma Client generated successfully."

# 6. Apply Migrations and Seed
echo ""
echo "[6/6] Database migrations & taxonomy seed..."
if pnpm run db:migrate; then
    echo "  ✔ Migrations applied."
    echo "  🌱 Seeding canonical PMI taxonomies..."
    pnpm run db:seed
    echo "  ✔ Taxonomies seeded."
else
    echo "  ⚠ Could not apply migrations. Ensure PostgreSQL is active on port 5432."
fi

echo ""
echo "============================================================"
echo "✨ MerQent environment setup complete!"
echo "Run 'pnpm dev' to launch web (http://localhost:3000) and api (http://localhost:4000/api/v1)."
echo "OpenAPI docs available at: http://localhost:4000/api/docs"
echo "============================================================"
