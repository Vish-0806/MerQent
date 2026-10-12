#!/usr/bin/env node
/**
 * MerQent Database Safety Guard
 *
 * Enforces fail-closed protection against destructive database operations
 * (reset, drop, truncate, wipe, destructive seed).
 *
 * Core Guarantees:
 * 1. Rejects execution when NODE_ENV=production or APP_ENV=production.
 * 2. Parses DATABASE_URL and rejects production/cloud hosts, even if NODE_ENV is unset or incorrect.
 * 3. Fails closed if DATABASE_URL is missing, invalid, or ambiguous.
 * 4. Rejects remote/shared databases by default, requiring explicit dual maintenance override.
 * 5. Requires explicit operation confirmation (--confirm-reset, --force, or CONFIRM_DB_RESET=YES) for local resets.
 * 6. Never exposes database passwords or credentials in errors, diagnostics, or logs.
 * 7. Preserves non-destructive forward migrations (prisma migrate deploy).
 * 8. Ensures Docker service names are not treated as trusted merely because they match a hardcoded name.
 */

const fs = require('fs');
const path = require('path');

// Target classification constants
const TARGET_CLASSIFICATION = {
  LOCAL_LOOPBACK: 'LOCAL_LOOPBACK',
  DOCKER_SERVICE: 'DOCKER_SERVICE',
  REMOTE_SHARED: 'REMOTE_SHARED',
  CLOUD_OR_PRODUCTION: 'CLOUD_OR_PRODUCTION',
  AMBIGUOUS: 'AMBIGUOUS',
};

// Strict local loopback addresses (guaranteed local host machine)
const STRICT_LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

const IPV4_LOOPBACK_REGEX = /^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/;

// Known Docker container / service names.
// SECURITY NOTE: These are NOT treated as trusted local targets merely by name.
// Container service names may route to production/shared databases in containerized environments.
const DOCKER_SERVICE_NAMES = new Set([
  'merqent_postgres',
  'postgres',
  'db',
  'database',
  'host.docker.internal',
  'docker.for.mac.localhost',
]);

// Cloud and production database hostname patterns
const PRODUCTION_HOST_PATTERNS = [
  /\.rds\.amazonaws\.com$/i,
  /\.database\.windows\.net$/i,
  /\.postgres\.database\.azure\.com$/i,
  /\.cloudsql/i,
  /\.supabase\.co$/i,
  /\.neon\.tech$/i,
  /\.cockroachlabs\.cloud$/i,
  /\.render\.com$/i,
  /\.railway\.app$/i,
  /\.fly\.dev$/i,
  /(^|[\.-])prod(uction)?([\.-]|$)/i,
  /(^|[\.-])live([\.-]|$)/i,
  /(^|[\.-])cluster([\.-]|$)/i,
  /(^|[\.-])primary([\.-]|$)/i,
  /(^|[\.-])master([\.-]|$)/i,
];

// Production database name patterns
const PRODUCTION_DB_PATTERNS = [/prod/i, /production/i, /live/i, /primary/i, /master/i];

/**
 * Classifies a database target hostname into a defined security category.
 */
function classifyDatabaseTarget(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    return TARGET_CLASSIFICATION.AMBIGUOUS;
  }

  const h = hostname.toLowerCase().trim();

  // 1. Cloud or production patterns take absolute precedence
  if (PRODUCTION_HOST_PATTERNS.some((pat) => pat.test(h))) {
    return TARGET_CLASSIFICATION.CLOUD_OR_PRODUCTION;
  }

  // 2. Strict local loopback (host machine)
  if (STRICT_LOOPBACK_HOSTS.has(h) || IPV4_LOOPBACK_REGEX.test(h)) {
    return TARGET_CLASSIFICATION.LOCAL_LOOPBACK;
  }

  // 3. Known Docker container / service names (NOT trusted as local loopback)
  if (DOCKER_SERVICE_NAMES.has(h)) {
    return TARGET_CLASSIFICATION.DOCKER_SERVICE;
  }

  // 4. Remote FQDN or IP with domain dots
  if (h.includes('.')) {
    return TARGET_CLASSIFICATION.REMOTE_SHARED;
  }

  // 5. Bare or unresolvable hostname without domain
  return TARGET_CLASSIFICATION.AMBIGUOUS;
}

