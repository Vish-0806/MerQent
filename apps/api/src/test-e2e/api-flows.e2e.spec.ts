import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from '../app/app.module';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { STORAGE_SERVICE_TOKEN } from '../infrastructure/storage/storage.interface';
import { MALWARE_SCANNER_TOKEN } from '../infrastructure/storage/malware/malware-scanner.interface';
import {
  createMockPrismaService,
  createMockRedisService,
  createMockStorageService,
  createMockMalwareScanner,
} from '../test-utils';
import { UserRole, ErrorCode } from '@merqent/shared-types';
import { JobsService } from '../infrastructure/jobs/jobs.service';

import { AllExceptionsFilter } from '../common/filters/http-exception.filter';

interface HealthResponseBody {
  status: string;
  environment: string;
  dependencies: {
    database: unknown;
    redis: unknown;
    storage: unknown;
  };
}

interface ReadinessResponseBody {
  status: string;
  timestamp: string;
}

interface ErrorResponseBody {
  statusCode: number;
  errorCode: string;
  message: string;
}

describe('End-to-End API Workflows & Health Probes', () => {
  let app: INestApplication;
  let baseUrl: string;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockRedis: ReturnType<typeof createMockRedisService>;
  let mockStorage: ReturnType<typeof createMockStorageService>;
  let mockScanner: ReturnType<typeof createMockMalwareScanner>;

  beforeAll(async () => {
    mockPrisma = createMockPrismaService();
    mockRedis = createMockRedisService();
    mockStorage = createMockStorageService();
    mockScanner = createMockMalwareScanner(true);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(RedisService)
      .useValue(mockRedis)
      .overrideProvider(STORAGE_SERVICE_TOKEN)
      .useValue(mockStorage)
      .overrideProvider(MALWARE_SCANNER_TOKEN)
      .useValue(mockScanner)
      .overrideProvider(JobsService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        beforeApplicationShutdown: jest.fn(),
        checkHealth: jest.fn().mockResolvedValue({
          queueName: 'file-processing',
          status: 'healthy',
          activeJobs: 0,
          waitingJobs: 0,
          failedJobs: 0,
        }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: (errors) => {
          return new BadRequestException({
            message: errors.map((e) => Object.values(e.constraints || {})).flat(),
            errorCode: ErrorCode.VALIDATION_ERROR,
            error: 'Bad Request',
          });
        },
      }),
    );

    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? address : address.port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Health & Readiness Probes (Zero Auth Required)', () => {
    it('GET /health returns 200 OK with system status and dependency map', async () => {
      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as HealthResponseBody;
      expect(body.status).toBe('ok');
      expect(body.environment).toBeDefined();
      expect(body.dependencies).toBeDefined();
      expect(body.dependencies.database).toBeDefined();
      expect(body.dependencies.redis).toBeDefined();
      expect(body.dependencies.storage).toBeDefined();
    });

    it('GET /health/ready returns 200 OK readiness probe', async () => {
      const res = await fetch(`${baseUrl}/health/ready`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as ReadinessResponseBody;
      expect(body.status).toBe('ready');
      expect(body.timestamp).toBeDefined();
    });

    it('propagates custom x-correlation-id header through response', async () => {
      const customCorrelationId = 'req-corr-e2e-trace-999';
      const res = await fetch(`${baseUrl}/health`, {
        headers: { 'x-correlation-id': customCorrelationId },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('x-correlation-id')).toBe(customCorrelationId);
    });
  });

  describe('2. Authentication Workflows (Register, Login, Token Revocation)', () => {
    it('rejects registration with weak password (HTTP 400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'weak@merqent.test',
          password: 'short',
          fullName: 'Weak Password User',
          role: UserRole.PE_FIRM_MEMBER,
        }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as ErrorResponseBody;
      expect(body.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('rejects login with unverified/non-existent user (HTTP 401 Unauthorized)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@merqent.test',
          password: 'ValidPassword123!',
        }),
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponseBody;
      expect(body.errorCode).toBe(ErrorCode.UNAUTHORIZED);
      // Ensure error message does not leak account existence
      expect(body.message).toMatch(/invalid email or password/i);
    });

    it('rejects protected routes when Bearer token is omitted', async () => {
      const res = await fetch(`${baseUrl}/auth/me`);
      expect(res.status).toBe(401);

      const body = (await res.json()) as ErrorResponseBody;
      expect(body.errorCode).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('rejects protected routes when token is blacklisted in Redis', async () => {
      const revokedToken = 'revoked-test-jwt-token-string';
      await mockRedis.blacklistToken(revokedToken);

      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { authorization: `Bearer ${revokedToken}` },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as ErrorResponseBody;
      expect(body.errorCode).toBe(ErrorCode.TOKEN_EXPIRED);
    });
  });

  describe('3. Security Headers Validation', () => {
    it('enforces essential browser security headers on all responses', async () => {
      const res = await fetch(`${baseUrl}/health`);

      // Verify defense-in-depth headers
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
    });
  });
});
