/**
 * Utility to sanitize sensitive fields from objects before logging or persistence.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /hash/i,
  /credential/i,
  /apikey/i,
  /api_key/i,
  /authorization/i,
  /cookie/i,
];

/**
 * Checks whether a given property key name is considered sensitive.
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Masks a sensitive string, preserving only the first 2 and last 4 characters if sufficiently long.
 */
export function maskSensitiveString(val: string): string {
  if (!val || typeof val !== 'string') return '***';
  if (val.length <= 8) return '***REDACTED***';
  return `${val.slice(0, 2)}***${val.slice(-4)}`;
}

/**
 * Recursively clones and sanitizes an object or array, masking all sensitive values.
 */
export function sanitizeObject<T = unknown>(obj: T, depth = 0): T {
  if (depth > 10) return obj; // Safeguard against circular references or deep recursion
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = typeof value === 'string' ? maskSensitiveString(value) : '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized as T;
  }

  return obj;
}
