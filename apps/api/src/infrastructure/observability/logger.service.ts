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

  log(message: any, ...optionalParams: any[]) {
    this.logger.info({ context: optionalParams }, message);
  }

  error(message: any, ...optionalParams: any[]) {
    this.logger.error({ context: optionalParams }, message);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn({ context: optionalParams }, message);
  }

  debug?(message: any, ...optionalParams: any[]) {
    this.logger.debug({ context: optionalParams }, message);
  }

  verbose?(message: any, ...optionalParams: any[]) {
    this.logger.trace({ context: optionalParams }, message);
  }
}
