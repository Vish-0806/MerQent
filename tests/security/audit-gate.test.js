/**
 * MerQent Security Audit Gate Test Suite
 *
 * Verifies that the security audit gate:
 * 1. Blocks newly introduced/unapproved vulnerabilities (fail-closed).
 * 2. Allows tracked baseline advisories at their approved severity.
 * 3. Blocks severity increases of existing tracked advisories above baseline.
 * 4. Blocks any critical severity vulnerabilities even if in baseline.
 * 5. Rejects missing or malformed audit data (never reports false success).
 * 6. Explicitly catalogs unresolved baseline findings without silent suppression.
 * 7. Verifies absence of targeted Next.js advisories (GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4, GHSA-89xv-2m56-2m9x).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  BASELINE_TRACKED_SEVERITIES,
  BASELINE_TRACKED_ADVISORIES,
  evaluateAuditGate,
} = require('../../scripts/testing/audit-report.js');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('       MERQENT SECURITY AUDIT GATE BEHAVIORAL VERIFICATION         ');
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

// 1. Verify detection of newly introduced vulnerabilities
runTest('Audit gate FAILS when newly introduced/untracked advisory is detected', () => {
  const mockAudit = {
    metadata: { vulnerabilities: { critical: 0, high: 2, moderate: 2, low: 0 } },
    advisories: {
      1: {
        id: 'GHSA-36xv-jgw5-4q75',
        github_advisory_id: 'GHSA-36xv-jgw5-4q75',
        severity: 'moderate',
        module_name: '@nestjs/core',
      },
      2: {
        id: 'GHSA-2g4f-4pwh-qvx6',
        github_advisory_id: 'GHSA-2g4f-4pwh-qvx6',
        severity: 'moderate',
        module_name: 'ajv',
      },
      3: {
        id: 'GHSA-vfj7-8cjw-p6xm',
        github_advisory_id: 'GHSA-vfj7-8cjw-p6xm',
        severity: 'high',
        module_name: 'braces',
      },
      4: {
        id: 'GHSA-evil-new1',
        github_advisory_id: 'GHSA-evil-new1',
        severity: 'high',
        module_name: 'untrusted-pkg',
      },
    },
  };
  const result = evaluateAuditGate(mockAudit, BASELINE_TRACKED_SEVERITIES);
  assert.strictEqual(result.isPassing, false, 'Gate must fail when new advisory is present');
  assert.strictEqual(result.newAdvisories.length, 1, 'Must detect exactly 1 new advisory');
  assert.strictEqual(result.newAdvisories[0].github_advisory_id, 'GHSA-evil-new1');
});

// 2. Verify tracked advisory at its existing approved severity
runTest('Audit gate PASSES when tracked advisories are at their approved baseline severity', () => {
  const mockAudit = {
    metadata: { vulnerabilities: { critical: 0, high: 1, moderate: 2, low: 0 } },
    advisories: {
      1: {
        id: 'GHSA-36xv-jgw5-4q75',
        github_advisory_id: 'GHSA-36xv-jgw5-4q75',
        severity: 'moderate',
        module_name: '@nestjs/core',
      },
      2: {
        id: 'GHSA-2g4f-4pwh-qvx6',
        github_advisory_id: 'GHSA-2g4f-4pwh-qvx6',
        severity: 'moderate',
        module_name: 'ajv',
      },
      3: {
        id: 'GHSA-vfj7-8cjw-p6xm',
        github_advisory_id: 'GHSA-vfj7-8cjw-p6xm',
        severity: 'high',
        module_name: 'braces',
      },
    },
  };
  const result = evaluateAuditGate(mockAudit, BASELINE_TRACKED_SEVERITIES);
  assert.strictEqual(result.isPassing, true, 'Gate must pass on approved baseline');
  assert.strictEqual(result.newAdvisories.length, 0, 'No new advisories');
  assert.strictEqual(result.escalatedAdvisories.length, 0, 'No escalated advisories');
  assert.strictEqual(result.criticalAdvisories.length, 0, 'No critical advisories');
});

// 3. Verify detection of severity escalation
runTest('Audit gate FAILS when tracked advisory severity increases above approved baseline', () => {
  // Scenario: @nestjs/core was approved at 'moderate', but newly assessed at 'high'
  const mockAudit = {
    metadata: { vulnerabilities: { critical: 0, high: 2, moderate: 1, low: 0 } },
    advisories: {
      1: {
        id: 'GHSA-36xv-jgw5-4q75',
        github_advisory_id: 'GHSA-36xv-jgw5-4q75',
        severity: 'high', // ESCALATED from moderate -> high
        module_name: '@nestjs/core',
      },
      2: {
        id: 'GHSA-2g4f-4pwh-qvx6',
        github_advisory_id: 'GHSA-2g4f-4pwh-qvx6',
        severity: 'moderate',
        module_name: 'ajv',
      },
      3: {
        id: 'GHSA-vfj7-8cjw-p6xm',
        github_advisory_id: 'GHSA-vfj7-8cjw-p6xm',
        severity: 'high',
        module_name: 'braces',
      },
    },
  };
  const result = evaluateAuditGate(mockAudit, BASELINE_TRACKED_SEVERITIES);
  assert.strictEqual(result.isPassing, false, 'Gate must fail when severity increases');
  assert.strictEqual(result.escalatedAdvisories.length, 1, 'Must detect 1 escalated advisory');
  assert.strictEqual(result.escalatedAdvisories[0].github_advisory_id, 'GHSA-36xv-jgw5-4q75');
});

// 4. Verify fail-closed behavior on Critical severity even if present in baseline
runTest('Audit gate FAILS on CRITICAL advisory even if placed in tracked baseline', () => {
  const mockAudit = {
    metadata: { vulnerabilities: { critical: 1, high: 0, moderate: 0, low: 0 } },
    advisories: {
      1: {
        id: 'GHSA-p293-qw3h-jr36',
        github_advisory_id: 'GHSA-p293-qw3h-jr36',
        severity: 'critical',
        module_name: 'next',
      },
    },
  };
  // Even if an engineer mistakenly configures 'GHSA-p293-qw3h-jr36': 'critical' in baseline:
  const result = evaluateAuditGate(mockAudit, { 'GHSA-p293-qw3h-jr36': 'critical' });
  assert.strictEqual(result.isPassing, false, 'Gate must never pass with a critical vulnerability');
  assert.strictEqual(result.criticalAdvisories.length, 1, 'Must identify critical advisory');
});

// 5. Verify handling of missing or malformed audit data
runTest('Audit gate FAILS on missing or malformed audit data (fails closed)', () => {
  const malformedInputs = [null, undefined, {}, { advisories: null }, 'invalid string', []];
  for (const input of malformedInputs) {
    const result = evaluateAuditGate(input, BASELINE_TRACKED_SEVERITIES);
    assert.strictEqual(
      result.isPassing,
      false,
      `Must fail on malformed input: ${JSON.stringify(input)}`,
    );
    assert(result.error, 'Must provide an explicit error description');
  }
});

// 6. Verify unresolved findings are reported as active in security-audit-report.json
runTest('Unresolved findings remain actively cataloged in generated report artifact', () => {
  const reportPath = path.join(__dirname, '../../reports/security-audit-report.json');
  if (!fs.existsSync(reportPath)) {
    const { execSync } = require('child_process');
    execSync('node scripts/testing/audit-report.js', {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'ignore',
    });
  }
  assert(fs.existsSync(reportPath), 'security-audit-report.json must exist');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

  assert.strictEqual(
    report.advisoriesCount,
    3,
    'Report must catalog exactly 3 remaining advisories',
  );
  const activeIds = report.advisories.map((a) => a.id);
  assert(
    activeIds.includes('GHSA-36xv-jgw5-4q75'),
    '@nestjs/core finding must be actively cataloged',
  );
  assert(activeIds.includes('GHSA-2g4f-4pwh-qvx6'), 'ajv finding must be actively cataloged');
  assert(activeIds.includes('GHSA-vfj7-8cjw-p6xm'), 'braces finding must be actively cataloged');
});

// 7. Confirm targeted Next.js advisories are completely absent
runTest('Targeted Next.js CVEs/GHSAs are absent from active audit findings', () => {
  const reportPath = path.join(__dirname, '../../reports/security-audit-report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const activeIds = report.advisories.map((a) => a.id);

  assert(!activeIds.includes('GHSA-p293-qw3h-jr36'), 'GHSA-p293-qw3h-jr36 must be absent');
  assert(!activeIds.includes('GHSA-2xp9-vwfh-vxw4'), 'GHSA-2xp9-vwfh-vxw4 must be absent');
  assert(!activeIds.includes('GHSA-89xv-2m56-2m9x'), 'GHSA-89xv-2m56-2m9x must be absent');
  assert.strictEqual(
    report.vulnerabilities.critical,
    0,
    'Active critical vulnerabilities must be 0',
  );
});

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log(`  RESULTS: ${passCount} Passed, ${failCount} Failed`);
console.log('═══════════════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
