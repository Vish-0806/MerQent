import { AppController } from './app.controller';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { IStorageService } from '../infrastructure/storage/storage.interface';
import { MetricsService } from '../infrastructure/observability/metrics.service';
import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';

describe('AppController Health Probes (Task 2.12)', () => {
  let appController: AppController;
  let mockPrisma: Partial<PrismaService>;
  let mockRedis: Partial<RedisService>;
  let mockStorage: Partial<IStorageService>;
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = new MetricsService();
    mockPrisma = {
      checkHealth: jest.fn().mockResolvedValue({
        status: 'connected',
        latencyMs: 2,
      }),
    };
    mockRedis = {
      checkHealth: jest.fn().mockResolvedValue({
        status: 'connected',
        latencyMs: 1,
      }),
    };
    mockStorage = {
      checkHealth: jest.fn().mockResolvedValue({
        status: 'connected',
        latencyMs: 1,
      }),
    };

    appController = new AppController(
      mockPrisma as PrismaService,
      mockRedis as RedisService,
      mockStorage as IStorageService,
      metricsService,
    );
  });

  describe('Comprehensive Health Check (/health)', () => {
    it('should return operational health status when all dependencies are connected', async () => {
      const result = await appController.checkHealth();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('MerQent API');
      expect(result.version).toBe('1.0.0');
      expect(result.dependencies.database.status).toBe('connected');
      expect(result.dependencies.database.latencyMs).toBe(2);
      expect(result.dependencies.redis?.status).toBe('connected');
      expect(result.dependencies.storage?.status).toBe('connected');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');

      // Verify metrics recorded dependency health
      const metrics = metricsService.getMetricsSnapshot();
      expect(metrics.dependencies['database']?.healthy).toBe(true);
      expect(metrics.dependencies['redis']?.healthy).toBe(true);
      expect(metrics.dependencies['storage']?.healthy).toBe(true);
    });

    it('should return degraded health status when database is disconnected', async () => {
      (mockPrisma.checkHealth as jest.Mock).mockResolvedValueOnce({
        status: 'disconnected',
      });

      const result = await appController.checkHealth();

      expect(result).toBeDefined();
      expect(result.status).toBe('degraded');
      expect(result.dependencies.database.status).toBe('disconnected');
    });

    it('should return degraded health status when Redis is disconnected', async () => {
      (mockRedis.checkHealth as jest.Mock).mockResolvedValueOnce({
        status: 'disconnected',
      });

      const result = await appController.checkHealth();

      expect(result).toBeDefined();
      expect(result.status).toBe('degraded');
      expect(result.dependencies.redis?.status).toBe('disconnected');
    });
  });

  describe('Liveness Probe (/health/live)', () => {
    it('should return ok with uptime and timestamp', () => {
      const result = appController.checkLiveness();

      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return identical response via alias /health/liveness', () => {
      const result = appController.checkLivenessAlias();
      expect(result.status).toBe('ok');
    });
  });

  describe('Readiness Probe (/health/ready)', () => {
    it('should return ready status (200 OK) when critical dependencies are healthy', async () => {
      const mockRes = {
        status: jest.fn(),
      } as unknown as Response;

      const result = await appController.checkReadiness(mockRes);

      expect(result.status).toBe('ready');
      expect(result.dependencies.database.status).toBe('connected');
      expect(mockRes.status).not.toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should return not_ready and set 503 HTTP status when database is disconnected', async () => {
      (mockPrisma.checkHealth as jest.Mock).mockResolvedValueOnce({
        status: 'disconnected',
      });

      const mockRes = {
        status: jest.fn(),
      } as unknown as Response;

      const result = await appController.checkReadiness(mockRes);

      expect(result.status).toBe('not_ready');
      expect(result.dependencies.database.status).toBe('disconnected');
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });
});
