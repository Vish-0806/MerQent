<#
.SYNOPSIS
    MerQent Local Development Environment Setup Script (Windows / PowerShell)
.DESCRIPTION
    Automates prerequisite verification, environment initialization, Docker infrastructure
    startup, Prisma Client generation, database migrations, and canonical taxonomy seeding.
#>

[CmdletBinding()]
param(
    [switch]$SkipDocker,
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   MerQent — Local Development Environment Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Verify Prerequisites
Write-Host "`n[1/6] Verifying system prerequisites..." -ForegroundColor Yellow

# Node.js
try {
    $nodeVersion = node -v
    $nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($nodeMajor -lt 20) {
        Write-Warning "Node.js 20+ required. Current: $nodeVersion"
    } else {
        Write-Host "  ✔ Node.js: $nodeVersion" -ForegroundColor Green
    }
} catch {
    Write-Error "Node.js is not installed or not in PATH. Please install Node.js 20 LTS."
}

# pnpm
try {
    $pnpmVersion = pnpm -v
    Write-Host "  ✔ pnpm: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Error "pnpm is not installed. Run: npm install -g pnpm@9.5.0"
}

# 2. Environment File Verification
Write-Host "`n[2/6] Verifying environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "  ℹ .env not found. Initializing from .env.example..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env"
    Write-Host "  ✔ Created .env template with safe defaults." -ForegroundColor Green
} else {
    Write-Host "  ✔ .env file present." -ForegroundColor Green
}

# 3. Install Monorepo Dependencies
Write-Host "`n[3/6] Installing monorepo dependencies via pnpm..." -ForegroundColor Yellow
pnpm install
Write-Host "  ✔ Dependencies up to date." -ForegroundColor Green

# 4. Docker Infrastructure
if (-not $SkipDocker) {
    Write-Host "`n[4/6] Verifying local Docker infrastructure..." -ForegroundColor Yellow
    try {
        $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✔ Docker daemon is running." -ForegroundColor Green
            Write-Host "  🚀 Starting PostgreSQL 16 + pgvector, Redis, and MinIO..." -ForegroundColor Cyan
            docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d
            Write-Host "  ✔ Infrastructure containers started." -ForegroundColor Green
        } else {
            Write-Warning "Docker daemon is not currently running. Skipping container startup."
            Write-Host "  ℹ If using Docker Desktop, start the application and re-run this script." -ForegroundColor Gray
        }
    } catch {
        Write-Warning "Could not connect to Docker. If running external PostgreSQL, ensure DATABASE_URL in .env is configured."
    }
} else {
    Write-Host "`n[4/6] Skipping Docker infrastructure (--SkipDocker specified)." -ForegroundColor Gray
}

# 5. Generate Prisma Client
Write-Host "`n[5/6] Generating Prisma Client..." -ForegroundColor Yellow
pnpm run db:generate
Write-Host "  ✔ Prisma Client generated successfully." -ForegroundColor Green

# 6. Apply Migrations and Seed
Write-Host "`n[6/6] Database migrations & taxonomy seed..." -ForegroundColor Yellow
try {
    Write-Host "  📦 Applying database migrations..." -ForegroundColor Cyan
    pnpm run db:migrate
    Write-Host "  ✔ Migrations applied." -ForegroundColor Green

    if (-not $SkipSeed) {
        Write-Host "  🌱 Seeding canonical PMI taxonomies..." -ForegroundColor Cyan
        pnpm run db:seed
        Write-Host "  ✔ Taxonomies seeded." -ForegroundColor Green
    }
} catch {
    Write-Warning "Database migration or seed could not connect to PostgreSQL."
    Write-Host "  ℹ Ensure PostgreSQL is running on the port specified in DATABASE_URL before seeding." -ForegroundColor Gray
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "✨ MerQent environment setup complete!" -ForegroundColor Green
Write-Host "Run 'pnpm dev' to launch web (http://localhost:3000) and api (http://localhost:4000/api/v1)." -ForegroundColor Yellow
Write-Host "OpenAPI docs available at: http://localhost:4000/api/docs" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
