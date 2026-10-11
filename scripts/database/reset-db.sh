#!/usr/bin/env bash
# ====================================================================
# MerQent Local Database Safe Reset Script (POSIX / Bash)
# Safely resets the local PostgreSQL database, reapplies schema migrations,
# and reseeds canonical PMI taxonomies.
# Requires explicit confirmation (--force) to guard against accidental data loss.
# ====================================================================

set -euo pipefail

FORCE=false
for arg in "$@"; do
    if [ "$arg" == "--force" ] || [ "$arg" == "-f" ]; then
        FORCE=true
    fi
done

echo "============================================================"
echo "   MerQent — Local Database Reset Procedure"
echo "============================================================"

if [ "$FORCE" != "true" ]; then
    echo "⚠️  CAUTION: This will drop and recreate all tables in the database target specified by DATABASE_URL."
    echo "To confirm immediately, run with: ./scripts/database/reset-db.sh --force"
    read -r -p "Proceed with database reset? (Type 'YES'): " confirmation
    if [ "$confirmation" != "YES" ]; then
        echo "Reset aborted by user."
        exit 0
    fi
fi

echo ""
echo "[1/3] Resetting schema via Prisma Migrate..."
pnpm prisma migrate reset --force --schema=prisma/schema.prisma

echo ""
echo "[2/3] Verifying database extensions..."
pnpm prisma:status

echo ""
echo "[3/3] Seeding canonical PMI taxonomies..."
pnpm prisma:seed

echo ""
echo "✔ Database reset, migrations, and seeding completed successfully."
