import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestWithCorrelation } from '../middleware/correlation-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<RequestWithCorrelation>();
    const res = ctx.getResponse();

    const { method, originalUrl } = req;
    const correlationId = req.correlationId || 'no-correlation-id';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode;
          this.logger.log(
            `[${correlationId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
          );
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const statusCode = err.status || 500;
          this.logger.warn(
            `[${correlationId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms - ${err.message}`,
          );
        },
      }),
    );
  }
}
