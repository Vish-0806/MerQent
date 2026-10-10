import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'merqent:rate_limit';

export interface RateLimitOptions {
  limit: number;
  ttlSeconds: number;
  keyPrefix?: string;
}

/**
 * Decorator to apply granular endpoint rate limits.
 *
 * @param options Rate limit parameters (limit, window in seconds, optional key prefix)
 */
export const RateLimit = (options: RateLimitOptions): CustomDecorator<string> =>
  SetMetadata(RATE_LIMIT_KEY, options);
