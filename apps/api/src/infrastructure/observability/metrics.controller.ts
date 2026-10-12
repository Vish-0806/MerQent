import { Controller, Get, Req, Res, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';
import { MetricsAuthGuard } from './metrics-auth.guard';
import { BypassTransform } from '../../common/interceptors/transform.interceptor';
import { MetricsSnapshot } from '@merqent/shared-types';

@ApiTags('Observability')
@ApiBearerAuth('JWT-Auth')
@ApiHeader({
  name: 'x-metrics-key',
  description:
    'Machine-to-machine monitoring authentication key (optional alternative to Bearer token)',
  required: false,
})
@UseGuards(MetricsAuthGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @BypassTransform()
  @ApiOperation({
    summary: 'Application Telemetry & Performance Metrics',
    description:
      'Exposes in-memory application metrics in Prometheus text exposition format or structured JSON. Access is restricted to PLATFORM_ADMIN users or authorized monitoring clients with a valid METRICS_SCRAPE_KEY.',
  })
  @ApiResponse({
    status: 200,
    description: 'Prometheus exposition text or structured metrics snapshot',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: Authentication missing, invalid, or scrape key mismatched',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Insufficient privileges (PLATFORM_ADMIN required)',
  })
  getMetrics(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('accept') acceptHeader?: string,
  ): void {
    const isPrometheusFormat =
      req.query['format'] === 'prometheus' || (acceptHeader && acceptHeader.includes('text/plain'));

    if (isPrometheusFormat) {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.status(200).send(this.metricsService.getPrometheusFormat());
      return;
    }

    const snapshot: MetricsSnapshot = this.metricsService.getMetricsSnapshot();
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(snapshot);
  }
}
