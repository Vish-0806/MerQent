import { Controller, Get, Req, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';
import { BypassTransform } from '../../common/interceptors/transform.interceptor';
import { MetricsSnapshot } from '@merqent/shared-types';

@ApiTags('Observability')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @BypassTransform()
  @ApiOperation({
    summary: 'Application Telemetry & Performance Metrics',
    description:
      'Exposes in-memory application metrics in Prometheus text exposition format or structured JSON. Safe for automated scrapers (Prometheus, Datadog) without leaking confidential deal data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Prometheus exposition text or structured metrics snapshot',
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
