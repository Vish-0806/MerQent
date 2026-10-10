import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiterService } from './rate-limiter.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { ErrorCode } from '@merqent/shared-types';

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  let mockRedisService: jest.Mocked<Partial<RedisService>>;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;
  let mockRedisClient: {
    incr: jest.Mock;
    expire: jest.Mock;
    ttl: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    mockRedisClient = {
      incr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      del: jest.fn(),
    };

    mockRedisService = {
      isReady: jest.fn().mockReturnValue(false),
      getClient: jest
        .fn()
        .mockReturnValue(mockRedisClient as unknown as ReturnType<RedisService['getClient']>),
      del: jest.fn().mockResolvedValue(1),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const configMap: Record<string, unknown> = {
          'rateLimit.redisFailClosed': false,
          nodeEnv: 'development',
        };
        return configMap[key] ?? defaultValue;
      }),
    };

    service = new RateLimiterService(
      mockRedisService as unknown as RedisService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('In-memory mode (fallback / local)', () => {
    it('allows requests within limit, tracks remaining quota, and flags degraded=true', async () => {
      const res1 = await service.consume('client-1', 3, 60);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);
      expect(res1.limit).toBe(3);
      expect(res1.degraded).toBe(true);

      const res2 = await service.consume('client-1', 3, 60);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);
      expect(res2.degraded).toBe(true);

      const res3 = await service.consume('client-1', 3, 60);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);
      expect(res3.degraded).toBe(true);

      // Exceeded
      const res4 = await service.consume('client-1', 3, 60);
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(res4.degraded).toBe(true);
    });

    it('resets quota when reset is invoked', async () => {
      await service.consume('client-reset', 1, 60);
      const blocked = await service.consume('client-reset', 1, 60);
      expect(blocked.allowed).toBe(false);

      await service.reset('client-reset');
      const allowedAfterReset = await service.consume('client-reset', 1, 60);
      expect(allowedAfterReset.allowed).toBe(true);
    });
  });

  describe('Distributed mode (Redis)', () => {
    beforeEach(() => {
      mockRedisService.isReady = jest.fn().mockReturnValue(true);
    });

    it('uses atomic incr and expire on first request with degraded=false', async () => {
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);
      mockRedisClient.ttl.mockResolvedValue(60);

      const res = await service.consume('redis-client', 5, 60);

      expect(mockRedisClient.incr).toHaveBeenCalledWith('ratelimit:redis-client');
      expect(mockRedisClient.expire).toHaveBeenCalledWith('ratelimit:redis-client', 60);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4);
      expect(res.degraded).toBe(false);
    });

    it('returns allowed: false when Redis incr exceeds limit', async () => {
      mockRedisClient.incr.mockResolvedValue(6);
      mockRedisClient.ttl.mockResolvedValue(45);

      const res = await service.consume('redis-client', 5, 60);

      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
      expect(res.retryAfterSeconds).toBe(45);
      expect(res.degraded).toBe(false);
    });

    it('falls back to degraded in-memory mode when Redis fails under default policy', async () => {
      mockRedisClient.incr.mockRejectedValue(new Error('Redis connection lost'));

      const res = await service.consume('redis-fail-client', 5, 60);

      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4);
      expect(res.degraded).toBe(true);
    });
  });

  describe('Redis Failure Policy (Fail-Closed)', () => {
    it('throws 503 Service Unavailable when Redis is offline and failClosed is true', async () => {
      mockRedisService.isReady = jest.fn().mockReturnValue(false);
      mockConfigService.get = jest.fn((key: string, defaultValue?: unknown) => {
        const configMap: Record<string, unknown> = {
          'rateLimit.redisFailClosed': true,
          nodeEnv: 'production',
        };
        return configMap[key] ?? defaultValue;
      });

      try {
        await service.consume('auth:login:10.0.0.1', 5, 60);
        fail('Expected 503 HttpException to be thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(HttpException);
        const httpErr = err as HttpException;
        expect(httpErr.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        const resp = httpErr.getResponse() as Record<string, unknown>;
        expect(resp.errorCode).toBe(ErrorCode.SERVICE_UNAVAILABLE);
        expect(String(resp.message)).toContain('temporarily unavailable');
      }
    });

    it('throws 503 Service Unavailable when Redis throws runtime error and failClosed is true', async () => {
      mockRedisService.isReady = jest.fn().mockReturnValue(true);
      mockRedisClient.incr.mockRejectedValue(new Error('Redis cluster partitioned'));
      mockConfigService.get = jest.fn((key: string, defaultValue?: unknown) => {
        const configMap: Record<string, unknown> = {
          'rateLimit.redisFailClosed': true,
          nodeEnv: 'production',
        };
        return configMap[key] ?? defaultValue;
      });

      try {
        await service.consume('auth:login:10.0.0.1', 5, 60);
        fail('Expected 503 HttpException to be thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(HttpException);
        const httpErr = err as HttpException;
        expect(httpErr.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        const resp = httpErr.getResponse() as Record<string, unknown>;
        expect(resp.errorCode).toBe(ErrorCode.SERVICE_UNAVAILABLE);
      }
    });
  });
});
