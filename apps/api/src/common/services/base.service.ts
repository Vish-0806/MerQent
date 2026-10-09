import { Logger } from '@nestjs/common';
import { RequestContextService, RequestUserContext } from '../context/request-context.service';

/**
 * Reusable abstract base service providing standardized structured logging
 * and synchronous access to the active request context.
 */
export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(
    serviceName: string,
    protected readonly requestContext?: RequestContextService,
  ) {
    this.logger = new Logger(serviceName);
  }

  /**
   * Returns the current request correlation ID.
   */
  protected get correlationId(): string {
    return this.requestContext?.getCorrelationId() || 'no-correlation-id';
  }

  /**
   * Returns the authenticated user context for the active request.
   */
  protected get currentUser(): RequestUserContext | undefined {
    return this.requestContext?.getCurrentUser();
  }

  /**
   * Returns the tenant ID (firmId) of the active request.
   */
  protected get tenantId(): string | undefined {
    return this.requestContext?.getTenantId();
  }

  /**
   * Logs a message with the current correlation ID prepended.
   */
  protected logWithContext(message: string): void {
    this.logger.log(`[${this.correlationId}] ${message}`);
  }

  /**
   * Logs a warning with the current correlation ID prepended.
   */
  protected warnWithContext(message: string): void {
    this.logger.warn(`[${this.correlationId}] ${message}`);
  }

  /**
   * Logs an error with the current correlation ID prepended.
   */
  protected errorWithContext(message: string, stack?: string): void {
    this.logger.error(`[${this.correlationId}] ${message}`, stack);
  }
}
