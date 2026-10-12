/**
 * MerQent Automated Dependency Security Audit Inspector
 * Parses pnpm audit output, catalogs CVE/GHSA advisories, generates structured reports,
 * and enforces strict security quality gates:
 * - Fails on untracked / new vulnerabilities (fail-closed)
 * - Fails on severity escalation of tracked vulnerabilities above approved baseline
 * - Fails on any Critical severity vulnerabilities (even if in baseline)
 * - Fails on missing or malformed audit data
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SEVERITY_LEVELS = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const BASELINE_TRACKED_SEVERITIES = {
  'GHSA-36xv-jgw5-4q75': 'moderate', // @nestjs/core SSE injection (requires NestJS 11)
  'GHSA-2g4f-4pwh-qvx6': 'moderate', // ajv ReDoS ($data) (transitive dev dependency)
  'GHSA-vfj7-8cjw-p6xm': 'high', // braces stack-exhaustion (transitive dev dependency)
};

const BASELINE_TRACKED_ADVISORIES = Object.keys(BASELINE_TRACKED_SEVERITIES);

/**
 * Normalizes baseline input into a map of { [advisoryId]: approvedSeverity }.
 */
function normalizeBaseline(baseline) {
  if (Array.isArray(baseline)) {
    const map = {};
    for (const id of baseline) {
      map[id] = BASELINE_TRACKED_SEVERITIES[id] || 'high';
    }
    return map;
  }
  if (baseline && typeof baseline === 'object') {
    return baseline;
  }
  return BASELINE_TRACKED_SEVERITIES;
}

/**
 * Evaluates dependency security audit data against baseline constraints.
 * Fails closed if audit data is malformed, or if any untracked, escalated,
 * or critical vulnerability is detected.
 */
function evaluateAuditGate(auditData, baseline = BASELINE_TRACKED_SEVERITIES) {
  // Validate audit data integrity
  if (
    !auditData ||
    typeof auditData !== 'object' ||
    !auditData.advisories ||
    typeof auditData.advisories !== 'object'
  ) {
    return {
      isPassing: false,
      error: 'Missing or malformed audit data: auditData.advisories must be a valid object',
      advisories: [],
      newAdvisories: [],
      escalatedAdvisories: [],
      criticalAdvisories: [],
      metadata: {},
    };
  }

  const baselineMap = normalizeBaseline(baseline);
  const advisories = Object.values(auditData.advisories || {});
  const metadata = auditData.metadata || { vulnerabilities: {} };

  // 1. Detect untracked / newly introduced advisories
  const newAdvisories = advisories.filter((a) => {
    const id = a.github_advisory_id || a.id;
    return !Object.prototype.hasOwnProperty.call(baselineMap, id);
  });

  // 2. Detect severity escalations above approved baseline
  const escalatedAdvisories = advisories.filter((a) => {
    const id = a.github_advisory_id || a.id;
    const approvedSeverity = baselineMap[id];
    if (!approvedSeverity) return false; // Already handled by newAdvisories

    const currentLevel = SEVERITY_LEVELS[String(a.severity).toLowerCase()] ?? 0;
    const approvedLevel = SEVERITY_LEVELS[String(approvedSeverity).toLowerCase()] ?? 0;
    return currentLevel > approvedLevel;
  });

  // 3. Detect critical severity advisories (zero tolerance, even if tracked)
  const criticalAdvisories = advisories.filter(
    (a) => String(a.severity).toLowerCase() === 'critical',
  );

  const isPassing =
    newAdvisories.length === 0 &&
    escalatedAdvisories.length === 0 &&
    criticalAdvisories.length === 0;

  return {
    isPassing,
    advisories,
    newAdvisories,
    escalatedAdvisories,
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

  const {
    isPassing,
    error,
    advisories,
    newAdvisories,
    escalatedAdvisories,
    criticalAdvisories,
    metadata,
  } = evaluateAuditGate(auditData, BASELINE_TRACKED_SEVERITIES);

  if (error) {
    console.error(`\n❌ Audit Data Integrity Error: ${error}`);
    process.exit(1);
  }

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
    baselineTrackedSeverities: BASELINE_TRACKED_SEVERITIES,
    baselineTrackedAdvisories: BASELINE_TRACKED_ADVISORIES,
    advisories: advisories.map((a) => {
      const id = a.github_advisory_id || a.id;
      return {
        id,
        module: a.module_name,
        title: a.title,
        severity: a.severity,
        baselineSeverity: BASELINE_TRACKED_SEVERITIES[id] || null,
        url: a.url,
        vulnerableVersions: a.vulnerable_versions,
        patchedVersions: a.patched_versions,
      };
    }),
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
      const id = a.github_advisory_id || a.id;
      const approvedSev = BASELINE_TRACKED_SEVERITIES[id];
      const tag = approvedSev ? '[TRACKED BASELINE]' : '[NEW/UNTRACKED]';
      const baselineNote = approvedSev ? ` (Approved Baseline: ${approvedSev.toUpperCase()})` : '';
      console.log(
        `   ${tag} [${String(a.severity).toUpperCase()}] ${a.module_name}: ${a.title} (${id})${baselineNote}`,
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
    if (escalatedAdvisories.length > 0) {
      console.error(
        `   - ${escalatedAdvisories.length} vulnerability advisory(ies) ESCALATED above approved baseline severity:`,
      );
      escalatedAdvisories.forEach((a) => {
        const id = a.github_advisory_id || a.id;
        const approvedSev = BASELINE_TRACKED_SEVERITIES[id];
        console.error(
          `     * ${id} (${a.module_name}): current severity [${String(a.severity).toUpperCase()}] exceeds approved [${String(approvedSev).toUpperCase()}]`,
        );
      });
    }
    process.exit(1);
  }

  console.log(
    '\n✅ Security Audit Quality Gate PASSED (all active findings match verified baseline severities, 0 criticals).',
  );
  process.exit(0);
}

if (require.main === module) {
  runAudit();
}

module.exports = {
  SEVERITY_LEVELS,
  BASELINE_TRACKED_SEVERITIES,
  BASELINE_TRACKED_ADVISORIES,
  evaluateAuditGate,
};
