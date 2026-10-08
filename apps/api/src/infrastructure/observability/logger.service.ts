import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class AppLogger implements NestLoggerService {
  private readonly logger = pino({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
            },
          }
        : undefined,
  });

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
