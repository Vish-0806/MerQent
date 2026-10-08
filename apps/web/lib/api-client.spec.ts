import { ApiClient } from './api-client';

describe('ApiClient Foundation', () => {
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
      json: async () => ({ data: { id: 'test-123', status: 'active' } }),
    });

    const result = await client.get<{ data: { id: string; status: string } }>('/test-endpoint');

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

  it('attaches query parameters correctly to the request URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ items: [] }),
    });

    await client.get('/items', {
      params: { page: 1, limit: 20, active: true },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.merqent.com/api/v1/items?page=1&limit=20&active=true',
      expect.anything(),
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

  it('throws ApiClientError with server error details on failure response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: {
        get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({ statusCode: 404, message: 'Resource not found' }),
    });

    await expect(client.get('/not-existing')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 404,
      message: 'Resource not found',
    });
  });

  it('handles array error messages from validation failures', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: {
        get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        statusCode: 400,
        message: ['Email is invalid', 'Password is too short'],
      }),
    });

    await expect(client.post('/auth/register', {})).rejects.toThrow(
      'Email is invalid, Password is too short',
    );
  });
});
