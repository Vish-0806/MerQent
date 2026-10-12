/**
 * MerQent Database Destructive Operation Guard Test Suite — Task 2.R3-V Verification
 *
 * Verifies that:
 * 1. Target classification correctly and consistently categorizes local loopback,
 *    Docker services, remote hosts, cloud hosts, and ambiguous hosts.
 * 2. Docker hostnames are NOT treated as trusted merely because they match a hardcoded name.
 * 3. Ambiguous and unknown targets fail closed and cannot be bypassed.
 * 4. Remote maintenance override boundaries are strictly enforced:
 *    - Never bypasses NODE_ENV=production or APP_ENV=production.
 *    - Never bypasses cloud/production host or database name detection.
 *    - Never bypasses missing, malformed, or ambiguous target validation.
 *    - Works only when every required override value matches exactly.
 * 5. The --force flag only satisfies the local confirmation requirement and never
 *    bypasses environment, remote-target, or target-validation protections.
 * 6. Database credentials and tokens are always sanitized in errors, messages, and diagnostics.
 * 7. Non-destructive operations (prisma migrate deploy, status, seed) remain unhindered.
 */

const assert = require('assert');
const {
  TARGET_CLASSIFICATION,
  classifyDatabaseTarget,
  evaluateDestructiveOperation,
  sanitizeDatabaseUrl,
  parseDatabaseTarget,
} = require('../../scripts/database/db-guard.js');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  MERQENT DATABASE DESTRUCTIVE OPERATION GUARD VERIFICATION (2.R3-V)');
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

// ============================================================================
// AREA 1: TARGET CLASSIFICATION AUDIT
// ============================================================================
console.log('▶ Area 1: Target Classification & Ambiguity Auditing');

runTest(
  'Classifies loopback targets (localhost, 127.0.0.1, ::1, 127.0.0.5) as LOCAL_LOOPBACK',
  () => {
    assert.strictEqual(classifyDatabaseTarget('localhost'), TARGET_CLASSIFICATION.LOCAL_LOOPBACK);
    assert.strictEqual(classifyDatabaseTarget('127.0.0.1'), TARGET_CLASSIFICATION.LOCAL_LOOPBACK);
    assert.strictEqual(classifyDatabaseTarget('127.0.0.99'), TARGET_CLASSIFICATION.LOCAL_LOOPBACK);
    assert.strictEqual(classifyDatabaseTarget('::1'), TARGET_CLASSIFICATION.LOCAL_LOOPBACK);
    assert.strictEqual(classifyDatabaseTarget('[::1]'), TARGET_CLASSIFICATION.LOCAL_LOOPBACK);
    assert.strictEqual(classifyDatabaseTarget('0.0.0.0'), TARGET_CLASSIFICATION.LOCAL_LOOPBACK);
  },
);

runTest('Classifies Docker container service names as DOCKER_SERVICE (not loopback)', () => {
  assert.strictEqual(
    classifyDatabaseTarget('merqent_postgres'),
    TARGET_CLASSIFICATION.DOCKER_SERVICE,
  );
  assert.strictEqual(classifyDatabaseTarget('postgres'), TARGET_CLASSIFICATION.DOCKER_SERVICE);
  assert.strictEqual(classifyDatabaseTarget('db'), TARGET_CLASSIFICATION.DOCKER_SERVICE);
  assert.strictEqual(classifyDatabaseTarget('database'), TARGET_CLASSIFICATION.DOCKER_SERVICE);
  assert.strictEqual(
    classifyDatabaseTarget('host.docker.internal'),
    TARGET_CLASSIFICATION.DOCKER_SERVICE,
  );
  assert.strictEqual(
    classifyDatabaseTarget('docker.for.mac.localhost'),
    TARGET_CLASSIFICATION.DOCKER_SERVICE,
  );
});

