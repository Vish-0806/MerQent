/**
 * Canonical Domain Enums, Contracts, and Shared Types for MerQent
 * Shared across frontend (Next.js), backend (NestJS), and workspace packages.
 */

// ============================================================================
// 1. Domain Enums (Aligned with Prisma Schema)
// ============================================================================

export enum UserRole {
  PE_FIRM_ADMIN = 'PE_FIRM_ADMIN',
  PE_FIRM_MEMBER = 'PE_FIRM_MEMBER',
  CONSULTANT_OPERATOR = 'CONSULTANT_OPERATOR',
  VERIFICATION_REVIEWER = 'VERIFICATION_REVIEWER',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

// SystemRole alias for backward compatibility across backend guards & decorators
export type SystemRole = UserRole;
export const SystemRole = UserRole;

export enum BaseRole {
  PE_FIRM = 'PE_FIRM',
  CONSULTANT = 'CONSULTANT',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum FirmAumTier {
  UNDER_500M = 'UNDER_500M',
  TIER_500M_TO_2B = 'TIER_500M_TO_2B',
  TIER_2B_TO_10B = 'TIER_2B_TO_10B',
  OVER_10B = 'OVER_10B',
}

export enum PrimaryRoleType {
  STRATEGIC_CONSULTANT = 'STRATEGIC_CONSULTANT',
  HANDS_ON_OPERATOR = 'HANDS_ON_OPERATOR',
  HYBRID = 'HYBRID',
}

export enum AvailabilityStatus {
  IMMEDIATELY_AVAILABLE = 'IMMEDIATELY_AVAILABLE',
  AVAILABLE_WITHIN_30_DAYS = 'AVAILABLE_WITHIN_30_DAYS',
  BOOKED = 'BOOKED',
}

export enum VerificationTier {
  TIER_0_UNVERIFIED = 'TIER_0_UNVERIFIED',
  TIER_1_EMAIL_VERIFIED = 'TIER_1_EMAIL_VERIFIED',
  TIER_2_CREDENTIAL_VERIFIED = 'TIER_2_CREDENTIAL_VERIFIED',
  TIER_3_REFERENCE_VERIFIED = 'TIER_3_REFERENCE_VERIFIED',
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  FULFILLED = 'FULFILLED',
  CLOSED = 'CLOSED',
}

export enum ConnectionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
}

export enum MeetingStatus {
  PROPOSED = 'PROPOSED',
  CONFIRMED = 'CONFIRMED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELED = 'CANCELED',
  COMPLETED = 'COMPLETED',
}

export enum TaxonomyCategory {
  ERP_SYSTEM = 'ERP_SYSTEM',
  ACCOUNTING_SYSTEM = 'ACCOUNTING_SYSTEM',
  DEAL_TYPE = 'DEAL_TYPE',
  INTEGRATION_DISCIPLINE = 'INTEGRATION_DISCIPLINE',
  INDUSTRY = 'INDUSTRY',
  PMI_TASK = 'PMI_TASK',
}

export enum VerificationRequestStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  INFO_REQUESTED = 'INFO_REQUESTED',
}

export enum FileScanStatus {
  PENDING = 'PENDING',
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
}

// ============================================================================
// 2. User & Session Context
// ============================================================================

export interface UserContext {
  id: string;
  email: string;
  role: UserRole;
  firmId?: string;
  consultantProfileId?: string;
}

// ============================================================================
// 3. Pagination & Query Parameters
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export type SortOrder = 'asc' | 'desc';

export interface SortParams {
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface SearchQueryParams extends PaginationParams, SortParams {
  query?: string;
  filter?: Record<string, unknown>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

// ============================================================================
// 4. Standardized API Responses & Errors
// ============================================================================

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: PaginationMeta;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  message?: string;
  timestamp: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path?: string;
  correlationId?: string;
  details?: ApiErrorDetail[];
}

export type HealthCheckStatus = 'ok' | 'degraded';
export type DependencyStatus = 'connected' | 'disconnected';

export interface DatabaseHealthStatus {
  status: DependencyStatus;
  latencyMs?: number;
}

export interface DependencyStatusMap {
  database: DatabaseHealthStatus;
}

export interface HealthResponse {
  status: HealthCheckStatus;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
  dependencies: DependencyStatusMap;
}

// ============================================================================
// 5. Common Identifiers & Primitives
// ============================================================================

export interface IdParam {
  id: string;
}

export interface TimestampFields {
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface DateRangeParams {
  startDate?: string | Date;
  endDate?: string | Date;
}
