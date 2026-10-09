import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { UserRole, UserStatus } from '@merqent/shared-types';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';

describe('AuthController (Task 2.8)', () => {
  let controller: AuthController;
  let mockAuthService: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    getMe: jest.Mock;
  };
  let mockConfigService: { get: jest.Mock };
  let mockReq: {
    ip: string;
    socket: { remoteAddress: string };
    headers: Record<string, string>;
    cookies: Record<string, string>;
  };
  let mockRes: {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };

  beforeEach(() => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getMe: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const configMap: Record<string, unknown> = {
          'jwt.cookieSecure': false,
          'jwt.cookieDomain': 'localhost',
        };
        return configMap[key] ?? defaultValue;
      }),
    };

    mockReq = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      headers: { 'user-agent': 'Jest-Agent' },
      cookies: {},
    };

    mockRes = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    controller = new AuthController(
      mockAuthService as unknown as AuthService,
      mockConfigService as unknown as ConfigService,
    );
  });

  it('register endpoint sets HttpOnly refresh cookie and returns payload', async () => {
    const registerDto: RegisterDto = {
      email: 'pe.admin@fund.com',
      password: 'StrongPassword123!',
      fullName: 'PE Partner',
      role: UserRole.PE_FIRM_ADMIN,
    };

    const mockResult = {
      accessToken: 'access-jwt-token-123',
      refreshToken: 'refresh-jwt-token-123',
      user: {
        id: 'usr-1',
        email: 'pe.admin@fund.com',
        fullName: 'PE Partner',
        role: UserRole.PE_FIRM_ADMIN,
        status: UserStatus.ACTIVE,
        mfaEnabled: false,
        createdAt: new Date(),
      },
    };

    mockAuthService.register.mockResolvedValue(mockResult);

    const response = await controller.register(
      registerDto,
      mockReq as unknown as Request,
      mockRes as unknown as Response,
    );

    expect(mockAuthService.register).toHaveBeenCalledWith(registerDto, '127.0.0.1', 'Jest-Agent');
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-jwt-token-123',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
    expect(response).toEqual({
      accessToken: 'access-jwt-token-123',
      user: mockResult.user,
    });
  });

  it('login endpoint sets HttpOnly cookie and returns access token', async () => {
    const loginDto: LoginDto = {
      email: 'pe.admin@fund.com',
      password: 'StrongPassword123!',
    };

    const mockResult = {
      accessToken: 'access-token-abc',
      refreshToken: 'refresh-token-xyz',
      user: {
        id: 'usr-1',
        email: 'pe.admin@fund.com',
        fullName: 'PE Partner',
        role: UserRole.PE_FIRM_ADMIN,
        status: UserStatus.ACTIVE,
        mfaEnabled: false,
        createdAt: new Date(),
      },
    };

    mockAuthService.login.mockResolvedValue(mockResult);

    const response = await controller.login(
      loginDto,
      mockReq as unknown as Request,
      mockRes as unknown as Response,
    );

    expect(mockRes.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token-xyz',
      expect.objectContaining({
        httpOnly: true,
      }),
    );
    expect(response.accessToken).toBe('access-token-abc');
  });

  it('refresh endpoint consumes cookie, sets rotated cookie, and returns access token', async () => {
    mockReq.cookies = { refresh_token: 'existing-refresh-token' };

    mockAuthService.refresh.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'rotated-refresh-token',
      user: { id: 'usr-1' },
    });

    const response = await controller.refresh(
      mockReq as unknown as Request,
      mockRes as unknown as Response,
    );

    expect(mockAuthService.refresh).toHaveBeenCalledWith(
      'existing-refresh-token',
      '127.0.0.1',
      'Jest-Agent',
    );
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'rotated-refresh-token',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(response.accessToken).toBe('new-access-token');
  });

  it('refresh endpoint throws UnauthorizedException if no cookie or body token provided', async () => {
    mockReq.cookies = {};

    await expect(
      controller.refresh(mockReq as unknown as Request, mockRes as unknown as Response),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockAuthService.refresh).not.toHaveBeenCalled();
  });

  it('logout endpoint clears cookie and triggers token revocation', async () => {
    mockReq.cookies = { refresh_token: 'active-refresh-token' };
    mockAuthService.logout.mockResolvedValue({ success: true, message: 'Logged out successfully' });

    const response = await controller.logout(
      mockReq as unknown as Request,
      mockRes as unknown as Response,
    );

    expect(mockAuthService.logout).toHaveBeenCalledWith('active-refresh-token');
    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
      }),
    );
    expect(response.success).toBe(true);
  });

  it('me endpoint returns current authenticated user profile', async () => {
    const mockUser = {
      id: 'usr-1',
      email: 'pe.admin@fund.com',
      fullName: 'PE Partner',
      role: UserRole.PE_FIRM_ADMIN,
      status: UserStatus.ACTIVE,
      mfaEnabled: false,
      createdAt: new Date(),
    };
    mockAuthService.getMe.mockResolvedValue(mockUser);

    const user = await controller.me('usr-1');

    expect(mockAuthService.getMe).toHaveBeenCalledWith('usr-1');
    expect(user.id).toBe('usr-1');
  });
});
