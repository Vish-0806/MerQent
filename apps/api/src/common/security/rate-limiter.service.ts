import { Injectable, Logger, Optional } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetTime: number; // Unix epoch seconds
}

interface InMemoryRecord {
  count: number;
  expiresAt: number; // Unix epoch ms
}

/**
 * Enterprise-grade distributed rate limiter with Redis backend and resilient in-memory fallback.
 * Employs fixed-window rate tracking with atomic increments and automatic expiry.
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly inMemoryCache = new Map<string, InMemoryRecord>();

  constructor(@Optional() private readonly redisService?: RedisService) {}

  /**
   * Consume a rate limit unit against the given key.
   *
   * @param key Unique identifier (e.g. `auth:login:192.168.1.1`)
   * @param limit Max permitted requests within the window
   * @param ttlSeconds Window size in seconds
   */
  async consume(key: string, limit: number, ttlSeconds: number): Promise<RateLimitResult> {
    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);

    // Prefer Redis distributed rate limiting if connected
    if (this.redisService?.isReady()) {
      try {
        const client = this.redisService.getClient();
        if (client) {
          const redisKey = `ratelimit:${key}`;
          const current = await client.incr(redisKey);
          if (current === 1) {
            await client.expire(redisKey, ttlSeconds);
          }
          const ttl = await client.ttl(redisKey);
          const effectiveTtl = ttl > 0 ? ttl : ttlSeconds;
          const resetTime = nowSec + effectiveTtl;

          if (current > limit) {
            return {
              allowed: false,
              limit,
              remaining: 0,
              retryAfterSeconds: effectiveTtl,
              resetTime,
            };
          }

          return {
            allowed: true,
            limit,
            remaining: Math.max(0, limit - current),
            retryAfterSeconds: 0,
            resetTime,
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Redis rate limiting failed, falling back to memory: ${msg}`);
      }
    }

    // In-memory fallback
    this.cleanExpiredMemoryEntries(nowMs);

    let record = this.inMemoryCache.get(key);
    if (!record || record.expiresAt <= nowMs) {
      record = {
        count: 1,
        expiresAt: nowMs + ttlSeconds * 1000,
      };
      this.inMemoryCache.set(key, record);
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        retryAfterSeconds: 0,
        resetTime: Math.ceil(record.expiresAt / 1000),
      };
    }

    record.count++;
    const retryAfter = Math.ceil((record.expiresAt - nowMs) / 1000);
    const resetTime = Math.ceil(record.expiresAt / 1000);

    if (record.count > limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfterSeconds: Math.max(1, retryAfter),
        resetTime,
      };
    }

    return {
      allowed: true,
      limit,
      remaining: limit - record.count,
      retryAfterSeconds: 0,
      resetTime,
    };
  }

  /**
   * Reset rate limit state for a key.
   */
  async reset(key: string): Promise<void> {
    if (this.redisService?.isReady()) {
      try {
        await this.redisService.del(`ratelimit:${key}`);
      } catch {
        // Ignore deletion failure
      }
    }
    this.inMemoryCache.delete(key);
  }

  private cleanExpiredMemoryEntries(nowMs: number): void {
    // Only clean periodically if size grows
    if (this.inMemoryCache.size > 200) {
      for (const [k, v] of this.inMemoryCache.entries()) {
        if (v.expiresAt <= nowMs) {
          this.inMemoryCache.delete(k);
        }
      }
    }
  }
}
