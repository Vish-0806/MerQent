import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimiterService } from '../security/rate-limiter.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { ErrorCode } from '@merqent/shared-types';

/**
 * Guard that enforces distributed rate limits on decorated endpoints.
 * Sets standard IETF rate-limiting response headers and returns structured 429 errors upon breach.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const clientIp = this.getClientIp(req);
    const prefix = options.keyPrefix || `${req.method}:${req.route?.path || req.path}`;
    const rateLimitKey = `${prefix}:${clientIp}`;

    const result = await this.rateLimiter.consume(rateLimitKey, options.limit, options.ttlSeconds);

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', String(result.limit));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(result.resetTime));
      if (result.degraded) {
        res.setHeader('X-RateLimit-Degraded', 'true');
      }
    }

    if (!result.allowed) {
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          errorCode: ErrorCode.RATE_LIMIT_EXCEEDED,
          error: 'Too Many Requests',
          message: `Too many requests. Please try again in ${result.retryAfterSeconds} seconds.`,
          retryAfter: result.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getClientIp(req: Request): string {
    // Strictly rely on Express trusted proxy resolution.
    // When trust proxy is disabled, req.ip returns direct socket connection remoteAddress,
    // completely ignoring forged X-Forwarded-For headers from untrusted clients.
    // When trust proxy is configured, Express traverses the hop chain securely against the trust policy.
    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }
}
