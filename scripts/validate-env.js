/**
 * CLI Environment Validation Script for MerQent
 * Run directly via `pnpm env:validate` to verify local .env integrity.
 */
const fs = require('fs');
const path = require('path');

// Resolve validateEnv: use compiled dist if available, or transpile source on-the-fly
let validateEnv;
const compiledSchemaPath = path.resolve(__dirname, '../apps/api/dist/config/env.schema.js');
const sourceSchemaPath = path.resolve(__dirname, '../apps/api/src/config/env.schema.ts');

if (fs.existsSync(compiledSchemaPath)) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  validateEnv = require(compiledSchemaPath).validateEnv;
} else if (fs.existsSync(sourceSchemaPath)) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ts = require('typescript');
  const sourceCode = fs.readFileSync(sourceSchemaPath, 'utf8');
  const transpiled = ts.transpileModule(sourceCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;

  const m = new module.constructor();
  m.paths = module.paths.concat(
    path.resolve(__dirname, '../apps/api/node_modules'),
    path.resolve(__dirname, '../node_modules'),
  );
  m._compile(transpiled, sourceSchemaPath);
  validateEnv = m.exports.validateEnv;
} else {
  console.error('❌ Could not locate MerQent environment schema (dist or src).');
  process.exit(1);
}

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
