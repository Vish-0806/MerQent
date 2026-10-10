import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService, AuthResult } from './auth.service';
import { RATE_LIMIT_KEY } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Request, Response } from 'express';

describe('Auth Security Baseline (Task 2.13)', () => {
  let controller: AuthController;
  let mockAuthService: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    getMe: jest.Mock;
  };
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;
  let mockReq: Partial<Request>;
  let mockRes: {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };
  const reflector = new Reflector();

  beforeEach(() => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getMe: jest.fn(),
    };

    mockReq = {
      ip: '198.51.100.1',
      socket: { remoteAddress: '198.51.100.1' } as unknown as Request['socket'],
      headers: { 'user-agent': 'Security-Audit-Agent' },
      cookies: { refresh_token: 'test-refresh-token' },
    };

    mockRes = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  describe('Rate Limiting Annotations', () => {
    it('AuthController is protected by RateLimitGuard at class level', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, AuthController);
      expect(guards).toBeDefined();
      expect(guards).toContain(RateLimitGuard);
    });

    it('login route enforces 5 requests per 60s limit with auth:login prefix', () => {
      const options = reflector.get(RATE_LIMIT_KEY, AuthController.prototype.login);
      expect(options).toEqual({
        limit: 5,
        ttlSeconds: 60,
        keyPrefix: 'auth:login',
      });
    });

    it('register route enforces 5 requests per 60s limit with auth:register prefix', () => {
      const options = reflector.get(RATE_LIMIT_KEY, AuthController.prototype.register);
      expect(options).toEqual({
        limit: 5,
        ttlSeconds: 60,
        keyPrefix: 'auth:register',
      });
    });

    it('refresh route enforces 15 requests per 60s limit with auth:refresh prefix', () => {
      const options = reflector.get(RATE_LIMIT_KEY, AuthController.prototype.refresh);
      expect(options).toEqual({
        limit: 15,
        ttlSeconds: 60,
        keyPrefix: 'auth:refresh',
      });
    });
  });

  describe('Cookie Security Attributes in Production', () => {
    it('sets secure=true, httpOnly=true, sameSite=strict when NODE_ENV is production', async () => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            nodeEnv: 'production',
            'jwt.cookieSecure': true,
            'jwt.cookieDomain': 'merqent.com',
          };
          return config[key] ?? defaultValue;
        }),
      };

      controller = new AuthController(
        mockAuthService as unknown as AuthService,
        mockConfigService as unknown as ConfigService,
      );

      mockAuthService.login.mockResolvedValue({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-secure-123',
        user: { id: 'user-1' } as unknown as AuthResult['user'],
      });

      await controller.login(
        { email: 'user@fund.com', password: 'Password123!' },
        mockReq as Request,
        mockRes as unknown as Response,
      );

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token-secure-123',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          domain: 'merqent.com',
          path: '/',
        }),
      );
    });

    it('clears cookie with matching secure=true in production', async () => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            nodeEnv: 'production',
            'jwt.cookieSecure': true,
            'jwt.cookieDomain': 'merqent.com',
          };
          return config[key] ?? defaultValue;
        }),
      };

      controller = new AuthController(
        mockAuthService as unknown as AuthService,
        mockConfigService as unknown as ConfigService,
      );

      mockAuthService.logout.mockResolvedValue({ success: true, message: 'Logged out' });

      await controller.logout(mockReq as Request, mockRes as unknown as Response);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          domain: 'merqent.com',
          path: '/',
        }),
      );
    });
  });
});
