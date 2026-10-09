import { ApiClient, ApiClientError } from './api-client';
import { ErrorCode, ApiResponse } from '@merqent/shared-types';

describe('ApiClient Foundation (Task 2.10: Contract & Error Architecture)', () => {
  let client: ApiClient;
  const mockFetch = jest.fn();

  beforeEach(() => {
    client = new ApiClient('https://api.test.merqent.com/api/v1');
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it('performs successful GET requests and parses JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        data: { id: 'test-123', status: 'active' },
        timestamp: '2026-10-09T18:00:00.000Z',
      }),
    });

    const result = await client.get<ApiResponse<{ id: string; status: string }>>('/test-endpoint');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.merqent.com/api/v1/test-endpoint',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      }),
    );
    expect(result.data.id).toBe('test-123');
  });

  it('attaches query parameters and correlation ID header correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: [] }),
    });

    await client.get('/items', {
      params: { page: 1, limit: 20, active: true },
      correlationId: 'client-trace-999',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.merqent.com/api/v1/items?page=1&limit=20&active=true',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-correlation-id': 'client-trace-999',
        }),
      }),
    );
  });

  it('attaches Bearer token when provided via setAuthToken or options', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ user: 'test' }),
    });

    client.setAuthToken('token-abc-123');
    await client.get('/me');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.merqent.com/api/v1/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-abc-123',
        }),
      }),
    );
  });

  it('unwraps data envelope cleanly via unwrap()', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        data: { id: 'user-1', fullName: 'PMI Operator' },
        timestamp: '2026-10-09T18:00:00.000Z',
      }),
    });

    const user = await client.unwrap(
      client.get<ApiResponse<{ id: string; fullName: string }>>('/auth/me'),
    );
    expect(user.id).toBe('user-1');
    expect(user.fullName).toBe('PMI Operator');
  });

  it('throws ApiClientError with server error details on 404 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: {
        get: (h: string) => {
          if (h.toLowerCase() === 'content-type') return 'application/json';
          if (h.toLowerCase() === 'x-correlation-id') return 'corr-404';
          return null;
        },
      },
      json: async () => ({
        statusCode: 404,
        errorCode: ErrorCode.NOT_FOUND,
        message: 'Resource not found',
        correlationId: 'corr-404',
      }),
    });

    try {
      await client.get('/not-existing');
      fail('Expected client to throw ApiClientError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const apiErr = err as ApiClientError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.errorCode).toBe(ErrorCode.NOT_FOUND);
      expect(apiErr.isNotFound()).toBe(true);
      expect(apiErr.correlationId).toBe('corr-404');
    }
  });

  it('handles 401 Unauthorized and 403 Forbidden with typed helper methods', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({
        statusCode: 401,
        errorCode: ErrorCode.UNAUTHORIZED,
        message: 'Invalid credentials',
      }),
    });

    await expect(client.get('/protected')).rejects.toThrow('Invalid credentials');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({
        statusCode: 403,
        errorCode: ErrorCode.FORBIDDEN,
        message: 'Access denied',
      }),
    });

    try {
      await client.get('/admin-only');
      fail('Expected 403 throw');
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.isForbidden()).toBe(true);
      expect(apiErr.errorCode).toBe(ErrorCode.FORBIDDEN);
    }
  });

  it('handles validation failures with structured details and getFieldErrors() mapping', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: {
        get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        statusCode: 400,
        errorCode: ErrorCode.VALIDATION_ERROR,
        error: 'Bad Request',
        message: ['email: Invalid email format', 'password: Minimum 8 characters'],
        details: [
          { field: 'email', message: 'Invalid email format', code: 'isEmail' },
          { field: 'password', message: 'Minimum 8 characters', code: 'minLength' },
        ],
      }),
    });

    try {
      await client.post('/auth/register', {});
      fail('Expected validation error');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const apiErr = err as ApiClientError;

      expect(apiErr.isValidationError()).toBe(true);
      expect(apiErr.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
      expect(apiErr.details).toHaveLength(2);

      const fieldErrors = apiErr.getFieldErrors();
      expect(fieldErrors['email']).toEqual(['Invalid email format']);
      expect(fieldErrors['password']).toEqual(['Minimum 8 characters']);
    }
  });

  it('handles 500 server error and network exceptions safely', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: { get: () => 'application/json' },
      json: async () => ({
        statusCode: 500,
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    });

    try {
      await client.get('/crash');
      fail('Expected server error');
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.isServerError()).toBe(true);
      expect(apiErr.errorCode).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    mockFetch.mockRejectedValueOnce(new Error('Network connection refused'));
    await expect(client.get('/down')).rejects.toThrow('Network connection refused');
  });
});
