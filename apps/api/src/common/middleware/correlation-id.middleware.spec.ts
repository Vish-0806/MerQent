import { Response } from 'express';
import { CorrelationIdMiddleware, RequestWithCorrelation } from './correlation-id.middleware';
import { RequestContextService } from '../context/request-context.service';

describe('CorrelationIdMiddleware (Task 2.11: Common Infrastructure)', () => {
  let middleware: CorrelationIdMiddleware;
  let requestContextService: RequestContextService;
  let mockRequest: Partial<RequestWithCorrelation>;
  let mockResponse: Partial<Response>;
  let nextFn: jest.Mock;

  beforeEach(() => {
    requestContextService = new RequestContextService();
    middleware = new CorrelationIdMiddleware(requestContextService);

    mockRequest = {
      headers: {},
      ip: '127.0.0.1',
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    nextFn = jest.fn();
  });

  it('generates a new UUID when no correlation ID header is present and binds to RequestContext', () => {
    let capturedCorrelationIdInContext: string | undefined;

    nextFn.mockImplementation(() => {
      capturedCorrelationIdInContext = requestContextService.getCorrelationId();
    });

    middleware.use(mockRequest as RequestWithCorrelation, mockResponse as Response, nextFn);

    expect(mockRequest.correlationId).toBeDefined();
    expect(mockRequest.correlationId).toHaveLength(36); // UUID v4 format
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      mockRequest.correlationId,
    );
    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(capturedCorrelationIdInContext).toBe(mockRequest.correlationId);
  });

  it('preserves incoming x-correlation-id header', () => {
    mockRequest.headers = { 'x-correlation-id': 'custom-upstream-trace-777' };

    let capturedCorrelationIdInContext: string | undefined;
    nextFn.mockImplementation(() => {
      capturedCorrelationIdInContext = requestContextService.getCorrelationId();
    });

    middleware.use(mockRequest as RequestWithCorrelation, mockResponse as Response, nextFn);

    expect(mockRequest.correlationId).toBe('custom-upstream-trace-777');
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      'custom-upstream-trace-777',
    );
    expect(capturedCorrelationIdInContext).toBe('custom-upstream-trace-777');
  });

  it('extracts proxy IP correctly from x-forwarded-for header', () => {
    mockRequest.headers = {
      'x-correlation-id': 'proxy-trace-1',
      'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
    };

    let capturedIp: string | undefined;
    nextFn.mockImplementation(() => {
      capturedIp = requestContextService.getContext()?.ip;
    });

    middleware.use(mockRequest as RequestWithCorrelation, mockResponse as Response, nextFn);

    expect(capturedIp).toBe('203.0.113.195');
  });

  it('ignores forged x-forwarded-for headers when trust proxy is disabled (false)', () => {
    (mockRequest as unknown as { app: { get: jest.Mock } }).app = {
      get: jest.fn().mockReturnValue(false),
    };
    mockRequest.headers = {
      'x-forwarded-for': '203.0.113.195, 70.41.3.18',
    };
    Object.defineProperty(mockRequest, 'ip', { value: '198.51.100.99', configurable: true });

    let capturedIp: string | undefined;
    nextFn.mockImplementation(() => {
      capturedIp = requestContextService.getContext()?.ip;
    });

    middleware.use(mockRequest as RequestWithCorrelation, mockResponse as Response, nextFn);

    expect(capturedIp).toBe('198.51.100.99');
  });

  it('functions gracefully without RequestContextService instance', () => {
    const standaloneMiddleware = new CorrelationIdMiddleware();

    standaloneMiddleware.use(
      mockRequest as RequestWithCorrelation,
      mockResponse as Response,
      nextFn,
    );

    expect(mockRequest.correlationId).toBeDefined();
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      mockRequest.correlationId,
    );
    expect(nextFn).toHaveBeenCalledTimes(1);
  });
});
