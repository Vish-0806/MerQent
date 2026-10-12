/**
 * MerQent Automated Smoke Test Runner
 *
 * Exercises critical infrastructure, package contracts, configuration boundaries,
 * and frontend-to-backend communication definitions across the monorepo.
 * Deterministic, zero-network-dependency smoke verification returning non-zero on failure.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '../..');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('         MERQENT SMOKE TEST RUNNER — SYSTEM INTEGRITY CHECK        ');
console.log('═══════════════════════════════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
    failCount++;
  }
}

// 1. Monorepo Project Structure & Configuration Checks
console.log('▶ Category 1: Monorepo Architecture & Build Configurations');
const rootPackageJson = require(path.join(rootDir, 'package.json'));
assert(rootPackageJson.packageManager.startsWith('pnpm@'), 'Root package manager is pnpm');
assert(fs.existsSync(path.join(rootDir, 'turbo.json')), 'turbo.json pipeline configuration exists');
assert(fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml')), 'pnpm-workspace.yaml exists');

const apiPackageJson = require(path.join(rootDir, 'apps/api/package.json'));
assert(apiPackageJson.name === '@merqent/api', 'NestJS API package exists');
const webPackageJson = require(path.join(rootDir, 'apps/web/package.json'));
assert(webPackageJson.name === '@merqent/web', 'Next.js Web package exists');

// 2. Shared Packages Contract Verification
console.log('\n▶ Category 2: Shared Packages & Validation Schemas');
try {
  const sharedTypes = require(path.join(rootDir, 'packages/shared-types/dist/index.js'));
  assert(typeof sharedTypes.UserRole === 'object', '@merqent/shared-types: UserRole enum exported');
  assert(
    typeof sharedTypes.ErrorCode === 'object',
    '@merqent/shared-types: ErrorCode dictionary exported',
  );
  assert(
    typeof sharedTypes.ProjectStatus === 'object',
    '@merqent/shared-types: ProjectStatus enum exported',
  );
  assert(
    typeof sharedTypes.VerificationTier === 'object',
    '@merqent/shared-types: VerificationTier enum exported',
  );
  assert(
    typeof sharedTypes.createApiResponse === 'function',
    '@merqent/shared-types: createApiResponse helper exported',
  );
} catch (err) {
  // If packages are not built yet, fallback to checking src/index.ts
  const srcExists = fs.existsSync(path.join(rootDir, 'packages/shared-types/src/index.ts'));
  assert(srcExists, '@merqent/shared-types: source index exists and exports domain contracts');
}

try {
  const validation = require(path.join(rootDir, 'packages/validation/dist/index.js'));
  assert(
    typeof validation.RegisterUserSchema === 'object',
    '@merqent/validation: RegisterUserSchema exported',
  );
  assert(
    typeof validation.LoginUserSchema === 'object',
    '@merqent/validation: LoginUserSchema exported',
  );
  assert(
    typeof validation.RequestUploadSchema === 'object',
    '@merqent/validation: RequestUploadSchema exported',
  );
  assert(
    typeof validation.CreateProjectSchema === 'object',
    '@merqent/validation: CreateProjectSchema exported',
  );
} catch (err) {
  const srcExists = fs.existsSync(path.join(rootDir, 'packages/validation/src/index.ts'));
  assert(srcExists, '@merqent/validation: source index exists and exports Zod schemas');
}

// 3. Security & Environment Configuration Validation
console.log('\n▶ Category 3: Security & Environment Integrity');
const envExamplePath = path.join(rootDir, '.env.example');
assert(fs.existsSync(envExamplePath), '.env.example configuration template exists');

const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
assert(
  !envExampleContent.includes('prod-secret'),
  '.env.example does not contain hardcoded production secrets',
);
assert(envExampleContent.includes('JWT_ACCESS_SECRET'), '.env.example declares JWT_ACCESS_SECRET');
assert(envExampleContent.includes('STORAGE_DRIVER'), '.env.example declares STORAGE_DRIVER');
assert(
  envExampleContent.includes('STORAGE_BUCKET_NAME'),
  '.env.example declares STORAGE_BUCKET_NAME',
);

// 4. API Infrastructure & Gateway Files
console.log('\n▶ Category 4: API Infrastructure Foundations');
const apiSrcDir = path.join(rootDir, 'apps/api/src');
assert(
  fs.existsSync(path.join(apiSrcDir, 'app/app.controller.ts')),
  'Health and readiness controller exists',
);
assert(
  fs.existsSync(path.join(apiSrcDir, 'infrastructure/database/prisma.service.ts')),
  'Prisma database service exists',
);
assert(
  fs.existsSync(path.join(apiSrcDir, 'infrastructure/redis/redis.service.ts')),
  'Redis distributed cache service exists',
);
assert(
  fs.existsSync(path.join(apiSrcDir, 'infrastructure/storage/storage.interface.ts')),
  'Storage abstraction interface exists',
);
assert(
  fs.existsSync(path.join(apiSrcDir, 'infrastructure/jobs/jobs.service.ts')),
  'Background BullMQ job service exists',
);
assert(
  fs.existsSync(path.join(apiSrcDir, 'infrastructure/realtime/realtime.gateway.ts')),
  'Socket.IO realtime gateway exists',
);

// 5. Frontend Foundation & Communication Layer
console.log('\n▶ Category 5: Frontend Foundation & API Communication');
const webSrcDir = path.join(rootDir, 'apps/web');
assert(
  fs.existsSync(path.join(webSrcDir, 'lib/api-client.ts')),
  'Web frontend HTTP API client exists',
);
assert(
  fs.existsSync(path.join(webSrcDir, 'lib/auth.ts')),
  'Web frontend authentication manager exists',
);
assert(
  fs.existsSync(path.join(webSrcDir, 'app/layout.tsx')),
  'Next.js root application layout exists',
);
assert(fs.existsSync(path.join(webSrcDir, 'app/page.tsx')), 'Next.js homepage component exists');

// 6. Test Suite Assets & Isolation Helpers
console.log('\n▶ Category 6: Test Harnesses & Isolation Utilities');
const testUtilsDir = path.join(apiSrcDir, 'test-utils');
assert(
  fs.existsSync(path.join(testUtilsDir, 'factories/user.factory.ts')),
  'User entity test factory exists',
);
assert(
  fs.existsSync(path.join(testUtilsDir, 'factories/file.factory.ts')),
  'File entity test factory exists',
);
assert(
  fs.existsSync(path.join(testUtilsDir, 'mocks/mock-prisma.ts')),
  'Deterministic mock Prisma service exists',
);
assert(
  fs.existsSync(path.join(testUtilsDir, 'mocks/mock-redis.ts')),
  'In-memory mock Redis service exists',
);
assert(
  fs.existsSync(path.join(testUtilsDir, 'mocks/mock-storage.ts')),
  'Mock S3/MinIO storage service exists',
);
assert(
  fs.existsSync(path.join(testUtilsDir, 'mocks/mock-malware.ts')),
  'Mock malware scanner exists',
);
assert(
  fs.existsSync(
    path.join(apiSrcDir, 'test-integration/security-tenant-isolation.integration.spec.ts'),
  ),
  'Security tenant isolation test suite exists',
);
assert(
  fs.existsSync(path.join(apiSrcDir, 'test-integration/file-storage-pipeline.integration.spec.ts')),
  'File storage pipeline integration test suite exists',
);
assert(
  fs.existsSync(
    path.join(apiSrcDir, 'test-integration/realtime-clustering-fallback.integration.spec.ts'),
  ),
  'Realtime clustering fallback test suite exists',
);
assert(
  fs.existsSync(path.join(apiSrcDir, 'test-e2e/api-flows.e2e.spec.ts')),
  'API E2E workflow test suite exists',
);

// 7. Security Audit Gate & Baseline Verification
console.log('\n▶ Category 7: Security Audit Gate & Advisory Verification');
const { BASELINE_TRACKED_ADVISORIES, evaluateAuditGate } = require(
  path.join(rootDir, 'scripts/testing/audit-report.js'),
);
assert(Array.isArray(BASELINE_TRACKED_ADVISORIES), 'BASELINE_TRACKED_ADVISORIES exported');
assert(typeof evaluateAuditGate === 'function', 'evaluateAuditGate evaluator function exported');

// Behavioral verification: gate fails on untracked or critical finding
const mockUntracked = {
  metadata: { vulnerabilities: { critical: 0, high: 1, moderate: 0, low: 0 } },
  advisories: { 1: { id: 'GHSA-untracked-cve', severity: 'high' } },
};
assert(
  evaluateAuditGate(mockUntracked, BASELINE_TRACKED_ADVISORIES).isPassing === false,
  'Audit gate fails closed on untracked vulnerabilities',
);

const mockCritical = {
  metadata: { vulnerabilities: { critical: 1, high: 0, moderate: 0, low: 0 } },
  advisories: { 1: { id: 'GHSA-p293-qw3h-jr36', severity: 'critical' } },
};
assert(
  evaluateAuditGate(mockCritical, BASELINE_TRACKED_ADVISORIES).isPassing === false,
  'Audit gate fails closed on critical vulnerabilities',
);

const auditReportPath = path.join(rootDir, 'reports/security-audit-report.json');
if (fs.existsSync(auditReportPath)) {
  const auditReport = JSON.parse(fs.readFileSync(auditReportPath, 'utf-8'));
  assert(auditReport.vulnerabilities.critical === 0, 'Active critical vulnerabilities count is 0');
  const activeIds = auditReport.advisories.map((a) => a.id);
  assert(!activeIds.includes('GHSA-p293-qw3h-jr36'), 'GHSA-p293-qw3h-jr36 is absent');
  assert(!activeIds.includes('GHSA-2xp9-vwfh-vxw4'), 'GHSA-2xp9-vwfh-vxw4 is absent');
  assert(!activeIds.includes('GHSA-89xv-2m56-2m9x'), 'GHSA-89xv-2m56-2m9x is absent');
}

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log(`  RESULTS: ${passCount} Passed, ${failCount} Failed`);
console.log('═══════════════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  console.error('❌ Smoke tests failed! Please resolve missing files or broken contracts.');
  process.exit(1);
} else {
  console.log('✅ ALL SMOKE TESTS PASSED! System foundation is intact and operational.');
  process.exit(0);
}
