import {
  createPaginationMeta,
  createApiResponse,
  createPaginatedResponse,
  UserRole,
  UserStatus,
  FileScanStatus,
  RealtimeEvent,
  ErrorCode,
  FirmAumTier,
  PrimaryRoleType,
  AvailabilityStatus,
} from './index';

describe('@merqent/shared-types — Helper Functions & Domain Enums', () => {
  describe('createPaginationMeta', () => {
    it('computes accurate pagination metadata for standard first page', () => {
      const meta = createPaginationMeta(100, 1, 20);
      expect(meta.total).toBe(100);
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(20);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPreviousPage).toBe(false);
    });

    it('computes accurate pagination metadata for middle page', () => {
      const meta = createPaginationMeta(95, 3, 20);
      expect(meta.total).toBe(95);
      expect(meta.page).toBe(3);
      expect(meta.limit).toBe(20);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPreviousPage).toBe(true);
    });

    it('computes accurate pagination metadata for final page', () => {
      const meta = createPaginationMeta(50, 5, 10);
      expect(meta.total).toBe(50);
      expect(meta.page).toBe(5);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPreviousPage).toBe(true);
    });

    it('safely handles empty results (total = 0)', () => {
      const meta = createPaginationMeta(0, 1, 20);
      expect(meta.total).toBe(0);
      expect(meta.page).toBe(1);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPreviousPage).toBe(false);
    });

    it('clamps negative inputs gracefully', () => {
      const meta = createPaginationMeta(-10, -5, 0);
      expect(meta.total).toBe(0);
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(1);
      expect(meta.totalPages).toBe(0);
    });
  });

  describe('createApiResponse & createPaginatedResponse', () => {
    it('creates standard API response envelope with ISO timestamp', () => {
      const payload = { userId: '123', name: 'John Doe' };
      const response = createApiResponse(payload, undefined, 'User retrieved successfully');

      expect(response.data).toEqual(payload);
      expect(response.message).toBe('User retrieved successfully');
      expect(typeof response.timestamp).toBe('string');
      expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
    });

    it('creates standard paginated response envelope with metadata', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const response = createPaginatedResponse(items, 2, 1, 10, 'Items retrieved');

      expect(response.data).toEqual(items);
      expect(response.meta).toEqual(createPaginationMeta(2, 1, 10));
      expect(response.message).toBe('Items retrieved');
      expect(typeof response.timestamp).toBe('string');
    });
  });

  describe('Domain Enums', () => {
    it('verifies UserRole, UserStatus, and FileScanStatus values', () => {
      expect(UserRole.PLATFORM_ADMIN).toBe('PLATFORM_ADMIN');
      expect(UserRole.PE_FIRM_ADMIN).toBe('PE_FIRM_ADMIN');
      expect(UserRole.PE_FIRM_MEMBER).toBe('PE_FIRM_MEMBER');
      expect(UserRole.CONSULTANT_OPERATOR).toBe('CONSULTANT_OPERATOR');

      expect(UserStatus.ACTIVE).toBe('ACTIVE');
      expect(UserStatus.SUSPENDED).toBe('SUSPENDED');
      expect(UserStatus.PENDING_VERIFICATION).toBe('PENDING_VERIFICATION');

      expect(FileScanStatus.PENDING).toBe('PENDING');
      expect(FileScanStatus.CLEAN).toBe('CLEAN');
      expect(FileScanStatus.INFECTED).toBe('INFECTED');
    });

    it('verifies RealtimeEvent and ErrorCode contracts', () => {
      expect(RealtimeEvent.CONNECTION_ESTABLISHED).toBe('connection:established');
      expect(RealtimeEvent.ROOM_JOIN).toBe('room:join');
      expect(RealtimeEvent.ROOM_JOINED).toBe('room:joined');
      expect(RealtimeEvent.HEARTBEAT).toBe('heartbeat');

      expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCode.WS_AUTHENTICATION_FAILED).toBe('WS_AUTHENTICATION_FAILED');
      expect(ErrorCode.WS_ROOM_JOIN_DENIED).toBe('WS_ROOM_JOIN_DENIED');
    });

    it('verifies marketplace taxonomies and tier enums', () => {
      expect(FirmAumTier.OVER_10B).toBe('OVER_10B');
      expect(PrimaryRoleType.HANDS_ON_OPERATOR).toBe('HANDS_ON_OPERATOR');
      expect(AvailabilityStatus.IMMEDIATELY_AVAILABLE).toBe('IMMEDIATELY_AVAILABLE');
    });
  });
});
