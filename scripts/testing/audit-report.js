/**
 * MerQent Automated Dependency Security Audit Inspector
 * Parses pnpm audit output, catalogs CVE/GHSA advisories, generates structured reports,
 * and enforces strict security quality gates (fails on new or critical vulnerabilities).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASELINE_TRACKED_ADVISORIES = [
  'GHSA-36xv-jgw5-4q75', // @nestjs/core SSE injection (requires NestJS 11)
  'GHSA-2g4f-4pwh-qvx6', // ajv ReDoS ($data) (transitive dev dependency)
  'GHSA-vfj7-8cjw-p6xm', // braces stack-exhaustion (transitive dev dependency)
];

/**
 * Evaluates dependency security audit data against baseline constraints.
 * Fails closed if any untracked or critical vulnerability is detected.
 */
function evaluateAuditGate(auditData, baselineTracked = BASELINE_TRACKED_ADVISORIES) {
  const advisories = Object.values(auditData?.advisories || {});
  const metadata = auditData?.metadata || { vulnerabilities: {} };
  const baselineSet = new Set(baselineTracked);

  const newAdvisories = advisories.filter((a) => {
    const id = a.github_advisory_id || a.id;
    return !baselineSet.has(id);
  });

  const criticalAdvisories = advisories.filter((a) => a.severity === 'critical');
  const isPassing = newAdvisories.length === 0 && criticalAdvisories.length === 0;

  return {
    isPassing,
    advisories,
    newAdvisories,
    criticalAdvisories,
    metadata,
  };
}

function runAudit() {
  console.log('🔒 MerQent Dependency Security Audit Inspector');
  console.log('══════════════════════════════════════════════════');

  let auditData = null;
  try {
    const stdout = execSync('pnpm audit --json', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    try {
      auditData = JSON.parse(stdout);
    } catch (e) {
      auditData = { advisories: {}, metadata: { vulnerabilities: {} } };
    }
  } catch (err) {
    try {
      auditData = JSON.parse(err.stdout);
    } catch (e) {
      console.error('❌ Failed to parse pnpm audit JSON output:', err.message);
      process.exit(1);
    }
  }

  const { isPassing, advisories, newAdvisories, criticalAdvisories, metadata } = evaluateAuditGate(
    auditData,
    BASELINE_TRACKED_ADVISORIES,
  );

  console.log(`Total Advisories Detected: ${advisories.length}`);
  console.log(`Severity Breakdown:`);
  console.log(`  - Critical: ${metadata.vulnerabilities?.critical || 0}`);
  console.log(`  - High:     ${metadata.vulnerabilities?.high || 0}`);
  console.log(`  - Moderate: ${metadata.vulnerabilities?.moderate || 0}`);
  console.log(`  - Low:      ${metadata.vulnerabilities?.low || 0}`);

  const affectedModules = new Set(advisories.map((a) => a.module_name));
  console.log(`Affected Modules: ${Array.from(affectedModules).join(', ') || 'None'}`);

  // Catalog and write structured report
  const report = {
    timestamp: new Date().toISOString(),
    advisoriesCount: advisories.length,
    vulnerabilities: metadata.vulnerabilities || {},
    affectedModules: Array.from(affectedModules),
    baselineTrackedAdvisories: BASELINE_TRACKED_ADVISORIES,
    advisories: advisories.map((a) => ({
      id: a.github_advisory_id || a.id,
      module: a.module_name,
      title: a.title,
      severity: a.severity,
      url: a.url,
      vulnerableVersions: a.vulnerable_versions,
      patchedVersions: a.patched_versions,
    })),
  };

  const outputDir = path.join(__dirname, '../../reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'security-audit-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n📄 Report written to: ${outputPath}`);

  if (advisories.length > 0) {
    console.log('\n⚠️  Active vulnerabilities detected:');
    advisories.forEach((a) => {
      const isTracked = BASELINE_TRACKED_ADVISORIES.includes(a.github_advisory_id || a.id);
      const tag = isTracked ? '[TRACKED BASELINE]' : '[NEW/UNTRACKED]';
      console.log(
        `   ${tag} [${a.severity.toUpperCase()}] ${a.module_name}: ${a.title} (${a.github_advisory_id || a.id})`,
      );
    });
  } else {
    console.log('✅ No vulnerabilities found! All dependencies are secure.');
  }

  if (!isPassing) {
    console.error('\n❌ Security Audit Quality Gate FAILED!');
    if (criticalAdvisories.length > 0) {
      console.error(
        `   - ${criticalAdvisories.length} CRITICAL vulnerability advisory(ies) detected.`,
      );
    }
    if (newAdvisories.length > 0) {
      console.error(
        `   - ${newAdvisories.length} newly introduced or unapproved vulnerability advisory(ies) detected:`,
      );
      newAdvisories.forEach((a) => {
        console.error(`     * ${a.github_advisory_id || a.id} (${a.module_name})`);
      });
    }
    process.exit(1);
  }

  console.log(
    '\n✅ Security Audit Quality Gate PASSED (all active findings are verified tracked baselines, 0 criticals).',
  );
  process.exit(0);
}

if (require.main === module) {
  runAudit();
}

module.exports = {
  BASELINE_TRACKED_ADVISORIES,
  evaluateAuditGate,
};
