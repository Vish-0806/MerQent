import { Controller, Get, Inject, Optional, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import {
  STORAGE_SERVICE_TOKEN,
  IStorageService,
  StorageHealthStatus,
} from '../infrastructure/storage/storage.interface';
import { MetricsService } from '../infrastructure/observability/metrics.service';
import { BypassTransform } from '../common/interceptors/transform.interceptor';
import { HealthResponseDto } from '../common/dto/api-response.dto';
import {
  HealthResponse,
  LivenessResponse,
  ReadinessResponse,
  DependencyStatusMap,
  RedisHealthStatus,
} from '@merqent/shared-types';

@ApiTags('Health')
@Controller('health')
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redis?: RedisService,
    @Optional()
    @Inject(STORAGE_SERVICE_TOKEN)
    private readonly storage?: IStorageService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  @Get()
  @BypassTransform()
  @ApiOperation({
    summary: 'Comprehensive API & Dependency Health Status',
    description:
      'Evaluates runtime readiness, application uptime, and dependencies (PostgreSQL, Redis, Storage) without leaking infrastructure credentials.',
  })
  @ApiResponse({
    status: 200,
    description: 'System health report',
    type: HealthResponseDto,
  })
  async checkHealth(): Promise<HealthResponse> {
    const dbStatus = await this.prisma.checkHealth();
    this.metrics?.recordDependencyHealth(
      'database',
      dbStatus.status === 'connected',
      dbStatus.latencyMs,
    );

    let redisStatus: RedisHealthStatus | undefined;
    if (this.redis) {
      redisStatus = await this.redis.checkHealth();
      this.metrics?.recordDependencyHealth(
        'redis',
        redisStatus.status === 'connected',
        redisStatus.latencyMs,
      );
    }

    let storageStatus: StorageHealthStatus | undefined;
    if (this.storage?.checkHealth) {
      storageStatus = await this.storage.checkHealth();
      this.metrics?.recordDependencyHealth(
        'storage',
        storageStatus.status === 'connected',
        storageStatus.latencyMs,
      );
    }

    const isDegraded =
      dbStatus.status === 'disconnected' ||
      (redisStatus && redisStatus.status === 'disconnected') ||
      (storageStatus && storageStatus.status === 'disconnected');

    const dependencies: DependencyStatusMap = {
      database: dbStatus,
      ...(redisStatus ? { redis: redisStatus } : {}),
      ...(storageStatus ? { storage: storageStatus } : {}),
    };

    return {
      status: isDegraded ? 'degraded' : 'ok',
      service: 'MerQent API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies,
    };
  }

  @Get('live')
  @BypassTransform()
  @ApiOperation({
    summary: 'Process Liveness Probe',
    description:
      'Lightweight probe confirming that the HTTP server process is running, responsive, and not deadlocked.',
  })
  @ApiResponse({
    status: 200,
    description: 'Process is alive',
  })
  checkLiveness(): LivenessResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('liveness')
  @BypassTransform()
  @ApiOperation({
    summary: 'Process Liveness Probe (Alias)',
    description: 'Alias for /health/live.',
  })
  checkLivenessAlias(): LivenessResponse {
    return this.checkLiveness();
  }

  @Get('ready')
  @BypassTransform()
  @ApiOperation({
    summary: 'Dependency Readiness Probe',
    description:
      'Evaluates critical dependencies (PostgreSQL and Redis) to determine whether the pod is ready to accept user traffic.',
  })
  @ApiResponse({
    status: 200,
    description: 'All critical dependencies are connected and ready',
  })
  @ApiResponse({
    status: 503,
    description: 'One or more critical dependencies are disconnected',
  })
  async checkReadiness(@Res({ passthrough: true }) res?: Response): Promise<ReadinessResponse> {
    const dbStatus = await this.prisma.checkHealth();
    let redisStatus: RedisHealthStatus | undefined;
    if (this.redis) {
      redisStatus = await this.redis.checkHealth();
    }

    let storageStatus: StorageHealthStatus | undefined;
    if (this.storage?.checkHealth) {
      storageStatus = await this.storage.checkHealth();
    }

    const isReady =
      dbStatus.status === 'connected' &&
      (!redisStatus || redisStatus.status === 'connected') &&
      (!storageStatus || storageStatus.status === 'connected');

    const dependencies: DependencyStatusMap = {
      database: dbStatus,
      ...(redisStatus ? { redis: redisStatus } : {}),
      ...(storageStatus ? { storage: storageStatus } : {}),
    };

    if (!isReady && res) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      dependencies,
    };
  }

  @Get('readiness')
  @BypassTransform()
  @ApiOperation({
    summary: 'Dependency Readiness Probe (Alias)',
    description: 'Alias for /health/ready.',
  })
  async checkReadinessAlias(
    @Res({ passthrough: true }) res?: Response,
  ): Promise<ReadinessResponse> {
    return this.checkReadiness(res);
  }
}
