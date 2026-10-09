import { sanitizeObject, maskSensitiveString, isSensitiveKey } from './sanitize.util';

describe('SanitizeUtil (Task 2.11: Common Infrastructure)', () => {
  it('detects sensitive keys correctly', () => {
    expect(isSensitiveKey('password')).toBe(true);
    expect(isSensitiveKey('hashedPassword')).toBe(true);
    expect(isSensitiveKey('accessToken')).toBe(true);
    expect(isSensitiveKey('refreshToken')).toBe(true);
    expect(isSensitiveKey('apiKey')).toBe(true);
    expect(isSensitiveKey('authorization')).toBe(true);
    expect(isSensitiveKey('clientSecret')).toBe(true);

    expect(isSensitiveKey('id')).toBe(false);
    expect(isSensitiveKey('email')).toBe(false);
    expect(isSensitiveKey('fullName')).toBe(false);
    expect(isSensitiveKey('role')).toBe(false);
  });

  it('masks sensitive strings properly', () => {
    expect(maskSensitiveString('short')).toBe('***REDACTED***');
    expect(maskSensitiveString('super-secret-token-value-12345')).toBe('su***2345');
    expect(maskSensitiveString('')).toBe('***');
  });

  it('recursively sanitizes complex nested objects and arrays without mutating originals', () => {
    const rawPayload = {
      id: 'usr-100',
      email: 'investor@blackstone.com',
      password: 'PlaintextPassword123!',
      metadata: {
        refreshToken: 'rt-secret-token-abcdefghijk-9999',
        lastLogin: '2026-10-09T20:00:00Z',
      },
      sessions: [
        { sessionId: 'sess-1', hash: 'argon2id-hash-string-value-4444', isValid: true },
        { sessionId: 'sess-2', hash: 'argon2id-hash-string-value-5555', isValid: false },
      ],
    };

    const sanitized = sanitizeObject(rawPayload);

    expect(sanitized.id).toBe('usr-100');
    expect(sanitized.email).toBe('investor@blackstone.com');
    expect(sanitized.password).not.toBe('PlaintextPassword123!');
    expect(sanitized.password).toContain('***');

    expect(sanitized.metadata.lastLogin).toBe('2026-10-09T20:00:00Z');
    expect(sanitized.metadata.refreshToken).not.toBe('rt-secret-token-abcdefghijk-9999');
    expect(sanitized.metadata.refreshToken).toContain('***');

    const session0 = sanitized.sessions?.[0];
    expect(session0?.sessionId).toBe('sess-1');
    expect(session0?.hash).toContain('***');
    expect(session0?.isValid).toBe(true);

    // Verify original object was NOT mutated
    expect(rawPayload.password).toBe('PlaintextPassword123!');
  });

  it('handles null, undefined, and non-object primitives safely', () => {
    expect(sanitizeObject(null)).toBeNull();
    expect(sanitizeObject(undefined)).toBeUndefined();
    expect(sanitizeObject(42)).toBe(42);
    expect(sanitizeObject('normal string')).toBe('normal string');
  });
});
