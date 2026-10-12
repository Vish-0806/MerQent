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
 */

const fs = require('fs');
const path = require('path');

// Safe local database hostnames
const LOCAL_HOST_WHITELIST = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  '0.0.0.0',
  'docker.for.mac.localhost',
  'host.docker.internal',
  'merqent_postgres',
  'postgres',
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
  /(^|\.)prod(uction)?[\.-]/i,
  /(^|\.)live[\.-]/i,
  /(^|\.)cluster[\.-]/i,
];

// Production database name patterns
const PRODUCTION_DB_PATTERNS = [/prod/i, /production/i, /live/i, /primary/i, /master/i];

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
    };
  }

  try {
    const parsed = new URL(rawUrl.trim());

    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
      return {
        isValid: false,
        error: `Unsupported database protocol: ${parsed.protocol} (only postgres/postgresql supported)`,
        sanitizedUrl: sanitizeDatabaseUrl(rawUrl),
      };
    }

    const hostname = parsed.hostname.toLowerCase().trim();
    if (!hostname) {
      return {
        isValid: false,
        error: 'Missing hostname in DATABASE_URL',
        sanitizedUrl: sanitizeDatabaseUrl(rawUrl),
      };
    }

    const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
    const database = parsed.pathname.replace(/^\/+/, '').trim();

    return {
      isValid: true,
      protocol: parsed.protocol,
      hostname,
      port,
      database: database || 'default',
      sanitizedUrl: sanitizeDatabaseUrl(rawUrl),
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Failed to parse DATABASE_URL: ${err.message}`,
      sanitizedUrl: sanitizeDatabaseUrl(rawUrl),
    };
  }
}

/**
 * Resolves DATABASE_URL from process.env or .env file without leaking credentials.
 */
function resolveDatabaseUrl(env = process.env) {
  if (env.DATABASE_URL && env.DATABASE_URL.trim()) {
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

  // 1. Missing or unparseable database configuration (Fail Closed)
  if (!target.isValid) {
    return {
      isAllowed: false,
      reason: 'MISSING_OR_INVALID_TARGET',
      message: `Database target cannot be verified confidently (${target.error}). Destructive operation aborted.`,
      sanitizedTarget: target.sanitizedUrl,
    };
  }

  // 2. Reject if explicitly in production environment
  if (['production', 'prod'].includes(nodeEnv) || ['production', 'prod'].includes(appEnv)) {
    return {
      isAllowed: false,
      reason: 'PRODUCTION_ENVIRONMENT_BLOCKED',
      message: `Destructive database operations are strictly prohibited when NODE_ENV='${nodeEnv || appEnv}'.`,
      sanitizedTarget: target.sanitizedUrl,
    };
  }

  // 3. Reject if host or database matches cloud / production patterns (even if NODE_ENV is unset or 'development')
  const isCloudHost = PRODUCTION_HOST_PATTERNS.some((pat) => pat.test(target.hostname));
  const isProductionDb = PRODUCTION_DB_PATTERNS.some((pat) => pat.test(target.database));

  if (isCloudHost || isProductionDb) {
    return {
      isAllowed: false,
      reason: 'PRODUCTION_TARGET_BLOCKED',
      message: `Database target (${target.hostname}/${target.database}) matches production/cloud patterns. Destructive operations are strictly prohibited.`,
      sanitizedTarget: target.sanitizedUrl,
    };
  }

  // 4. Distinguish Local vs Remote / Shared host
  const isLocalHost = LOCAL_HOST_WHITELIST.has(target.hostname);

  if (!isLocalHost) {
    // Remote host requires explicit authorized maintenance procedure
    const REQUIRED_REMOTE_PHRASE = 'I_CONFIRM_REMOTE_DATABASE_WIPE';

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

  // 5. Require explicit operation confirmation for local/test resets
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
  LOCAL_HOST_WHITELIST,
  PRODUCTION_HOST_PATTERNS,
  PRODUCTION_DB_PATTERNS,
  sanitizeDatabaseUrl,
  parseDatabaseTarget,
  resolveDatabaseUrl,
  evaluateDestructiveOperation,
  runGuardCli,
};
