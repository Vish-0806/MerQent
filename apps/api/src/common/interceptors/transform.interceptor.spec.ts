import { of, firstValueFrom } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor (Task 2.4)', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockReflector: Partial<Reflector>;
  let mockContext: ExecutionContext;
  let mockHandler: CallHandler;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    interceptor = new TransformInterceptor(mockReflector as Reflector);

    mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  });

  it('wraps raw response payload into { data: payload }', async () => {
    mockHandler = {
      handle: () => of({ id: 'consultant-123', name: 'Operator A' }),
    };

    const stream$ = interceptor.intercept(mockContext, mockHandler);
    const result = await firstValueFrom(stream$);

    expect(result).toEqual({
      data: { id: 'consultant-123', name: 'Operator A' },
    });
  });

  it('preserves response when already formatted with data and meta properties', async () => {
    const existingEnvelope = {
      data: [{ id: 'proj-1' }],
      meta: { total: 1, page: 1 },
    };
    mockHandler = {
      handle: () => of(existingEnvelope),
    };

    const stream$ = interceptor.intercept(mockContext, mockHandler);
    const result = await firstValueFrom(stream$);

    expect(result).toEqual(existingEnvelope);
  });

  it('bypasses wrapping when handler is decorated with @BypassTransform', async () => {
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

    const rawPayload = { status: 'ok', uptime: 100 };
    mockHandler = {
      handle: () => of(rawPayload),
    };

    const stream$ = interceptor.intercept(mockContext, mockHandler);
    const result = await firstValueFrom(stream$);

    expect(result).toEqual(rawPayload);
  });
});
