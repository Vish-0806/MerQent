import { Module, Global } from '@nestjs/common';
import { RequestContextService } from './context/request-context.service';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { AppConfigService } from './config/app-config.service';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { TenantGuard } from './guards/tenant.guard';

const COMMON_PROVIDERS = [
  RequestContextService,
  CorrelationIdMiddleware,
  AppConfigService,
  TransformInterceptor,
  LoggingInterceptor,
  AllExceptionsFilter,
  RolesGuard,
  PermissionsGuard,
  TenantGuard,
];

@Global()
@Module({
  providers: COMMON_PROVIDERS,
  exports: COMMON_PROVIDERS,
})
export class CommonModule {}
