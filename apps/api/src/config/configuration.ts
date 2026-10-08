import { validateEnv, EnvConfig } from './env.schema';

export interface AppConfiguration {
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  apiBaseUrl: string;
  webAppUrl: string;
  database: {
    url: string;
    poolMin: number;
    poolMax: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    cookieDomain: string;
    cookieSecure: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  storage: {
    driver: string;
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    signedUrlExpirySeconds: number;
  };
  email: {
    apiKey: string;
    fromAddress: string;
  };
  ai: {
    openaiApiKey: string;
    anthropicApiKey?: string;
    embeddingModel: string;
    completionModel: string;
  };
  observability: {
    logLevel: string;
    sentryDsn?: string;
    otelEndpoint?: string;
  };
  cors: {
    origin: string;
  };
}

export default (): AppConfiguration => {
  const env: EnvConfig = validateEnv(process.env);

  return {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    apiBaseUrl: env.API_BASE_URL,
    webAppUrl: env.WEB_APP_URL,
    database: {
      url: env.DATABASE_URL,
      poolMin: env.DATABASE_POOL_MIN,
      poolMax: env.DATABASE_POOL_MAX,
    },
    jwt: {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      cookieDomain: env.COOKIE_DOMAIN,
      cookieSecure: env.COOKIE_SECURE,
    },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
    },
    storage: {
      driver: env.STORAGE_DRIVER,
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      bucket: env.STORAGE_BUCKET_NAME,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
      signedUrlExpirySeconds: env.STORAGE_SIGNED_URL_EXPIRY_SECONDS,
    },
    email: {
      apiKey: env.RESEND_API_KEY,
      fromAddress: env.EMAIL_FROM_ADDRESS,
    },
    ai: {
      openaiApiKey: env.OPENAI_API_KEY,
      anthropicApiKey: env.ANTHROPIC_API_KEY || undefined,
      embeddingModel: env.OPENAI_EMBEDDING_MODEL,
      completionModel: env.OPENAI_COMPLETION_MODEL,
    },
    observability: {
      logLevel: env.LOG_LEVEL,
      sentryDsn: env.SENTRY_DSN || undefined,
      otelEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT || undefined,
    },
    cors: {
      origin: env.WEB_APP_URL,
    },
  };
};