/**
 * Sanitizes a database connection string by redacting credentials and sensitive query params.
 * Never throws — returns a safe diagnostic token on malformed input.
 */
function sanitizeDatabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '[MISSING_DATABASE_URL]';
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = '***';
    }
    if (parsed.username) {
      parsed.username = '***';
    }

    // Redact sensitive query parameters
    const sensitiveKeys = ['password', 'pwd', 'secret', 'token', 'key', 'auth'];
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        parsed.searchParams.set(key, '***');
      }
    }

    return parsed.toString();
  } catch {
    // Regex fallback for non-standard connection strings
    return rawUrl.replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/i, '$1***$2');
  }
}

/**
 * Parses and extracts database connection target metadata.
 */
function parseDatabaseTarget(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      isValid: false,
      error: 'DATABASE_URL is missing or empty',
      sanitizedUrl: '[MISSING_DATABASE_URL]',
      classification: TARGET_CLASSIFICATION.AMBIGUOUS,
    };
  }

  try {
    const parsed = new URL(rawUrl.trim());

    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
      return {
        isValid: false,
        error: `Unsupported database protocol: ${parsed.protocol} (only postgres/postgresql supported)`,
        sanitizedUrl: sanitizeDatabaseUrl(rawUrl),
        classification: TARGET_CLASSIFICATION.AMBIGUOUS,
      };
    }

    const hostname = parsed.hostname.toLowerCase().trim();
    if (!hostname) {
      return {
        isValid: false,
        error: 'Missing hostname in DATABASE_URL',
        sanitizedUrl: sanitizeDatabaseUrl(rawUrl),
        classification: TARGET_CLASSIFICATION.AMBIGUOUS,
      };
    }

    const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
    const database = parsed.pathname.replace(/^\/+/, '').trim();

    if (!database) {
      return {
        isValid: false,
        error: 'Missing or ambiguous database name in DATABASE_URL',
        sanitizedUrl: sanitizeDatabaseUrl(rawUrl),
        classification: TARGET_CLASSIFICATION.AMBIGUOUS,
      };
    }

    const classification = classifyDatabaseTarget(hostname);

    return {
      isValid: true,
      protocol: parsed.protocol,
      hostname,
      port,
      database,
      classification,
      sanitizedUrl: sanitizeDatabaseUrl(rawUrl),
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Failed to parse DATABASE_URL: ${err.message}`,
      sanitizedUrl: sanitizeDatabaseUrl(rawUrl),
      classification: TARGET_CLASSIFICATION.AMBIGUOUS,
    };
  }
}

/**
 * Resolves DATABASE_URL from process.env or .env file without leaking credentials.
 */
function resolveDatabaseUrl(env = process.env) {
  if (env.DATABASE_URL !== undefined) {
    return env.DATABASE_URL.trim();
  }

  // Check for .env in current directory or project root
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.startsWith('DATABASE_URL=')) {
            const raw = trimmed.substring('DATABASE_URL='.length).trim();
            // Strip surrounding quotes
            return raw.replace(/^["']|["']$/g, '');
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  return '';
}

/**
 * Evaluates whether a destructive database operation is safe to proceed.
 * Returns an evaluation object: { isAllowed: boolean, reason: string, message: string, sanitizedTarget: string }
 */
function evaluateDestructiveOperation(options = {}) {
  const env = options.env || process.env;
  const rawUrl = options.databaseUrl !== undefined ? options.databaseUrl : resolveDatabaseUrl(env);
  const target = parseDatabaseTarget(rawUrl);

  const nodeEnv = (options.nodeEnv || env.NODE_ENV || '').toLowerCase().trim();
  const appEnv = (options.appEnv || env.APP_ENV || env.ENVIRONMENT || '').toLowerCase().trim();
  const confirmation = (options.confirmation || env.CONFIRM_DB_RESET || '').trim();

  const allowRemote =
    options.allowRemote === true ||
    options.allowRemote === 'true' ||
    env.ALLOW_REMOTE_DESTRUCTIVE_DATABASE_OPERATION === 'true';

  const confirmRemote = (
    options.confirmRemote ||
    env.CONFIRM_REMOTE_DESTRUCTIVE_DATABASE_OPERATION ||
    ''
  ).trim();

  // Tier 0: Missing or unparseable database configuration (Fail Closed)
  if (!target.isValid) {
    return {
      isAllowed: false,
      reason: 'MISSING_OR_INVALID_TARGET',
      message: `Database target cannot be verified confidently (${target.error}). Destructive operation aborted.`,
      sanitizedTarget: target.sanitizedUrl,
    };
  }

  // Tier 0B: Ambiguous target (Fail Closed - never bypassable by maintenance override)
  if (target.classification === TARGET_CLASSIFICATION.AMBIGUOUS) {
    return {
      isAllowed: false,
      reason: 'AMBIGUOUS_TARGET_BLOCKED',
      message: `Database target host (${target.hostname}) is ambiguous or unknown. Destructive operations require a verified loopback host or an unambiguous remote host.`,
      sanitizedTarget: target.sanitizedUrl,
    };
  }

  // Tier 1: Reject if explicitly in production environment (Never bypassable by maintenance override)
  if (['production', 'prod'].includes(nodeEnv) || ['production', 'prod'].includes(appEnv)) {
    return {
      isAllowed: false,
      reason: 'PRODUCTION_ENVIRONMENT_BLOCKED',
      message: `Destructive database operations are strictly prohibited when NODE_ENV='${nodeEnv || appEnv}'.`,
      sanitizedTarget: target.sanitizedUrl,
    };
  }

  // Tier 2: Reject if host or database matches cloud / production patterns (Never bypassable by maintenance override)
  const isCloudHost = target.classification === TARGET_CLASSIFICATION.CLOUD_OR_PRODUCTION;
  const isProductionDb = PRODUCTION_DB_PATTERNS.some((pat) => pat.test(target.database));

  if (isCloudHost || isProductionDb) {
    return {
      isAllowed: false,
      reason: 'PRODUCTION_TARGET_BLOCKED',
      message: `Database target (${target.hostname}/${target.database}) matches production/cloud patterns. Destructive operations are strictly prohibited.`,
      sanitizedTarget: target.sanitizedUrl,
    };
  }

  // Tier 3: Target Classification Handling
  const REQUIRED_REMOTE_PHRASE = 'I_CONFIRM_REMOTE_DATABASE_WIPE';

  // 3A: Docker container / service hostnames
  // SECURITY REQUIREMENT: Docker hostnames cannot be treated as trusted merely because they match a hardcoded name.
  // In containerized deployments (production Compose, Kubernetes, ECS), a production database may be named 'postgres' or 'merqent_postgres'.
  if (target.classification === TARGET_CLASSIFICATION.DOCKER_SERVICE) {
    if (!allowRemote || confirmRemote !== REQUIRED_REMOTE_PHRASE) {
      return {
        isAllowed: false,
        reason: 'DOCKER_HOST_NOT_TRUSTED',
        message:
          `Docker service / container host (${target.hostname}) cannot be treated as a trusted local loopback target merely by name. ` +
          `Accidental execution against container/network targets is denied. ` +
          `To authorize an intentional maintenance reset, set ALLOW_REMOTE_DESTRUCTIVE_DATABASE_OPERATION=true ` +
          `and CONFIRM_REMOTE_DESTRUCTIVE_DATABASE_OPERATION='${REQUIRED_REMOTE_PHRASE}'.`,
        sanitizedTarget: target.sanitizedUrl,
      };
    }
  }

  // 3B: Remote / Shared host
  if (target.classification === TARGET_CLASSIFICATION.REMOTE_SHARED) {
    if (!allowRemote || confirmRemote !== REQUIRED_REMOTE_PHRASE) {
      return {
        isAllowed: false,
        reason: 'REMOTE_DATABASE_BLOCKED',
        message:
          `Remote/shared database host (${target.hostname}) rejected by default. ` +
          `Accidental execution against non-local hosts is denied. ` +
          `To authorize an intentional maintenance reset, set ALLOW_REMOTE_DESTRUCTIVE_DATABASE_OPERATION=true ` +
          `and CONFIRM_REMOTE_DESTRUCTIVE_DATABASE_OPERATION='${REQUIRED_REMOTE_PHRASE}'.`,
        sanitizedTarget: target.sanitizedUrl,
      };
    }
  }

  // Tier 4: Require explicit operation confirmation for all permitted resets
  const hasConfirmation =
    confirmation === 'YES' || confirmation === 'true' || options.force === true;

  if (!hasConfirmation) {
    return {
      isAllowed: false,
      reason: 'CONFIRMATION_REQUIRED',
      message:
        `Explicit operation confirmation required. ` +
        `Pass --confirm-reset, --force, or set CONFIRM_DB_RESET=YES to proceed with reset.`,
      sanitizedTarget: target.sanitizedUrl,
    };
  }

  // All safety checks passed
  return {
    isAllowed: true,
    reason: 'SAFETY_CHECKS_PASSED',
    message: `Database target verified safe for reset: ${target.hostname}:${target.port}/${target.database}`,
    sanitizedTarget: target.sanitizedUrl,
    target: {
      hostname: target.hostname,
      port: target.port,
      database: target.database,
      classification: target.classification,
    },
  };
}

/**
 * Command-Line Interface Entry Point
 */
function runGuardCli(args = process.argv.slice(2)) {
  const force = args.includes('--force') || args.includes('-f') || args.includes('--confirm-reset');
  const allowRemote = args.includes('--allow-remote');

  let confirmRemote = '';
  const confirmRemoteArg = args.find((a) => a.startsWith('--confirm-remote='));
  if (confirmRemoteArg) {
    confirmRemote = confirmRemoteArg.split('=')[1] || '';
  }

  const evaluation = evaluateDestructiveOperation({
    force,
    allowRemote,
    confirmRemote,
  });

  if (!evaluation.isAllowed) {
    console.error('\n═══════════════════════════════════════════════════════════════════');
    console.error('      🚨 MERQENT DATABASE SAFETY GUARD — EXECUTION BLOCKED 🚨      ');
    console.error('═══════════════════════════════════════════════════════════════════');
    console.error(`Reason:  ${evaluation.reason}`);
    console.error(`Message: ${evaluation.message}`);
    console.error(`Target:  ${evaluation.sanitizedTarget}`);
    console.error('═══════════════════════════════════════════════════════════════════\n');
    process.exit(1);
  }

  console.log(`✔ [DB Safety Guard] ${evaluation.message}`);
  process.exit(0);
}

if (require.main === module) {
  runGuardCli();
}

module.exports = {
  TARGET_CLASSIFICATION,
  STRICT_LOOPBACK_HOSTS,
  DOCKER_SERVICE_NAMES,
  LOCAL_HOST_WHITELIST: STRICT_LOOPBACK_HOSTS, // Backward-compatible alias
  PRODUCTION_HOST_PATTERNS,
  PRODUCTION_DB_PATTERNS,
  classifyDatabaseTarget,
  sanitizeDatabaseUrl,
  parseDatabaseTarget,
  resolveDatabaseUrl,
  evaluateDestructiveOperation,
  runGuardCli,
};
