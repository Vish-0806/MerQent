Write-Host "[1/2] Applying Prisma Database Migrations..." -ForegroundColor Cyan
pnpm prisma:migrate
Write-Host "[2/2] Seeding Database Taxonomies..." -ForegroundColor Cyan
pnpm prisma:seed
Write-Host "Database migration and seeding completed successfully." -ForegroundColor Green
