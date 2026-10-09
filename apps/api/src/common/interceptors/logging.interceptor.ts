import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestWithCorrelation } from '../middleware/correlation-id.middleware';
import { MetricsService } from '../../infrastructure/observability/metrics.service';

/**
 * Global HTTP logging and telemetry interceptor.
 * Automatically tracks latency, request status, correlation IDs, and captures
 * application metrics without logging sensitive payloads or credentials.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(@Optional() private readonly metrics?: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<RequestWithCorrelation>();
    const res = ctx.getResponse();

    const { method, originalUrl } = req;
    const correlationId = req.correlationId || 'no-correlation-id';
    const startTime = Date.now();

    this.metrics?.incrementInFlight();

    return next.handle().pipe(
      tap({
        next: () => {
          this.metrics?.decrementInFlight();
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode || 200;

          this.metrics?.recordHttpRequest(method, originalUrl, statusCode, duration);

          this.logger.log(
            `[${correlationId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
          );
        },
        error: (err) => {
          this.metrics?.decrementInFlight();
          const duration = Date.now() - startTime;
          const statusCode = err.status || err.statusCode || 500;
          const errorCode = err.response?.errorCode || err.code;

          this.metrics?.recordHttpRequest(method, originalUrl, statusCode, duration);
          this.metrics?.recordHttpError(method, originalUrl, statusCode, errorCode);

          this.logger.warn(
            `[${correlationId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms - ${err.message}`,
          );
        },
      }),
    );
  }
}
