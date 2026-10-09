import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Parameter decorator to reliably extract client IP address across proxies.
 */
export const ClientIp = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const forwardedFor = request.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0];
  }
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    const firstPart = forwardedFor.split(',')[0];
    if (firstPart) {
      return firstPart.trim();
    }
  }
  return request.ip || request.socket.remoteAddress || '127.0.0.1';
});