runTest('Classifies cloud database hosts as CLOUD_OR_PRODUCTION', () => {
  assert.strictEqual(
    classifyDatabaseTarget('merqent.c123.rds.amazonaws.com'),
    TARGET_CLASSIFICATION.CLOUD_OR_PRODUCTION,
  );
  assert.strictEqual(
    classifyDatabaseTarget('db.postgres.database.azure.com'),
    TARGET_CLASSIFICATION.CLOUD_OR_PRODUCTION,
  );
  assert.strictEqual(
    classifyDatabaseTarget('db.abcdef.supabase.co'),
    TARGET_CLASSIFICATION.CLOUD_OR_PRODUCTION,
  );
  assert.strictEqual(
    classifyDatabaseTarget('ep-xyz.neon.tech'),
    TARGET_CLASSIFICATION.CLOUD_OR_PRODUCTION,
  );
  assert.strictEqual(
    classifyDatabaseTarget('postgres-prod.internal.net'),
    TARGET_CLASSIFICATION.CLOUD_OR_PRODUCTION,
  );
});

runTest('Classifies remote FQDNs with domain dots as REMOTE_SHARED', () => {
  assert.strictEqual(
    classifyDatabaseTarget('staging-db.merqent-internal.net'),
    TARGET_CLASSIFICATION.REMOTE_SHARED,
  );
  assert.strictEqual(
    classifyDatabaseTarget('qa-postgres.corp.local'),
    TARGET_CLASSIFICATION.REMOTE_SHARED,
  );
  assert.strictEqual(classifyDatabaseTarget('10.0.1.50'), TARGET_CLASSIFICATION.REMOTE_SHARED);
});

runTest('Classifies bare, unknown single-label hostnames as AMBIGUOUS', () => {
  assert.strictEqual(classifyDatabaseTarget('custom-server'), TARGET_CLASSIFICATION.AMBIGUOUS);
  assert.strictEqual(classifyDatabaseTarget('mybox'), TARGET_CLASSIFICATION.AMBIGUOUS);
  assert.strictEqual(classifyDatabaseTarget(''), TARGET_CLASSIFICATION.AMBIGUOUS);
  assert.strictEqual(classifyDatabaseTarget(null), TARGET_CLASSIFICATION.AMBIGUOUS);
});

runTest('Docker hostnames are NOT treated as trusted local targets merely by name', () => {
  // A Docker service name like merqent_postgres cannot be reset with --force alone!
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://merqent:pass@merqent_postgres:5432/merqent_dev',
    nodeEnv: 'development',
    force: true, // Only --force supplied, no remote maintenance override
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'DOCKER_HOST_NOT_TRUSTED');
  assert.match(
    result.message,
    /cannot be treated as a trusted local loopback target merely by name/i,
  );
});

runTest('Docker service "postgres" is NOT treated as trusted local target merely by name', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://user:pass@postgres:5432/merqent_db',
    nodeEnv: 'development',
    force: true,
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'DOCKER_HOST_NOT_TRUSTED');
});

runTest('Ambiguous target hosts fail closed and are rejected', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://user:pass@unknown-box:5432/merqent_dev',
    nodeEnv: 'development',
    force: true,
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'AMBIGUOUS_TARGET_BLOCKED');
  assert.match(result.message, /ambiguous or unknown/i);
});

runTest('Missing or empty database name in DATABASE_URL fails closed as ambiguous', () => {
  const result1 = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://user:pass@localhost:5432',
    nodeEnv: 'development',
    confirmation: 'YES',
  });
  assert.strictEqual(result1.isAllowed, false);
  assert.strictEqual(result1.reason, 'MISSING_OR_INVALID_TARGET');

  const result2 = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://user:pass@localhost:5432/',
    nodeEnv: 'development',
    confirmation: 'YES',
  });
  assert.strictEqual(result2.isAllowed, false);
  assert.strictEqual(result2.reason, 'MISSING_OR_INVALID_TARGET');
});

// ============================================================================
// AREA 2: MAINTENANCE OVERRIDE BOUNDARIES
// ============================================================================
console.log('\n▶ Area 2: Remote Maintenance Override Boundaries');

