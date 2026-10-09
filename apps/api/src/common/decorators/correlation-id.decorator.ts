import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithCorrelation } from '../middleware/correlation-id.middleware';

/**
 * Parameter decorator to inject the current request correlation ID.
 */
export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithCorrelation>();
    return (
      request.correlationId ||
      (request.headers?.['x-correlation-id'] as string) ||
      (request.headers?.['x-request-id'] as string) ||
      'no-correlation-id'
    );
  },
);
