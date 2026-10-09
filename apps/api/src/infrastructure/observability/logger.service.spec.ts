import { AppLogger, StructuredLogPayload } from './logger.service';
import { RequestContextService } from '../../common/context/request-context.service';
import { UserRole } from '@merqent/shared-types';

describe('AppLogger (Task 2.12)', () => {
  let logger: AppLogger;
  let requestContext: RequestContextService;
  let pinoInstance: ReturnType<AppLogger['getPinoInstance']>;

  beforeEach(() => {
    requestContext = new RequestContextService();
    logger = new AppLogger(requestContext);
    pinoInstance = logger.getPinoInstance();
  });

  it('should format log with correlation ID, service name, and timestamp', () => {
    const infoSpy = jest.spyOn(pinoInstance, 'info').mockImplementation(() => {});

    requestContext.run(
      {
        correlationId: 'test-corr-abc-123',
        startTime: Date.now(),
        user: {
          id: 'user-uuid-999',
          email: 'partner@pefirm.com',
          role: UserRole.PE_FIRM_ADMIN,
          firmId: 'org-uuid-888',
        },
      },
      () => {
        logger.log('Operation completed successfully', 'DomainService');
      },
    );

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [rawPayload, message] = infoSpy.mock.calls[0]!;
    const payload = rawPayload as StructuredLogPayload;

    expect(message).toBe('Operation completed successfully');
    expect(payload.service).toBe('merqent-api');
    expect(payload.correlationId).toBe('test-corr-abc-123');
    expect(payload.userId).toBe('user-uuid-999');
    expect(payload.tenantId).toBe('org-uuid-888');
    expect(payload.context).toBe('DomainService');
    expect(typeof payload.timestamp).toBe('string');
  });

  it('should automatically sanitize sensitive metadata before logging', () => {
    const warnSpy = jest.spyOn(pinoInstance, 'warn').mockImplementation(() => {});

    const sensitiveData = {
      password: 'super-secret-password',
      accessToken: 'jwt.bearer.token',
      apiKey: 'sk-proj-123456',
      safeMetric: 42,
      nested: {
        clientSecret: 'shhh-secret',
        organizationName: 'Acme Partners',
      },
    };

    logger.warn('Warning event triggered', sensitiveData, 'SecurityService');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [rawPayload] = warnSpy.mock.calls[0]!;
    const payload = rawPayload as Record<string, unknown>;
    const nested = payload['nested'] as Record<string, unknown>;

    expect(payload['password']).not.toBe('super-secret-password');
    expect(String(payload['password'])).toContain('***');
    expect(payload['accessToken']).not.toBe('jwt.bearer.token');
    expect(String(payload['accessToken'])).toContain('***');
    expect(payload['apiKey']).not.toBe('sk-proj-123456');
    expect(String(payload['apiKey'])).toContain('***');
    expect(payload['safeMetric']).toBe(42);
    expect(nested['clientSecret']).not.toBe('shhh-secret');
    expect(String(nested['clientSecret'])).toContain('***');
    expect(nested['organizationName']).toBe('Acme Partners');
  });

  it('should extract error stack traces and sanitize error messages', () => {
    const errorSpy = jest.spyOn(pinoInstance, 'error').mockImplementation(() => {});

    const error = new Error('Database connection failed with credentials password=secret123');
    error.stack = 'Error: Database connection failed\n    at query (database.ts:12:4)';

    logger.error('Failed to execute query', error.stack, 'DatabaseModule');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [rawPayload, message] = errorSpy.mock.calls[0]!;
    const payload = rawPayload as StructuredLogPayload;

    expect(message).toBe('Failed to execute query');
    expect(payload.context).toBe('DatabaseModule');
    expect(payload.stack).toContain('database.ts:12:4');
  });

  it('should fallback to no-correlation-id when executed outside request context', () => {
    const infoSpy = jest.spyOn(pinoInstance, 'info').mockImplementation(() => {});

    logger.log('Startup initialization');

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [rawPayload] = infoSpy.mock.calls[0]!;
    const payload = rawPayload as StructuredLogPayload;

    expect(payload.correlationId).toBe('no-correlation-id');
    expect(payload.userId).toBeUndefined();
    expect(payload.tenantId).toBeUndefined();
  });
});
