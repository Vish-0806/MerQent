import { UserRole, UserStatus, ApiResponse } from '@merqent/shared-types';
import { RegisterUserInput, LoginUserInput } from '@merqent/validation';
import { apiClient } from './api-client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string | null;
  emailVerifiedAt?: Date | null;
  mfaEnabled: boolean;
  createdAt: Date;
}

export interface AuthResponseData {
  accessToken: string;
  user: AuthUser;
}

/**
 * In-memory token storage.
 * Access tokens are stored exclusively in memory and NEVER written to localStorage
 * or browser storage, protecting against XSS token exfiltration.
 * Refresh tokens are stored exclusively in HttpOnly, SameSite cookies managed by the server.
 */
let inMemoryAccessToken: string | null = null;

export const authStorage = {
  getAccessToken(): string | null {
    return inMemoryAccessToken;
  },
  setAccessToken(token: string | null): void {
    inMemoryAccessToken = token;
    apiClient.setAuthToken(token);
  },
  clear(): void {
    inMemoryAccessToken = null;
    apiClient.setAuthToken(null);
  },
};

export const authApi = {
  /**
   * Register a new user and store the returned access token in memory.
   * Refresh token is set securely in an HttpOnly cookie by the server.
   */
  async register(data: RegisterUserInput): Promise<AuthUser> {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>('auth/register', data);
    const authData = res.data;
    authStorage.setAccessToken(authData.accessToken);
    return authData.user;
  },

  /**
   * Authenticate user credentials and store the returned access token in memory.
   * Refresh token is set securely in an HttpOnly cookie by the server.
   */
  async login(data: LoginUserInput): Promise<AuthUser> {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>('auth/login', data);
    const authData = res.data;
    authStorage.setAccessToken(authData.accessToken);
    return authData.user;
  },

  /**
   * Request rotated access token using the server-managed HttpOnly refresh cookie.
   */
  async refresh(): Promise<string> {
    try {
      const res = await apiClient.post<ApiResponse<AuthResponseData>>('auth/refresh');
      const authData = res.data;
      authStorage.setAccessToken(authData.accessToken);
      return authData.accessToken;
    } catch (error) {
      authStorage.clear();
      throw error;
    }
  },

  /**
   * Terminate current session, clearing memory and notifying API to revoke refresh token.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('auth/logout');
    } finally {
      authStorage.clear();
    }
  },

  /**
   * Fetch current authenticated user profile using the in-memory access token.
   */
  async getMe(): Promise<AuthUser> {
    const res = await apiClient.get<ApiResponse<AuthUser>>('auth/me');
    return res.data;
  },
};
