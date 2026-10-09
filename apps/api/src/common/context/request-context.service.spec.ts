import { UserRole } from '@merqent/shared-types';
import { RequestContextService, RequestContextData } from './request-context.service';

describe('RequestContextService (Task 2.11: Common Infrastructure)', () => {
  let service: RequestContextService;

  beforeEach(() => {
    service = new RequestContextService();
  });

  it('returns fallback correlationId and undefined context when outside request scope', () => {
    expect(service.getContext()).toBeUndefined();
    expect(service.getCorrelationId()).toBe('no-correlation-id');
    expect(service.getCurrentUser()).toBeUndefined();
    expect(service.getTenantId()).toBeUndefined();
    expect(service.getDurationMs()).toBe(0);
  });

  it('provides active context and user details within run() scope', () => {
    const mockContext: RequestContextData = {
      correlationId: 'test-trace-123',
      ip: '192.168.1.1',
      userAgent: 'JestTestRunner/1.0',
      startTime: Date.now() - 50,
      user: {
        id: 'u-1',
        email: 'admin@merqent.com',
        role: UserRole.PLATFORM_ADMIN,
        firmId: 'firm-alpha',
      },
    };

    service.run(mockContext, () => {
      expect(service.getContext()).toBeDefined();
      expect(service.getCorrelationId()).toBe('test-trace-123');
      expect(service.getCurrentUser()).toEqual(mockContext.user);
      expect(service.getTenantId()).toBe('firm-alpha');
      expect(service.getDurationMs()).toBeGreaterThanOrEqual(40);
    });
  });

  it('allows updating user context and metadata during request lifecycle', () => {
    const mockContext: RequestContextData = {
      correlationId: 'trace-update-456',
      startTime: Date.now(),
    };

    service.run(mockContext, () => {
      expect(service.getCurrentUser()).toBeUndefined();

      service.setUser({
        id: 'u-2',
        email: 'consultant@merqent.com',
        role: UserRole.CONSULTANT_OPERATOR,
        consultantProfileId: 'cp-999',
      });

      expect(service.getCurrentUser()?.id).toBe('u-2');
      expect(service.getCurrentUser()?.role).toBe(UserRole.CONSULTANT_OPERATOR);
      expect(service.getCurrentUser()?.consultantProfileId).toBe('cp-999');

      service.setMetadata('auditAction', 'PROFILE_VIEW');
      expect(service.getMetadata('auditAction')).toBe('PROFILE_VIEW');
    });
  });

  it('maintains strict isolation between concurrent asynchronous executions', async () => {
    const runAsyncBranch = (id: string, delayMs: number) => {
      const ctx: RequestContextData = {
        correlationId: `corr-${id}`,
        startTime: Date.now(),
      };

      return service.run(ctx, async () => {
        expect(service.getCorrelationId()).toBe(`corr-${id}`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        expect(service.getCorrelationId()).toBe(`corr-${id}`);
        return service.getCorrelationId();
      });
    };

    const results = await Promise.all([
      runAsyncBranch('alpha', 30),
      runAsyncBranch('beta', 15),
      runAsyncBranch('gamma', 5),
    ]);

    expect(results).toEqual(['corr-alpha', 'corr-beta', 'corr-gamma']);
  });
});
