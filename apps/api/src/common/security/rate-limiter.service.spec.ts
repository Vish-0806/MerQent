import { RateLimiterService } from './rate-limiter.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  let mockRedisService: jest.Mocked<Partial<RedisService>>;
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

    service = new RateLimiterService(mockRedisService as unknown as RedisService);
  });

  describe('In-memory mode (fallback / local)', () => {
    it('allows requests within limit and tracks remaining quota', async () => {
      const res1 = await service.consume('client-1', 3, 60);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);
      expect(res1.limit).toBe(3);

      const res2 = await service.consume('client-1', 3, 60);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = await service.consume('client-1', 3, 60);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      // Exceeded
      const res4 = await service.consume('client-1', 3, 60);
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.retryAfterSeconds).toBeGreaterThanOrEqual(1);
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

    it('uses atomic incr and expire on first request', async () => {
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);
      mockRedisClient.ttl.mockResolvedValue(60);

      const res = await service.consume('redis-client', 5, 60);

      expect(mockRedisClient.incr).toHaveBeenCalledWith('ratelimit:redis-client');
      expect(mockRedisClient.expire).toHaveBeenCalledWith('ratelimit:redis-client', 60);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4);
    });

    it('returns allowed: false when Redis incr exceeds limit', async () => {
      mockRedisClient.incr.mockResolvedValue(6);
      mockRedisClient.ttl.mockResolvedValue(45);

      const res = await service.consume('redis-client', 5, 60);

      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
      expect(res.retryAfterSeconds).toBe(45);
    });

    it('falls back seamlessly to in-memory tracking if Redis command fails', async () => {
      mockRedisClient.incr.mockRejectedValue(new Error('Redis connection lost'));

      const res = await service.consume('redis-fail-client', 5, 60);

      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4);
    });
  });
});
