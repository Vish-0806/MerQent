import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@merqent/shared-types';
import { TenantGuard } from './tenant.guard';

describe('TenantGuard (Task 2.9)', () => {
  let guard: TenantGuard;
  let mockReflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new TenantGuard(mockReflector as unknown as Reflector);
  });

  interface MockRequest {
    user?: { id: string; role?: UserRole; firmId?: string };
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
  }

  const createMockContext = (req: MockRequest): ExecutionContext => {
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
    const context = createMockContext({});

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException when unauthenticated user calls tenant-guarded route', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce('firmId'); // paramName
    const context = createMockContext({ params: { firmId: 'firm-123' } });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('allows PLATFORM_ADMIN cross-tenant access without restriction', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce('firmId'); // paramName
    const context = createMockContext({
      user: { id: 'admin-1', role: UserRole.PLATFORM_ADMIN },
      params: { firmId: 'any-target-firm' },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when target tenant identifier is missing', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce('firmId'); // paramName
    const context = createMockContext({
      user: { id: 'pe-1', role: UserRole.PE_FIRM_ADMIN, firmId: 'firm-abc' },
      params: {}, // No firmId provided
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      "Forbidden: Tenant identifier 'firmId' missing from request",
    );
  });

  it('throws ForbiddenException when user has no organization association (e.g. consultant)', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce('firmId'); // paramName
    const context = createMockContext({
      user: { id: 'c-1', role: UserRole.CONSULTANT_OPERATOR }, // no firmId
      params: { firmId: 'firm-abc' },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Forbidden: User is not associated with any organization tenant',
    );
  });

  it('throws ForbiddenException when user attempts cross-tenant access to another firm', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce('firmId'); // paramName
    const context = createMockContext({
      user: { id: 'pe-1', role: UserRole.PE_FIRM_ADMIN, firmId: 'firm-my-firm' },
      params: { firmId: 'firm-other-firm' }, // Cross-tenant!
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Forbidden: Cross-tenant access prohibited. Resource belongs to another organization',
    );
  });

  it('allows access when user firmId matches route param firmId', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce('firmId'); // paramName
    const context = createMockContext({
      user: { id: 'pe-1', role: UserRole.PE_FIRM_ADMIN, firmId: 'firm-my-firm' },
      params: { firmId: 'firm-my-firm' },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when tenant ID is supplied in request body', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce('firmId'); // paramName
    const context = createMockContext({
      user: { id: 'pe-1', role: UserRole.PE_FIRM_MEMBER, firmId: 'firm-my-firm' },
      body: { firmId: 'firm-my-firm', title: 'New Mandate' },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('respects custom parameter name specified in @CheckTenant decorator', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce('orgId'); // custom paramName
    const context = createMockContext({
      user: { id: 'pe-1', role: UserRole.PE_FIRM_ADMIN, firmId: 'org-999' },
      params: { orgId: 'org-999' },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects spoofed x-tenant-id client headers when route or body does not specify tenant', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce('firmId'); // paramName
    const context = createMockContext({
      user: { id: 'pe-1', role: UserRole.PE_FIRM_ADMIN, firmId: 'firm-my-firm' },
      headers: { 'x-tenant-id': 'firm-my-firm' }, // spoofed header attempt
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      "Forbidden: Tenant identifier 'firmId' missing from request",
    );
  });

  it('rejects type-confusion / non-string tenant parameter injection', () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce('firmId'); // paramName
    const context = createMockContext({
      user: { id: 'pe-1', role: UserRole.PE_FIRM_ADMIN, firmId: 'firm-my-firm' },
      body: { firmId: ['firm-my-firm', 'firm-other-firm'] }, // array injection attack
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      "Forbidden: Tenant identifier 'firmId' missing from request",
    );
  });
});
