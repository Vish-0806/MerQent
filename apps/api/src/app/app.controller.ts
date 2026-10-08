import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { BypassTransform } from '../common/interceptors/transform.interceptor';
import { HealthResponseDto } from '../common/dto/api-response.dto';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
  dependencies: {
    database: {
      status: 'connected' | 'disconnected';
      latencyMs?: number;
    };
  };
}

@ApiTags('Health')
@Controller('health')
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @BypassTransform()
  @ApiOperation({
    summary: 'API Service & Dependency Health Check',
    description:
      'Evaluates runtime readiness, application uptime, and PostgreSQL database connectivity without leaking infrastructure credentials.',
  })
  @ApiResponse({
    status: 200,
    description: 'System health report',
    type: HealthResponseDto,
  })
  async checkHealth(): Promise<HealthCheckResponse> {
    const dbStatus = await this.prisma.checkHealth();
    const isDegraded = dbStatus.status === 'disconnected';

    return {
      status: isDegraded ? 'degraded' : 'ok',
      service: 'MerQent API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        database: dbStatus,
      },
    };
  }
}
