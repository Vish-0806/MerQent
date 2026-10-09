import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { UserRole, UserStatus } from '@merqent/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';

describe('AuthService (Task 2.8)', () => {
  let service: AuthService;
  let mockPrisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    refreshToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let mockJwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let mockConfig: { get: jest.Mock };
  let mockRedis: {
    blacklistToken: jest.Mock;
    isTokenBlacklisted: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };

  const validPassword = 'SecurePassword123!';
  let validPasswordHash: string;

  beforeAll(async () => {
    validPasswordHash = await argon2.hash(validPassword, {
      type: argon2.argon2id,
    });
  });

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    mockJwtService = {
      signAsync: jest.fn().mockImplementation((payload) => {
        if (payload.type === 'access') return Promise.resolve('mock-access-token');
        return Promise.resolve('mock-refresh-token');
      }),
      verifyAsync: jest.fn(),
    };

    mockConfig = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const configMap: Record<string, unknown> = {
          'jwt.secret': 'test-access-secret-32-chars-long-minimum-key',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret-32-chars-long-minimum-key',
          'jwt.refreshExpiresIn': '7d',
          'jwt.cookieDomain': 'localhost',
          'jwt.cookieSecure': false,
        };
        return configMap[key] ?? defaultValue;
      }),
    };

    mockRedis = {
      blacklistToken: jest.fn().mockResolvedValue(undefined),
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    service = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockJwtService as unknown as JwtService,
      mockConfig as unknown as ConfigService,
      mockRedis as unknown as RedisService,
    );
  });

  describe('Registration & Password Security', () => {
    const registerDto: RegisterDto = {
      email: 'pmi.lead@example.com',
      password: validPassword,
      fullName: 'PMI Lead Operator',
      role: UserRole.CONSULTANT_OPERATOR,
    };

    it('successfully registers user with Argon2id password hash and active status', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'pmi.lead@example.com',
        fullName: 'PMI Lead Operator',
        role: UserRole.CONSULTANT_OPERATOR,
        status: UserStatus.ACTIVE,
        avatarUrl: null,
        emailVerifiedAt: null,
        mfaEnabled: false,
        createdAt: new Date(),
      });
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'token-uuid-1',
      });

      const result = await service.register(registerDto, '127.0.0.1', 'JestTestRunner');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'pmi.lead@example.com' },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'pmi.lead@example.com',
          fullName: 'PMI Lead Operator',
          role: UserRole.CONSULTANT_OPERATOR,
          status: UserStatus.ACTIVE,
        }),
      });

      // Verify password was hashed with argon2
      const createdCall = mockPrisma.user.create.mock.calls[0][0];
      const storedHash = createdCall.data.passwordHash;
      expect(storedHash).not.toEqual(validPassword);
      expect(storedHash).toMatch(/^\$argon2id\$/);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user).toMatchObject({
        id: 'user-uuid-1',
        email: 'pmi.lead@example.com',
        role: UserRole.CONSULTANT_OPERATOR,
        status: UserStatus.ACTIVE,
      });
      expect((result.user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('throws ConflictException when duplicate email is registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'pmi.lead@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('Login & Safe Authentication Errors', () => {
    const loginDto: LoginDto = {
      email: 'pmi.lead@example.com',
      password: validPassword,
    };

    it('successfully authenticates active user and updates lastLoginAt', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'pmi.lead@example.com',
        fullName: 'PMI Lead Operator',
        passwordHash: validPasswordHash,
        role: UserRole.CONSULTANT_OPERATOR,
        status: UserStatus.ACTIVE,
        avatarUrl: null,
        emailVerifiedAt: null,
        mfaEnabled: false,
        createdAt: new Date(),
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto, '127.0.0.1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.id).toBe('user-uuid-1');
    });

    it('throws generic safe UnauthorizedException when email is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid email or password');
    });

    it('throws generic safe UnauthorizedException when password does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'pmi.lead@example.com',
        passwordHash: validPasswordHash,
        role: UserRole.CONSULTANT_OPERATOR,
        status: UserStatus.ACTIVE,
      });

      const badDto: LoginDto = {
        email: 'pmi.lead@example.com',
        password: 'WrongPassword123!',
      };

      await expect(service.login(badDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(badDto)).rejects.toThrow('Invalid email or password');
    });

    it('throws UnauthorizedException when account status is SUSPENDED or DEACTIVATED', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'pmi.lead@example.com',
        passwordHash: validPasswordHash,
        role: UserRole.CONSULTANT_OPERATOR,
        status: UserStatus.SUSPENDED,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Account is not active');
    });
  });

  describe('Refresh Token Lifecycle & Rotation', () => {
    const rawRefreshToken = 'valid-raw-refresh-jwt-token';
    const computedHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const tokenId = 'token-uuid-123';
    const userId = 'user-uuid-123';

    it('successfully rotates refresh token, revokes previous token, and blacklists in Redis', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: userId,
        jti: tokenId,
        type: 'refresh',
      });
      mockRedis.isTokenBlacklisted.mockResolvedValue(false);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: tokenId,
        userId,
        tokenHash: computedHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@merqent.com',
        fullName: 'Test User',
        role: UserRole.PE_FIRM_ADMIN,
        status: UserStatus.ACTIVE,
        mfaEnabled: false,
        createdAt: new Date(),
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh(rawRefreshToken);

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: tokenId },
        data: { isRevoked: true },
      });
      expect(mockRedis.blacklistToken).toHaveBeenCalledWith(tokenId, expect.any(Number));
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('detects revoked token reuse and invalidates all user sessions', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: userId,
        jti: tokenId,
        type: 'refresh',
      });
      mockRedis.isTokenBlacklisted.mockResolvedValue(false);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: tokenId,
        userId,
        tokenHash: computedHash,
        isRevoked: true, // Already revoked!
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });

      await expect(service.refresh(rawRefreshToken)).rejects.toThrow(
        'Refresh token reuse detected; all sessions have been revoked for security',
      );

      // Verify that all active tokens for this user were revoked
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('rejects blacklisted token in Redis', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: userId,
        jti: tokenId,
        type: 'refresh',
      });
      mockRedis.isTokenBlacklisted.mockResolvedValue(true);

      await expect(service.refresh(rawRefreshToken)).rejects.toThrow(
        'Refresh token has been revoked',
      );
    });

    it('rejects expired token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: userId,
        jti: tokenId,
        type: 'refresh',
      });
      mockRedis.isTokenBlacklisted.mockResolvedValue(false);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: tokenId,
        userId,
        tokenHash: computedHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000), // Expired in the past
      });

      await expect(service.refresh(rawRefreshToken)).rejects.toThrow('Refresh token has expired');
    });
  });

  describe('Logout & Session Revocation', () => {
    it('revokes token in DB and blacklists in Redis', async () => {
      const rawToken = 'logout-refresh-token';
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        jti: 'token-123',
        type: 'refresh',
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.logout(rawToken);

      expect(res.success).toBe(true);
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'token-123', isRevoked: false },
        data: { isRevoked: true },
      });
      expect(mockRedis.blacklistToken).toHaveBeenCalledWith('token-123', expect.any(Number));
    });

    it('handles logout gracefully without token', async () => {
      const res = await service.logout(undefined);
      expect(res.success).toBe(true);
      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('Current User Identity (getMe)', () => {
    it('returns sanitized user data for active user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@merqent.com',
        fullName: 'Active User',
        role: UserRole.PE_FIRM_ADMIN,
        status: UserStatus.ACTIVE,
        avatarUrl: null,
        emailVerifiedAt: new Date(),
        mfaEnabled: true,
        createdAt: new Date(),
      });

      const user = await service.getMe('user-123');

      expect(user.id).toBe('user-123');
      expect(user.role).toBe(UserRole.PE_FIRM_ADMIN);
      expect((user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('throws UnauthorizedException if user not found or suspended', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('non-existent')).rejects.toThrow(UnauthorizedException);
    });
  });
});
