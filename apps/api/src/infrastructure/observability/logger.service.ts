import { Injectable, LoggerService as NestLoggerService, Optional } from '@nestjs/common';
import pino from 'pino';
import { RequestContextService } from '../../common/context/request-context.service';
import { sanitizeObject } from '../../common/utils/sanitize.util';

export interface StructuredLogPayload {
  service: string;
  environment: string;
  correlationId: string;
  context?: string;
  userId?: string;
  tenantId?: string;
  timestamp: string;
  stack?: string;
  [key: string]: unknown;
}

/**
 * Production-ready structured logger using Pino.
 * Automatically enriches log events with correlation ID, authenticated user context,
 * service metadata, ISO timestamps, and enforces deep sanitization of sensitive data.
 */
@Injectable()
export class AppLogger implements NestLoggerService {
  private readonly logger: pino.Logger;
  private readonly serviceName = 'merqent-api';
  private readonly environment: string;

  constructor(@Optional() private readonly requestContext?: RequestContextService) {
    this.environment = process.env.NODE_ENV || 'development';
    const isProduction = this.environment === 'production';
    const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

    try {
      this.logger = pino({
        level: logLevel,
        transport: !isProduction
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: true,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
        base: {
          service: this.serviceName,
          environment: this.environment,
        },
      });
    } catch {
      // Fallback to standard JSON logging if pretty transport is unavailable
      this.logger = pino({
        level: logLevel,
        base: {
          service: this.serviceName,
          environment: this.environment,
        },
      });
    }
  }

  /**
   * Internal helper to extract context name, stack trace, and extra metadata,
   * while sanitizing all inputs to prevent credential leaks.
   */
  private formatLogMeta(
    optionalParams: unknown[],
    isError = false,
  ): { context?: string; stack?: string; extra: Record<string, unknown> } {
    let context: string | undefined;
    let stack: string | undefined;
    let extra: Record<string, unknown> = {};

    if (optionalParams.length > 0) {
      const lastParam = optionalParams[optionalParams.length - 1];

      // In NestJS, the last string param is conventionally the context name
      if (typeof lastParam === 'string') {
        context = lastParam;
      }

      if (isError) {
        // In error(msg, stack, context), first param may be stack trace
        const firstParam = optionalParams[0];
        if (
          typeof firstParam === 'string' &&
          (firstParam.includes('\n') || firstParam.startsWith('Error'))
        ) {
          stack = firstParam;
        }
      }

      // Collect any object metadata passed as parameters
      for (const param of optionalParams) {
        if (param && typeof param === 'object' && !(param instanceof Error)) {
          extra = { ...extra, ...(param as Record<string, unknown>) };
        } else if (param instanceof Error) {
          stack = param.stack;
          extra.errorName = param.name;
          extra.errorMessage = param.message;
        }
      }
    }

    // Sanitize any metadata to prevent token/secret leaks
    const sanitizedExtra = sanitizeObject(extra);

    return { context, stack, extra: sanitizedExtra };
  }

  /**
   * Builds the structured log payload stamped with correlation and caller context.
   */
  private buildPayload(
    context?: string,
    stack?: string,
    extra: Record<string, unknown> = {},
  ): StructuredLogPayload {
    const correlationId = this.requestContext?.getCorrelationId() || 'no-correlation-id';
    const user = this.requestContext?.getUser();

    const payload: StructuredLogPayload = {
      service: this.serviceName,
      environment: this.environment,
      correlationId,
      timestamp: new Date().toISOString(),
      ...extra,
    };

    if (context) payload.context = context;
    if (stack) payload.stack = stack;
    if (user?.id) payload.userId = user.id;
    const tenantId =
      user?.firmId ||
      (user as unknown as Record<string, unknown> | undefined)?.['primaryOrganizationId'];
    if (typeof tenantId === 'string') payload.tenantId = tenantId;

    return payload;
  }

  log(message: unknown, ...optionalParams: unknown[]) {
    const { context, extra } = this.formatLogMeta(optionalParams);
    const payload = this.buildPayload(context, undefined, extra);
    const msg = typeof message === 'string' ? message : JSON.stringify(sanitizeObject(message));
    this.logger.info(payload, msg);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    const { context, stack, extra } = this.formatLogMeta(optionalParams, true);
    const payload = this.buildPayload(context, stack, extra);
    const msg = typeof message === 'string' ? message : JSON.stringify(sanitizeObject(message));
    this.logger.error(payload, msg);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    const { context, extra } = this.formatLogMeta(optionalParams);
    const payload = this.buildPayload(context, undefined, extra);
    const msg = typeof message === 'string' ? message : JSON.stringify(sanitizeObject(message));
    this.logger.warn(payload, msg);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    const { context, extra } = this.formatLogMeta(optionalParams);
    const payload = this.buildPayload(context, undefined, extra);
    const msg = typeof message === 'string' ? message : JSON.stringify(sanitizeObject(message));
    this.logger.debug(payload, msg);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    const { context, extra } = this.formatLogMeta(optionalParams);
    const payload = this.buildPayload(context, undefined, extra);
    const msg = typeof message === 'string' ? message : JSON.stringify(sanitizeObject(message));
    this.logger.trace(payload, msg);
  }

  /**
   * Directly get the underlying Pino instance if needed.
   */
  getPinoInstance(): pino.Logger {
    return this.logger;
  }
}
