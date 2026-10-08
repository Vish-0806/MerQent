import { ApiErrorResponse } from '../types';

/**
 * Standardized API client error capturing status, payload, and user-facing messages.
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  token?: string | null;
}

/**
 * MerQent Typed API Client Foundation.
 * Provides consistent HTTP transport, header handling, JSON serialization, and error wrapping.
 */
export class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl?: string) {
    // Defaults safely to NEXT_PUBLIC_API_URL or local fallback
    this.baseUrl =
      baseUrl ||
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
      'http://localhost:4000/api/v1';
  }

  /**
   * Set authentication token for subsequent requests (used when auth is introduced).
   */
  public setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get current auth token.
   */
  public getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Resolve full URL with optional query parameters.
   */
  private buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.baseUrl.replace(/\/$/, '')}${cleanEndpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Core request dispatcher.
   */
  public async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, token, headers = {}, ...customConfig } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    };

    const effectiveToken = token !== undefined ? token : this.authToken;
    if (effectiveToken) {
      requestHeaders.Authorization = `Bearer ${effectiveToken}`;
    }

    const url = this.buildUrl(endpoint, params);

    try {
      const response = await fetch(url, {
        ...customConfig,
        headers: requestHeaders,
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      let parsedBody: unknown = null;
      if (isJson) {
        parsedBody = await response.json();
      } else {
        parsedBody = await response.text();
      }

      if (!response.ok) {
        let errorMessage = `API request failed with status ${response.status}`;
        if (isJson && parsedBody && typeof parsedBody === 'object') {
          const errorPayload = parsedBody as ApiErrorResponse;
          if (Array.isArray(errorPayload.message)) {
            errorMessage = errorPayload.message.join(', ');
          } else if (errorPayload.message) {
            errorMessage = errorPayload.message;
          }
        }
        throw new ApiClientError(errorMessage, response.status, parsedBody);
      }

      return parsedBody as T;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      const genericMessage =
        error instanceof Error ? error.message : 'Unknown network error occurred';
      throw new ApiClientError(genericMessage, 0, null);
    }
  }

  public get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public put<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

/**
 * Singleton instance of the MerQent API client for shared use.
 */
export const apiClient = new ApiClient();