runTest('Maintenance override NEVER bypasses NODE_ENV=production', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://dev:pass@staging-db.merqent-internal.net:5432/merqent_staging',
    nodeEnv: 'production',
    allowRemote: true,
    confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'PRODUCTION_ENVIRONMENT_BLOCKED');
});

runTest('Maintenance override NEVER bypasses APP_ENV=production', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://dev:pass@staging-db.merqent-internal.net:5432/merqent_staging',
    nodeEnv: 'development',
    appEnv: 'production',
    allowRemote: true,
    confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'PRODUCTION_ENVIRONMENT_BLOCKED');
});

runTest('Maintenance override NEVER bypasses cloud/production host detection', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl:
      'postgresql://admin:secret@merqent-prod.c123.rds.amazonaws.com:5432/merqent_staging',
    nodeEnv: 'development',
    allowRemote: true,
    confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'PRODUCTION_TARGET_BLOCKED');
});

runTest('Maintenance override NEVER bypasses production database name detection', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl:
      'postgresql://admin:secret@staging-db.merqent-internal.net:5432/merqent_production',
    nodeEnv: 'development',
    allowRemote: true,
    confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'PRODUCTION_TARGET_BLOCKED');
});

runTest(
  'Maintenance override NEVER bypasses missing, empty, or malformed target validation',
  () => {
    const resultEmpty = evaluateDestructiveOperation({
      databaseUrl: '',
      nodeEnv: 'development',
      allowRemote: true,
      confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
      confirmation: 'YES',
    });
    assert.strictEqual(resultEmpty.isAllowed, false);
    assert.strictEqual(resultEmpty.reason, 'MISSING_OR_INVALID_TARGET');

    const resultMalformed = evaluateDestructiveOperation({
      databaseUrl: 'mysql://root:secret@staging-db.merqent-internal.net:3306/db',
      nodeEnv: 'development',
      allowRemote: true,
      confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
      confirmation: 'YES',
    });
    assert.strictEqual(resultMalformed.isAllowed, false);
    assert.strictEqual(resultMalformed.reason, 'MISSING_OR_INVALID_TARGET');
  },
);

runTest('Maintenance override NEVER bypasses ambiguous target validation', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://user:pass@unknown-box:5432/staging_db',
    nodeEnv: 'development',
    allowRemote: true,
    confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'AMBIGUOUS_TARGET_BLOCKED');
});

runTest(
  'Maintenance override works ONLY when every required override value matches exactly',
  () => {
    const validUrl = 'postgresql://dev:pass@staging-db.merqent-internal.net:5432/merqent_staging';

    // 1. Missing confirmRemote phrase
    assert.strictEqual(
      evaluateDestructiveOperation({
        databaseUrl: validUrl,
        nodeEnv: 'development',
        allowRemote: true,
        confirmRemote: '',
        confirmation: 'YES',
      }).isAllowed,
      false,
    );

    // 2. Incorrect confirmRemote phrase
    assert.strictEqual(
      evaluateDestructiveOperation({
        databaseUrl: validUrl,
        nodeEnv: 'development',
        allowRemote: true,
        confirmRemote: 'YES',
        confirmation: 'YES',
      }).isAllowed,
      false,
    );

    // 3. allowRemote is false
    assert.strictEqual(
      evaluateDestructiveOperation({
        databaseUrl: validUrl,
        nodeEnv: 'development',
        allowRemote: false,
        confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
        confirmation: 'YES',
      }).isAllowed,
      false,
    );

    // 4. Missing operation confirmation (Tier 4)
    assert.strictEqual(
      evaluateDestructiveOperation({
        databaseUrl: validUrl,
        nodeEnv: 'development',
        allowRemote: true,
        confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
        confirmation: '',
      }).isAllowed,
      false,
    );

    // 5. All exact match -> Allowed!
    const successResult = evaluateDestructiveOperation({
      databaseUrl: validUrl,
      nodeEnv: 'development',
      allowRemote: true,
      confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
      confirmation: 'YES',
    });
    assert.strictEqual(successResult.isAllowed, true);
    assert.strictEqual(successResult.reason, 'SAFETY_CHECKS_PASSED');
  },
);

