Write-Host "📦 Applying Prisma Database Migrations..." -ForegroundColor Cyan
pnpm --filter @merqent/api run prisma:migrate
Write-Host "🌱 Seeding Database Taxonomies..." -ForegroundColor Cyan
pnpm --filter @merqent/api run prisma:seed
Write-Host "✅ Database migration and seeding completed." -ForegroundColor Green
