import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@merqent/shared-types';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard (Task 2.8)', () => {
  let guard: JwtAuthGuard;
  let mockReflector: { getAllAndOverride: jest.Mock };
  let mockJwtService: { verifyAsync: jest.Mock };
  let mockConfigService: { get: jest.Mock };
  let mockRedisService: { isTokenBlacklisted: jest.Mock };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };
    mockJwtService = {
      verifyAsync: jest.fn(),
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret-key-32-chars-long'),
    };
    mockRedisService = {
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    };

    guard = new JwtAuthGuard(
      mockReflector as unknown as Reflector,
      mockJwtService as unknown as JwtService,
      mockConfigService as unknown as ConfigService,
      mockRedisService as unknown as RedisService,
    );
  });

  interface MockRequest {
    headers: { authorization?: string };
    user?: { id: string; email: string; role: UserRole };
  }

  const createMockContext = (
    authHeader?: string,
  ): { context: ExecutionContext; req: MockRequest } => {
    const req: MockRequest = {
      headers: {
        authorization: authHeader,
      },
    };

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    return { context, req };
  };

  it('allows access to public endpoints decorated with @Public', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const { context } = createMockContext();

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when Authorization header is missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { context } = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Authorization header is missing or invalid',
    );
  });

  it('throws UnauthorizedException when Authorization format is not Bearer', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { context } = createMockContext('Basic somecredentials');

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid authorization format; expected Bearer token',
    );
  });

  it('throws UnauthorizedException when token type is not access', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 'usr-1',
      type: 'refresh', // refresh token used instead of access token!
    });
    const { context } = createMockContext('Bearer some-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid token purpose; access token required',
    );
  });

  it('throws UnauthorizedException when token is blacklisted in Redis', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 'usr-1',
      email: 'user@test.com',
      role: UserRole.PE_FIRM_ADMIN,
      type: 'access',
    });
    mockRedisService.isTokenBlacklisted.mockResolvedValue(true);
    const { context } = createMockContext('Bearer some-token');

    await expect(guard.canActivate(context)).rejects.toThrow('Token has been revoked');
  });

  it('attaches sanitized user to request and allows access on valid token', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 'usr-1',
      email: 'lead@pmi.com',
      role: UserRole.CONSULTANT_OPERATOR,
      type: 'access',
    });
    mockRedisService.isTokenBlacklisted.mockResolvedValue(false);

    const { context, req } = createMockContext('Bearer valid-jwt-token');

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(req.user).toEqual({
      id: 'usr-1',
      email: 'lead@pmi.com',
      role: UserRole.CONSULTANT_OPERATOR,
    });
  });
});
