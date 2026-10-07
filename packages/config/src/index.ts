/**
 * MerQent Shared Configuration Constants and Conventions
 */

export const APP_CONSTANTS = {
  APP_NAME: 'MerQent',
  API_VERSION: 'v1',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PASSWORD_MIN_LENGTH: 12,
  TOKEN_EXPIRY: {
    ACCESS_TOKEN: '15m',
    REFRESH_TOKEN: '7d',
    EMAIL_VERIFICATION: '24h',
    PASSWORD_RESET: '1h',
  },
  RATE_LIMITS: {
    PUBLIC_API: { ttl: 60, limit: 100 },
    AUTH_API: { ttl: 900, limit: 10 },
    AI_MATCHING: { ttl: 3600, limit: 50 },
  },
} as const;

export type AppConstants = typeof APP_CONSTANTS;
