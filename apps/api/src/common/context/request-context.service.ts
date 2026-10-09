import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { UserRole } from '@merqent/shared-types';

export interface RequestUserContext {
  id: string;
  email: string;
  role: UserRole;
  firmId?: string;
  consultantProfileId?: string;
}

export interface RequestContextData {
  correlationId: string;
  user?: RequestUserContext;
  ip?: string;
  userAgent?: string;
  startTime: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class RequestContextService {
  private static readonly storage = new AsyncLocalStorage<RequestContextData>();

  /**
   * Executes a callback within the scope of a given request context.
   */
  public run<T>(context: RequestContextData, fn: () => T): T {
    return RequestContextService.storage.run(context, fn);
  }

  /**
   * Retrieves the current active request context data, if any.
   */
  public getContext(): RequestContextData | undefined {
    return RequestContextService.storage.getStore();
  }

  /**
   * Returns the current request correlation ID, or a fallback if outside request scope.
   */
  public getCorrelationId(): string {
    return this.getContext()?.correlationId || 'no-correlation-id';
  }

  /**
   * Returns the authenticated user context for the current request.
   */
  public getCurrentUser(): RequestUserContext | undefined {
    return this.getContext()?.user;
  }

  /**
   * Returns the active tenant (firmId) for the authenticated user.
   */
  public getTenantId(): string | undefined {
    return this.getContext()?.user?.firmId;
  }

  /**
   * Attaches or updates the authenticated user in the current request context.
   */
  public setUser(user: RequestUserContext): void {
    const ctx = this.getContext();
    if (ctx) {
      ctx.user = user;
    }
  }

  /**
   * Stores contextual metadata key-value pair in the request context.
   */
  public setMetadata(key: string, value: unknown): void {
    const ctx = this.getContext();
    if (ctx) {
      if (!ctx.metadata) {
        ctx.metadata = {};
      }
      ctx.metadata[key] = value;
    }
  }

  /**
   * Returns the metadata value for a given key.
   */
  public getMetadata<T = unknown>(key: string): T | undefined {
    return this.getContext()?.metadata?.[key] as T | undefined;
  }

  /**
   * Computes the duration in milliseconds since the request began.
   */
  public getDurationMs(): number {
    const ctx = this.getContext();
    if (!ctx) return 0;
    return Date.now() - ctx.startTime;
  }
}
