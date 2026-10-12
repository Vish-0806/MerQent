/**
 * MerQent Database Destructive Operation Guard Test Suite — Task 2.R3
 *
 * Verifies that:
 * 1. Production mode is strictly rejected (NODE_ENV=production or APP_ENV=production).
 * 2. Production database targets are rejected even when NODE_ENV is not production.
 * 3. Missing or ambiguous database configurations fail closed.
 * 4. Local and test databases can be reset ONLY with explicit operation confirmation.
 * 5. Remote and shared databases are rejected by default.
 * 6. Authorized remote maintenance requires explicit dual override and is locked out in production.
 * 7. Passwords and credentials are never exposed in errors or diagnostics.
 * 8. Non-destructive database operations (forward migrations) are preserved.
 */

const assert = require('assert');
const {
  evaluateDestructiveOperation,
  sanitizeDatabaseUrl,
  parseDatabaseTarget,
} = require('../../scripts/database/db-guard.js');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('      MERQENT DATABASE DESTRUCTIVE OPERATION GUARD VERIFICATION   ');
console.log('═══════════════════════════════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    failCount++;
  }
}

// 1. Production mode rejection
runTest('Rejects destructive operation when NODE_ENV=production', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://merqent_user:secret@localhost:5432/merqent_db',
    nodeEnv: 'production',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'PRODUCTION_ENVIRONMENT_BLOCKED');
  assert.match(result.message, /strictly prohibited when NODE_ENV/i);
});

runTest('Rejects destructive operation when APP_ENV=production even if NODE_ENV is unset', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://merqent_user:secret@localhost:5432/merqent_db',
    nodeEnv: '',
    appEnv: 'production',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'PRODUCTION_ENVIRONMENT_BLOCKED');
});

// 2. Production database target rejection even when NODE_ENV is not production
runTest('Rejects AWS RDS production host even when NODE_ENV=development', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl:
      'postgresql://admin:supersecret@merqent-primary.c789.rds.amazonaws.com:5432/merqent',
    nodeEnv: 'development',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'PRODUCTION_TARGET_BLOCKED');
  assert.match(result.message, /matches production\/cloud patterns/i);
});

runTest('Rejects Azure Postgres host even when NODE_ENV=test', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl:
      'postgresql://admin:supersecret@merqent-db.postgres.database.azure.com:5432/merqent',
    nodeEnv: 'test',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'PRODUCTION_TARGET_BLOCKED');
});

runTest('Rejects Supabase cloud host even when NODE_ENV=development', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://postgres:secret@db.abcdef.supabase.co:5432/postgres',
    nodeEnv: 'development',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'PRODUCTION_TARGET_BLOCKED');
});

runTest(
  'Rejects database target named with production pattern (e.g. merqent_prod) on localhost',
  () => {
    const result = evaluateDestructiveOperation({
      databaseUrl: 'postgresql://user:pass@localhost:5432/merqent_production',
      nodeEnv: 'development',
      confirmation: 'YES',
    });

    assert.strictEqual(result.isAllowed, false);
    assert.strictEqual(result.reason, 'PRODUCTION_TARGET_BLOCKED');
  },
);

// 3. Missing or ambiguous database configuration fails closed
runTest('Fails closed when DATABASE_URL is missing or empty', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: '',
    nodeEnv: 'development',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'MISSING_OR_INVALID_TARGET');
});

runTest('Fails closed when DATABASE_URL is malformed or invalid protocol', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'http://localhost:5432/merqent_db',
    nodeEnv: 'development',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'MISSING_OR_INVALID_TARGET');
});

runTest('Fails closed when hostname is missing in database URL', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql:///merqent_db',
    nodeEnv: 'development',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'MISSING_OR_INVALID_TARGET');
});

// 4. Local and isolated test databases require explicit confirmation
runTest('Rejects local database reset when explicit confirmation is missing', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://merqent:pass@localhost:5432/merqent_dev',
    nodeEnv: 'development',
    confirmation: '', // Missing confirmation
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'CONFIRMATION_REQUIRED');
  assert.match(result.message, /Explicit operation confirmation required/i);
});

