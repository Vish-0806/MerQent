import { Permission, UserRole, UserStatus } from '@merqent/shared-types';
import { can, isRole, isTenantMember, canAccessRoute, getRoleDisplay } from './authorization';
import { AuthUser } from './auth';

describe('Frontend Authorization Utilities (Task 2.9)', () => {
  const createMockUser = (
    role: UserRole,
    firmId?: string,
    consultantProfileId?: string,
  ): AuthUser => ({
    id: 'usr-123',
    email: 'user@merqent.com',
    fullName: 'Test User',
    role,
    status: UserStatus.ACTIVE,
    firmId,
    consultantProfileId,
    mfaEnabled: false,
    createdAt: new Date(),
  });

  describe('Permission Evaluation (can)', () => {
    it('returns false when user is null', () => {
      expect(can(null, Permission.PROJECT_CREATE)).toBe(false);
    });

    it('grants PE_FIRM_ADMIN permission to create projects', () => {
      const user = createMockUser(UserRole.PE_FIRM_ADMIN, 'firm-1');
      expect(can(user, Permission.PROJECT_CREATE)).toBe(true);
      expect(can(user, Permission.ORGANIZATION_UPDATE)).toBe(true);
    });

    it('denies CONSULTANT_OPERATOR permission to create projects', () => {
      const consultant = createMockUser(UserRole.CONSULTANT_OPERATOR);
      expect(can(consultant, Permission.PROJECT_CREATE)).toBe(false);
      expect(can(consultant, Permission.CONSULTANT_PROFILE_UPDATE)).toBe(true);
    });

    it('grants PLATFORM_ADMIN access to all domain permissions', () => {
      const admin = createMockUser(UserRole.PLATFORM_ADMIN);
      expect(can(admin, Permission.PROJECT_CREATE)).toBe(true);
      expect(can(admin, Permission.AUDIT_LOG_READ)).toBe(true);
      expect(can(admin, Permission.PLATFORM_USER_MANAGE)).toBe(true);
    });
  });

  describe('Role Evaluation (isRole)', () => {
    it('returns true when user has matching role', () => {
      const user = createMockUser(UserRole.PE_FIRM_ADMIN);
      expect(isRole(user, UserRole.PE_FIRM_ADMIN)).toBe(true);
      expect(isRole(user, UserRole.PE_FIRM_ADMIN, UserRole.PE_FIRM_MEMBER)).toBe(true);
    });

    it('returns false when user does not have matching role', () => {
      const user = createMockUser(UserRole.CONSULTANT_OPERATOR);
      expect(isRole(user, UserRole.PE_FIRM_ADMIN)).toBe(false);
    });

    it('returns false when user is null', () => {
      expect(isRole(null, UserRole.PLATFORM_ADMIN)).toBe(false);
    });
  });

  describe('Tenant Membership (isTenantMember)', () => {
    it('returns true when user firmId matches targetFirmId', () => {
      const user = createMockUser(UserRole.PE_FIRM_ADMIN, 'firm-abc');
      expect(isTenantMember(user, 'firm-abc')).toBe(true);
    });

    it('returns false when user firmId does not match targetFirmId', () => {
      const user = createMockUser(UserRole.PE_FIRM_ADMIN, 'firm-abc');
      expect(isTenantMember(user, 'firm-xyz')).toBe(false);
    });

    it('returns true for PLATFORM_ADMIN regardless of target firm', () => {
      const admin = createMockUser(UserRole.PLATFORM_ADMIN);
      expect(isTenantMember(admin, 'any-tenant-firm-id')).toBe(true);
    });

    it('returns false when user is null', () => {
      expect(isTenantMember(null, 'firm-abc')).toBe(false);
    });
  });

  describe('Route Access Policies (canAccessRoute)', () => {
    it('allows public access to /auth and home page', () => {
      expect(canAccessRoute('/auth/login', null).allowed).toBe(true);
      expect(canAccessRoute('/', null).allowed).toBe(true);
    });

    it('redirects unauthenticated user accessing /firm to login', () => {
      const access = canAccessRoute('/firm/mandates', null);
      expect(access.allowed).toBe(false);
      expect(access.redirect).toContain('/auth/login?redirect=');
    });

    it('blocks consultant from accessing /firm and redirects to unauthorized', () => {
      const consultant = createMockUser(UserRole.CONSULTANT_OPERATOR);
      const access = canAccessRoute('/firm/projects', consultant);
      expect(access.allowed).toBe(false);
      expect(access.redirect).toBe('/unauthorized');
    });

    it('allows PE_FIRM_ADMIN to access /firm/projects', () => {
      const peAdmin = createMockUser(UserRole.PE_FIRM_ADMIN, 'firm-1');
      const access = canAccessRoute('/firm/projects', peAdmin);
      expect(access.allowed).toBe(true);
    });

    it('allows PLATFORM_ADMIN to access /admin routes', () => {
      const admin = createMockUser(UserRole.PLATFORM_ADMIN);
      const access = canAccessRoute('/admin/users', admin);
      expect(access.allowed).toBe(true);
    });
  });

  describe('Role Display Helper (getRoleDisplay)', () => {
    it('returns correct label and badge for each role', () => {
      expect(getRoleDisplay(UserRole.PLATFORM_ADMIN).label).toBe('Platform Administrator');
      expect(getRoleDisplay(UserRole.PE_FIRM_ADMIN).label).toBe('PE Firm Managing Director');
      expect(getRoleDisplay(UserRole.CONSULTANT_OPERATOR).label).toBe('PMI Operator Specialist');
    });
  });
});
