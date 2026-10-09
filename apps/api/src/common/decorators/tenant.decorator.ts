import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TENANT_PARAM_KEY = 'tenantParam';

/**
 * Marks an endpoint or controller for tenant isolation enforcement.
 * By default looks for 'firmId' in route parameters, query, body, or x-tenant-id header.
 */
export const CheckTenant = (paramName = 'firmId') => SetMetadata(TENANT_PARAM_KEY, paramName);

/**
 * Parameter decorator to extract the active tenant ID (firmId) from the authenticated user.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.firmId;
  },
);
