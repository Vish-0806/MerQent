import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse as SharedApiResponse, PaginationMeta } from '@merqent/shared-types';

export const BYPASS_TRANSFORM_KEY = 'BYPASS_TRANSFORM';
export const BypassTransform = () => SetMetadata(BYPASS_TRANSFORM_KEY, true);

export interface ApiResponse<T> extends SharedApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  message?: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private reflector?: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T> | T> {
    const isBypassed = this.reflector?.getAllAndOverride<boolean>(BYPASS_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isBypassed) {
      return next.handle();
    }

    return next.handle().pipe(
      map((payload) => {
        const now = new Date().toISOString();

        if (payload && typeof payload === 'object' && 'data' in payload) {
          const envelope = payload as Record<string, unknown>;
          return {
            ...envelope,
            timestamp: (envelope.timestamp as string) || now,
          } as unknown as ApiResponse<T>;
        }

        return {
          data: payload,
          timestamp: now,
        } as unknown as ApiResponse<T>;
      }),
    );
  }
}
