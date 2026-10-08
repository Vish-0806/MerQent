import { validateEnv } from './env.schema';

describe('Environment Configuration Validation (Task 2.2)', () => {
  const validBaseEnv = {
    NODE_ENV: 'development',
    PORT: '4000',
    API_BASE_URL: 'http://localhost:4000/api/v1',
    WEB_APP_URL: 'http://localhost:3000',
    DATABASE_URL:
      'postgresql://merqent_user:merqent_dev_password@localhost:5432/merqent_db?schema=public',
    DATABASE_POOL_MIN: '2',
    DATABASE_POOL_MAX: '10',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_key_at_least_32_characters_long',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_key_at_least_32_characters_long',
    JWT_REFRESH_EXPIRES_IN: '7d',
    COOKIE_DOMAIN: 'localhost',
    COOKIE_SECURE: 'false',
    STORAGE_DRIVER: 's3',
    STORAGE_ENDPOINT: 'http://localhost:9000',
    STORAGE_REGION: 'us-east-1',
    STORAGE_BUCKET_NAME: 'merqent-secure-documents',
    STORAGE_ACCESS_KEY_ID: 'minioadmin',
    STORAGE_SECRET_ACCESS_KEY: 'minioadmin',
    STORAGE_SIGNED_URL_EXPIRY_SECONDS: '900',
    LOG_LEVEL: 'debug',
  };

  it('should validate and parse a fully conformant environment record with defaults', () => {
    const config = validateEnv(validBaseEnv);

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(4000);
    expect(config.DATABASE_URL).toContain('postgresql://');
    expect(config.JWT_ACCESS_SECRET).toHaveLength(validBaseEnv.JWT_ACCESS_SECRET.length);
    expect(config.STORAGE_BUCKET_NAME).toBe('merqent-secure-documents');
    expect(config.OPENAI_API_KEY).toBe('sk-placeholder-openai-api-key');
  });

  it('should fail with explicit error when DATABASE_URL is missing', () => {
    const invalidEnv = { ...validBaseEnv };
    delete (invalidEnv as Record<string, unknown>).DATABASE_URL;

    expect(() => validateEnv(invalidEnv)).toThrow('[CONFIGURATION ERROR]');
  });

  it('should fail with explicit error when DATABASE_URL has invalid protocol', () => {
    const invalidEnv = { ...validBaseEnv, DATABASE_URL: 'mysql://user:pass@localhost:3306/db' };

    expect(() => validateEnv(invalidEnv)).toThrow(
      'DATABASE_URL must be a valid PostgreSQL connection URI',
    );
  });

  it('should fail when PORT is outside acceptable range', () => {
    const invalidEnv = { ...validBaseEnv, PORT: '80' };

    expect(() => validateEnv(invalidEnv)).toThrow('[CONFIGURATION ERROR]');
  });

  it('should fail when API_BASE_URL is not a valid URL', () => {
    const invalidEnv = { ...validBaseEnv, API_BASE_URL: 'not-a-valid-url' };

    expect(() => validateEnv(invalidEnv)).toThrow('[CONFIGURATION ERROR]');
  });

  it('should fail when NODE_ENV is an unapproved environment name', () => {
    const invalidEnv = { ...validBaseEnv, NODE_ENV: 'staging' };

    expect(() => validateEnv(invalidEnv)).toThrow('[CONFIGURATION ERROR]');
  });

  it('should fail when JWT_ACCESS_SECRET is shorter than 32 characters', () => {
    const invalidEnv = { ...validBaseEnv, JWT_ACCESS_SECRET: 'too_short' };

    expect(() => validateEnv(invalidEnv)).toThrow(
      'JWT_ACCESS_SECRET must be at least 32 characters long',
    );
  });

  it('should fail when JWT_REFRESH_SECRET is shorter than 32 characters', () => {
    const invalidEnv = { ...validBaseEnv, JWT_REFRESH_SECRET: 'too_short' };

    expect(() => validateEnv(invalidEnv)).toThrow(
      'JWT_REFRESH_SECRET must be at least 32 characters long',
    );
  });

  it('should fail when STORAGE_ENDPOINT is not a valid URL', () => {
    const invalidEnv = { ...validBaseEnv, STORAGE_ENDPOINT: 'invalid-endpoint' };

    expect(() => validateEnv(invalidEnv)).toThrow('[CONFIGURATION ERROR]');
  });
});
