import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common.module';
import { RequestContextService } from './context/request-context.service';
import { AppConfigService } from './config/app-config.service';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { TenantGuard } from './guards/tenant.guard';

describe('CommonModule (Task 2.11: Common Infrastructure)', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ port: 4000, nodeEnv: 'test' })],
        }),
        CommonModule,
      ],
    }).compile();
  });

  it('successfully compiles and resolves all common providers', () => {
    expect(module.get(RequestContextService)).toBeInstanceOf(RequestContextService);
    expect(module.get(AppConfigService)).toBeInstanceOf(AppConfigService);
    expect(module.get(CorrelationIdMiddleware)).toBeInstanceOf(CorrelationIdMiddleware);
    expect(module.get(TransformInterceptor)).toBeInstanceOf(TransformInterceptor);
    expect(module.get(LoggingInterceptor)).toBeInstanceOf(LoggingInterceptor);
    expect(module.get(AllExceptionsFilter)).toBeInstanceOf(AllExceptionsFilter);
    expect(module.get(RolesGuard)).toBeInstanceOf(RolesGuard);
    expect(module.get(PermissionsGuard)).toBeInstanceOf(PermissionsGuard);
    expect(module.get(TenantGuard)).toBeInstanceOf(TenantGuard);
  });
});
