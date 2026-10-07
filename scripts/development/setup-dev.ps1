# Run local development services: Docker PostgreSQL + Redis + MinIO
Write-Host "🚀 Starting MerQent Local Development Infrastructure..." -ForegroundColor Cyan
docker compose -f infrastructure/docker/docker-compose.yml up -d
Write-Host "✅ Containers active. Running Prisma DB migrations..." -ForegroundColor Green
pnpm run db:migrate
Write-Host "🌱 Seeding controlled taxonomies..." -ForegroundColor Green
pnpm run db:seed
Write-Host "✨ MerQent environment ready. Run 'pnpm dev' to launch web and api." -ForegroundColor Yellow
