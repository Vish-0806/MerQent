import { of, firstValueFrom } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor (Task 2.10)', () => {
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

  it('wraps raw response payload into standardized { data: payload, timestamp } envelope', async () => {
    mockHandler = {
      handle: () => of({ id: 'consultant-123', name: 'Operator A' }),
    };

    const stream$ = interceptor.intercept(mockContext, mockHandler);
    const result = await firstValueFrom(stream$);

    expect(result).toEqual({
      data: { id: 'consultant-123', name: 'Operator A' },
      timestamp: expect.any(String),
    });
  });

  it('preserves response when already formatted with data, meta, and attaches timestamp', async () => {
    const existingEnvelope = {
      data: [{ id: 'proj-1' }],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      message: 'Projects retrieved successfully',
    };
    mockHandler = {
      handle: () => of(existingEnvelope),
    };

    const stream$ = interceptor.intercept(mockContext, mockHandler);
    const result = await firstValueFrom(stream$);

    expect(result).toEqual({
      ...existingEnvelope,
      timestamp: expect.any(String),
    });
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
