<#
.SYNOPSIS
    MerQent Local Database Safe Reset Script (Windows / PowerShell)
.DESCRIPTION
    Safely resets the local PostgreSQL database, reapplies schema migrations,
    and reseeds canonical PMI taxonomies.
    Requires explicit confirmation (-Force) to guard against accidental data loss.
#>

[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "   MerQent — Local Database Reset Procedure" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

if (-not $Force) {
    Write-Warning "CAUTION: This will drop and recreate all tables in the database target specified by DATABASE_URL."
    Write-Host "To confirm immediately, run with: .\scripts\database\reset-db.ps1 -Force" -ForegroundColor DarkYellow
    Write-Host "Or enter 'YES' below to proceed:" -ForegroundColor Cyan
    $confirmation = Read-Host "Proceed with database reset? (Type 'YES')"
    if ($confirmation -ne "YES") {
        Write-Host "Reset aborted by user." -ForegroundColor Gray
        exit 0
    }
}

# Enforce fail-closed safety guard checks
Write-Host "`n[Safety Gate] Validating database target safety..." -ForegroundColor Cyan
node scripts/database/db-guard.js --force
if ($LASTEXITCODE -ne 0) {
    Write-Error "Safety guard check failed. Aborting database reset."
    exit 1
}

Write-Host "`n[1/3] Resetting schema via Prisma Migrate..." -ForegroundColor Cyan
pnpm prisma migrate reset --force --schema=prisma/schema.prisma

Write-Host "`n[2/3] Verifying database extensions..." -ForegroundColor Cyan
pnpm prisma:status

Write-Host "`n[3/3] Seeding canonical PMI taxonomies..." -ForegroundColor Cyan
pnpm prisma:seed

Write-Host "`n✔ Database reset, migrations, and seeding completed successfully." -ForegroundColor Green
