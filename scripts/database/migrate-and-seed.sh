#!/usr/bin/env bash
set -euo pipefail

echo "📦 Applying Prisma Database Migrations..."
pnpm --filter @merqent/api run prisma:migrate

echo "🌱 Seeding Database Taxonomies..."
pnpm --filter @merqent/api run prisma:seed

echo "✅ Database migration and seeding completed."
