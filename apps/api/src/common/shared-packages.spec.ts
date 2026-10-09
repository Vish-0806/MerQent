import {
  UserRole,
  UserStatus,
  FirmAumTier,
  PrimaryRoleType,
  AvailabilityStatus,
  VerificationTier,
  ProjectStatus,
  ConnectionStatus,
  MeetingStatus,
  TaxonomyCategory,
  VerificationRequestStatus,
  FileScanStatus,
} from '@merqent/shared-types';
import type { ApiErrorResponse, DatabaseHealthStatus } from '@merqent/shared-types';
import { PaginationQuerySchema, SortQuerySchema, IdParamSchema } from '@merqent/validation';

describe('Shared Packages Integration in API', () => {
  it('exposes identical domain enums matching database models', () => {
    expect(UserRole.PLATFORM_ADMIN).toBe('PLATFORM_ADMIN');
    expect(UserStatus.PENDING_VERIFICATION).toBe('PENDING_VERIFICATION');
    expect(FirmAumTier.OVER_10B).toBe('OVER_10B');
    expect(PrimaryRoleType.HANDS_ON_OPERATOR).toBe('HANDS_ON_OPERATOR');
    expect(AvailabilityStatus.BOOKED).toBe('BOOKED');
    expect(VerificationTier.TIER_3_REFERENCE_VERIFIED).toBe('TIER_3_REFERENCE_VERIFIED');
    expect(ProjectStatus.FULFILLED).toBe('FULFILLED');
    expect(ConnectionStatus.EXPIRED).toBe('EXPIRED');
    expect(MeetingStatus.RESCHEDULED).toBe('RESCHEDULED');
    expect(TaxonomyCategory.INTEGRATION_DISCIPLINE).toBe('INTEGRATION_DISCIPLINE');
    expect(VerificationRequestStatus.IN_REVIEW).toBe('IN_REVIEW');
    expect(FileScanStatus.INFECTED).toBe('INFECTED');
  });

  it('validates pagination and sort parameters correctly in API pipes', () => {
    const query = PaginationQuerySchema.parse({ page: '3', limit: '15' });
    expect(query.page).toBe(3);
    expect(query.limit).toBe(15);

    const sort = SortQuerySchema.parse({ sortBy: 'createdAt', sortOrder: 'asc' });
    expect(sort.sortBy).toBe('createdAt');
    expect(sort.sortOrder).toBe('asc');
  });

  it('validates UUID path params', () => {
    const validUuid = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
    expect(IdParamSchema.safeParse({ id: validUuid }).success).toBe(true);
    expect(IdParamSchema.safeParse({ id: 'invalid-id' }).success).toBe(false);
  });

  it('verifies standardized error and health response shapes', () => {
    const errorDto: ApiErrorResponse = {
      statusCode: 404,
      message: 'Consultant not found',
      error: 'Not Found',
      timestamp: new Date().toISOString(),
      path: '/api/v1/consultants/123',
    };
    expect(errorDto.statusCode).toBe(404);

    const dbHealth: DatabaseHealthStatus = {
      status: 'connected',
      latencyMs: 15,
    };
    expect(dbHealth.status).toBe('connected');
  });
});
