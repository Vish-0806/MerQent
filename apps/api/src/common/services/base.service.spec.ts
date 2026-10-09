import { UserRole } from '@merqent/shared-types';
import { BaseService } from './base.service';
import { RequestContextService, RequestContextData } from '../context/request-context.service';

class TestDomainService extends BaseService {
  constructor(requestContext?: RequestContextService) {
    super(TestDomainService.name, requestContext);
  }

  public getContextDetails() {
    return {
      correlationId: this.correlationId,
      currentUser: this.currentUser,
      tenantId: this.tenantId,
    };
  }

  public executeOperation() {
    this.logWithContext('Operation executing');
    this.warnWithContext('Potential threshold warning');
    this.errorWithContext('Operation failure');
  }
}

describe('BaseService (Task 2.11: Common Infrastructure)', () => {
  let requestContextService: RequestContextService;
  let service: TestDomainService;

  beforeEach(() => {
    requestContextService = new RequestContextService();
    service = new TestDomainService(requestContextService);
  });

  it('exposes correlationId and user context via RequestContextService', () => {
    const mockContext: RequestContextData = {
      correlationId: 'domain-op-101',
      startTime: Date.now(),
      user: {
        id: 'user-77',
        email: 'deal.lead@kkr.com',
        role: UserRole.PE_FIRM_ADMIN,
        firmId: 'firm-kkr',
      },
    };

    requestContextService.run(mockContext, () => {
      const details = service.getContextDetails();
      expect(details.correlationId).toBe('domain-op-101');
      expect(details.currentUser?.id).toBe('user-77');
      expect(details.tenantId).toBe('firm-kkr');
    });
  });

  it('defaults safely to fallback values outside request context', () => {
    const details = service.getContextDetails();
    expect(details.correlationId).toBe('no-correlation-id');
    expect(details.currentUser).toBeUndefined();
    expect(details.tenantId).toBeUndefined();
  });

  it('logs contextual messages without throwing', () => {
    expect(() => service.executeOperation()).not.toThrow();
  });
});
