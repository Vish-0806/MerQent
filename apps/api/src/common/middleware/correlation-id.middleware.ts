import { Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContextService, RequestContextData } from '../context/request-context.service';

export interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(
    @Optional()
    private readonly requestContextService?: RequestContextService,
  ) {}

  use(req: RequestWithCorrelation, res: Response, next: NextFunction): void {
    const incomingId =
      (req.headers['x-correlation-id'] as string) || (req.headers['x-request-id'] as string);

    const correlationId = incomingId || randomUUID();

    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    if (this.requestContextService) {
      const forwardedFor = req.headers['x-forwarded-for'];
      let clientIp: string | undefined;

      if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
        clientIp = forwardedFor[0];
      } else if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
        clientIp = forwardedFor.split(',')[0]?.trim();
      }

      if (!clientIp) {
        clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
      }

      const userAgentHeader = req.headers['user-agent'];
      const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

      const contextData: RequestContextData = {
        correlationId,
        ip: clientIp,
        userAgent,
        startTime: Date.now(),
      };

      this.requestContextService.run(contextData, () => {
        next();
      });
    } else {
      next();
    }
  }
}
