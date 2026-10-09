import {
  UserRole,
  Permission,
  hasPermission as checkSharedPermission,
  hasRole as checkSharedRole,
} from '@merqent/shared-types';
import { AuthUser } from './auth';

export interface RouteAuthorizationRule {
  pathPrefix: string;
  allowedRoles?: UserRole[];
  requiredPermissions?: Permission[];
  requiresAuth: boolean;
}

/**
 * Route access policies for frontend navigation and layout rendering.
 * NOTE: Frontend route guards provide usability, navigation flow, and UX enhancements.
 * Absolute security enforcement is strictly executed by backend NestJS API guards.
 */
export const ROUTE_POLICIES: RouteAuthorizationRule[] = [
  {
    pathPrefix: '/admin',
    allowedRoles: [UserRole.PLATFORM_ADMIN, UserRole.VERIFICATION_REVIEWER],
    requiresAuth: true,
  },
  {
    pathPrefix: '/firm',
    allowedRoles: [UserRole.PE_FIRM_ADMIN, UserRole.PE_FIRM_MEMBER, UserRole.PLATFORM_ADMIN],
    requiresAuth: true,
  },
  {
    pathPrefix: '/consultant',
    allowedRoles: [UserRole.CONSULTANT_OPERATOR, UserRole.PLATFORM_ADMIN],
    requiresAuth: true,
  },
  {
    pathPrefix: '/verification',
    allowedRoles: [
      UserRole.VERIFICATION_REVIEWER,
      UserRole.PLATFORM_ADMIN,
      UserRole.CONSULTANT_OPERATOR,
    ],
    requiresAuth: true,
  },
];

/**
 * Check if an authenticated user possesses a specific domain permission.
 */
export function can(user: AuthUser | null, permission: Permission): boolean {
  if (!user || !user.role) return false;
  return checkSharedPermission(user.role, permission);
}

/**
 * Check if an authenticated user holds any of the specified roles.
 */
export function isRole(user: AuthUser | null, ...roles: UserRole[]): boolean {
  if (!user || !user.role) return false;
  return checkSharedRole(user.role, roles);
}

/**
 * Check if user is associated with a specific organization tenant.
 * Platform admins possess cross-tenant oversight.
 */
export function isTenantMember(user: AuthUser | null, targetFirmId: string): boolean {
  if (!user) return false;
  if (user.role === UserRole.PLATFORM_ADMIN) return true;
  return user.firmId === targetFirmId;
}

/**
 * Evaluate client-side route access for navigation and redirects.
 */
export function canAccessRoute(
  pathname: string,
  user: AuthUser | null,
): { allowed: boolean; redirect?: string; reason?: string } {
  // Public routes
  if (pathname.startsWith('/auth') || pathname === '/' || pathname.startsWith('/terms')) {
    return { allowed: true };
  }

  const policy = ROUTE_POLICIES.find((p) => pathname.startsWith(p.pathPrefix));

  if (!policy) {
    // Default fallback: requires authentication if authenticated zone
    return { allowed: true };
  }

  if (policy.requiresAuth && !user) {
    return {
      allowed: false,
      redirect: `/auth/login?redirect=${encodeURIComponent(pathname)}`,
      reason: 'Authentication required',
    };
  }

  if (user && policy.allowedRoles && !policy.allowedRoles.includes(user.role)) {
    return {
      allowed: false,
      redirect: '/unauthorized',
      reason: `Role '${user.role}' cannot access ${policy.pathPrefix}`,
    };
  }

  return { allowed: true };
}

/**
 * Helper to get user-friendly role display label and theme badge color.
 */
export function getRoleDisplay(role: UserRole): { label: string; badgeVariant: string } {
  switch (role) {
    case UserRole.PLATFORM_ADMIN:
      return { label: 'Platform Administrator', badgeVariant: 'destructive' };
    case UserRole.PE_FIRM_ADMIN:
      return { label: 'PE Firm Managing Director', badgeVariant: 'default' };
    case UserRole.PE_FIRM_MEMBER:
      return { label: 'PE Deal Team Member', badgeVariant: 'secondary' };
    case UserRole.CONSULTANT_OPERATOR:
      return { label: 'PMI Operator Specialist', badgeVariant: 'outline' };
    case UserRole.VERIFICATION_REVIEWER:
      return { label: 'Credential Reviewer', badgeVariant: 'secondary' };
    default:
      return { label: role, badgeVariant: 'secondary' };
  }
}
