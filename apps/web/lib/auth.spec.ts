import { UserRole, UserStatus } from '@merqent/shared-types';
import { authStorage, authApi } from './auth';
import { apiClient } from './api-client';

describe('Web Auth Foundation (Task 2.8)', () => {
  beforeEach(() => {
    authStorage.clear();
    jest.restoreAllMocks();
  });

  describe('In-Memory Token Storage Security', () => {
    it('stores token in memory only and sets it on apiClient', () => {
      expect(authStorage.getAccessToken()).toBeNull();
      expect(apiClient.getAuthToken()).toBeNull();

      authStorage.setAccessToken('test-access-token');

      expect(authStorage.getAccessToken()).toBe('test-access-token');
      expect(apiClient.getAuthToken()).toBe('test-access-token');

      authStorage.clear();

      expect(authStorage.getAccessToken()).toBeNull();
      expect(apiClient.getAuthToken()).toBeNull();
    });
  });

  describe('Auth API Client Actions', () => {
    const mockUser = {
      id: 'usr-1',
      email: 'consultant@merqent.com',
      fullName: 'Consultant Lead',
      role: UserRole.CONSULTANT_OPERATOR,
      status: UserStatus.ACTIVE,
      mfaEnabled: false,
      createdAt: new Date(),
    };

    it('login stores access token in memory and returns user', async () => {
      jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          accessToken: 'jwt-access-token-123',
          user: mockUser,
        },
      });

      const user = await authApi.login({
        email: 'consultant@merqent.com',
        password: 'Password12345!',
      });

      expect(user.id).toBe('usr-1');
      expect(authStorage.getAccessToken()).toBe('jwt-access-token-123');
      expect(apiClient.post).toHaveBeenCalledWith('auth/login', {
        email: 'consultant@merqent.com',
        password: 'Password12345!',
      });
    });

    it('refresh updates access token in memory', async () => {
      jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          accessToken: 'jwt-new-access-token-456',
          user: mockUser,
        },
      });

      const token = await authApi.refresh();

      expect(token).toBe('jwt-new-access-token-456');
      expect(authStorage.getAccessToken()).toBe('jwt-new-access-token-456');
    });

    it('logout clears in-memory tokens and calls logout endpoint', async () => {
      authStorage.setAccessToken('current-token');
      jest.spyOn(apiClient, 'post').mockResolvedValueOnce({ success: true });

      await authApi.logout();

      expect(authStorage.getAccessToken()).toBeNull();
      expect(apiClient.post).toHaveBeenCalledWith('auth/logout');
    });

    it('getMe returns user data via apiClient', async () => {
      jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: mockUser,
      });

      const user = await authApi.getMe();

      expect(user.email).toBe('consultant@merqent.com');
      expect(apiClient.get).toHaveBeenCalledWith('auth/me');
    });
  });
});
