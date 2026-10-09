import {
  ApiErrorResponse,
  ApiErrorDetail,
  ErrorCode,
  ApiResponse,
  PaginatedResponse,
} from '@merqent/shared-types';

/**
 * Standardized API client error capturing status, payload, error code, correlation ID, and granular constraint details.
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly data?: unknown;
  public readonly errorCode?: string;
  public readonly correlationId?: string;
  public readonly details?: ApiErrorDetail[];
  public readonly timestamp?: string;
  public readonly path?: string;

  constructor(
    message: string,
    status: number,
    data?: unknown,
    options?: {
      errorCode?: string;
      correlationId?: string;
      details?: ApiErrorDetail[];
      timestamp?: string;
      path?: string;
    },
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
    this.errorCode = options?.errorCode;
    this.correlationId = options?.correlationId;
    this.details = options?.details;
    this.timestamp = options?.timestamp;
    this.path = options?.path;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }

  public isUnauthorized(): boolean {
    return this.status === 401;
  }

  public isForbidden(): boolean {
    return this.status === 403;
  }

  public isNotFound(): boolean {
    return this.status === 404;
  }

  public isConflict(): boolean {
    return this.status === 409;
  }

  public isValidationError(): boolean {
    return (
      this.status === 400 &&
      (this.errorCode === ErrorCode.VALIDATION_ERROR || (!!this.details && this.details.length > 0))
    );
  }

  public isRateLimited(): boolean {
    return this.status === 429;
  }

  public isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Returns a map of field names to error messages for easy form binding.
   */
  public getFieldErrors(): Record<string, string[]> {
    const fieldMap: Record<string, string[]> = {};

    if (this.details && this.details.length > 0) {
      for (const detail of this.details) {
        const key = detail.field || '_general';
        if (!fieldMap[key]) {
          fieldMap[key] = [];
        }
        fieldMap[key].push(detail.message);
      }
    }

    return fieldMap;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  token?: string | null;
  correlationId?: string;
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
   * Set authentication token for subsequent requests.
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
    const { params, token, correlationId, headers = {}, ...customConfig } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    };

    if (correlationId) {
      requestHeaders['x-correlation-id'] = correlationId;
    }

    const effectiveToken = token !== undefined ? token : this.authToken;
    if (effectiveToken) {
      requestHeaders.Authorization = `Bearer ${effectiveToken}`;
    }

    const url = this.buildUrl(endpoint, params);

    try {
      const response = await fetch(url, {
        credentials: 'include',
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
        let errorCode: string | undefined = undefined;
        let correlationIdFromRes: string | undefined =
          response.headers.get('x-correlation-id') || undefined;
        let details: ApiErrorDetail[] | undefined = undefined;
        let timestamp: string | undefined = undefined;
        let path: string | undefined = undefined;

        if (isJson && parsedBody && typeof parsedBody === 'object') {
          const errorPayload = parsedBody as ApiErrorResponse;
          if (Array.isArray(errorPayload.message)) {
            errorMessage = errorPayload.message.join(', ');
          } else if (errorPayload.message) {
            errorMessage = errorPayload.message;
          }

          errorCode = errorPayload.errorCode as string | undefined;
          correlationIdFromRes = errorPayload.correlationId || correlationIdFromRes;
          details = errorPayload.details;
          timestamp = errorPayload.timestamp;
          path = errorPayload.path;
        }

        throw new ApiClientError(errorMessage, response.status, parsedBody, {
          errorCode,
          correlationId: correlationIdFromRes,
          details,
          timestamp,
          path,
        });
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

  /**
   * Helper to unwrap the data field from an ApiResponse envelope.
   */
  public async unwrap<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
    const response = await promise;
    return response.data;
  }

  /**
   * Type-safe convenience method for paginated query endpoints.
   */
  public getPaginated<T>(
    endpoint: string,
    options?: RequestOptions,
  ): Promise<PaginatedResponse<T>> {
    return this.get<PaginatedResponse<T>>(endpoint, options);
  }
}

/**
 * Singleton instance of the MerQent API client for shared use.
 */
export const apiClient = new ApiClient();
