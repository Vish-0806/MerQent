import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { UserRole } from '@merqent/shared-types';
import Redis from 'ioredis';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('Live Database & Redis Auth Integration (Task 2.8)', () => {
  let prisma: PrismaClient;
  let redis: Redis;
  let authService: AuthService;
  let redisService: RedisService;
  let jwtService: JwtService;

  const testEmail = `live.test.user.${Date.now()}@merqent.com`;
  const testPassword = 'ProductionPassword123!';
  let createdUserId: string | null = null;

  beforeAll(async () => {
    jest.setTimeout(30000);
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://merqent_user:merqent_dev_password@localhost:5433/merqent_db?schema=public',
        },
      },
    });

    redis = new Redis({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
    });

    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      await redis.connect();
    } catch (e) {
      console.warn('PostgreSQL or Redis not reachable for live integration test:', e);
    }

    const configService = {
      get: (key: string, defaultValue?: unknown) => {
        const conf: Record<string, unknown> = {
          'jwt.secret': 'test-access-secret-32-chars-long-minimum-key',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret-32-chars-long-minimum-key',
          'jwt.refreshExpiresIn': '7d',
          'redis.host': 'localhost',
          'redis.port': 6379,
        };
        return conf[key] ?? defaultValue;
      },
    } as unknown as ConfigService;

    jwtService = new JwtService({
      secret: 'test-access-secret-32-chars-long-minimum-key',
    });

    redisService = new RedisService(configService);
    redisService.onModuleInit();

    const prismaService = prisma as unknown as PrismaService;
    authService = new AuthService(prismaService, jwtService, configService, redisService);
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.refreshToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => null);
    }
    await redisService.onModuleDestroy();
    await prisma.$disconnect();
    try {
      await redis.quit();
    } catch {
      // ignore
    }
  });

  it('verifies Argon2id registration and hashed refresh token persistence in PostgreSQL', async () => {
    const result = await authService.register(
      {
        email: testEmail,
        password: testPassword,
        fullName: 'Live Integration Operator',
        role: UserRole.CONSULTANT_OPERATOR as const,
      },
      '127.0.0.1',
      'IntegrationTest/1.0',
    );

    createdUserId = result.user.id;
    expect(result.user.email).toBe(testEmail);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    // Verify stored password hash in PostgreSQL uses Argon2id
    const dbUser = await prisma.user.findUnique({ where: { id: result.user.id } });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.passwordHash).toMatch(/^\$argon2id\$/);

    const isPasswordValid = await argon2.verify(dbUser!.passwordHash, testPassword);
    expect(isPasswordValid).toBe(true);

    // Verify refresh token record exists and is stored hashed (not plaintext)
    const tokens = await prisma.refreshToken.findMany({ where: { userId: dbUser!.id } });
    expect(tokens.length).toBe(1);
    const tokenRecord = tokens[0];
    expect(tokenRecord).toBeDefined();
    expect(tokenRecord!.tokenHash).not.toBe(result.refreshToken);

    const expectedHash = crypto.createHash('sha256').update(result.refreshToken).digest('hex');
    expect(tokenRecord!.tokenHash).toBe(expectedHash);
    expect(tokenRecord!.isRevoked).toBe(false);
  });

  it('rejects duplicate registration with ConflictException', async () => {
    await expect(
      authService.register({
        email: testEmail,
        password: testPassword,
        fullName: 'Duplicate',
        role: UserRole.CONSULTANT_OPERATOR as const,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('authenticates user and updates lastLoginAt in PostgreSQL', async () => {
    const loginRes = await authService.login(
      { email: testEmail, password: testPassword },
      '127.0.0.1',
    );

    expect(loginRes.user.id).toBe(createdUserId);
    expect(loginRes.accessToken).toBeDefined();

    const dbUser = await prisma.user.findUnique({ where: { id: createdUserId! } });
    expect(dbUser?.lastLoginAt).not.toBeNull();
  });

  it('rejects invalid password with safe generic UnauthorizedException', async () => {
    await expect(
      authService.login({ email: testEmail, password: 'WrongPassword123!' }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('rotates refresh token, marks old token as revoked in DB, and adds to Redis blacklist', async () => {
    const loginRes = await authService.login(
      { email: testEmail, password: testPassword },
      '127.0.0.1',
    );

    const oldToken = loginRes.refreshToken;
    const rotateRes = await authService.refresh(oldToken, '127.0.0.1');

    expect(rotateRes.accessToken).toBeDefined();
    expect(rotateRes.refreshToken).toBeDefined();
    expect(rotateRes.refreshToken).not.toBe(oldToken);

    // Check old token in DB
    const decodedOld = jwtService.decode(oldToken) as { jti: string; sub: string };
    const oldDbRecord = await prisma.refreshToken.findUnique({
      where: { id: decodedOld.jti },
    });
    expect(oldDbRecord?.isRevoked).toBe(true);

    // Check Redis blacklist
    const isBlacklisted = await redisService.isTokenBlacklisted(decodedOld.jti);
    expect(isBlacklisted).toBe(true);
  });

  it('detects revoked token reuse and revokes all active sessions for that user', async () => {
    // Get fresh token pair
    const freshLogin = await authService.login(
      { email: testEmail, password: testPassword },
      '127.0.0.1',
    );
    const tokenToRevoke = freshLogin.refreshToken;

    // Rotate once
    await authService.refresh(tokenToRevoke, '127.0.0.1');

    // Attempt to reuse already rotated/revoked token
    await expect(authService.refresh(tokenToRevoke)).rejects.toThrow(UnauthorizedException);

    // Verify all active sessions were invalidated
    const remainingActive = await prisma.refreshToken.count({
      where: { userId: createdUserId!, isRevoked: false },
    });
    expect(remainingActive).toBe(0);
  });

  it('revokes refresh token on logout', async () => {
    const freshLogin = await authService.login(
      { email: testEmail, password: testPassword },
      '127.0.0.1',
    );
    const decoded = jwtService.decode(freshLogin.refreshToken) as { jti: string; sub: string };

    const logoutResult = await authService.logout(freshLogin.refreshToken);
    expect(logoutResult.success).toBe(true);

    const dbRecord = await prisma.refreshToken.findUnique({
      where: { id: decoded.jti },
    });
    expect(dbRecord?.isRevoked).toBe(true);

    const isBlacklisted = await redisService.isTokenBlacklisted(decoded.jti);
    expect(isBlacklisted).toBe(true);
  });
});
