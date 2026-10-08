import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class AppLogger implements NestLoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
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
              },
            }
          : undefined,
      });
    } catch {
      // Fallback to standard JSON logging if pretty transport is unavailable
      this.logger = pino({
        level: logLevel,
      });
    }
  }

  log(message: unknown, ...optionalParams: unknown[]) {
    this.logger.info({ context: optionalParams }, String(message));
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.logger.error({ context: optionalParams }, String(message));
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.logger.warn({ context: optionalParams }, String(message));
  }

  debug?(message: unknown, ...optionalParams: unknown[]) {
    this.logger.debug({ context: optionalParams }, String(message));
  }

  verbose?(message: unknown, ...optionalParams: unknown[]) {
    this.logger.trace({ context: optionalParams }, String(message));
  }
}
