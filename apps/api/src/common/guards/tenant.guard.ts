import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@merqent/shared-types';
import { TENANT_PARAM_KEY } from '../decorators/tenant.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const tenantParamName =
      this.reflector.getAllAndOverride<string>(TENANT_PARAM_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 'firmId';

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user || !user.role) {
      throw new UnauthorizedException('Authentication required');
    }

    // Platform admins have cross-tenant management oversight
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    // Authoritative target firm identifier resolution:
    // 1. Route path params (highest trust, authoritative for existing resources)
    // 2. Request body params (for resource creation)
    // 3. Query parameters (for tenant-scoped listings)
    // Note: Spoofable client headers (e.g. x-tenant-id) are rejected to prevent bypasses.
    let targetFirmId: unknown =
      req.params?.[tenantParamName] ??
      req.params?.firmId ??
      req.body?.[tenantParamName] ??
      req.body?.firmId ??
      req.query?.[tenantParamName] ??
      req.query?.firmId;

    if (!targetFirmId && tenantParamName === 'id') {
      targetFirmId = req.params?.id;
    }

    if (typeof targetFirmId !== 'string' || targetFirmId.trim().length === 0) {
      throw new ForbiddenException(
        `Forbidden: Tenant identifier '${tenantParamName}' missing from request`,
      );
    }

    const cleanTargetFirmId = targetFirmId.trim();

    if (!user.firmId) {
      throw new ForbiddenException(
        'Forbidden: User is not associated with any organization tenant',
      );
    }

    if (user.firmId !== cleanTargetFirmId) {
      throw new ForbiddenException(
        'Forbidden: Cross-tenant access prohibited. Resource belongs to another organization',
      );
    }

    return true;
  }
}
