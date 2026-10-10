import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimiterService } from '../security/rate-limiter.service';
import { ErrorCode } from '@merqent/shared-types';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;
  let rateLimiterService: jest.Mocked<RateLimiterService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    rateLimiterService = {
      consume: jest.fn(),
      reset: jest.fn(),
    } as unknown as jest.Mocked<RateLimiterService>;

    guard = new RateLimitGuard(reflector, rateLimiterService);
  });

  const createMockContext = (
    ip = '192.168.1.1',
    forwardedFor?: string,
  ): { context: ExecutionContext; headers: Record<string, string> } => {
    const headers: Record<string, string> = {};
    const req = {
      ip,
      headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
      socket: { remoteAddress: ip },
    } as unknown as Request;
    const res = {
      setHeader: jest.fn((name: string, value: string) => {
        headers[name.toLowerCase()] = String(value);
      }),
    } as unknown as Response;

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;

    return { context, headers };
  };

  it('should allow request when no rate limit metadata is present', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const { context } = createMockContext();

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(rateLimiterService.consume).not.toHaveBeenCalled();
  });

  it('should enforce rate limit and set headers on successful consumption', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      limit: 10,
      ttlSeconds: 60,
      keyPrefix: 'test',
    });

    rateLimiterService.consume.mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      retryAfterSeconds: 0,
      resetTime: 1700000060,
    });

    const { context, headers } = createMockContext('10.0.0.1');

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(rateLimiterService.consume).toHaveBeenCalledWith('test:10.0.0.1', 10, 60);
    expect(headers['x-ratelimit-limit']).toBe('10');
    expect(headers['x-ratelimit-remaining']).toBe('9');
    expect(headers['x-ratelimit-reset']).toBe('1700000060');
  });

  it('should extract client IP from x-forwarded-for if present', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      limit: 5,
      ttlSeconds: 60,
      keyPrefix: 'auth',
    });

    rateLimiterService.consume.mockResolvedValue({
      allowed: true,
      limit: 5,
      remaining: 4,
      retryAfterSeconds: 0,
      resetTime: 1700000060,
    });

    const { context } = createMockContext('127.0.0.1', '203.0.113.195, 70.41.3.18');

    await guard.canActivate(context);

    expect(rateLimiterService.consume).toHaveBeenCalledWith('auth:203.0.113.195', 5, 60);
  });

  it('should throw 429 HttpException with standard error structure when rate limit exceeded', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      limit: 5,
      ttlSeconds: 60,
      keyPrefix: 'login',
    });

    rateLimiterService.consume.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      retryAfterSeconds: 45,
      resetTime: 1700000060,
    });

    const { context, headers } = createMockContext('192.168.1.50');

    try {
      await guard.canActivate(context);
      fail('Expected guard to throw HttpException');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      const response = httpErr.getResponse() as Record<string, unknown>;
      expect(response.errorCode).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
      expect(String(response.message)).toContain('Too many requests');
    }

    expect(headers['retry-after']).toBe('45');
    expect(headers['x-ratelimit-limit']).toBe('5');
    expect(headers['x-ratelimit-remaining']).toBe('0');
  });
});
