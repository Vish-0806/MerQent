import {
  IdParamSchema,
  PaginationQuerySchema,
  SortQuerySchema,
  SearchQuerySchema,
  DateRangeQuerySchema,
  RegisterUserSchema,
  LoginUserSchema,
  CreateProjectSchema,
  UpdateConsultantProfileSchema,
  PresignUploadSchema,
  ConfirmUploadSchema,
  MalwareScanJobPayloadSchema,
  CleanupAbandonedJobPayloadSchema,
  WsJoinRoomSchema,
  WsLeaveRoomSchema,
  WsHeartbeatSchema,
} from './index';
import { UserRole, PrimaryRoleType, AvailabilityStatus } from '@merqent/shared-types';

describe('@merqent/validation — Canonical Zod Schemas', () => {
  describe('Query & Identifier Schemas', () => {
    it('validates UUID identifiers via IdParamSchema', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(IdParamSchema.safeParse({ id: validUuid }).success).toBe(true);
      expect(IdParamSchema.safeParse({ id: 'invalid-uuid-format' }).success).toBe(false);
      expect(IdParamSchema.safeParse({ id: '' }).success).toBe(false);
    });

    it('coerces and validates PaginationQuerySchema', () => {
      const parsed = PaginationQuerySchema.parse({ page: '2', limit: '50' });
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(50);

      const defaults = PaginationQuerySchema.parse({});
      expect(defaults.page).toBe(1);
      expect(defaults.limit).toBe(20);

      expect(PaginationQuerySchema.safeParse({ page: 0 }).success).toBe(false);
      expect(PaginationQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    });

    it('validates SortQuerySchema and SearchQuerySchema', () => {
      expect(SortQuerySchema.parse({}).sortOrder).toBe('desc');
      expect(SortQuerySchema.parse({ sortOrder: 'asc' }).sortOrder).toBe('asc');
      expect(SortQuerySchema.safeParse({ sortOrder: 'invalid' }).success).toBe(false);

      const search = SearchQuerySchema.parse({ query: 'healthcare carveout', page: '1' });
      expect(search.query).toBe('healthcare carveout');
      expect(search.page).toBe(1);
    });

    it('validates DateRangeQuerySchema with ISO datetimes', () => {
      const valid = DateRangeQuerySchema.safeParse({
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.999Z',
      });
      expect(valid.success).toBe(true);
      expect(DateRangeQuerySchema.safeParse({ startDate: '2026/01/01' }).success).toBe(false);
    });
  });

  describe('User & Auth Input Schemas', () => {
    it('enforces strong password policy in RegisterUserSchema', () => {
      const validPayload = {
        email: 'partner@summit-equity.test',
        password: 'ValidPassword123!',
        fullName: 'Jane Partner',
        role: UserRole.PE_FIRM_ADMIN,
      };
      expect(RegisterUserSchema.safeParse(validPayload).success).toBe(true);

      // Fails on password length (< 12)
      expect(RegisterUserSchema.safeParse({ ...validPayload, password: 'Short1!' }).success).toBe(
        false,
      );
      // Fails on missing uppercase
      expect(
        RegisterUserSchema.safeParse({ ...validPayload, password: 'lowercaseonly123!' }).success,
      ).toBe(false);
      // Fails on missing number
      expect(
        RegisterUserSchema.safeParse({ ...validPayload, password: 'NoNumberSpecial!' }).success,
      ).toBe(false);
      // Fails on missing special character
      expect(
        RegisterUserSchema.safeParse({ ...validPayload, password: 'NoSpecialChar123' }).success,
      ).toBe(false);
      // Fails on invalid email
      expect(RegisterUserSchema.safeParse({ ...validPayload, email: 'not-an-email' }).success).toBe(
        false,
      );
    });

    it('validates LoginUserSchema', () => {
      expect(LoginUserSchema.safeParse({ email: 'user@test.com', password: 'pwd' }).success).toBe(
        true,
      );
      expect(LoginUserSchema.safeParse({ email: 'bad', password: 'pwd' }).success).toBe(false);
      expect(LoginUserSchema.safeParse({ email: 'user@test.com', password: '' }).success).toBe(
        false,
      );
    });
  });

  describe('Consultant & Project Schemas', () => {
    it('validates UpdateConsultantProfileSchema', () => {
      const validProfile = {
        headline: 'Senior PMI Carve-out Director',
        bio: 'Over fifteen years leading complex divestitures and technology integrations for global PE portfolios.',
        primaryRoleType: PrimaryRoleType.HANDS_ON_OPERATOR,
        yearsPmiExperience: 18,
        availabilityStatus: AvailabilityStatus.IMMEDIATELY_AVAILABLE,
        availableHoursPerWeek: 40,
        geographyCountry: 'US',
        willingToTravelPercent: 50,
      };
      expect(UpdateConsultantProfileSchema.safeParse(validProfile).success).toBe(true);
      expect(
        UpdateConsultantProfileSchema.safeParse({ ...validProfile, yearsPmiExperience: 0 }).success,
      ).toBe(false);
      expect(
        UpdateConsultantProfileSchema.safeParse({ ...validProfile, headline: 'hi' }).success,
      ).toBe(false);
    });

    it('validates CreateProjectSchema', () => {
      const validProject = {
        title: 'Project Apex Platform Carve-out',
        confidentialNameMasked: 'Project Apex',
        description:
          'Multi-year healthcare provider carved out from legacy enterprise parent company.',
        industryTermId: '123e4567-e89b-12d3-a456-426614174000',
        dealTypeTermId: '123e4567-e89b-12d3-a456-426614174001',
        targetStartDate: '2026-11-01T00:00:00.000Z',
        estimatedDurationMonths: 12,
        requiredTravelPercent: 25,
        geographyCountry: 'US',
      };
      expect(CreateProjectSchema.safeParse(validProject).success).toBe(true);
      expect(CreateProjectSchema.safeParse({ ...validProject, title: 'Sm' }).success).toBe(false);
      expect(
        CreateProjectSchema.safeParse({ ...validProject, estimatedDurationMonths: 0 }).success,
      ).toBe(false);
    });
  });

  describe('File & Storage Schemas', () => {
    it('validates PresignUploadSchema with size constraints', () => {
      const valid = {
        originalFileName: 'diligence_report.pdf',
        fileSizeBytes: 1024 * 1024,
        mimeType: 'application/pdf',
      };
      expect(PresignUploadSchema.safeParse(valid).success).toBe(true);

      // Exceeds 25 MB max (25 * 1024 * 1024 = 26214400)
      expect(
        PresignUploadSchema.safeParse({ ...valid, fileSizeBytes: 30 * 1024 * 1024 }).success,
      ).toBe(false);
      // Zero byte file rejected
      expect(PresignUploadSchema.safeParse({ ...valid, fileSizeBytes: 0 }).success).toBe(false);
    });

    it('validates ConfirmUploadSchema', () => {
      expect(
        ConfirmUploadSchema.safeParse({ fileRecordId: '123e4567-e89b-12d3-a456-426614174000' })
          .success,
      ).toBe(true);
      expect(ConfirmUploadSchema.safeParse({ fileRecordId: 'invalid-id' }).success).toBe(false);
    });
  });

  describe('Background Job Schemas', () => {
    it('validates MalwareScanJobPayloadSchema', () => {
      const validPayload = {
        fileRecordId: '123e4567-e89b-12d3-a456-426614174000',
        storageKey: 'tenants/firm-123/documents/file-123/report.pdf',
        requestedByUserId: '123e4567-e89b-12d3-a456-426614174001',
        tenantId: 'firm-123',
      };
      expect(MalwareScanJobPayloadSchema.safeParse(validPayload).success).toBe(true);
      expect(
        MalwareScanJobPayloadSchema.safeParse({ ...validPayload, fileRecordId: 'bad' }).success,
      ).toBe(false);
      expect(
        MalwareScanJobPayloadSchema.safeParse({ ...validPayload, storageKey: '' }).success,
      ).toBe(false);
    });

    it('validates CleanupAbandonedJobPayloadSchema', () => {
      expect(CleanupAbandonedJobPayloadSchema.safeParse({ maxAgeHours: 24 }).success).toBe(true);
      expect(CleanupAbandonedJobPayloadSchema.safeParse({ maxAgeHours: 0 }).success).toBe(false);
    });
  });

  describe('Realtime WebSocket Schemas', () => {
    it('validates WsJoinRoomSchema and WsLeaveRoomSchema', () => {
      expect(WsJoinRoomSchema.safeParse({ roomId: 'firm:firm-123' }).success).toBe(true);
      expect(WsJoinRoomSchema.safeParse({ roomId: '' }).success).toBe(false);
      expect(WsLeaveRoomSchema.safeParse({ roomId: 'firm:firm-123' }).success).toBe(true);
      expect(WsLeaveRoomSchema.safeParse({ roomId: '' }).success).toBe(false);
    });

    it('validates WsHeartbeatSchema with optional timestamp', () => {
      expect(WsHeartbeatSchema.safeParse({}).success).toBe(true);
      expect(WsHeartbeatSchema.safeParse({ timestamp: Date.now() }).success).toBe(true);
      expect(WsHeartbeatSchema.safeParse({ timestamp: 'not-a-number' }).success).toBe(false);
    });
  });
});
