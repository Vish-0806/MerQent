import { SecurityHeadersMiddleware } from './security-headers.middleware';
import { Request, Response } from 'express';

describe('SecurityHeadersMiddleware', () => {
  let middleware: SecurityHeadersMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let headers: Record<string, string>;
  let nextFn: jest.Mock;

  beforeEach(() => {
    middleware = new SecurityHeadersMiddleware();
    headers = {};
    mockRequest = {};
    mockResponse = {
      setHeader: jest.fn((name: string, value: string) => {
        headers[name.toLowerCase()] = value;
        return mockResponse as Response;
      }),
      removeHeader: jest.fn((name: string) => {
        delete headers[name.toLowerCase()];
        return mockResponse as Response;
      }),
    };
    nextFn = jest.fn();
  });

  it('should set all essential OWASP security headers', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFn);

    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '0');
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Referrer-Policy',
      'strict-origin-when-cross-origin',
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';",
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Cross-Origin-Opener-Policy',
      'same-origin',
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Cross-Origin-Resource-Policy',
      'same-origin',
    );
    expect(mockResponse.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    expect(nextFn).toHaveBeenCalledTimes(1);
  });
});
