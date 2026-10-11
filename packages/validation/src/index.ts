/**
 * Canonical Zod Validation Schemas for MerQent
 * Shared across frontend forms and backend validation pipelines.
 */
import { z } from 'zod';
import { UserRole, PrimaryRoleType, AvailabilityStatus } from '@merqent/shared-types';

// ============================================================================
// 1. Common Query & Identifier Schemas
// ============================================================================

export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid UUID identifier'),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
});

export const SortQuerySchema = z.object({
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const SearchQuerySchema = PaginationQuerySchema.merge(SortQuerySchema).extend({
  query: z.string().max(200).optional(),
});

export const DateRangeQuerySchema = z.object({
  startDate: z.string().datetime({ message: 'startDate must be a valid ISO datetime' }).optional(),
  endDate: z.string().datetime({ message: 'endDate must be a valid ISO datetime' }).optional(),
});

// ============================================================================
// 2. User & Authentication Input Schemas
// ============================================================================

export const RegisterUserSchema = z.object({
  email: z.string().email('Invalid business email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  fullName: z.string().min(2, 'Full name is required'),
  role: z.enum([UserRole.PE_FIRM_ADMIN, UserRole.CONSULTANT_OPERATOR] as const),
});

export const LoginUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// 3. Domain Entity Input Schemas
// ============================================================================

export const CreateProjectSchema = z.object({
  title: z.string().min(5, 'Project title must be at least 5 characters'),
  confidentialNameMasked: z.string().min(3, 'Confidential mask name required'),
  description: z.string().min(20, 'Detailed project description required'),
  industryTermId: z.string().uuid('Invalid industry taxonomy ID'),
  dealTypeTermId: z.string().uuid('Invalid deal type taxonomy ID'),
  targetStartDate: z.string().datetime('Target start date must be a valid ISO datetime string'),
  estimatedDurationMonths: z.number().int().min(1).max(36),
  requiredTravelPercent: z.number().int().min(0).max(100),
  geographyCountry: z.string().min(2),
});

export const UpdateConsultantProfileSchema = z.object({
  headline: z.string().min(5).max(120),
  bio: z.string().min(50).max(5000),
  primaryRoleType: z.nativeEnum(PrimaryRoleType),
  yearsPmiExperience: z.number().int().min(1).max(50),
  availabilityStatus: z.nativeEnum(AvailabilityStatus),
  availableHoursPerWeek: z.number().int().min(1).max(80),
  geographyCountry: z.string().min(2),
  willingToTravelPercent: z.number().int().min(0).max(100),
});

// ============================================================================
// 4. File & Storage Schemas
// ============================================================================

export const PresignUploadSchema = z.object({
  originalFileName: z.string().min(1, 'File name is required').max(255),
  mimeType: z.string().min(3, 'MIME type is required').max(100),
  fileSizeBytes: z
    .number()
    .int()
    .min(1, 'File size must be greater than 0 bytes')
    .max(26214400, 'File size cannot exceed 25MB'),
  checksumSha256: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'Must be a valid 64-character SHA-256 hex string')
    .optional(),
  folder: z.string().max(100).optional(),
});

export const RequestUploadSchema = PresignUploadSchema;

export const ConfirmUploadSchema = z.object({
  fileRecordId: z.string().uuid('Invalid file record UUID'),
  checksumSha256: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'Must be a valid 64-character SHA-256 hex string')
    .optional(),
});

// ============================================================================
// 5. Background Job & Queue Schemas
// ============================================================================

export const MalwareScanJobPayloadSchema = z.object({
  fileRecordId: z.string().uuid('Invalid file record UUID'),
  storageKey: z.string().min(1, 'Storage key is required').max(512),
  requestedByUserId: z.string().uuid('Invalid user UUID').optional(),
  tenantId: z.string().max(100).optional(),
});

export const CleanupAbandonedJobPayloadSchema = z.object({
  maxAgeHours: z.number().int().min(1).max(720).default(24),
  triggeredBy: z.string().max(100).default('scheduled-job'),
});

// ============================================================================
// 6. Realtime & WebSocket Schemas
// ============================================================================

export const WsJoinRoomSchema = z.object({
  roomId: z
    .string()
    .min(1, 'Room ID is required')
    .max(128, 'Room ID must not exceed 128 characters'),
});

export const WsLeaveRoomSchema = z.object({
  roomId: z
    .string()
    .min(1, 'Room ID is required')
    .max(128, 'Room ID must not exceed 128 characters'),
});

export const WsHeartbeatSchema = z.object({
  timestamp: z.number().int().positive().optional(),
});

// ============================================================================
// 7. Inferred TypeScript Types
// ============================================================================

export type IdParamInput = z.infer<typeof IdParamSchema>;
export type PaginationQueryInput = z.infer<typeof PaginationQuerySchema>;
export type SortQueryInput = z.infer<typeof SortQuerySchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type DateRangeQueryInput = z.infer<typeof DateRangeQuerySchema>;
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
export type LoginUserInput = z.infer<typeof LoginUserSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateConsultantProfileInput = z.infer<typeof UpdateConsultantProfileSchema>;
export type PresignUploadInput = z.infer<typeof PresignUploadSchema>;
export type ConfirmUploadInput = z.infer<typeof ConfirmUploadSchema>;
export type MalwareScanJobPayloadInput = z.infer<typeof MalwareScanJobPayloadSchema>;
export type CleanupAbandonedJobPayloadInput = z.infer<typeof CleanupAbandonedJobPayloadSchema>;
export type WsJoinRoomInput = z.infer<typeof WsJoinRoomSchema>;
export type WsLeaveRoomInput = z.infer<typeof WsLeaveRoomSchema>;
export type WsHeartbeatInput = z.infer<typeof WsHeartbeatSchema>;
