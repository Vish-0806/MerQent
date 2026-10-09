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
  BaseRole,
} from '@merqent/shared-types';
import type {
  ApiErrorResponse,
  PaginationMeta,
  PaginatedResponse,
  HealthResponse,
} from '@merqent/shared-types';
import {
  RegisterUserSchema,
  LoginUserSchema,
  PaginationQuerySchema,
  SortQuerySchema,
  IdParamSchema,
  CreateProjectSchema,
} from '@merqent/validation';
import { MERQENT_THEME } from '@merqent/ui';

describe('Shared Packages Integration in Web', () => {
  describe('@merqent/shared-types', () => {
    it('provides all 12 canonical domain enums', () => {
      expect(UserRole.PE_FIRM_ADMIN).toBe('PE_FIRM_ADMIN');
      expect(UserRole.CONSULTANT_OPERATOR).toBe('CONSULTANT_OPERATOR');
      expect(UserStatus.ACTIVE).toBe('ACTIVE');
      expect(FirmAumTier.TIER_2B_TO_10B).toBe('TIER_2B_TO_10B');
      expect(PrimaryRoleType.STRATEGIC_CONSULTANT).toBe('STRATEGIC_CONSULTANT');
      expect(AvailabilityStatus.IMMEDIATELY_AVAILABLE).toBe('IMMEDIATELY_AVAILABLE');
      expect(VerificationTier.TIER_2_CREDENTIAL_VERIFIED).toBe('TIER_2_CREDENTIAL_VERIFIED');
      expect(ProjectStatus.ACTIVE).toBe('ACTIVE');
      expect(ConnectionStatus.ACCEPTED).toBe('ACCEPTED');
      expect(MeetingStatus.CONFIRMED).toBe('CONFIRMED');
      expect(TaxonomyCategory.ERP_SYSTEM).toBe('ERP_SYSTEM');
      expect(VerificationRequestStatus.APPROVED).toBe('APPROVED');
      expect(FileScanStatus.CLEAN).toBe('CLEAN');
      expect(BaseRole.PE_FIRM).toBe('PE_FIRM');
    });

    it('enforces typed API and pagination contracts', () => {
      const mockMeta: PaginationMeta = {
        total: 100,
        page: 1,
        limit: 20,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: false,
      };

      const mockResponse: PaginatedResponse<string> = {
        data: ['item-1', 'item-2'],
        meta: mockMeta,
        timestamp: new Date().toISOString(),
      };

      expect(mockResponse.data).toHaveLength(2);
      expect(mockResponse.meta.totalPages).toBe(5);

      const mockError: ApiErrorResponse = {
        statusCode: 400,
        message: 'Invalid input',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
      };
      expect(mockError.statusCode).toBe(400);

      const mockHealth: HealthResponse = {
        status: 'ok',
        service: 'MerQent API',
        version: '1.0.0',
        environment: 'test',
        timestamp: new Date().toISOString(),
        uptime: 100,
        dependencies: {
          database: {
            status: 'connected',
            latencyMs: 12,
          },
        },
      };
      expect(mockHealth.dependencies.database.status).toBe('connected');
    });
  });

  describe('@merqent/validation', () => {
    it('validates correct registration payloads', () => {
      const validPayload = {
        email: 'partner@summitequity.com',
        password: 'ValidPassword123!',
        fullName: 'Jonathan Vance',
        role: UserRole.PE_FIRM_ADMIN,
      };

      const parsed = RegisterUserSchema.parse(validPayload);
      expect(parsed.email).toBe(validPayload.email);
    });

    it('validates login payloads', () => {
      const parsed = LoginUserSchema.parse({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(parsed.email).toBe('user@example.com');
    });

    it('validates and coerces pagination and sort query params', () => {
      const parsed = PaginationQuerySchema.parse({ page: '2', limit: '50' });
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(50);

      const sort = SortQuerySchema.parse({ sortBy: 'title', sortOrder: 'asc' });
      expect(sort.sortBy).toBe('title');
      expect(sort.sortOrder).toBe('asc');
    });

    it('validates UUID identifiers', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(IdParamSchema.safeParse({ id: validUuid }).success).toBe(true);
      expect(IdParamSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    });

    it('validates project creation schema', () => {
      const validProject = {
        title: 'Project Apex Carve-Out',
        confidentialNameMasked: 'Project Apex',
        description: 'Comprehensive financial systems carve-out and cutover.',
        industryTermId: '123e4567-e89b-12d3-a456-426614174000',
        dealTypeTermId: '123e4567-e89b-12d3-a456-426614174001',
        targetStartDate: new Date().toISOString(),
        estimatedDurationMonths: 6,
        requiredTravelPercent: 25,
        geographyCountry: 'United States',
      };
      expect(CreateProjectSchema.safeParse(validProject).success).toBe(true);
    });
  });

  describe('@merqent/ui', () => {
    it('exports design system theme colors and font tokens', () => {
      expect(MERQENT_THEME.colors.brandNavy).toBe('#0F172A');
      expect(MERQENT_THEME.colors.brandBlue).toBe('#2563EB');
      expect(MERQENT_THEME.typography.fontSans).toBe('var(--font-inter)');
    });
  });
});
