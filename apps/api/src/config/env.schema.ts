import { z } from 'zod';

/**
 * Strict Environment Configuration Schema for MerQent API
 * Enforces validated types, ranges, URLs, and secrets across all environments.
 */
export const envConfigSchema = z.object({
  // Runtime & Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000/api/v1'),
  WEB_APP_URL: z.string().url().default('http://localhost:3000'),

  // PostgreSQL & pgvector Database
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (val) => val.startsWith('postgresql://') || val.startsWith('postgres://'),
      'DATABASE_URL must be a valid PostgreSQL connection URI',
    ),
  DATABASE_POOL_MIN: z.coerce.number().int().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  // Redis
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  // Authentication & Session Security
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long for cryptographic security'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long for cryptographic security'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  // AI & LLM Providers
  OPENAI_API_KEY: z.string().default('sk-placeholder-openai-api-key'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_COMPLETION_MODEL: z.string().default('gpt-4o-mini'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),

  // Object Storage
  STORAGE_DRIVER: z.enum(['s3', 'local']).default('s3'),
  STORAGE_ENDPOINT: z.string().url().default('http://localhost:9000'),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_BUCKET_NAME: z.string().default('merqent-secure-documents'),
  STORAGE_ACCESS_KEY_ID: z.string().default('minioadmin'),
  STORAGE_SECRET_ACCESS_KEY: z.string().default('minioadmin'),
  STORAGE_SIGNED_URL_EXPIRY_SECONDS: z.coerce.number().int().min(60).max(86400).default(900),

  // Transactional Email
  RESEND_API_KEY: z.string().default('re_placeholder_api_key'),
  EMAIL_FROM_ADDRESS: z.string().default('MerQent Team <notifications@merqent.com>'),

  // Observability & Telemetry
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('debug'),
  SENTRY_DSN: z.string().optional().default(''),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional().default(''),
});

export type EnvConfig = z.infer<typeof envConfigSchema>;

/**
 * Validates raw environment records against envConfigSchema.
 * Produces readable, formatted error messages when validation fails.
 */
export function validateEnv(rawConfig: Record<string, unknown>): EnvConfig {
  const result = envConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `\n❌ [CONFIGURATION ERROR] Invalid application environment configuration:\n${errorDetails}\n\nPlease check your .env file against .env.example.\n`,
    );
  }

  return result.data;
}