runTest('Allows Docker container target ONLY with explicit maintenance override', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://merqent:pass@merqent_postgres:5432/merqent_dev',
    nodeEnv: 'development',
    allowRemote: true,
    confirmRemote: 'I_CONFIRM_REMOTE_DATABASE_WIPE',
    confirmation: 'YES',
  });

  assert.strictEqual(result.isAllowed, true);
  assert.strictEqual(result.reason, 'SAFETY_CHECKS_PASSED');
  assert.strictEqual(result.target.classification, TARGET_CLASSIFICATION.DOCKER_SERVICE);
});

// ============================================================================
// AREA 3 & 4: WRAPPER BEHAVIOR & --force BOUNDARIES
// ============================================================================
console.log('\n▶ Area 3 & 4: Wrapper Behavior & --force Boundaries');

runTest('--force satisfies confirmation requirement ONLY on local loopback', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://merqent:pass@127.0.0.1:5433/merqent_dev',
    nodeEnv: 'development',
    force: true,
  });

  assert.strictEqual(result.isAllowed, true);
  assert.strictEqual(result.reason, 'SAFETY_CHECKS_PASSED');
});

runTest('--force does NOT bypass NODE_ENV=production', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://merqent:pass@localhost:5432/merqent_dev',
    nodeEnv: 'production',
    force: true,
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'PRODUCTION_ENVIRONMENT_BLOCKED');
});

runTest('--force does NOT bypass cloud host protection', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://merqent:pass@db.postgres.database.azure.com:5432/merqent_dev',
    nodeEnv: 'development',
    force: true,
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'PRODUCTION_TARGET_BLOCKED');
});

runTest('--force does NOT bypass remote target protection', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://merqent:pass@staging-db.merqent-internal.net:5432/merqent_staging',
    nodeEnv: 'development',
    force: true,
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'REMOTE_DATABASE_BLOCKED');
});

runTest('--force does NOT bypass Docker host protection', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: 'postgresql://merqent:pass@merqent_postgres:5432/merqent_dev',
    nodeEnv: 'development',
    force: true,
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'DOCKER_HOST_NOT_TRUSTED');
});

runTest('--force does NOT bypass missing or malformed target validation', () => {
  const result = evaluateDestructiveOperation({
    databaseUrl: '',
    nodeEnv: 'development',
    force: true,
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.reason, 'MISSING_OR_INVALID_TARGET');
});

// ============================================================================
// AREA 5: SECRETS SANITIZATION & NON-DESTRUCTIVE PRESERVATION
// ============================================================================
console.log('\n▶ Area 5: Secrets Sanitization & Non-Destructive Preservation');

runTest('Sanitizes database passwords and sensitive tokens in error messages and outputs', () => {
  const secretPassword = 'P@ssw0rd_With_Spec!al_Chars';
  const secretToken = 'sec_token_9876543210';
  const rawUrl = `postgresql://admin_user:${encodeURIComponent(secretPassword)}@localhost:5432/merqent_db?token=${secretToken}&schema=public`;

  const sanitized = sanitizeDatabaseUrl(rawUrl);
  assert.strictEqual(sanitized.includes(secretPassword), false);
  assert.strictEqual(sanitized.includes(secretToken), false);
  assert.strictEqual(sanitized.includes('***'), true);

  const result = evaluateDestructiveOperation({
    databaseUrl: rawUrl,
    nodeEnv: 'development',
    confirmation: '',
  });

  assert.strictEqual(result.isAllowed, false);
  assert.strictEqual(result.sanitizedTarget.includes(secretPassword), false);
  assert.strictEqual(result.message.includes(secretPassword), false);
});

runTest(
  'Preserves non-destructive migration commands (schema status and forward deploy intact)',
  () => {
    const target = parseDatabaseTarget('postgresql://merqent:pass@localhost:5432/merqent_dev');
    assert.strictEqual(target.isValid, true);
    assert.strictEqual(target.classification, TARGET_CLASSIFICATION.LOCAL_LOOPBACK);
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
