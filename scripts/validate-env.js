/**
 * CLI Environment Validation Script for MerQent
 * Run directly via `pnpm env:validate` to verify local .env integrity.
 */
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { validateEnv } = require('../apps/api/dist/config/env.schema');

// Fallback to loading .env or .env.example if process.env is not yet populated
if (!process.env.DATABASE_URL && typeof process.loadEnvFile === 'function') {
  if (fs.existsSync('.env')) {
    process.loadEnvFile('.env');
  } else if (fs.existsSync('.env.example')) {
    process.loadEnvFile('.env.example');
  }
}

try {
  console.log('🔍 Validating local .env configuration against MerQent environment schema...');
  const validated = validateEnv(process.env);
  console.log('✅ Environment configuration is valid!');
  console.log(`   - Environment:   ${validated.NODE_ENV}`);
  console.log(`   - API Port:      ${validated.PORT}`);
  console.log(`   - Database URI:  ${validated.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`   - Redis Host:    ${validated.REDIS_HOST}:${validated.REDIS_PORT}`);
  console.log(`   - Storage:       ${validated.STORAGE_DRIVER} (${validated.STORAGE_ENDPOINT})`);
  console.log(`   - Log Level:     ${validated.LOG_LEVEL}`);
  process.exit(0);
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('❌ Unknown error during environment validation:', error);
  }
  process.exit(1);
}