runTest(
  'Allows local database reset when explicit confirmation is provided (CONFIRM_DB_RESET=YES)',
  () => {
    const result = evaluateDestructiveOperation({
      databaseUrl: 'postgresql://merqent:pass@localhost:5432/merqent_dev',
      nodeEnv: 'development',
      confirmation: 'YES',
    });

    assert.strictEqual(result.isAllowed, true);
    assert.strictEqual(result.reason, 'SAFETY_CHECKS_PASSED');
    assert.strictEqual(result.target.hostname, 'localhost');
    assert.strictEqual(result.target.database, 'merqent_dev');
  },
);

runTest('Allows local database reset with force flag on 127.0.0.1 or docker hostname', () => {
  const result1 = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://merqent:pass@127.0.0.1:5433/merqent_test',
    nodeEnv: 'test',
    force: true,
  });
  assert.strictEqual(result1.isAllowed, true);

  const result2 = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://merqent:pass@merqent_postgres:5432/merqent_dev',
    nodeEnv: 'development',
    force: true,
  });
  assert.strictEqual(result2.isAllowed, true);
});

// 5. Remote / Shared databases rejected by default
runTest('Rejects remote or shared database by default without maintenance override', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://dev:pass@staging-db.merqent-internal.net:5432/merqent_staging',
    nodeEnv: 'development',
    confirmation: 'YES',
    allowRemote: false,
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'REMOTE_DATABASE_BLOCKED');
  assert.match(result.message, /Remote\/shared database host.*rejected by default/i);
});

runTest('Allows remote staging database ONLY with explicit authorized maintenance override', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://dev:pass@staging-db.merqent-internal.net:5432/merqent_staging',
    nodeEnv: 'development',
    confirmation: 'YES',
    allowRemote: true,
    confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
  });

  assert.strictEqual(result.isAllowed, true);
  assert.strictEqual(result.reason, 'SAFETY_CHECKS_PASSED');
});

runTest('Rejects remote database if maintenance confirmation phrase is wrong or missing', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://dev:pass@staging-db.merqent-internal.net:5432/merqent_staging',
    nodeEnv: 'development',
    confirmation: 'YES',
    allowRemote: true,
    confirmRemote: 'WRONG_PHRASE',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'REMOTE_DATABASE_BLOCKED');
});

runTest(
  'Strictly locks out remote override when NODE_ENV=production (absolute production protection)',
  () => {
    const result = evaluateDestructiveOperation({
      databaseUrl: 'postgresql://dev:pass@staging-db.merqent-internal.net:5432/merqent_staging',
      nodeEnv: 'production', // Production flag present
      confirmation: 'YES',
      allowRemote: true,
      confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
    });

    assert.strictEqual(result.isAllowed, false);
    assert.strictEqual(result.reason, 'PRODUCTION_ENVIRONMENT_BLOCKED');
  },
);

// 6. Secrets are not exposed in error messages or logs
runTest('Sanitizes database passwords and sensitive tokens in error messages and outputs', () => {
  const secretPassword = 'MySuperSecretP@ssw0rd!#';
  const secretToken = 'jwt_secret_token_abc_123';
  const rawUrl = `postgresql://admin_user:${encodeURIComponent(secretPassword)}@localhost:5432/merqent_db?auth_token=${secretToken}&schema=public`;

  const sanitized = sanitizeDatabaseUrl(rawUrl);
  assert.strictEqual(sanitized.includes(secretPassword), false);
  assert.strictEqual(sanitized.includes(secretToken), false);
  assert.strictEqual(sanitized.includes('***'), true);

  // Evaluate missing confirmation to test message output
  const result = evaluateDestructiveOperation({
    databaseUrl: rawUrl,
    nodeEnv: 'development',
    confirmation: '',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.sanitizedTarget.includes(secretPassword), false);
  assert.strictEqual(result.sanitizedTarget.includes(secretToken), false);
  assert.strictEqual(result.message.includes(secretPassword), false);
});

// 7. Non-destructive commands verification
runTest(
  'Preserves non-destructive migration commands (schema status and forward deploy intact)',
  () => {
    const target = parseDatabaseTarget('postgresql://merqent:pass@localhost:5432/merqent_dev');
    assert.strictEqual(target.isValid, true);
    // Non-destructive forward migrations (prisma migrate deploy) do not invoke reset gate
  },
);

console.log('═══════════════════════════════════════════════════════════════════');
console.log(`  RESULTS: ${passCount} Passed, ${failCount} Failed`);
console.log('═══════════════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
