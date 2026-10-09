import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@merqent/shared-types';
import { RolesGuard } from './roles.guard';

describe('RolesGuard (Task 2.9)', () => {
  let guard: RolesGuard;
  let mockReflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(mockReflector as unknown as Reflector);
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

  it('allows access when no roles are required on route', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce(undefined); // requiredRoles
    const context = createMockContext({ id: 'u1', role: UserRole.CONSULTANT_OPERATOR });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException when unauthenticated user accesses role-protected route', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([UserRole.PLATFORM_ADMIN]); // requiredRoles
    const context = createMockContext(undefined); // no user

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when user role does not match required role', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([UserRole.PLATFORM_ADMIN]); // requiredRoles
    const context = createMockContext({ id: 'u1', role: UserRole.CONSULTANT_OPERATOR });

    try {
      guard.canActivate(context);
      fail('Expected guard to throw ForbiddenException');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).message).toBe(
        "Forbidden: Role 'CONSULTANT_OPERATOR' is not authorized to access this resource",
      );
    }
  });

  it('allows access when user has one of the required roles', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([UserRole.PE_FIRM_ADMIN, UserRole.PE_FIRM_MEMBER]); // requiredRoles
    const context = createMockContext({ id: 'u1', role: UserRole.PE_FIRM_ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });
});
