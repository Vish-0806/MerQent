import { UnauthorizedException, ForbiddenException, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MetricsAuthGuard } from './metrics-auth.guard';
import { UserRole } from '@merqent/shared-types';
import { RedisService } from '../redis/redis.service';
import { RequestContextService } from '../../common/context/request-context.service';

describe('MetricsAuthGuard (Task 2.R4)', () => {
  let guard: MetricsAuthGuard;
  let configService: ConfigService;
  let jwtService: JwtService;
  let redisService: RedisService;
  let requestContextService: RequestContextService;

  const VALID_SCRAPE_KEY = 'monitoring-scraper-secret-token-key-2026';
  const JWT_SECRET = 'super-secret-jwt-signing-key-for-test-32chars!';

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'observability.metricsScrapeKey') return VALID_SCRAPE_KEY;
        if (key === 'jwt.secret') return JWT_SECRET;
        return undefined;
      }),
    } as unknown as ConfigService;

    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as JwtService;

    redisService = {
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    } as unknown as RedisService;

    requestContextService = {
      setUser: jest.fn(),
    } as unknown as RequestContextService;

    guard = new MetricsAuthGuard(configService, jwtService, redisService, requestContextService);
  });

  function createMockContext(headers: Record<string, string | undefined>): ExecutionContext {
    const request = {
      headers: { ...headers },
      user: undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  describe('Unauthenticated & Missing Credentials', () => {
    it('throws UnauthorizedException when no auth headers are provided', async () => {
      const context = createMockContext({});
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        /Authentication required to access operational telemetry/i,
      );
    });

    it('throws UnauthorizedException when authorization header is empty or malformed', async () => {
      const context = createMockContext({ authorization: 'Basic user:pass' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(/expected Bearer token/i);
    });
  });

  describe('Machine-to-Machine Scraper Authentication (x-metrics-key header)', () => {
    it('allows request when valid x-metrics-key matches configured server key', async () => {
      const context = createMockContext({ 'x-metrics-key': VALID_SCRAPE_KEY });
      const allowed = await guard.canActivate(context);

      expect(allowed).toBe(true);
      const req = context.switchToHttp().getRequest();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('system:metrics-scraper');
      expect(req.user.role).toBe(UserRole.PLATFORM_ADMIN);
    });

    it('throws UnauthorizedException when x-metrics-key is invalid or incorrect', async () => {
      const context = createMockContext({ 'x-metrics-key': 'wrong-unauthorized-key' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        /Invalid metrics scraper authentication key/i,
      );
    });

    it('fails closed when x-metrics-key is supplied but METRICS_SCRAPE_KEY is not configured on server', async () => {
      (configService.get as jest.Mock).mockReturnValue(undefined);
      delete process.env.METRICS_SCRAPE_KEY;

      const context = createMockContext({ 'x-metrics-key': VALID_SCRAPE_KEY });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        /Machine-to-machine metrics authentication is not configured/i,
      );
    });

    it('throws UnauthorizedException when x-metrics-key is empty string or whitespace', async () => {
      const context = createMockContext({ 'x-metrics-key': '   ' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        /Invalid or empty x-metrics-key header/i,
      );
    });
  });

  describe('Machine-to-Machine Scraper Authentication (Bearer token)', () => {
    it('allows request when Bearer token matches configured METRICS_SCRAPE_KEY', async () => {
      const context = createMockContext({ authorization: `Bearer ${VALID_SCRAPE_KEY}` });
      const allowed = await guard.canActivate(context);

      expect(allowed).toBe(true);
      const req = context.switchToHttp().getRequest();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('system:metrics-scraper');
      expect(req.user.role).toBe(UserRole.PLATFORM_ADMIN);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });

  describe('User JWT & Role-Based Access Control (RBAC)', () => {
    it('allows request when user has PLATFORM_ADMIN role with valid access token', async () => {
      const userToken = 'valid-jwt-token-admin';
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'usr-admin-1',
        email: 'admin@merqent.com',
        role: UserRole.PLATFORM_ADMIN,
        type: 'access',
      });

      const context = createMockContext({ authorization: `Bearer ${userToken}` });
      const allowed = await guard.canActivate(context);

      expect(allowed).toBe(true);
      const req = context.switchToHttp().getRequest();
      expect(req.user.id).toBe('usr-admin-1');
      expect(req.user.role).toBe(UserRole.PLATFORM_ADMIN);
      expect(requestContextService.setUser).toHaveBeenCalledWith(req.user);
    });

    it('denies access with ForbiddenException when user has PE_FIRM_ADMIN role', async () => {
      const userToken = 'valid-jwt-token-pe-admin';
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'usr-pe-1',
        email: 'pe.admin@fund.com',
        role: UserRole.PE_FIRM_ADMIN,
        type: 'access',
      });

      const context = createMockContext({ authorization: `Bearer ${userToken}` });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(/PLATFORM_ADMIN required/i);
    });

    it('denies access with ForbiddenException when user has CONSULTANT_OPERATOR role', async () => {
      const userToken = 'valid-jwt-token-consultant';
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'usr-consultant-1',
        email: 'consultant@expert.com',
        role: UserRole.CONSULTANT_OPERATOR,
        type: 'access',
      });

      const context = createMockContext({ authorization: `Bearer ${userToken}` });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(/Forbidden/i);
    });

    it('denies access with ForbiddenException when user has PE_FIRM_MEMBER role', async () => {
      const userToken = 'valid-jwt-token-member';
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'usr-member-1',
        email: 'member@fund.com',
        role: UserRole.PE_FIRM_MEMBER,
        type: 'access',
      });

      const context = createMockContext({ authorization: `Bearer ${userToken}` });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('throws UnauthorizedException when token type is not "access" (e.g. refresh token)', async () => {
      const refreshToken = 'valid-jwt-refresh-token';
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'usr-admin-1',
        email: 'admin@merqent.com',
        role: UserRole.PLATFORM_ADMIN,
        type: 'refresh', // Invalid token purpose
      });

      const context = createMockContext({ authorization: `Bearer ${refreshToken}` });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(/access token required/i);
    });

    it('throws UnauthorizedException when token is revoked/blacklisted in Redis', async () => {
      const blacklistedToken = 'revoked-jwt-token';
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: 'usr-admin-1',
        email: 'admin@merqent.com',
        role: UserRole.PLATFORM_ADMIN,
        type: 'access',
      });
      (redisService.isTokenBlacklisted as jest.Mock).mockResolvedValue(true);

      const context = createMockContext({ authorization: `Bearer ${blacklistedToken}` });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(/Token has been revoked/i);
    });

    it('throws UnauthorizedException when JWT verification throws (expired/tampered)', async () => {
      const expiredToken = 'expired-jwt-token';
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('jwt expired'));

      const context = createMockContext({ authorization: `Bearer ${expiredToken}` });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        /Invalid or expired authentication credentials/i,
      );
    });
  });
});
