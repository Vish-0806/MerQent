import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, UserRole } from '@merqent/shared-types';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard (Task 2.9)', () => {
  let guard: PermissionsGuard;
  let mockReflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new PermissionsGuard(mockReflector as unknown as Reflector);
  });

  interface MockRequest {
    user?: { id: string; role?: UserRole };
  }

  const createMockContext = (user?: { id: string; role?: UserRole }): ExecutionContext => {
    const req: MockRequest = { user };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  it('allows public route with @Public decorator', () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when no permissions are required on route', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(undefined); // requiredPermissions
    const context = createMockContext({ id: 'u1', role: UserRole.CONSULTANT_OPERATOR });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException when unauthenticated user accesses permission-protected route', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([Permission.PROJECT_CREATE]); // requiredPermissions
    const context = createMockContext(undefined); // no user

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when role lacks required permission', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([Permission.PROJECT_CREATE]); // requiredPermissions
    // Consultant cannot create projects (only PE firms can)
    const context = createMockContext({ id: 'u1', role: UserRole.CONSULTANT_OPERATOR });

    try {
      guard.canActivate(context);
      fail('Expected guard to throw ForbiddenException');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).message).toBe(
        "Forbidden: Role 'CONSULTANT_OPERATOR' lacks required permissions [PROJECT_CREATE]",
      );
    }
  });

  it('allows access when role possesses required permission', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([Permission.PROJECT_CREATE]); // requiredPermissions
    const context = createMockContext({ id: 'u1', role: UserRole.PE_FIRM_ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows PLATFORM_ADMIN access to any permission', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([Permission.ORGANIZATION_UPDATE, Permission.AUDIT_LOG_READ]);
    const context = createMockContext({ id: 'u1', role: UserRole.PLATFORM_ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });
});
